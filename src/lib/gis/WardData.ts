/**
 * WardData.ts
 * 
 * Normalized ward data types and property extraction for the multi-city ward layer.
 * Handles the differing property schemas across Mumbai, Pune, and Navi Mumbai.
 */

export interface NormalizedWardProperties {
  wardId: string;
  wardName: string;
  wardCode: string;
  city: string;
}

/**
 * City-specific color configuration for boundary rendering.
 * Each city gets a distinct color so they don't visually blend at borders.
 */
export const CITY_COLORS = {
  mumbai: {
    outline: { r: 0.23, g: 0.51, b: 0.96, a: 0.85 },  // #3B82F6 Blue
    fill: { r: 0.23, g: 0.51, b: 0.96, a: 0.01 },       // Near-transparent for terrain draping
    fillActive: { r: 0.23, g: 0.51, b: 0.96, a: 0.15 },  // Glowing ground, lets buildings punch through
    highlight: { r: 0.4, g: 0.65, b: 1.0, a: 0.4 },      // Hover highlight
    label: '#3B82F6',
  },
  pune: {
    outline: { r: 0.96, g: 0.62, b: 0.04, a: 0.85 },  // #F59E0B Amber
    fill: { r: 0.96, g: 0.62, b: 0.04, a: 0.01 },
    fillActive: { r: 0.96, g: 0.62, b: 0.04, a: 0.15 },
    highlight: { r: 1.0, g: 0.75, b: 0.2, a: 0.4 },
    label: '#F59E0B',
  },
  navi_mumbai: {
    outline: { r: 0.06, g: 0.73, b: 0.51, a: 0.85 },  // #10B981 Green
    fill: { r: 0.06, g: 0.73, b: 0.51, a: 0.01 },
    fillActive: { r: 0.06, g: 0.73, b: 0.51, a: 0.15 },
    highlight: { r: 0.2, g: 0.85, b: 0.6, a: 0.4 },
    label: '#10B981',
  },
} as const;

/**
 * City center coordinates for camera fly-to.
 */
export const CITY_CENTERS = {
  mumbai: { lng: 72.8777, lat: 19.076, altitude: 3000 },
  pune: { lng: 73.8567, lat: 18.5204, altitude: 3000 },
  navi_mumbai: { lng: 73.0297, lat: 19.0330, altitude: 3000 },
} as const;

/**
 * Extracts normalized ward properties from an entity's raw properties.
 * Used by WardLayer when processing entities after GeoJsonDataSource loads.
 * 
 * The API route normalizer already injects ward_id, ward_name, ward_code, city
 * into the GeoJSON properties. This function reads those normalized fields.
 */
export function extractNormalizedProperties(rawProps: Record<string, any>): NormalizedWardProperties {
  return {
    wardId: rawProps.ward_id || 'unknown',
    wardName: rawProps.ward_name || 'Unknown Ward',
    wardCode: rawProps.ward_code || '?',
    city: rawProps.city || 'unknown',
  };
}

/**
 * Legacy normalizer for backward compatibility with the old WardLayer code.
 * The new system uses the API route to pre-normalize, so this is rarely needed.
 */
export function normalizeWardProperties(city: string, rawProperties: any): NormalizedWardProperties {
  // If already normalized (from API route), just extract
  if (rawProperties?.ward_id) {
    return extractNormalizedProperties(rawProperties);
  }

  // Fallback: manual normalization (matches wardNormalizer.ts logic)
  let wardId: string;
  let wardCode: string;
  let wardName: string;

  switch (city.toLowerCase()) {
    case 'mumbai': {
      const rawName = (rawProperties?.NAME2 || rawProperties?.name || 'Unknown').toString().trim();
      wardCode = rawName;
      wardName = rawName;
      wardId = `mumbai_${rawProperties?.OBJECTID || wardCode}`;
      break;
    }
    case 'pune': {
      const num = rawProperties?.wardnum || 0;
      wardCode = num.toString().padStart(2, '0');
      wardName = (rawProperties?.Name2 || rawProperties?.Name1 || `Ward ${wardCode}`).toString().trim();
      wardId = `pune_${num}`;
      break;
    }
    case 'navi_mumbai': {
      const code = (rawProperties?.sourcewardcode || '0').toString();
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

  return { wardId, wardName, wardCode, city };
}
