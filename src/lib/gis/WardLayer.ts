/**
 * WardLayer.ts
 * 
 * Multi-city ward boundary layer manager for CesiumJS.
 * Loads Mumbai, Pune, and Navi Mumbai ward boundaries as separate GeoJsonDataSources,
 * each independently toggleable, with centroid labels, hover/click interactivity,
 * and a fill-mode toggle for future choropleth coloring.
 */

import {
  Viewer,
  GeoJsonDataSource,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  Entity,
  Cartesian2,
  Cartesian3,
  NearFarScalar,
  DistanceDisplayCondition,
  LabelStyle,
  VerticalOrigin,
  HorizontalOrigin,
  HeightReference,
  BoundingSphere,
  Cartographic,
  Math as CesiumMath,
  ClassificationType,
  PolylineGraphics,
  PolygonHierarchy,
} from 'cesium';
import { CITY_COLORS, extractNormalizedProperties, type NormalizedWardProperties } from './WardData';
import { HazardPins } from './HazardPins';
import { wardProfileKey, type WardRiskProfile } from '../risk/WardRiskProfile';
import { isRemoteEnabled, wardGeojsonUrl } from './gisUrlResolver';

type CityKey = 'mumbai' | 'pune' | 'navi_mumbai';

const ALL_CITIES: CityKey[] = ['mumbai', 'pune', 'navi_mumbai'];

// Label visibility thresholds (camera altitude in meters)
const LABEL_THRESHOLDS = {
  mumbai: { showCode: 30000, showName: 12000 },
  pune: { showCode: 30000, showName: 12000 },
  navi_mumbai: { showCode: 20000, showName: 6000 }, // Tighter thresholds for 111 wards
};

interface CityLayerData {
  dataSource: GeoJsonDataSource;
  labelEntities: Entity[];
  lineEntities: Entity[];
  visible: boolean;
  entityMaterials: Map<string, { fill: ColorMaterialProperty; outline: Color }>;
}

/** High-speed 2D Ramer-Douglas-Peucker simplification for terrain outlines and clipping masks */
function simplifyRing2D(pts: number[][], tolerance: number = 0.00015): number[][] {
  if (pts.length <= 4) return pts;

  function getSqSegDist(p: number[], p1: number[], p2: number[]) {
    let x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = p2[0]; y = p2[1];
      } else if (t > 0) {
        x += dx * t; y += dy * t;
      }
    }
    dx = p[0] - x; dy = p[1] - y;
    return dx * dx + dy * dy;
  }

  const sqTol = tolerance * tolerance;
  const last = pts.length - 1;
  const simplified: number[][] = [pts[0]];

  function step(first: number, lastIdx: number) {
    let maxSq = sqTol;
    let index = -1;
    for (let i = first + 1; i < lastIdx; i++) {
      const sq = getSqSegDist(pts[i], pts[first], pts[lastIdx]);
      if (sq > maxSq) {
        index = i;
        maxSq = sq;
      }
    }
    if (maxSq > sqTol) {
      if (index - first > 1) step(first, index);
      simplified.push(pts[index]);
      if (lastIdx - index > 1) step(index, lastIdx);
    }
  }

  step(0, last);
  simplified.push(pts[last]);
  return simplified;
}

/** Enforces Counter-Clockwise winding order required by Cesium ClippingPolygon */
function ensureCounterClockwiseRing(ring: number[][]): number[][] {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  }
  // In geographic (lng, lat): positive area indicates clockwise, negative indicates counter-clockwise
  if (area > 0) {
    return [...ring].reverse();
  }
  return ring;
}

export class WardLayer {
  private viewer: Viewer;
  private cityLayers: Map<CityKey, CityLayerData> = new Map();
  private selectedEntity: Entity | null = null;
  private selectedMaterial: any = null;
  private fillMode: boolean = false;
  private loadingPromise: Promise<void> | null = null;
  private hazardPins: HazardPins;
  private wardPolygonEntities: Map<string, Entity> = new Map();
  private wardBoundaryPositions: Map<string, Cartesian3[]> = new Map();
  private wardLineEntities: Map<string, Entity[]> = new Map();
  private wardWaterEntities: Map<string, Entity> = new Map();
  private lastProfiles: Record<string, WardRiskProfile> = {};

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.hazardPins = new HazardPins(viewer);
  }

  public destroy() {
    this.removeAll();
    this.hazardPins.destroy();
  }

  /**
   * Retrieves the outer boundary Cartesian3 positions of a specific ward for 3D tileset clipping.
   */
  public getWardBoundaryPositions(wardId: string): Cartesian3[] | null {
    if (!wardId) return null;
    return (
      this.wardBoundaryPositions.get(wardId) ||
      this.wardBoundaryPositions.get(wardProfileKey(wardId)) ||
      this.wardBoundaryPositions.get(`mumbai_${wardId}`) ||
      this.wardBoundaryPositions.get(`mumbai_${wardProfileKey(wardId)}`) ||
      null
    );
  }

  /**
   * Loads all three cities' ward boundaries from the normalizing API route.
   * Each city becomes a separate GeoJsonDataSource for independent toggling.
   */
  async loadAllCities(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this._doLoadAllCities();
    return this.loadingPromise;
  }

  private async _doLoadAllCities(): Promise<void> {
    const loadPromises = ALL_CITIES.map(async (city) => {
      try {
        await this.loadCity(city);
        console.log(`[WardLayer] ${city} loaded successfully`);
      } catch (error) {
        console.error(`[WardLayer] Failed to load ${city}:`, error);
      }
    });

    await Promise.all(loadPromises);
    console.log(`[WardLayer] All cities loaded. Total data sources: ${this.cityLayers.size}`);
  }

  /**
   * Load a single city's ward boundaries.
   */
  public async loadCity(city: CityKey): Promise<void> {
    if (this.cityLayers.has(city)) return;

    // When remote storage is configured, try remote first with immediate local fallback
    const primaryUrl = isRemoteEnabled ? wardGeojsonUrl(city) : `/data/wards/${city}.geojson`;
    let geojson: any = null;

    try {
      const response = await fetch(primaryUrl);
      if (response.ok) {
        geojson = await response.json();
      } else {
        console.warn(`[WardLayer] Primary fetch returned ${response.status} for ${primaryUrl}`);
      }
    } catch (err) {
      console.warn(`[WardLayer] Primary fetch failed for ${city} from ${primaryUrl}, trying local fallback`);
    }

    if (!geojson) {
      try {
        const localRes = await fetch(`/data/wards/${city}.geojson`);
        if (localRes.ok) {
          geojson = await localRes.json();
        } else {
          const apiRes = await fetch(`/api/wards/${city}`);
          if (apiRes.ok) geojson = await apiRes.json();
        }
      } catch (err) {
        console.error(`[WardLayer] Fallback fetch also failed for ${city}:`, err);
      }
    }

    if (!geojson) {
      throw new Error(`Failed to load ward GeoJSON for ${city}`);
    }

    // 1. Build clamped-to-ground vector polyline outlines directly on Cesium terrain
    // This guarantees 100% visible, razor-sharp ward administrative boundaries regardless of elevation.
    const features = geojson.features || [];
    const lineEntities: Entity[] = [];

    // Safety guard: ensure coordinates are in standard [longitude, latitude] order
    function ensureLngLat(coords: any): any {
      if (typeof coords[0] === 'number') {
        if (coords[0] < 35 && coords[1] > 60) {
          const s = [coords[1], coords[0]];
          if (coords.length > 2) s.push(coords[2]);
          return s;
        }
        return coords;
      }
      return coords.map(ensureLngLat);
    }

    for (const feature of features) {
      if (feature.geometry && feature.geometry.coordinates) {
        feature.geometry.coordinates = ensureLngLat(feature.geometry.coordinates);
      }
      const rawProps = feature.properties || {};
      const normalized = extractNormalizedProperties(rawProps);
      const geom = feature.geometry;
      if (!geom) continue;

      let rings: number[][][] = [];
      if (geom.type === 'Polygon') {
        rings = geom.coordinates;
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          if (poly && poly.length > 0) rings.push(poly[0]);
        }
      }

      if (rings.length > 0) {
        const outerRing = rings[0];
        // Simplify outer ring and ensure Counter-Clockwise order for Cesium ClippingPolygon
        const simplifiedOuter = simplifyRing2D(outerRing, 0.00015);
        const ccwOuter = ensureCounterClockwiseRing(simplifiedOuter);
        const flatOuter: number[] = [];
        for (const pt of ccwOuter) {
          flatOuter.push(pt[0], pt[1]);
        }
        if (flatOuter.length >= 6) {
          const cartPositions = Cartesian3.fromDegreesArray(flatOuter);
          this.wardBoundaryPositions.set(normalized.wardId, cartPositions);
          if (normalized.wardCode) {
            const code = normalized.wardCode.trim();
            this.wardBoundaryPositions.set(code, cartPositions);
            this.wardBoundaryPositions.set(code.toUpperCase(), cartPositions);
            this.wardBoundaryPositions.set(code.replace('/', ''), cartPositions);
            this.wardBoundaryPositions.set(`${city}_${code}`, cartPositions);
          }
          const bare = wardProfileKey(normalized.wardId);
          if (bare) this.wardBoundaryPositions.set(bare, cartPositions);
        }

        // Add clamped vector polyline for each boundary ring with simplified geometry
        for (const ring of rings) {
          const simplified = simplifyRing2D(ring, 0.00015);
          const flatRing: number[] = [];
          for (const pt of simplified) {
            flatRing.push(pt[0], pt[1]);
          }
          if (flatRing.length >= 6) {
            // Close ring if open
            if (simplified[0][0] !== simplified[simplified.length - 1][0] || simplified[0][1] !== simplified[simplified.length - 1][1]) {
              flatRing.push(simplified[0][0], simplified[0][1]);
            }

            const outlineColor = Color.fromCssColorString('rgba(16, 185, 129, 0.85)');
            const lineEntity = this.viewer.entities.add({
              polyline: {
                positions: Cartesian3.fromDegreesArray(flatRing),
                width: 2.5,
                material: outlineColor,
                clampToGround: true,
              },
              properties: {
                isWardBoundaryLine: true,
                wardId: normalized.wardId,
                wardCode: normalized.wardCode,
                city: city,
              } as any,
            });

            lineEntities.push(lineEntity);

            const registerLineKey = (key: string) => {
              if (!this.wardLineEntities.has(key)) {
                this.wardLineEntities.set(key, []);
              }
              this.wardLineEntities.get(key)!.push(lineEntity);
            };

            registerLineKey(normalized.wardId);
            if (normalized.wardCode) {
              const code = normalized.wardCode.trim();
              registerLineKey(code);
              registerLineKey(code.toUpperCase());
              registerLineKey(code.replace('/', ''));
              registerLineKey(`${city}_${code}`);
            }
            const bareKey = wardProfileKey(normalized.wardId);
            if (bareKey) registerLineKey(bareKey);
          }
        }
      }
    }

    // 2. Load into Cesium GeoJsonDataSource for ground polygons and hover/click interactivity
    const dataSource = new GeoJsonDataSource(`wards_${city}`);
    await dataSource.load(geojson, {
      clampToGround: true,
    });

    const entityMaterials = new Map<string, { fill: ColorMaterialProperty; outline: Color }>();

    // Style each entity and create labels
    const entities = dataSource.entities.values;
    const labelEntities: Entity[] = [];

    for (const entity of entities) {
      const rawProps = entity.properties ? entity.properties.getValue(this.viewer.clock.currentTime) : {};
      const normalized = extractNormalizedProperties(rawProps);

      // Attach normalized properties to entity for hover/click access
      if (entity.properties) {
        entity.properties.addProperty('normalizedWardId', normalized.wardId);
        entity.properties.addProperty('normalizedWardName', normalized.wardName);
        entity.properties.addProperty('normalizedWardCode', normalized.wardCode);
        entity.properties.addProperty('normalizedCity', normalized.city);
      }

      // Style the polygon with sleek frosted obsidian fill
      if (entity.polygon) {
        const outlineColor = Color.fromCssColorString('rgba(16, 185, 129, 0.85)');
        const fillColor = Color.fromCssColorString('rgba(16, 185, 129, 0.22)');
        const fillMaterial = new ColorMaterialProperty(fillColor);

        entity.polygon.material = fillMaterial;
        entity.polygon.classificationType = new ConstantProperty(ClassificationType.BOTH);
        entity.polygon.height = undefined as any;
        entity.polygon.perPositionHeight = undefined as any;

        entityMaterials.set(normalized.wardId, { fill: fillMaterial, outline: outlineColor });

        const registerPolyKey = (key: string) => {
          this.wardPolygonEntities.set(key, entity);
        };

        registerPolyKey(normalized.wardId);
        if (normalized.wardCode) {
          const code = normalized.wardCode.trim();
          registerPolyKey(code);
          registerPolyKey(code.toUpperCase());
          registerPolyKey(code.replace('/', ''));
          registerPolyKey(`${city}_${code}`);
        }
        const bare = wardProfileKey(normalized.wardId);
        if (bare) registerPolyKey(bare);
      }

      // Create centroid label
      const centroid = this.computeCentroid(entity);
      if (centroid) {
        const thresholds = LABEL_THRESHOLDS[city];
        const labelEntity = this.viewer.entities.add({
          position: centroid,
          label: {
            text: normalized.wardCode,
            font: city === 'navi_mumbai' ? 'bold 11px sans-serif' : 'bold 13px sans-serif',
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 3,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new NearFarScalar(1000, 1.0, thresholds.showCode, 0.0),
            translucencyByDistance: new NearFarScalar(
              thresholds.showName,
              1.0,
              thresholds.showCode,
              0.0
            ),
            distanceDisplayCondition: new DistanceDisplayCondition(0, thresholds.showCode),
            pixelOffset: new Cartesian2(0, -25),
          },
          properties: {
            wardLayerLabel: true,
            city: city,
            normalizedWardId: normalized.wardId,
            normalizedWardCode: normalized.wardCode,
          } as any,
        });

        labelEntities.push(labelEntity);
      }
    }

    // Add data source to viewer
    this.viewer.dataSources.add(dataSource);

    // Store city layer data
    this.cityLayers.set(city, {
      dataSource,
      labelEntities,
      lineEntities,
      visible: true,
      entityMaterials,
    });
  }

  /**
   * Compute the centroid of an entity's polygon for label placement.
   * Uses a simple average of the polygon's outer ring coordinates.
   */
  private computeCentroid(entity: Entity): Cartesian3 | null {
    if (!entity.polygon || !entity.polygon.hierarchy) {
      return null;
    }

    try {
      const hierarchy = entity.polygon.hierarchy.getValue(this.viewer.clock.currentTime);
      if (!hierarchy || !hierarchy.positions || hierarchy.positions.length === 0) {
        return null;
      }

      const positions = hierarchy.positions;
      let sumX = 0, sumY = 0, sumZ = 0;
      for (const pos of positions) {
        sumX += pos.x;
        sumY += pos.y;
        sumZ += pos.z;
      }
      const count = positions.length;

      return new Cartesian3(sumX / count, sumY / count, sumZ / count);
    } catch {
      return null;
    }
  }

  /**
   * Toggle visibility of a specific city's ward layer.
   */
  setCityVisible(city: CityKey, visible: boolean): void {
    const layer = this.cityLayers.get(city);
    if (!layer) return;

    layer.visible = visible;
    layer.dataSource.show = visible;

    for (const labelEntity of layer.labelEntities) {
      labelEntity.show = visible;
    }
    for (const lineEntity of layer.lineEntities) {
      lineEntity.show = visible;
    }
    for (const [wKey, water] of this.wardWaterEntities.entries()) {
      if (!visible && (wKey.startsWith(city) || (city === 'mumbai' && !wKey.startsWith('pune') && !wKey.startsWith('navi_mumbai')))) {
        water.show = false;
      }
    }
  }

  /**
   * Get current visibility state of all cities.
   */
  getCityVisibility(): Record<CityKey, boolean> {
    const result = {} as Record<CityKey, boolean>;
    for (const city of ALL_CITIES) {
      const layer = this.cityLayers.get(city);
      result[city] = layer?.visible ?? false;
    }
    return result;
  }

  /**
   * Update the real ward polygon boundaries for all wards from their computed risk profiles.
   * Dynamically adjusts polygon hazard glass, vector outlines, centroid badges, and 3D flood water prisms
   * in real-time as the timeline scrubber advances.
   */
  updateFromProfiles(profiles: Record<string, WardRiskProfile>): void {
    this.lastProfiles = profiles;

    // 1. Ensure all cylinder ellipses are removed from centroid label entities
    for (const layer of this.cityLayers.values()) {
      for (const labelEntity of layer.labelEntities) {
        if (labelEntity.ellipse) {
          labelEntity.ellipse = undefined;
        }
      }
    }

    // 2. Dynamically style the ACTUAL WARD BOUNDARY POLYGONS & VECTOR POLYLINES
    for (const [wardKey, entity] of this.wardPolygonEntities.entries()) {
      if (!entity.polygon) continue;

      const cleanKey = wardKey.replace(/\s+/g, '').toUpperCase();
      const bareKey = wardProfileKey(wardKey);

      let profile: WardRiskProfile | undefined =
        profiles[wardKey] ||
        profiles[cleanKey] ||
        profiles[bareKey] ||
        profiles[cleanKey.replace('/', '')] ||
        profiles[`mumbai_${wardKey}`] ||
        profiles[`mumbai_${cleanKey}`] ||
        profiles[`mumbai_${bareKey}`] ||
        profiles[`pune_${wardKey}`] ||
        profiles[`navi_mumbai_${wardKey}`];

      if (!profile) {
        profile = Object.values(profiles).find(
          (p) =>
            p.wardId === wardKey ||
            p.wardId === cleanKey ||
            p.wardName?.toUpperCase().includes(cleanKey) ||
            cleanKey.includes(p.wardId.toUpperCase())
        );
      }

      const sev = profile ? profile.overallSeverity : 0;

      // Vivid flood risk zone styling:
      // Critical (3): Crimson Alert Zone
      // High (2): Amber Warning Zone
      // Moderate (1): Tactical Blue Zone
      // Low (0): Calm Emerald Glass
      const alpha = this.fillMode ? 0.38 : 0.20;
      const fillColor =
        sev === 3 ? Color.fromCssColorString(`rgba(239, 68, 68, ${Math.min(0.70, alpha + 0.25)})`) :
        sev === 2 ? Color.fromCssColorString(`rgba(245, 158, 11, ${Math.min(0.60, alpha + 0.18)})`) :
        sev === 1 ? Color.fromCssColorString(`rgba(59, 130, 246, ${Math.min(0.50, alpha + 0.12)})`) :
                    Color.fromCssColorString(`rgba(16, 185, 129, ${alpha})`);

      const outlineColor =
        sev === 3 ? Color.fromCssColorString('#EF4444') :
        sev === 2 ? Color.fromCssColorString('#F59E0B') :
        sev === 1 ? Color.fromCssColorString('#3B82F6') :
                    Color.fromCssColorString('rgba(16, 185, 129, 0.85)');

      const outlineWidth = sev === 3 ? 5.0 : sev === 2 ? 4.0 : sev === 1 ? 3.0 : 2.5;

      if (!this.selectedEntity || this.selectedEntity !== entity) {
        entity.polygon.material = new ColorMaterialProperty(fillColor);
      }

      // Update vector polylines for crisp terrain outlines
      const lines =
        this.wardLineEntities.get(wardKey) ||
        this.wardLineEntities.get(cleanKey) ||
        this.wardLineEntities.get(bareKey) ||
        this.wardLineEntities.get(`mumbai_${wardKey}`) ||
        this.wardLineEntities.get(`mumbai_${cleanKey}`);

      if (lines) {
        for (const line of lines) {
          if (line.polyline) {
            line.polyline.material = new ColorMaterialProperty(outlineColor);
            line.polyline.width = new ConstantProperty(outlineWidth);
          }
        }
      }
    }

    // 3. Update centroid labels with dynamic severity status
    for (const layer of this.cityLayers.values()) {
      for (const labelEntity of layer.labelEntities) {
        if (!labelEntity.label || !labelEntity.properties) continue;
        const wardId = labelEntity.properties.getValue(this.viewer.clock.currentTime)?.normalizedWardId;
        const wardCode = labelEntity.properties.getValue(this.viewer.clock.currentTime)?.normalizedWardCode || wardId;
        if (!wardCode) continue;

        const clean = wardCode.replace(/\s+/g, '').toUpperCase();
        let profile: WardRiskProfile | undefined =
          profiles[wardCode] ||
          profiles[clean] ||
          profiles[wardId] ||
          profiles[wardProfileKey(wardId)];

        if (!profile) {
          profile = Object.values(profiles).find(
            (p) => p.wardId === wardId || p.wardId === clean || p.wardName?.toUpperCase().includes(clean)
          );
        }

        const sev = profile ? profile.overallSeverity : 0;
        const sevText = sev === 3 ? 'CRITICAL' : sev === 2 ? 'ELEVATED' : sev === 1 ? 'WATCH' : 'NOMINAL';
        const labelColor =
          sev === 3 ? Color.fromCssColorString('#EF4444') :
          sev === 2 ? Color.fromCssColorString('#F59E0B') :
          sev === 1 ? Color.fromCssColorString('#60A5FA') :
                      Color.fromCssColorString('#34D399');

        labelEntity.label.text = new ConstantProperty(`${wardCode}\n[${sevText}]`);
        labelEntity.label.fillColor = new ConstantProperty(labelColor);
      }
    }

    // 4. Dynamic 3D Volumetric Flood Water Prisms (Rise with increasing timeline rainfall & severity)
    for (const [wardKey, cartPositions] of this.wardBoundaryPositions.entries()) {
      if (!cartPositions || cartPositions.length < 3) continue;

      const cleanKey = wardKey.replace(/\s+/g, '').toUpperCase();
      let profile: WardRiskProfile | undefined =
        profiles[wardKey] ||
        profiles[cleanKey] ||
        profiles[wardProfileKey(wardKey)] ||
        profiles[`mumbai_${wardKey}`] ||
        profiles[`mumbai_${cleanKey}`];

      if (!profile) {
        profile = Object.values(profiles).find(
          (p) => p.wardId === wardKey || p.wardId === cleanKey || p.wardName?.toUpperCase().includes(cleanKey)
        );
      }

      const sev = profile ? profile.overallSeverity : 0;
      const rain = profile ? profile.rainfall3DaySum : 0;

      let waterEntity = this.wardWaterEntities.get(wardKey);

      // Flood water becomes visibly extruded when there is elevated risk and rainfall
      if (sev >= 1 && rain >= 40) {
        // Dynamic water height scales seamlessly from 14m to 65m based on 3-day rainfall
        const visualHeight = Math.min(75, 14 + (rain / 280) * 42 + sev * 6);

        const waterColor =
          sev === 3 ? Color.fromCssColorString('rgba(239, 68, 68, 0.44)') :   // Crimson Deluge
          sev === 2 ? Color.fromCssColorString('rgba(245, 158, 11, 0.38)') :  // Amber Inundation
                      Color.fromCssColorString('rgba(37, 99, 235, 0.32)');    // Blue Rising Tide

        if (!waterEntity) {
          waterEntity = this.viewer.entities.add({
            polygon: {
              hierarchy: new ConstantProperty(new PolygonHierarchy(cartPositions)),
              extrudedHeight: new ConstantProperty(visualHeight),
              perPositionHeight: false,
              material: new ColorMaterialProperty(waterColor),
              closeTop: true,
              closeBottom: false,
            },
            properties: { isWardFloodWater: true, wardId: wardKey } as any,
          });
          this.wardWaterEntities.set(wardKey, waterEntity);
        } else {
          waterEntity.show = true;
          if (waterEntity.polygon) {
            waterEntity.polygon.extrudedHeight = new ConstantProperty(visualHeight);
            waterEntity.polygon.material = new ColorMaterialProperty(waterColor);
          }
        }
      } else if (waterEntity) {
        waterEntity.show = false;
      }
    }
  }

  /**
   * Ward centroids for the floating HTML tags, which anchor real DOM to a 3D
   * point rather than rendering their content into the WebGL canvas.
   */
  getWardAnchors(city?: CityKey): { wardId: string; position: Cartesian3 }[] {
    const anchors: { wardId: string; position: Cartesian3 }[] = [];
    const time = this.viewer.clock.currentTime;

    for (const [key, layer] of this.cityLayers) {
      if (city && key !== city) continue;
      for (const labelEntity of layer.labelEntities) {
        const wardId = labelEntity.properties?.getValue(time)?.normalizedWardId;
        const position = labelEntity.position?.getValue(time);
        if (wardId && position) anchors.push({ wardId, position });
      }
    }

    return anchors;
  }

  /**
   * Toggle fill mode (subtle glass vs saturated flood fill).
   * Preserves calculated severity colors.
   */
  setFillMode(enabled: boolean): void {
    this.fillMode = enabled;
    if (this.lastProfiles && Object.keys(this.lastProfiles).length > 0) {
      this.updateFromProfiles(this.lastProfiles);
    }
  }

  /**
   * Get information about a hovered/picked entity.
   * Returns null if the entity is not a ward polygon.
   */
  getWardInfo(entity: Entity): NormalizedWardProperties | null {
    if (!entity.properties) return null;

    const time = this.viewer.clock.currentTime;
    const wardId = entity.properties.normalizedWardId?.getValue(time);
    if (!wardId) return null;

    return {
      wardId,
      wardName: entity.properties.normalizedWardName?.getValue(time) || 'Unknown',
      wardCode: entity.properties.normalizedWardCode?.getValue(time) || '?',
      city: entity.properties.normalizedCity?.getValue(time) || 'unknown',
    };
  }

  /**
   * Highlight a ward polygon (for hover effect).
   * Returns the original material so it can be restored.
   */
  highlightWard(entity: Entity): any {
    if (!entity.polygon) return null;

    const originalMaterial = entity.polygon.material;
    const info = this.getWardInfo(entity);
    entity.polygon.material = new ColorMaterialProperty(Color.fromCssColorString('rgba(255, 255, 255, 0.22)'));

    if (info) {
      const lines = this.wardLineEntities.get(info.wardId) || (info.wardCode ? this.wardLineEntities.get(info.wardCode) : null);
      if (lines) {
        for (const line of lines) {
          if (line.polyline) {
            line.polyline.material = new ColorMaterialProperty(Color.WHITE);
            line.polyline.width = new ConstantProperty(3.5);
          }
        }
      }
    }

    return originalMaterial;
  }

  /**
   * Restore a ward polygon's original material (after hover).
   */
  unhighlightWard(entity: Entity, originalMaterial: any): void {
    if (!entity.polygon || !originalMaterial) return;

    entity.polygon.material = originalMaterial;
    const info = this.getWardInfo(entity);
    if (info && (!this.selectedEntity || this.selectedEntity !== entity)) {
      const lines = this.wardLineEntities.get(info.wardId) || (info.wardCode ? this.wardLineEntities.get(info.wardCode) : null);
      if (lines) {
        for (const line of lines) {
          if (line.polyline) {
            line.polyline.material = new ColorMaterialProperty(Color.fromCssColorString('rgba(255, 255, 255, 0.70)'));
            line.polyline.width = new ConstantProperty(2.0);
          }
        }
      }
    }
  }

  /**
   * Select a ward (persistent highlight).
   * Deselects any previously selected ward.
   */
  selectWard(entity: Entity): NormalizedWardProperties | null {
    // Deselect previous
    this.clearSelection();

    const info = this.getWardInfo(entity);
    if (!info || !entity.polygon) return null;

    this.selectedEntity = entity;
    this.selectedMaterial = entity.polygon.material;

    // Apply high-contrast frosted selection highlight
    entity.polygon.material = new ColorMaterialProperty(Color.fromCssColorString('rgba(255, 255, 255, 0.38)'));

    const lines = this.wardLineEntities.get(info.wardId) || (info.wardCode ? this.wardLineEntities.get(info.wardCode) : null);
    if (lines) {
      for (const line of lines) {
        if (line.polyline) {
          line.polyline.material = new ColorMaterialProperty(Color.WHITE);
          line.polyline.width = new ConstantProperty(4.5);
        }
      }
    }

    return info;
  }

  /**
   * Clear the current ward selection.
   */
  clearSelection(): void {
    if (this.selectedEntity && this.selectedMaterial) {
      this.unhighlightWard(this.selectedEntity, this.selectedMaterial);
    }
    this.selectedEntity = null;
    this.selectedMaterial = null;
  }

  /**
   * Check if an entity is a ward boundary (not a label or other entity).
   */
  isWardEntity(entity: Entity): boolean {
    return !!entity.polygon && !!entity.properties?.normalizedWardId;
  }

  /**
   * Load wards for a single city (backward compatibility).
   * The old API would remove the previous city and load the new one.
   * The new API keeps all cities loaded but toggles visibility.
   */
  async loadCityWards(city: CityKey): Promise<void> {
    if (this.cityLayers.size === 0) {
      await this.loadAllCities();
    }
    this.setCityVisible(city, true);
  }

  /**
   * Remove a single city's layer from the viewer.
   */
  removeCityLayer(city: CityKey): void {
    const layer = this.cityLayers.get(city);
    if (!layer) return;

    this.viewer.dataSources.remove(layer.dataSource, true);
    for (const labelEntity of layer.labelEntities) {
      this.viewer.entities.remove(labelEntity);
    }
    for (const lineEntity of layer.lineEntities) {
      this.viewer.entities.remove(lineEntity);
    }
    this.cityLayers.delete(city);
  }

  /**
   * Remove all ward layers from the viewer.
   */
  removeAll(): void {
    for (const city of ALL_CITIES) {
      this.removeCityLayer(city);
    }
    for (const water of this.wardWaterEntities.values()) {
      this.viewer.entities.remove(water);
    }
    this.wardWaterEntities.clear();
    this.clearSelection();
    this.loadingPromise = null;
  }

  /**
   * Backward-compatible removeLayer method.
   */
  removeLayer(): void {
    this.removeAll();
  }
}
