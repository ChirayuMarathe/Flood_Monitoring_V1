import * as Cesium from 'cesium';

/**
 * Streaming building layer, backed by the 3D Tiles sets under public/tiles/<city>/
 * (generated offline by scripts/extract_buildings.py + scripts/build_3dtiles.py).
 *
 * Replaces the old GeoJSON path, which parsed a few hundred MB of text on the
 * main thread and then held every footprint in memory forever. Here Cesium
 * streams only the tiles in view and evicts the rest.
 */

const TILESET_URLS: Record<string, string> = {
  mumbai: '/tiles/mumbai/tileset.json',
  pune: '/tiles/pune/tileset.json',
  navi_mumbai: '/tiles/navi_mumbai/tileset.json',
};

/** Google Photorealistic 3D Tiles, served through the project's Cesium ion token. */
const GOOGLE_PHOTOREAL_ION_ASSET = 2275207;

/**
 * The photogrammetry base layer: real Mumbai/Pune, not extruded footprints.
 * It's a single baked mesh, so nothing in it can be recolored per building —
 * that's what the analytical extrusion layer above is for.
 */
export async function loadPhotorealTileset(
  viewer: Cesium.Viewer
): Promise<Cesium.Cesium3DTileset | null> {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(GOOGLE_PHOTOREAL_ION_ASSET, {
    // Google's terms require their attribution to stay visible; Cesium handles
    // that automatically as long as the credit container isn't suppressed.
    maximumScreenSpaceError: 16,
    cacheBytes: 512 * 1024 * 1024,
  });

  if (viewer.isDestroyed()) return null;
  viewer.scene.primitives.add(tileset);
  return tileset;
}

/**
 * Shades the flat extrusions into something that reads as a building: floor
 * bands at storey height, plus a specular lift on towers so glass catches light.
 */
function buildingShader() {
  return new Cesium.CustomShader({
    lightingModel: Cesium.LightingModel.PBR,
    fragmentShaderText: `
      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        float h = fsInput.attributes.positionMC.y;   // glTF content is Y-up
        float storey = fract(h / 3.2);
        float band = smoothstep(0.30, 0.46, storey) * (1.0 - smoothstep(0.54, 0.70, storey));
        material.diffuse *= mix(0.74, 1.04, band);
        material.roughness = mix(0.92, 0.35, smoothstep(30.0, 90.0, h));
      }
    `,
  });
}

export interface BuildingTilesetOptions {
  /** Higher renders less geometry. 16 is Cesium's default; 24-32 if the GPU struggles. */
  maximumScreenSpaceError?: number;
  onProgress?: (pending: number, processing: number) => void;
}

export async function loadCityTileset(
  viewer: Cesium.Viewer,
  city: string,
  options: BuildingTilesetOptions = {}
): Promise<Cesium.Cesium3DTileset | null> {
  const url = TILESET_URLS[city];
  if (!url) return null;

  const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
    maximumScreenSpaceError: options.maximumScreenSpaceError ?? 16,
    cacheBytes: 384 * 1024 * 1024,
    maximumCacheOverflowBytes: 128 * 1024 * 1024,
    // The tileset uses ADD refinement (each level adds shorter buildings on top
    // of the skyline already drawn), so the REPLACE-only traversal options —
    // skipLevelOfDetail, dynamicScreenSpaceError — are deliberately left off.
  });

  if (viewer.isDestroyed()) return null;

  tileset.customShader = buildingShader();
  tileset.shadows = Cesium.ShadowMode.ENABLED;

  if (options.onProgress) {
    // Progress is only interesting for the first fill — after that tiles stream
    // in and out constantly and a bar flashing on every camera move is noise.
    const onProgress = options.onProgress;
    const remove = tileset.loadProgress.addEventListener(onProgress);
    tileset.initialTilesLoaded.addEventListener(() => {
      onProgress(0, 0);
      remove();
    });
  }

  viewer.scene.primitives.add(tileset);
  return tileset;
}
