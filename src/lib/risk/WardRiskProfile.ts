/**
 * WardRiskProfile.ts
 * 
 * Structured risk profile per ward — replaces the single severity: 0-3 field
 * with a data-rich, hazard-specific assessment. Every field is computed from
 * real data (ward_zonal_stats.csv, training_table_master.csv, climate CSVs),
 * never from an LLM.
 */

/**
 * Bridges the two ward id schemes in the app: the map normalizes ids to
 * `<city>_<id>` ("mumbai_1", see WardData.normalizeWardProperties) while the
 * risk profiles are keyed by the bare id from mumbai-data/pune-data ("1").
 * Any lookup that starts from a picked entity has to go through this.
 */
export function wardProfileKey(mapWardId: string): string {
  const match = /^(?:mumbai|pune|navi_mumbai)_(.+)$/.exec(mapWardId);
  return match ? match[1] : mapWardId;
}

export type HazardType =
  | "rainfall_overflow"      // rainfall + soil saturation exceeding absorption
  | "topographic_pooling"    // natural low-lying basin, high TWI
  | "tidal_backflow"         // coastal ward + high tide coincidence
  | "river_overflow"         // near a known river/creek (Mithi, Dahisar, Poisar)
  | "compound";              // multiple hazards active simultaneously

export interface HazardFactor {
  type: HazardType;
  contributionScore: number;   // 0-1, how much this hazard contributes to overall risk
  explanation: string;         // human-readable reason, built from real numbers
}

export interface WardRiskProfile {
  wardId: string;
  wardName: string;
  city: "mumbai" | "pune" | "navi_mumbai";

  overallSeverity: 0 | 1 | 2 | 3;
  primaryHazard: HazardType;
  activeHazards: HazardFactor[];   // all hazards currently contributing, sorted by contributionScore desc

  // Raw values driving the assessment — always show these, never hide behind a label
  rainfall3DaySum: number;         // mm
  soilMoisture: number;            // m3/m3
  elevationMean: number;           // m
  twiMean: number;                 // topographic wetness index
  flowAccumulationMean: number;

  // Trend + urgency
  rainfallTrend: "rising" | "falling" | "steady";
  estimatedTimeToThresholdHours: number | null; // null if not currently trending toward risk

  // Historical grounding — this is what makes it "in-depth" instead of generic
  similarHistoricalEvent: {
    date: string;                  // e.g. "2017-08-29"
    outcome: string;               // e.g. "Moderate flooding recorded in this ward"
    similarityNote: string;        // e.g. "Rainfall and soil saturation are within 10% of that event"
  } | null;
}

/**
 * A snapshot of city-wide climate conditions at a given date.
 * Sourced from mumbai_climate_daily_avg_1990_2024_enriched.csv.
 */
export interface ClimateSnapshot {
  date: string;
  rainfallMm: number;
  soilMoisture: number;          // m3/m3
  landSurfaceTemp: number;       // °C
  rain2DaySum: number;
  rain3DaySum: number;
  rainPrevDay: number;
  rainNextDay: number;
  // Tidal/river data not yet available in CSV — use null
  tideLevel: number | null;
  riverLevel: number | null;
}

/**
 * Static zonal statistics per ward from ward_zonal_stats.csv.
 */
export interface WardZonalStats {
  gid: number;
  name: string;
  elevationMean: number;
  elevationMin: number;
  elevationMax: number;
  flowAccumulationMean: number;
  flowAccumulationMin: number;
  flowAccumulationMax: number;
  twiMean: number;
  twiMin: number;
  twiMax: number;
}

/**
 * A row from training_table_master.csv — historical flood event data.
 */
export interface TrainingTableRow {
  date: string;
  localityMentioned: string;
  lat: number;
  lon: number;
  wardName: string;
  wardGid: number;
  severity: number;
  source: string;
  notes: string;
  rainfallMm: number;
  soilMoisture: number;
  landSurfaceTemp: number;
  rain2DaySum: number;
  rain3DaySum: number;
  rainPrevDay: number;
  rainNextDay: number;
  elevationMean: number;
  elevationMin: number;
  elevationMax: number;
  flowAccumulationMean: number;
  twiMean: number;
}
