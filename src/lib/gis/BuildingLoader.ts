import * as Cesium from 'cesium';

// Pre-cached color palettes (avoids creating Color objects per-building)
const PALETTE_CACHE = new Map<string, Cesium.Color>();
function cachedColor(hex: string, alpha: number): Cesium.Color {
  const key = `${hex}_${alpha}`;
  if (!PALETTE_CACHE.has(key)) {
    PALETTE_CACHE.set(key, Cesium.Color.fromCssColorString(hex).withAlpha(alpha));
  }
  return PALETTE_CACHE.get(key)!;
}

// Realistic urban building color based on type + height
const BUILDING_PALETTES: Record<string, string[]> = {
  residential:  ['#C4B5A0', '#B8A994', '#D4C5B0', '#BFB09B', '#A89888'],
  apartments:   ['#C9B99A', '#D6C8A8', '#B5A68E', '#CABBA0', '#AFA08A'],
  commercial:   ['#A8B0B8', '#98A0A8', '#B8C0C8', '#8890A0', '#C0C8D0'],
  office:       ['#8898A8', '#7888A0', '#6880A0', '#B0BCC8', '#A0ACB8'],
  industrial:   ['#8A8A80', '#7A7A70', '#9A9A90', '#6A6A60', '#A0A098'],
  retail:       ['#C8B898', '#B8A888', '#D0C0A0', '#C0B090', '#A89878'],
  hotel:        ['#B0A090', '#C0B0A0', '#A09888', '#D0C0B0', '#908070'],
  hospital:     ['#E0D8D0', '#D0C8C0', '#F0E8E0', '#C8C0B8', '#E8E0D8'],
  school:       ['#C8B8A0', '#B8A890', '#D8C8B0', '#A89880', '#D0C0A8'],
  church:       ['#D8D0C0', '#C8C0B0', '#E0D8C8', '#B8B0A0', '#C0B8A8'],
};
const DEFAULT_PALETTE = ['#C0B8A8', '#B0A898', '#D0C8B8', '#A89888', '#BEB6A6'];

const GLASS_TINT = Cesium.Color.fromCssColorString('#7090B0');

function getBuildingColor(heightM: number, buildingType: string): Cesium.Color {
  const type = (buildingType || 'yes').toLowerCase();
  const palette = BUILDING_PALETTES[type] || DEFAULT_PALETTE;
  const idx = Math.abs(Math.round(heightM * 7.3)) % palette.length;
  let baseColor = cachedColor(palette[idx], 0.95);

  // Tall buildings get a glass curtain-wall tint
  if (heightM > 30) {
    const t = Math.min(0.4, (heightM - 30) / 80.0);
    baseColor = Cesium.Color.lerp(baseColor, GLASS_TINT, t, new Cesium.Color());
    baseColor.alpha = 0.95;
  }

  return baseColor;
}

// Minimum height to render — skip tiny sheds/garages to reduce geometry count by ~40%
const MIN_HEIGHT_M = 4.0;
// How many geometries per batch primitive (first batch appears on screen fast)
const BATCH_SIZE = 20000;

export async function loadBuildingsWithHeight(
  viewer: Cesium.Viewer, 
  geojsonUrl: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<Cesium.Primitive | null> {
  try {
    console.log(`Fetching buildings from ${geojsonUrl}...`);
    const response = await fetch(geojsonUrl);
    const data = await response.json();

    const totalFeatures = data.features.length;
    console.log(`Loaded ${totalFeatures} building footprints. Building geometries...`);

    if (onProgress) onProgress(0, totalFeatures);

    let instances: Cesium.GeometryInstance[] = [];
    let primitivesAdded = 0;
    let skipped = 0;
    const primitives: Cesium.Primitive[] = [];

    for (let i = 0; i < totalFeatures; i++) {
      const feature = data.features[i];
      if (!feature.geometry) continue;
      const gtype = feature.geometry.type;
      if (gtype !== 'MultiPolygon' && gtype !== 'Polygon') continue;

      const heightM = feature.properties.height_m || 8.0;
      
      // Skip very small buildings for performance
      if (heightM < MIN_HEIGHT_M) { skipped++; continue; }

      const coords = gtype === 'MultiPolygon' 
        ? feature.geometry.coordinates[0][0] 
        : feature.geometry.coordinates[0];

      if (!coords || coords.length < 3) continue;

      const osmId = feature.properties.osm_id || `b_${i}`;
      const buildingType = feature.properties.building || 'yes';

      const positions = coords.map(([lng, lat]: [number, number]) =>
        Cesium.Cartesian3.fromDegrees(lng, lat)
      );

      if (positions.length < 3) continue;

      const baseHeight = -3.0;

      const polygon = new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(positions),
        height: baseHeight,
        extrudedHeight: baseHeight + heightM,
        vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
      });

      instances.push(new Cesium.GeometryInstance({
        geometry: polygon,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(getBuildingColor(heightM, buildingType))
        },
        id: osmId
      }));

      // Flush batch to screen when we hit BATCH_SIZE
      if (instances.length >= BATCH_SIZE) {
        if (viewer.isDestroyed()) {
          console.warn("Viewer destroyed during building load, aborting");
          return null;
        }
        const p = new Cesium.Primitive({
          geometryInstances: instances,
          appearance: new Cesium.PerInstanceColorAppearance({ flat: false, translucent: false }),
          asynchronous: true
        });
        viewer.scene.primitives.add(p);
        primitives.push(p);
        primitivesAdded++;
        console.log(`Building batch ${primitivesAdded} added (${instances.length} geometries)`);
        instances = [];
        
        // Yield to let the browser render the batch
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Report progress every 10K features
      if (i % 10000 === 0 && onProgress) {
        onProgress(i, totalFeatures);
      }
    }

    // Flush remaining instances
    if (instances.length > 0) {
      if (viewer.isDestroyed()) {
        console.warn("Viewer destroyed before final buildings could be added.");
        return null;
      }
      const p = new Cesium.Primitive({
        geometryInstances: instances,
        appearance: new Cesium.PerInstanceColorAppearance({ flat: false, translucent: false }),
        asynchronous: true
      });
      viewer.scene.primitives.add(p);
      primitives.push(p);
    }

    if (onProgress) onProgress(totalFeatures, totalFeatures);
    console.log(`All buildings rendered! ${primitivesAdded + 1} batches, ${skipped} tiny buildings skipped.`);

    // Return the last primitive for compatibility
    return primitives[primitives.length - 1] || null;

  } catch (err) {
    console.error("Failed to load local buildings:", err);
    throw err;
  }
}
