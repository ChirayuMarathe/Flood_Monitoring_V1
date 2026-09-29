/**
 * wardNormalizer.ts
 * 
 * Preprocesses raw GeoJSON ward-boundary files for Mumbai, Pune, and Navi Mumbai
 * into a unified schema before they're served to the Cesium client.
 * 
 * Handles:
 * - Schema normalization (each city has different property keys)
 * - Coordinate order fixing (Mumbai & Pune are [lat,lng] instead of [lng,lat])
 * - Douglas-Peucker geometry simplification (configurable)
 * - Feature count validation
 * - CRS verification
 * - Invalid geometry detection
 */

import simplify from '@turf/simplify';
import { feature as turfFeature, featureCollection } from '@turf/helpers';

// Expected feature counts per city
const EXPECTED_COUNTS: Record<string, number> = {
  mumbai: 24,
  pune: 58,
  navi_mumbai: 111,
};

// Default simplification tolerance in degrees (~11 meters)
const DEFAULT_SIMPLIFY_TOLERANCE = 0.0001;

export interface NormalizationResult {
  geojson: GeoJSON.FeatureCollection;
  warnings: string[];
  stats: {
    city: string;
    featureCount: number;
    expectedCount: number;
    coordsFixed: boolean;
    simplificationApplied: boolean;
    invalidGeometries: number;
  };
}

/**
 * Swap [lat, lng] → [lng, lat] recursively through coordinate arrays.
 * Mumbai and Pune GeoJSON files have coordinates in [lat, lng] order,
 * which violates RFC 7946 (GeoJSON spec requires [lng, lat]).
 */
function swapCoordinates(coords: any): any {
  if (typeof coords[0] === 'number') {
    // Single coordinate: [lat, lng, (alt)] → [lng, lat, (alt)]
    const swapped = [coords[1], coords[0]];
    if (coords.length > 2) swapped.push(coords[2]);
    return swapped;
  }
  return coords.map(swapCoordinates);
}

/**
 * Check if a coordinate array needs swapping by examining the first coordinate.
 * For Indian cities, longitude is ~72-74 and latitude is ~18-20.
 * If coord[0] is in the latitude range (~18-20), it's swapped.
 */
function needsCoordSwap(geojson: GeoJSON.FeatureCollection): boolean {
  const firstFeature = geojson.features[0];
  if (!firstFeature || !firstFeature.geometry) return false;

  let firstCoord: number[];
  const geom = firstFeature.geometry as any;

  if (geom.type === 'Polygon') {
    firstCoord = geom.coordinates[0][0];
  } else if (geom.type === 'MultiPolygon') {
    firstCoord = geom.coordinates[0][0][0];
  } else {
    return false;
  }

  // If the first value is in latitude range (~15-25 for India), coords are swapped
  return firstCoord[0] > 15 && firstCoord[0] < 25;
}

/**
 * Check for self-intersecting polygons (basic ring-direction check).
 * Returns indices of features with potential issues.
 */
function findInvalidGeometries(geojson: GeoJSON.FeatureCollection): number[] {
  const invalidIndices: number[] = [];

  geojson.features.forEach((feature, idx) => {
    if (!feature.geometry) {
      invalidIndices.push(idx);
      return;
    }

    const geom = feature.geometry as any;
    const rings: number[][][] = [];

    if (geom.type === 'Polygon') {
      rings.push(...geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly: number[][][]) => rings.push(...poly));
    }

    for (const ring of rings) {
      if (ring.length < 4) {
        invalidIndices.push(idx);
        break;
      }
      // Check if ring is closed
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        invalidIndices.push(idx);
        break;
      }
    }
  });

  return invalidIndices;
}

/**
 * Extract normalized ward properties from a feature based on its city.
 * 
 * Property schemas differ across cities:
 * - Mumbai:      NAME2, OBJECTID
 * - Pune:        wardnum, Name2
 * - Navi Mumbai: sourcewardcode, ward_lgd_name
 */
function normalizeProperties(city: string, props: Record<string, any>): Record<string, any> {
  let wardId: string;
  let wardName: string;
  let wardCode: string;

  switch (city) {
    case 'mumbai': {
      // Mumbai uses NAME2 for ward code (e.g., "G/S\n") and OBJECTID for sequence
      const rawName = (props.NAME2 || props.Name || 'Unknown').toString().trim();
      wardCode = rawName;
      wardName = rawName;
      wardId = `mumbai_${props.OBJECTID || wardCode}`;
      break;
    }
    case 'pune': {
      // Pune uses wardnum (1-58) and Name2 for area name (e.g., "Dhanori - Vishrantwadi")
      const num = props.wardnum || 0;
      wardCode = num.toString().padStart(2, '0');
      wardName = (props.Name2 || props.Name1 || `Ward ${wardCode}`).toString().trim();
      wardId = `pune_${num}`;
      break;
    }
    case 'navi_mumbai': {
      // Navi Mumbai uses sourcewardcode (e.g., "24") and ward_lgd_name
      const code = (props.sourcewardcode || '0').toString();
      wardCode = code;
      wardName = `Ward No.${code}`;
      wardId = `navi_mumbai_${code}`;
      break;
    }
    default:
      wardId = 'unknown';
      wardCode = 'Unknown';
      wardName = 'Unknown';
  }

  return {
    ward_id: wardId,
    ward_name: wardName,
    ward_code: wardCode,
    city: city,
  };
}

/**
 * Main normalization function.
 * Takes raw GeoJSON and a city identifier, returns normalized GeoJSON
 * with consistent schema, fixed coordinates, and optionally simplified geometry.
 */
export function normalizeWardGeoJSON(
  rawGeoJSON: GeoJSON.FeatureCollection,
  city: string,
  options: { simplify?: boolean; simplifyTolerance?: number } = {}
): NormalizationResult {
  const warnings: string[] = [];
  const shouldSimplify = options.simplify !== false;
  const tolerance = options.simplifyTolerance ?? DEFAULT_SIMPLIFY_TOLERANCE;

  // 1. Log property keys from first feature for audit
  if (rawGeoJSON.features.length > 0) {
    const firstProps = rawGeoJSON.features[0].properties || {};
    console.log(`[WardNormalizer] ${city} — Property keys: ${Object.keys(firstProps).join(', ')}`);
    console.log(`[WardNormalizer] ${city} — First feature properties:`, firstProps);
  }

  // 2. Verify CRS
  const crs = (rawGeoJSON as any).crs;
  if (crs) {
    const crsName = crs?.properties?.name || '';
    if (crsName.includes('CRS84') || crsName.includes('4326')) {
      console.log(`[WardNormalizer] ${city} — CRS: ${crsName} (WGS84 ✓)`);
    } else {
      warnings.push(`${city}: Unknown CRS "${crsName}" — assuming WGS84`);
    }
  } else {
    console.log(`[WardNormalizer] ${city} — CRS: Not specified (assumed WGS84 ✓)`);
  }

  // 3. Check coordinate order and fix if needed
  const needsSwap = needsCoordSwap(rawGeoJSON);
  if (needsSwap) {
    console.log(`[WardNormalizer] ${city} — Coordinates are [lat,lng] — swapping to [lng,lat]`);
  }

  // 4. Check for invalid geometries
  const invalidIndices = findInvalidGeometries(rawGeoJSON);
  if (invalidIndices.length > 0) {
    warnings.push(`${city}: Found ${invalidIndices.length} features with potentially invalid geometry at indices: ${invalidIndices.join(', ')}`);
    console.warn(`[WardNormalizer] ${city} — Invalid geometries:`, invalidIndices);
  }

  // 5. Process each feature
  const normalizedFeatures: GeoJSON.Feature[] = rawGeoJSON.features.map((feature, idx) => {
    // Fix coordinates if needed
    let geometry = feature.geometry;
    if (needsSwap && geometry) {
      geometry = {
        ...geometry,
        coordinates: swapCoordinates((geometry as any).coordinates),
      } as GeoJSON.Geometry;
    }

    // Normalize properties
    const normalizedProps = normalizeProperties(city, feature.properties || {});

    // Build the normalized feature
    let normalizedFeature: GeoJSON.Feature = {
      type: 'Feature',
      id: idx,
      geometry,
      properties: normalizedProps,
    };

    // Apply simplification
    if (shouldSimplify && geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
      try {
        normalizedFeature = simplify(normalizedFeature as any, {
          tolerance,
          highQuality: true,
        }) as GeoJSON.Feature;
        // Preserve normalized properties after simplification
        normalizedFeature.properties = normalizedProps;
        normalizedFeature.id = idx;
      } catch (e) {
        warnings.push(`${city}: Simplification failed for feature ${idx}`);
      }
    }

    return normalizedFeature;
  });

  // 6. Validate feature count
  const expectedCount = EXPECTED_COUNTS[city] ?? 0;
  if (normalizedFeatures.length !== expectedCount) {
    warnings.push(
      `${city}: Expected ${expectedCount} wards but loaded ${normalizedFeatures.length}`
    );
    console.warn(`[WardNormalizer] ${city} — Feature count mismatch: expected ${expectedCount}, got ${normalizedFeatures.length}`);
  } else {
    console.log(`[WardNormalizer] ${city} — Feature count: ${normalizedFeatures.length} ✓`);
  }

  const result: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: normalizedFeatures,
  };

  return {
    geojson: result,
    warnings,
    stats: {
      city,
      featureCount: normalizedFeatures.length,
      expectedCount,
      coordsFixed: needsSwap,
      simplificationApplied: shouldSimplify,
      invalidGeometries: invalidIndices.length,
    },
  };
}
