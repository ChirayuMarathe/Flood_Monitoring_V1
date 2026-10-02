/**
 * gisUrlResolver.ts
 *
 * Central resolver for all GIS data URLs.
 * When NEXT_PUBLIC_SUPABASE_URL is set, files are fetched from a public
 * Supabase Storage bucket (CDN-cached, 0 MB local disk).
 * Otherwise falls back to local files under /public for offline dev.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const GIS_BUCKET = process.env.NEXT_PUBLIC_GIS_BUCKET || 'gis-data';

/**
 * Build the public URL for a file inside the Supabase Storage bucket.
 * Public buckets serve at: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function supabasePublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${GIS_BUCKET}/${path}`;
}

/** True when Supabase Storage is configured via environment variables. */
export const isRemoteEnabled = !!SUPABASE_URL;

// ---------------------------------------------------------------------------
// 3D Tiles
// ---------------------------------------------------------------------------

/** 3D Tiles tileset.json for a city's building extrusions. */
export function tilesetUrl(city: string): string {
  if (isRemoteEnabled) return supabasePublicUrl(`tiles/${city}/tileset.json`);
  return `/tiles/${city}/tileset.json`;
}

// ---------------------------------------------------------------------------
// Building footprint GeoJSON (for analytical extrusion mode)
// ---------------------------------------------------------------------------

/** Building footprints with height_m attribute. */
export function buildingGeojsonUrl(city: string): string {
  if (isRemoteEnabled) return supabasePublicUrl(`buildings/${city}_buildings_with_height.geojson`);
  return `/data/${city}_buildings_with_height.geojson`;
}

// ---------------------------------------------------------------------------
// Ward boundaries
// ---------------------------------------------------------------------------

/** Ward boundary GeoJSON (pre-normalized). */
export function wardGeojsonUrl(city: string): string {
  if (isRemoteEnabled) return supabasePublicUrl(`wards/${city}.geojson`);
  return `/data/wards/${city}.geojson`;
}

/** Ward GIS boundaries (used by the normalizing API route). */
export function wardGisUrl(city: string): string {
  if (isRemoteEnabled) return supabasePublicUrl(`wards/${city}_wards.geojson`);
  return `/data/gis/${city}_wards.geojson`;
}

// ---------------------------------------------------------------------------
// Climate / risk CSV data
// ---------------------------------------------------------------------------

/** Climate or risk CSV data file. */
export function climateDataUrl(filename: string): string {
  if (isRemoteEnabled) return supabasePublicUrl(`climate/${filename}`);
  return `/data/${filename}`;
}
