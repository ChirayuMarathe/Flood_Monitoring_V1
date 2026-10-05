import * as Cesium from 'cesium';
import { tilesetUrl, isRemoteEnabled } from './gisUrlResolver';

const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';

/**
 * Streaming 3D building layers:
 * 1. Cloud-streamed Cesium OSM Buildings (Ion Asset 96188) — 0 MB local disk footprint.
 * 2. Cloud-streamed Google Photorealistic 3D Tiles (Ion Asset 2275207).
 * 3. 3D Tiles from Supabase Storage (production) or local public/tiles/<city>/ (dev).
 */

/** Google Photorealistic 3D Tiles, served through the project's Cesium ion token. */
const GOOGLE_PHOTOREAL_ION_ASSET = 2275207;

export async function loadPhotorealTileset(
  viewer: Cesium.Viewer
): Promise<Cesium.Cesium3DTileset | null> {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(GOOGLE_PHOTOREAL_ION_ASSET, {
    maximumScreenSpaceError: 16,
    cacheBytes: 512 * 1024 * 1024,
  });

  if (viewer.isDestroyed()) return null;
  viewer.scene.primitives.add(tileset);
  return tileset;
}

/**
 * Shades extrusions into something that reads as a building: floor
 * bands at storey height, plus a specular lift on towers so glass catches light.
 */
export function buildingShader() {
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

/**
 * Loads cloud-streamed Cesium OSM 3D Buildings (Asset ID 96188).
 * Provides worldwide 3D buildings including Mumbai, Pune, and Navi Mumbai.
 * Requires 0 MB of local disk space.
 */
export async function loadOsmBuildingsTileset(
  viewer: Cesium.Viewer,
  options: BuildingTilesetOptions = {}
): Promise<Cesium.Cesium3DTileset | null> {
  const tileset = await Cesium.createOsmBuildingsAsync();

  if (viewer.isDestroyed()) return null;

  tileset.maximumScreenSpaceError = options.maximumScreenSpaceError ?? 16;

  tileset.customShader = buildingShader();
  tileset.shadows = Cesium.ShadowMode.ENABLED;

  if (options.onProgress) {
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

/**
 * Loads city building tileset from Supabase Storage (production) or
 * local public/tiles/<city>/tileset.json (dev).
 * Returns null if not found, so caller can fall back to cloud OSM buildings.
 */
export async function loadCityTileset(
  viewer: Cesium.Viewer,
  city: string,
  options: BuildingTilesetOptions = {}
): Promise<Cesium.Cesium3DTileset | null> {
  const url = tilesetUrl(city);

  try {
    // For local files, probe first to avoid 404 noise.
    // For remote (Supabase), skip the probe — just attempt the load.
    if (!isRemoteEnabled) {
      const probe = await fetch(url, { method: 'HEAD' });
      if (!probe.ok) {
        console.log(`[BuildingTileset] HEAD probe for ${url} returned ${probe.status} — skipping local tiles`);
        return null;
      }
    }

    const source = isRemoteEnabled ? 'Supabase Storage' : 'local';
    console.log(`[BuildingTileset] Loading tileset from ${source}: ${url}`);

    const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
      maximumScreenSpaceError: options.maximumScreenSpaceError ?? 24,
      cacheBytes: 256 * 1024 * 1024,
      maximumCacheOverflowBytes: 64 * 1024 * 1024,
    });

    if (viewer.isDestroyed()) return null;

    tileset.customShader = buildingShader();
    tileset.shadows = Cesium.ShadowMode.DISABLED;

    if (options.onProgress) {
      const onProgress = options.onProgress;
      const remove = tileset.loadProgress.addEventListener(onProgress);
      tileset.initialTilesLoaded.addEventListener(() => {
        onProgress(0, 0);
        remove();
      });
    }

    viewer.scene.primitives.add(tileset);
    return tileset;
  } catch {
    return null;
  }
}
