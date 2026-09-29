import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeWardGeoJSON, type NormalizationResult } from '@/lib/gis/wardNormalizer';

// In-memory cache — these files are static, no need to reprocess on every request
const cache = new Map<string, NormalizationResult>();

const VALID_CITIES = ['mumbai', 'pune', 'navi_mumbai'] as const;

const FILE_MAP: Record<string, string> = {
  mumbai: 'mumbai.geojson',
  pune: 'pune.geojson',
  navi_mumbai: 'navi_mumbai.geojson',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ city: string }> }
) {
  const { city } = await params;

  if (!VALID_CITIES.includes(city as any)) {
    return NextResponse.json(
      { error: `Invalid city "${city}". Valid cities: ${VALID_CITIES.join(', ')}` },
      { status: 400 }
    );
  }

  // Check cache
  if (cache.has(city)) {
    const cached = cache.get(city)!;
    return NextResponse.json(cached.geojson, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Ward-Count': String(cached.stats.featureCount),
        'X-Coords-Fixed': String(cached.stats.coordsFixed),
        'X-Simplified': String(cached.stats.simplificationApplied),
      },
    });
  }

  try {
    // Read raw GeoJSON from public/data/wards/
    const filePath = join(process.cwd(), 'public', 'data', 'wards', FILE_MAP[city]);
    const rawData = readFileSync(filePath, 'utf-8');
    const rawGeoJSON = JSON.parse(rawData) as GeoJSON.FeatureCollection;

    // Check for simplify=false query param
    const url = new URL(request.url);
    const shouldSimplify = url.searchParams.get('simplify') !== 'false';

    // Normalize
    const result = normalizeWardGeoJSON(rawGeoJSON, city, {
      simplify: shouldSimplify,
    });

    // Log warnings
    if (result.warnings.length > 0) {
      console.warn(`[API /wards/${city}] Warnings:`, result.warnings);
    }

    console.log(`[API /wards/${city}] Stats:`, result.stats);

    // Cache the result
    cache.set(city, result);

    return NextResponse.json(result.geojson, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Ward-Count': String(result.stats.featureCount),
        'X-Coords-Fixed': String(result.stats.coordsFixed),
        'X-Simplified': String(result.stats.simplificationApplied),
        'X-Invalid-Geometries': String(result.stats.invalidGeometries),
      },
    });
  } catch (error: any) {
    console.error(`[API /wards/${city}] Error:`, error);
    return NextResponse.json(
      { error: `Failed to load ward data for ${city}: ${error.message}` },
      { status: 500 }
    );
  }
}
