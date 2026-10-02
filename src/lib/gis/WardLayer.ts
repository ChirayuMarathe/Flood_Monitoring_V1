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
  visible: boolean;
  entityMaterials: Map<string, { fill: ColorMaterialProperty; outline: Color }>;
}



export class WardLayer {
  private viewer: Viewer;
  private cityLayers: Map<CityKey, CityLayerData> = new Map();
  private selectedEntity: Entity | null = null;
  private selectedMaterial: any = null;
  private fillMode: boolean = false;
  private loadingPromise: Promise<void> | null = null;
  private hazardPins: HazardPins;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.hazardPins = new HazardPins(viewer);
  }

  public destroy() {
    this.removeAll();
    this.hazardPins.destroy();
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

    // When remote storage is configured, fetch pre-normalized GeoJSON directly
    // from Supabase CDN. Otherwise use the local API route which normalizes on the fly.
    const apiUrl = isRemoteEnabled ? wardGeojsonUrl(city) : `/api/wards/${city}`;
    const source = isRemoteEnabled ? 'Supabase Storage' : 'API route';

    // Fetch normalized GeoJSON
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`${source} returned ${response.status} for ${city}`);
    }
    const geojson = await response.json();

    // Log the normalization info from headers (API route only)
    if (!isRemoteEnabled) {
      console.log(`[WardLayer] ${city} — wards: ${response.headers.get('X-Ward-Count')}, coords fixed: ${response.headers.get('X-Coords-Fixed')}, simplified: ${response.headers.get('X-Simplified')}`);
    } else {
      console.log(`[WardLayer] ${city} — loaded from ${source}`);
    }

    // Load into Cesium GeoJsonDataSource
    const dataSource = new GeoJsonDataSource(`wards_${city}`);
    await dataSource.load(geojson, {
      clampToGround: true,
    });

    // Get city color config
    const colors = CITY_COLORS[city];
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

      // Style the polygon
      if (entity.polygon) {
        const outlineColor = new Color(colors.outline.r, colors.outline.g, colors.outline.b, colors.outline.a);
        // Use alpha=0.01 instead of 0 to ensure proper terrain draping
        const fillColor = new Color(colors.fill.r, colors.fill.g, colors.fill.b, colors.fill.a);
        const fillMaterial = new ColorMaterialProperty(fillColor);

        entity.polygon.material = fillMaterial;
        entity.polygon.height = new ConstantProperty(0); // Fix for outline warning on terrain
        entity.polygon.perPositionHeight = new ConstantProperty(false); // Drop perPositionHeight to avoid conflict with height
        entity.polygon.outline = new ConstantProperty(true);
        entity.polygon.outlineColor = new ConstantProperty(outlineColor);
        entity.polygon.outlineWidth = new ConstantProperty(2);

        entityMaterials.set(normalized.wardId, { fill: fillMaterial, outline: outlineColor });
      }

      // Create centroid label
      const centroid = this.computeCentroid(entity);
      if (centroid) {
        const thresholds = LABEL_THRESHOLDS[city];
        const labelEntity = this.viewer.entities.add({
          position: centroid,
          // Billboard is handled by HazardPins in updateFromProfiles
          label: {
            text: normalized.wardCode,
            font: city === 'navi_mumbai' ? '11px sans-serif' : '13px sans-serif',
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            // Zoom-dependent scaling
            scaleByDistance: new NearFarScalar(1000, 1.0, thresholds.showCode, 0.0),
            // Fade out at distance
            translucencyByDistance: new NearFarScalar(
              thresholds.showName,
              1.0,
              thresholds.showCode,
              0.0
            ),
            // Completely stop rendering beyond threshold (perf optimization)
            distanceDisplayCondition: new DistanceDisplayCondition(0, thresholds.showCode),
            pixelOffset: new Cartesian2(0, -45), // Push label above the pin
          },
          properties: {
            wardLayerLabel: true,
            city: city,
            normalizedWardId: normalized.wardId,
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

    // Toggle labels
    for (const labelEntity of layer.labelEntities) {
      labelEntity.show = visible;
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
   * Update the hazard pins for all wards from their computed risk profiles.
   */
  updateFromProfiles(profiles: Record<string, WardRiskProfile>): void {
    for (const city of ALL_CITIES) {
      const layer = this.cityLayers.get(city);
      if (!layer) continue;
      
      for (const labelEntity of layer.labelEntities) {
        if (!labelEntity.properties) continue;
        const wardId = labelEntity.properties.getValue(this.viewer.clock.currentTime)?.normalizedWardId;
        if (!wardId) continue;
        
        const profile = profiles[wardProfileKey(wardId)];
        if (!profile) continue;

        if (!labelEntity.ellipse) {
          this.hazardPins.setupAlert(labelEntity, profile, LABEL_THRESHOLDS[city]);
        } else {
          this.hazardPins.updateAlert(labelEntity, profile);
        }
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
   * Toggle fill mode (for future choropleth coloring).
   * When enabled, ward polygons show a subtle fill color.
   * When disabled, fill is near-transparent (outline only).
   */
  setFillMode(enabled: boolean): void {
    this.fillMode = enabled;

    for (const [city, layer] of this.cityLayers) {
      const colors = CITY_COLORS[city as CityKey];
      const entities = layer.dataSource.entities.values;

      for (const entity of entities) {
        if (entity.polygon) {
          if (enabled) {
            entity.polygon.material = new ColorMaterialProperty(
              new Color(colors.fillActive.r, colors.fillActive.g, colors.fillActive.b, colors.fillActive.a)
            );
          } else {
            entity.polygon.material = new ColorMaterialProperty(
              new Color(colors.fill.r, colors.fill.g, colors.fill.b, colors.fill.a)
            );
          }
        }
      }
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
    const time = this.viewer.clock.currentTime;
    const city = entity.properties?.normalizedCity?.getValue(time) as CityKey;

    if (city && CITY_COLORS[city]) {
      const hc = CITY_COLORS[city].highlight;
      entity.polygon.material = new ColorMaterialProperty(new Color(hc.r, hc.g, hc.b, hc.a));
      entity.polygon.outlineWidth = new ConstantProperty(3);
    }

    return originalMaterial;
  }

  /**
   * Restore a ward polygon's original material (after hover).
   */
  unhighlightWard(entity: Entity, originalMaterial: any): void {
    if (!entity.polygon || !originalMaterial) return;

    entity.polygon.material = originalMaterial;
    entity.polygon.outlineWidth = new ConstantProperty(2);
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

    // Apply selection highlight (brighter than hover)
    const city = info.city as CityKey;
    if (CITY_COLORS[city]) {
      const hc = CITY_COLORS[city].highlight;
      entity.polygon.material = new ColorMaterialProperty(new Color(hc.r, hc.g, hc.b, hc.a + 0.15));
      entity.polygon.outlineWidth = new ConstantProperty(4);
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
    // If all cities aren't loaded yet, load them
    if (this.cityLayers.size === 0) {
      await this.loadAllCities();
    }

    // Show the requested city, keep others as they are
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
    this.cityLayers.delete(city);
  }

  /**
   * Remove all ward layers from the viewer.
   */
  removeAll(): void {
    for (const city of ALL_CITIES) {
      this.removeCityLayer(city);
    }
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
