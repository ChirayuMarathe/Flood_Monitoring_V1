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
  mumbai: { lng: 72.8550, lat: 19.0185, altitude: 5500 },
  pune: { lng: 73.8567, lat: 18.4842, altitude: 4800 },
  navi_mumbai: { lng: 73.0150, lat: 19.0073, altitude: 5000 },
} as const;

export const MUMBAI_OBJECTID_TO_CODE: Record<string, string> = {
  '1': 'G/S',
  '2': 'F/N',
  '3': 'M/W',
  '4': 'H/W',
  '5': 'G/N',
  '6': 'M/E',
  '7': 'E',
  '8': 'H/E',
  '9': 'R/S',
  '10': 'T',
  '11': 'N',
  '12': 'P/S',
  '13': 'P/N',
  '14': 'B',
  '15': 'R/C',
  '16': 'K/E',
  '17': 'L',
  '18': 'S',
  '19': 'R/N',
  '20': 'K/W',
  '21': 'A',
  '22': 'C',
  '23': 'D',
  '24': 'F/S',
};

/**
 * Extracts normalized ward properties from an entity's raw properties.
 * Used by WardLayer when processing entities after GeoJsonDataSource loads.
 * 
 * The API route normalizer already injects ward_id, ward_name, ward_code, city
 * into the GeoJSON properties. This function reads those normalized fields.
 */
export function extractNormalizedProperties(rawProps: Record<string, any>, cityHint: string = 'mumbai'): NormalizedWardProperties {
  if (rawProps?.ward_id && rawProps.ward_id !== 'unknown') {
    let wId = String(rawProps.ward_id);
    let wCode = String(rawProps.ward_code || rawProps.ward_id);
    let wName = String(rawProps.ward_name || rawProps.ward_id);
    const city = String(rawProps.city || cityHint);

    const clean = wId.replace(/^(mumbai|pune|navi_mumbai)_/, '');
    if ((city === 'mumbai' || cityHint === 'mumbai') && MUMBAI_OBJECTID_TO_CODE[clean]) {
      wCode = MUMBAI_OBJECTID_TO_CODE[clean];
      wId = `mumbai_${wCode}`;
      if (!wName || wName === clean || !isNaN(Number(wName))) {
        wName = wCode;
      }
    }

    return {
      wardId: wId,
      wardName: wName,
      wardCode: wCode,
      city: city,
    };
  }

  return normalizeWardProperties(cityHint, rawProps);
}

/**
 * Normalizer for raw and pre-normalized properties across Mumbai, Pune, and Navi Mumbai.
 */
export function normalizeWardProperties(city: string, rawProperties: any): NormalizedWardProperties {
  if (rawProperties?.ward_id && rawProperties.ward_id !== 'unknown') {
    let wId = String(rawProperties.ward_id);
    let wCode = String(rawProperties.ward_code || rawProperties.ward_id);
    let wName = String(rawProperties.ward_name || rawProperties.ward_id);
    const cityStr = String(rawProperties.city || city);

    const clean = wId.replace(/^(mumbai|pune|navi_mumbai)_/, '');
    if (cityStr === 'mumbai' && MUMBAI_OBJECTID_TO_CODE[clean]) {
      wCode = MUMBAI_OBJECTID_TO_CODE[clean];
      wId = `mumbai_${wCode}`;
      if (!wName || wName === clean || !isNaN(Number(wName))) {
        wName = wCode;
      }
    }

    return {
      wardId: wId,
      wardName: wName,
      wardCode: wCode,
      city: cityStr,
    };
  }

  let wardId: string;
  let wardCode: string;
  let wardName: string;

  switch (city.toLowerCase()) {
    case 'mumbai': {
      let rawName = (rawProperties?.NAME2 || rawProperties?.Name || rawProperties?.ward || rawProperties?.WARD || rawProperties?.name || '').toString().trim();
      const objId = rawProperties?.OBJECTID !== undefined ? String(rawProperties.OBJECTID).trim() : '';

      if ((!rawName || !isNaN(Number(rawName))) && objId && MUMBAI_OBJECTID_TO_CODE[objId]) {
        rawName = MUMBAI_OBJECTID_TO_CODE[objId];
      } else if (!isNaN(Number(rawName)) && MUMBAI_OBJECTID_TO_CODE[rawName]) {
        rawName = MUMBAI_OBJECTID_TO_CODE[rawName];
      } else if (!rawName && objId) {
        rawName = MUMBAI_OBJECTID_TO_CODE[objId] || objId;
      } else if (!rawName) {
        rawName = 'Unknown';
      }

      wardCode = rawName;
      wardName = rawName;
      wardId = `mumbai_${rawName}`;
      break;
    }
    case 'pune': {
      const adminMatch = typeof rawProperties?.name === 'string' ? rawProperties.name.match(/Admin Ward\s+(\d+)\s*(.*)/i) : null;
      if (adminMatch) {
        const num = parseInt(adminMatch[1], 10);
        wardCode = `P${num.toString().padStart(2, '0')}`;
        wardName = adminMatch[2].trim() || `Admin Ward ${num}`;
        wardId = `pune_p${num}`;
      } else {
        const raw = (rawProperties?.name || rawProperties?.Name || 'Unknown').toString().trim();
        wardCode = raw;
        wardName = raw;
        wardId = `pune_${raw}`;
      }
      break;
    }
    case 'navi_mumbai': {
      const code = (rawProperties?.sourcewardcode || rawProperties?.OBJECTID || '0').toString();
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
