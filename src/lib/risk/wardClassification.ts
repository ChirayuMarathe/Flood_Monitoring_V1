/**
 * wardClassification.ts
 * 
 * Manual classification of Mumbai's 24 wards for coastal/river proximity.
 * Based on:
 * - training_table_master.csv notes (e.g., "Mithi River", "Powai Lake overflowed",
 *   "coastal western seaboard")
 * - Known Mumbai geography
 * 
 * Ward GIDs match ward_zonal_stats.csv gid column.
 */

export interface WardClassification {
  gid: number;
  wardCode: string;
  isCoastal: boolean;
  nearRiver: boolean;
  riverName: string | null;
}

/**
 * Classification of all 24 Mumbai administrative wards.
 * 
 * Coastal wards: Those with direct Arabian Sea frontage where tidal backflow
 * can block stormwater discharge.
 * 
 * River-adjacent wards: Those near Mithi River, Dahisar River, Poisar River,
 * or Powai Lake (which overflows into Mithi).
 * 
 * Sources:
 * - 2005-07-26: "Powai Lake overflowed, discharging ~5.95M m³ into Mithi River" (ward S)
 * - 2005-07-26: "Built on reclaimed mangrove/swamp land along Mithi river" (ward H/E)
 * - 2017-08-29: "coastal western seaboard area heavily inundated" (ward G/S)
 * - 2017-08-29: "subway flooded, WEH gridlocked" (ward K/W, near Mithi)
 * - 2019-07-02: "Hindmata junction" (ward F/N, chronic Mithi-influenced flooding)
 */
export const WARD_CLASSIFICATIONS: WardClassification[] = [
  // --- Coastal wards (Arabian Sea frontage) ---
  { gid: 1,  wardCode: 'A',    isCoastal: true,  nearRiver: false, riverName: null },           // Colaba — southern tip peninsula
  { gid: 2,  wardCode: 'B',    isCoastal: true,  nearRiver: false, riverName: null },           // Churchgate — western waterfront
  { gid: 3,  wardCode: 'C',    isCoastal: true,  nearRiver: false, riverName: null },           // Marine Drive — direct sea exposure
  { gid: 4,  wardCode: 'D',    isCoastal: true,  nearRiver: false, riverName: null },           // Nariman Point — reclaimed land, sea on 3 sides
  { gid: 7,  wardCode: 'G/S',  isCoastal: true,  nearRiver: false, riverName: null },           // Worli — western seaboard, severity 3 in 2017
  { gid: 9,  wardCode: 'G/N',  isCoastal: true,  nearRiver: false, riverName: null },           // Dadar West — western coast

  // --- River-adjacent wards (Mithi River corridor) ---
  { gid: 14, wardCode: 'K/W',  isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Andheri — chronic Mithi flood spot, severity 3 in 2005 & 2017
  { gid: 18, wardCode: 'H/E',  isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Santacruz/BKC — reclaimed mangrove along Mithi, severity 3 in 2005
  { gid: 12, wardCode: 'S',    isCoastal: false, nearRiver: true,  riverName: 'Powai Lake' },  // Powai — lake overflows into Mithi
  { gid: 24, wardCode: 'L',    isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Kurla — along Mithi, severity 3 in 2005
  { gid: 8,  wardCode: 'F/N',  isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Sion/Matunga — Hindmata junction, chronic Mithi flooding
  { gid: 20, wardCode: 'M/E',  isCoastal: false, nearRiver: true,  riverName: 'Mithi River' }, // Chembur East — downstream Mithi

  // --- River-adjacent wards (Dahisar/Poisar) ---
  { gid: 11, wardCode: 'R/C',  isCoastal: false, nearRiver: true,  riverName: 'Dahisar River' }, // Borivali — Dahisar river corridor
  { gid: 16, wardCode: 'P/N',  isCoastal: false, nearRiver: true,  riverName: 'Poisar River' }, // Malad — Poisar river corridor

  // --- Inland wards (no special coastal/river classification) ---
  { gid: 5,  wardCode: 'E',    isCoastal: false, nearRiver: false, riverName: null },           // Byculla
  { gid: 6,  wardCode: 'F/S',  isCoastal: false, nearRiver: false, riverName: null },           // Parel
  { gid: 10, wardCode: 'N',    isCoastal: false, nearRiver: false, riverName: null },           // Ghatkopar
  { gid: 13, wardCode: 'T',    isCoastal: false, nearRiver: false, riverName: null },           // Mulund — highland
  { gid: 15, wardCode: 'R/N',  isCoastal: false, nearRiver: false, riverName: null },           // Dahisar (east side)
  { gid: 17, wardCode: 'M/W',  isCoastal: false, nearRiver: false, riverName: null },           // Chembur West
  { gid: 19, wardCode: 'K/E',  isCoastal: false, nearRiver: false, riverName: null },           // Andheri East (inland side)
  { gid: 21, wardCode: 'R/S',  isCoastal: false, nearRiver: false, riverName: null },           // Kandivali
  { gid: 22, wardCode: 'H/W',  isCoastal: false, nearRiver: false, riverName: null },           // Bandra West
  { gid: 23, wardCode: 'N/W',  isCoastal: false, nearRiver: false, riverName: null },           // Juhu — could be coastal but mainly residential inland
];

/**
 * Lookup a ward's classification by GID.
 */
const classificationMap = new Map(WARD_CLASSIFICATIONS.map(w => [w.gid, w]));

export function getWardClassification(gid: number): WardClassification | undefined {
  return classificationMap.get(gid);
}

/**
 * Lookup by ward code (e.g., "K/W", "H/E").
 */
const codeMap = new Map(WARD_CLASSIFICATIONS.map(w => [w.wardCode, w]));

export function getWardClassificationByCode(code: string): WardClassification | undefined {
  return codeMap.get(code);
}
