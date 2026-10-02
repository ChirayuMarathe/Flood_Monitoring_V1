/**
 * wardClassification.ts
 * 
 * Geographic and hydrological classification of wards across:
 * - Mumbai (24 wards: coastal Arabian Sea + Mithi/Dahisar/Poisar river network)
 * - Pune (15 zones: inland Deccan plateau + Mula-Mutha river basin)
 * - Navi Mumbai (14 zones: coastal Thane Creek / Panvel Creek wetlands & estuaries)
 */

export interface WardClassification {
  gid?: number;
  wardId?: string;
  wardCode: string;
  isCoastal: boolean;
  nearRiver: boolean;
  riverName: string | null;
}

// ==================================================================
// 1. Mumbai Wards (24 Administrative Wards)
// ==================================================================
export const MUMBAI_CLASSIFICATIONS: WardClassification[] = [
  // --- Coastal wards (Arabian Sea frontage) ---
  { gid: 1,  wardCode: 'A',    isCoastal: true,  nearRiver: false, riverName: null },           // Colaba
  { gid: 2,  wardCode: 'B',    isCoastal: true,  nearRiver: false, riverName: null },           // Churchgate
  { gid: 3,  wardCode: 'C',    isCoastal: true,  nearRiver: false, riverName: null },           // Marine Drive
  { gid: 4,  wardCode: 'D',    isCoastal: true,  nearRiver: false, riverName: null },           // Nariman Point
  { gid: 7,  wardCode: 'G/S',  isCoastal: true,  nearRiver: false, riverName: null },           // Worli
  { gid: 9,  wardCode: 'G/N',  isCoastal: true,  nearRiver: false, riverName: null },           // Dadar West

  // --- River-adjacent wards (Mithi River corridor) ---
  { gid: 14, wardCode: 'K/W',  isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Andheri
  { gid: 18, wardCode: 'H/E',  isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Santacruz/BKC
  { gid: 12, wardCode: 'S',    isCoastal: false, nearRiver: true,  riverName: 'Powai Lake' },  // Powai
  { gid: 24, wardCode: 'L',    isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Kurla
  { gid: 8,  wardCode: 'F/N',  isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Sion/Matunga
  { gid: 20, wardCode: 'M/E',  isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Chembur East

  // --- River-adjacent wards (Dahisar/Poisar) ---
  { gid: 11, wardCode: 'R/C',  isCoastal: false, nearRiver: true,  riverName: 'Dahisar River' }, // Borivali
  { gid: 16, wardCode: 'P/N',  isCoastal: false, nearRiver: true,  riverName: 'Poisar River' }, // Malad

  // --- Inland wards ---
  { gid: 5,  wardCode: 'E',    isCoastal: false, nearRiver: false, riverName: null },           // Byculla
  { gid: 6,  wardCode: 'F/S',  isCoastal: false, nearRiver: false, riverName: null },           // Parel
  { gid: 10, wardCode: 'N',    isCoastal: false, nearRiver: false, riverName: null },           // Ghatkopar
  { gid: 13, wardCode: 'T',    isCoastal: false, nearRiver: false, riverName: null },           // Mulund
  { gid: 15, wardCode: 'R/N',  isCoastal: false, nearRiver: false, riverName: null },           // Dahisar East
  { gid: 17, wardCode: 'M/W',  isCoastal: false, nearRiver: false, riverName: null },           // Chembur West
  { gid: 19, wardCode: 'K/E',  isCoastal: false, nearRiver: false, riverName: null },           // Andheri East
  { gid: 21, wardCode: 'R/S',  isCoastal: false, nearRiver: false, riverName: null },           // Kandivali
  { gid: 22, wardCode: 'H/W',  isCoastal: false, nearRiver: false, riverName: null },           // Bandra West
  { gid: 23, wardCode: 'N/W',  isCoastal: false, nearRiver: false, riverName: null },           // Juhu
];

// ==================================================================
// 2. Pune Wards (15 Administrative Zones)
// All Pune zones are inland (zero coastal Arabian sea tides).
// Key hydrological hazard is Mula, Mutha, and Mula-Mutha river corridors.
// ==================================================================
export const PUNE_CLASSIFICATIONS: WardClassification[] = [
  { wardId: 'p1',  wardCode: 'SN', isCoastal: false, nearRiver: true,  riverName: 'Mula-Mutha Confluence' }, // Shivajinagar
  { wardId: 'p2',  wardCode: 'KT', isCoastal: false, nearRiver: false, riverName: null },                   // Kothrud (highland)
  { wardId: 'p3',  wardCode: 'HD', isCoastal: false, nearRiver: true,  riverName: 'Mula-Mutha Basin' },      // Hadapsar (critical basin)
  { wardId: 'p4',  wardCode: 'HJ', isCoastal: false, nearRiver: false, riverName: null },                   // Hinjewadi (ridge plateau)
  { wardId: 'p5',  wardCode: 'BN', isCoastal: false, nearRiver: true,  riverName: 'Ram Nadi Corridor' },     // Baner
  { wardId: 'p6',  wardCode: 'KJ', isCoastal: false, nearRiver: true,  riverName: 'Katraj Lake Basin' },     // Katraj (lake catchment)
  { wardId: 'p7',  wardCode: 'SR', isCoastal: false, nearRiver: true,  riverName: 'Mutha River Channel' },   // Sinhagad Road (dam discharge)
  { wardId: 'p8',  wardCode: 'DG', isCoastal: false, nearRiver: true,  riverName: 'Mutha River Bank' },      // Deccan Gymkhana (low bridge zone)
  { wardId: 'p9',  wardCode: 'KP', isCoastal: false, nearRiver: true,  riverName: 'Mula-Mutha River' },      // Koregaon Park
  { wardId: 'p10', wardCode: 'VN', isCoastal: false, nearRiver: false, riverName: null },                   // Viman Nagar
  { wardId: 'p11', wardCode: 'PC', isCoastal: false, nearRiver: true,  riverName: 'Pavana River' },          // Pimpri-Chinchwad
  { wardId: 'p12', wardCode: 'WK', isCoastal: false, nearRiver: false, riverName: null },                   // Wakad (highland)
  { wardId: 'p13', wardCode: 'MW', isCoastal: false, nearRiver: true,  riverName: 'Mula-Mutha River' },      // Mundhwa (chronic flood zone)
  { wardId: 'p14', wardCode: 'WJ', isCoastal: false, nearRiver: true,  riverName: 'Mutha River Corridor' },  // Warje
  { wardId: 'p15', wardCode: 'YW', isCoastal: false, nearRiver: true,  riverName: 'Mula-Mutha River' },      // Yerawada (flood embankment)
];

// ==================================================================
// 3. Navi Mumbai Wards (14 Administrative Nodes)
// Prominent estuarine coastal creek influences: Thane Creek, Panvel Creek,
// NRI coastal wetlands, and reclaimed mangrove tidal basins.
// ==================================================================
export const NAVI_MUMBAI_CLASSIFICATIONS: WardClassification[] = [
  { wardId: 'nm1',  wardCode: 'VSH', isCoastal: true,  nearRiver: false, riverName: 'Thane Creek Estuary' }, // Vashi
  { wardId: 'nm2',  wardCode: 'NRL', isCoastal: true,  nearRiver: false, riverName: 'Thane Creek Mudflats' }, // Nerul
  { wardId: 'nm3',  wardCode: 'BLP', isCoastal: true,  nearRiver: true,  riverName: 'Belapur Creek' },        // CBD Belapur
  { wardId: 'nm4',  wardCode: 'ARL', isCoastal: true,  nearRiver: false, riverName: 'Thane Creek Estuary' }, // Airoli
  { wardId: 'nm5',  wardCode: 'KPK', isCoastal: true,  nearRiver: false, riverName: 'Thane Creek Outfall' }, // Kopar Khairane
  { wardId: 'nm6',  wardCode: 'GNS', isCoastal: false, nearRiver: false, riverName: null },                   // Ghansoli
  { wardId: 'nm7',  wardCode: 'SPD', isCoastal: false, nearRiver: false, riverName: null },                   // Sanpada
  { wardId: 'nm8',  wardCode: 'TRB', isCoastal: false, nearRiver: false, riverName: null },                   // Turbhe (foothill)
  { wardId: 'nm9',  wardCode: 'SWD', isCoastal: true,  nearRiver: false, riverName: 'NRI Coastal Wetlands' }, // Seawoods - Darave
  { wardId: 'nm10', wardCode: 'KHG', isCoastal: false, nearRiver: false, riverName: null },                   // Kharghar (foothill)
  { wardId: 'nm11', wardCode: 'ULW', isCoastal: true,  nearRiver: true,  riverName: 'Panvel Creek Basin' },   // Ulwe (critical coastal lowland)
  { wardId: 'nm12', wardCode: 'DGH', isCoastal: false, nearRiver: false, riverName: null },                   // Digha
  { wardId: 'nm13', wardCode: 'KMT', isCoastal: false, nearRiver: true,  riverName: 'Gadhi River Canal' },    // Kamothe
  { wardId: 'nm14', wardCode: 'PNV', isCoastal: true,  nearRiver: true,  riverName: 'Kalundre River Estuary' },// Panvel
];

// Fallback legacy export
export const WARD_CLASSIFICATIONS = MUMBAI_CLASSIFICATIONS;

const mumbaiGidMap = new Map(MUMBAI_CLASSIFICATIONS.map(w => [w.gid, w]));
const mumbaiCodeMap = new Map(MUMBAI_CLASSIFICATIONS.map(w => [w.wardCode, w]));

const puneIdMap = new Map(PUNE_CLASSIFICATIONS.map(w => [w.wardId, w]));
const puneCodeMap = new Map(PUNE_CLASSIFICATIONS.map(w => [w.wardCode, w]));

const naviMumbaiIdMap = new Map(NAVI_MUMBAI_CLASSIFICATIONS.map(w => [w.wardId, w]));
const naviMumbaiCodeMap = new Map(NAVI_MUMBAI_CLASSIFICATIONS.map(w => [w.wardCode, w]));

/**
 * City-aware classification lookup
 */
export function getWardClassificationForCity(
  identifier: number | string,
  city: 'mumbai' | 'pune' | 'navi_mumbai' = 'mumbai'
): WardClassification | undefined {
  const idStr = String(identifier).toLowerCase();

  if (city === 'pune') {
    return puneIdMap.get(idStr) || puneCodeMap.get(String(identifier).toUpperCase());
  }

  if (city === 'navi_mumbai') {
    return naviMumbaiIdMap.get(idStr) || naviMumbaiCodeMap.get(String(identifier).toUpperCase());
  }

  // Mumbai: by GID or Ward Code
  if (typeof identifier === 'number') {
    return mumbaiGidMap.get(identifier);
  }
  const numeric = parseInt(idStr.replace(/\D/g, ''), 10);
  if (!isNaN(numeric) && mumbaiGidMap.has(numeric)) {
    return mumbaiGidMap.get(numeric);
  }
  return mumbaiCodeMap.get(String(identifier).toUpperCase());
}

/**
 * Legacy lookup for backward compatibility
 */
export function getWardClassification(gid: number): WardClassification | undefined {
  return mumbaiGidMap.get(gid);
}

export function getWardClassificationByCode(code: string): WardClassification | undefined {
  return mumbaiCodeMap.get(code);
}
