/**
 * computeRiskProfile.ts
 * 
 * Deterministic, explainable scoring function — NOT an LLM call.
 * Computes a WardRiskProfile from ward zonal stats + current climate conditions.
 * 
 * CALIBRATION NOTES (from training_table_master.csv):
 * 
 * Known flood events and their city-wide climate averages:
 * ┌──────────────┬──────────┬───────────┬─────────────┐
 * │ Date         │ Rainfall │ Soil Mst  │ Rain 3D Sum │
 * ├──────────────┼──────────┼───────────┼─────────────┤
 * │ 2005-07-26   │   9.36   │   0.424   │    28.89    │
 * │ 2017-08-29   │ 121.98   │   0.428   │   256.90    │
 * │ 2019-07-02   │  42.56   │   0.413   │   104.21    │
 * │ 2021-07-18   │  34.89   │   0.398   │    89.45    │
 * └──────────────┴──────────┴───────────┴─────────────┘
 * 
 * Wards that flooded with severity 3:
 * - K/W (gid 14): elev=8.64, TWI=9.37, flow_acc=0.135 — chronic Mithi spot
 * - H/E (gid 18): elev=6.58, TWI=9.89, flow_acc=0.184 — reclaimed mangrove
 * - G/N (gid 9):  elev=6.92, TWI=8.32, flow_acc=0.076 — Sion/Mithi junction
 * - L  (gid 24): elev=16.68, TWI=9.00, flow_acc=0.083 — along Mithi
 * - G/S (gid 7):  elev=7.64, TWI=9.88, flow_acc=0.108 — coastal Worli
 * 
 * Wards that never flooded (severity 0 across all events):
 * - T  (gid 13): elev=87.31, TWI=10.36 — highland Mulund
 * - A  (gid 1):  elev=9.72, TWI=10.45 — Colaba, coastal but elevated
 * - B  (gid 2):  elev=8.48, TWI=8.07 — Churchgate
 */

import type {
  WardRiskProfile,
  HazardType,
  HazardFactor,
  ClimateSnapshot,
  WardZonalStats,
  TrainingTableRow,
} from './WardRiskProfile';
import { getWardClassification } from './wardClassification';

// ------------------------------------------------------------------
// Scoring thresholds — calibrated against the training data above.
// ------------------------------------------------------------------

/**
 * Score rainfall overflow risk.
 * 
 * Calibration:
 * - 2005 event: rain_3day_sum=28.89, soil=0.424 → many wards flooded (but rainfall avg was low,
 *   suggesting the event was extremely localized — the 944mm/24hr at Santacruz)
 * - 2017 event: rain_3day_sum=256.90, soil=0.428 → widespread flooding
 * - Non-flood baseline: rain_3day_sum < 30, soil < 0.35
 * 
 * We use rain_3day_sum as the primary driver with soil moisture as an amplifier.
 */
function scoreRainfallOverflow(rain3DaySum: number, soilMoisture: number): number {
  // No risk below 50mm cumulative — normal monsoon day
  if (rain3DaySum < 50) return 0;

  // Rain factor: 0 at 50mm, 1.0 at 300mm (the 2017 event was ~257mm)
  const rainFactor = Math.min(1.0, (rain3DaySum - 50) / 250);

  // Soil amplifier: wet soil (>0.40) amplifies risk, dry soil (<0.30) dampens it
  // 0.424 was the baseline for the 2005 event where flooding occurred
  const soilAmplifier = soilMoisture > 0.35
    ? 1.0 + (soilMoisture - 0.35) * 2.0  // up to 1.3x at 0.50
    : 0.7 + soilMoisture;                  // 0.7-1.05 for dry soil

  return Math.min(1.0, rainFactor * soilAmplifier);
}

/**
 * Score topographic pooling risk.
 * 
 * Calibration:
 * - H/E (severity 3): elev=6.58m, TWI=9.89 — natural basin
 * - K/W (severity 3): elev=8.64m, TWI=9.37 — low-lying
 * - T (severity 0):   elev=87.31m, TWI=10.36 — highland (high TWI but high elevation = no pooling)
 * 
 * Key insight: TWI alone is misleading — T has high TWI but is at 87m elevation.
 * We need LOW elevation + HIGH TWI for actual pooling risk.
 */
function scoreTopographicPooling(twiMean: number, elevationMean: number): number {
  // Elevation factor: full risk below 8m, no risk above 30m
  // H/E=6.58m (high risk), K/W=8.64m (moderate), T=87.31m (no risk)
  const elevFactor = elevationMean < 8
    ? 1.0
    : elevationMean < 30
      ? 1.0 - (elevationMean - 8) / 22
      : 0;

  // TWI factor: meaningful above 8.0, strong above 9.5
  // H/E=9.89 (strong), K/W=9.37 (moderate), B=8.07 (low)
  const twiFactor = twiMean > 8.0
    ? Math.min(1.0, (twiMean - 8.0) / 3.0)
    : 0;

  return elevFactor * twiFactor;
}

/**
 * Score tidal backflow risk.
 * 
 * Only applicable to coastal wards. When heavy rain coincides with high tide,
 * stormwater discharge into the Arabian Sea is physically blocked.
 * 
 * Since we don't have real-time tide data, we use rainfall intensity as a proxy:
 * coastal wards with high rainfall are at elevated tidal risk during monsoon
 * (high tides are predictable and frequent during July-August).
 */
function scoreTidalBackflow(rain3DaySum: number, tideLevel: number | null): number {
  // If we had real tide data, use it
  if (tideLevel !== null) {
    // High tide > 4.5m is dangerous; combined with rain > 100mm is severe
    const tideFactor = Math.min(1.0, Math.max(0, (tideLevel - 3.5) / 1.5));
    const rainFactor = Math.min(1.0, Math.max(0, (rain3DaySum - 50) / 200));
    return tideFactor * rainFactor;
  }

  // Without tide data: use monsoon season rainfall as a proxy
  // Coastal wards with >100mm rain_3day face some tidal restriction risk
  if (rain3DaySum < 100) return 0;
  return Math.min(0.6, (rain3DaySum - 100) / 300); // cap at 0.6 without real tide data
}

/**
 * Score river overflow risk.
 * 
 * Only applicable to river-adjacent wards. The Mithi River in particular
 * caused devastating flooding in 2005 and 2017.
 * 
 * Without real-time river gauge data, we use a combination of:
 * - Upstream rainfall intensity (affects river level)
 * - Ward flow accumulation (how much water flows through/collects in this ward)
 */
function scoreRiverOverflow(
  rain3DaySum: number,
  flowAccumulationMean: number,
  riverLevel: number | null
): number {
  // If we had real river gauge data
  if (riverLevel !== null) {
    return Math.min(1.0, Math.max(0, (riverLevel - 2.0) / 3.0));
  }

  // Without river data: heavy rain + high flow accumulation = river overflow risk
  // K/W flow_acc=0.135, H/E flow_acc=0.184, S flow_acc=0.075
  if (rain3DaySum < 80) return 0;

  const rainFactor = Math.min(1.0, (rain3DaySum - 80) / 200);
  // Flow accumulation: meaningful above 0.05, strong above 0.15
  const flowFactor = Math.min(1.0, Math.max(0, flowAccumulationMean / 0.15));

  return Math.min(1.0, rainFactor * flowFactor * 1.2); // slight boost since river flooding is severe
}

/**
 * Derive overall severity (0-3) from the list of active hazard factors.
 */
function deriveSeverityFromHazards(hazards: HazardFactor[]): 0 | 1 | 2 | 3 {
  if (hazards.length === 0) return 0;

  // Weighted sum of all hazard contributions
  const totalScore = hazards.reduce((sum, h) => sum + h.contributionScore, 0);
  // Compound penalty: multiple hazards compound risk
  const compoundMultiplier = hazards.length > 1 ? 1.0 + (hazards.length - 1) * 0.15 : 1.0;
  const adjustedScore = Math.min(1.0, totalScore * compoundMultiplier);

  // Thresholds calibrated against training_table_master.csv:
  // severity 3 wards typically had score > 0.6 (K/W, H/E in 2005/2017)
  // severity 2 wards: 0.35-0.6 (E, F/S in 2017)
  // severity 1 wards: 0.15-0.35 (R/C in 2017)
  if (adjustedScore > 0.6) return 3;
  if (adjustedScore > 0.35) return 2;
  if (adjustedScore > 0.15) return 1;
  return 0;
}

/**
 * Determine rainfall trend from surrounding days.
 */
function computeRainfallTrend(climate: ClimateSnapshot): "rising" | "falling" | "steady" {
  const current = climate.rainfallMm;
  const prev = climate.rainPrevDay;
  const next = climate.rainNextDay;

  // If we have next day data and it's significantly higher
  if (next > current * 1.3 && next - current > 10) return "rising";
  // If previous was higher and current is lower
  if (prev > current * 1.3 && prev - current > 10) return "falling";
  return "steady";
}

/**
 * Estimate hours until a critical threshold is reached.
 * Returns null if conditions are not trending toward risk.
 */
function estimateTimeToThreshold(
  climate: ClimateSnapshot,
  currentSeverity: number
): number | null {
  if (currentSeverity >= 3) return 0; // Already critical

  const trend = computeRainfallTrend(climate);
  if (trend !== "rising") return null;

  // Rough estimate: if rain is rising, how many hours until we'd hit severity 3?
  // Based on 2017 event where ~250mm/3-day was severity 3 threshold
  const gap = 250 - climate.rain3DaySum;
  if (gap <= 0) return 0;

  // Estimate rate from next day data
  const dailyRate = climate.rainNextDay - climate.rainfallMm;
  if (dailyRate <= 0) return null;

  const hoursToThreshold = (gap / dailyRate) * 24;
  return hoursToThreshold < 72 ? Math.round(hoursToThreshold) : null;
}

// ------------------------------------------------------------------
// Historical event matching
// ------------------------------------------------------------------

const SEVERITY_LABELS: Record<number, string> = {
  0: 'No',
  1: 'Minor',
  2: 'Moderate',
  3: 'Severe',
};

/**
 * Find the closest historical event for this ward based on climate similarity.
 * Uses normalized Euclidean distance on (rainfall, soil_moisture, rain_3day_sum).
 */
export function findSimilarHistoricalEvent(
  wardGid: number,
  currentClimate: ClimateSnapshot,
  trainingTable: TrainingTableRow[]
): WardRiskProfile["similarHistoricalEvent"] {
  // Filter training data for this ward only
  const wardHistory = trainingTable.filter(row => row.wardGid === wardGid);
  if (wardHistory.length === 0) return null;

  // Normalization ranges (from the training data spread)
  const RAIN_MAX = 150;   // rainfall_mm_mumbai_avg max meaningful range
  const SOIL_MAX = 0.5;
  const RAIN3D_MAX = 300;

  let closestRow: TrainingTableRow | null = null;
  let closestDistance = Infinity;

  for (const row of wardHistory) {
    const d = Math.sqrt(
      Math.pow((currentClimate.rainfallMm - row.rainfallMm) / RAIN_MAX, 2) +
      Math.pow((currentClimate.soilMoisture - row.soilMoisture) / SOIL_MAX, 2) +
      Math.pow((currentClimate.rain3DaySum - row.rain3DaySum) / RAIN3D_MAX, 2)
    );

    if (d < closestDistance) {
      closestDistance = d;
      closestRow = row;
    }
  }

  // Threshold: if distance > 0.8 (80% of normalized range), not a meaningful match
  if (!closestRow || closestDistance > 0.8) return null;

  const severityLabel = SEVERITY_LABELS[closestRow.severity] || 'Unknown';

  return {
    date: closestRow.date,
    outcome: closestRow.severity > 0
      ? `${severityLabel} flooding recorded — ${closestRow.notes || 'details in historical records'}`
      : 'No flooding recorded for this ward during this event',
    similarityNote: `Current conditions are within ${Math.round(closestDistance * 100)}% of this past event's climate profile`,
  };
}

// ------------------------------------------------------------------
// Main entry point
// ------------------------------------------------------------------

/**
 * Compute a full WardRiskProfile for a single ward given current climate conditions.
 * 
 * This is the core function — fully deterministic, no LLM involved.
 * The LLM layer (Phase 4) explains this data; it does not compute it.
 */
export function computeRiskProfile(
  wardGid: number,
  wardName: string,
  city: "mumbai" | "pune" | "navi_mumbai",
  zonalStats: WardZonalStats,
  climate: ClimateSnapshot,
  trainingTable: TrainingTableRow[]
): WardRiskProfile {
  const classification = getWardClassification(wardGid);
  const isCoastal = classification?.isCoastal ?? false;
  const nearRiver = classification?.nearRiver ?? false;
  const riverName = classification?.riverName ?? null;

  const hazards: HazardFactor[] = [];

  // 1. Rainfall overflow
  const rainfallScore = scoreRainfallOverflow(climate.rain3DaySum, climate.soilMoisture);
  if (rainfallScore > 0.15) {
    hazards.push({
      type: "rainfall_overflow",
      contributionScore: rainfallScore,
      explanation: `${climate.rain3DaySum.toFixed(0)}mm over 3 days with soil already at ${(climate.soilMoisture * 100).toFixed(0)}% saturation`,
    });
  }

  // 2. Topographic pooling
  const poolingScore = scoreTopographicPooling(zonalStats.twiMean, zonalStats.elevationMean);
  if (poolingScore > 0.15) {
    hazards.push({
      type: "topographic_pooling",
      contributionScore: poolingScore,
      explanation: `Elevation ${zonalStats.elevationMean.toFixed(1)}m with a wetness index of ${zonalStats.twiMean.toFixed(1)} — a natural low-lying basin`,
    });
  }

  // 3. Tidal backflow — only for coastal wards
  if (isCoastal) {
    const tidalScore = scoreTidalBackflow(climate.rain3DaySum, climate.tideLevel);
    if (tidalScore > 0.15) {
      hazards.push({
        type: "tidal_backflow",
        contributionScore: tidalScore,
        explanation: climate.tideLevel !== null
          ? `Heavy rainfall coinciding with a ${climate.tideLevel.toFixed(1)}m tide — stormwater discharge into the sea is restricted`
          : `${climate.rain3DaySum.toFixed(0)}mm rainfall during monsoon — stormwater outfall to the Arabian Sea likely restricted by high tide`,
      });
    }
  }

  // 4. River overflow — only for river-adjacent wards
  if (nearRiver && riverName) {
    const riverScore = scoreRiverOverflow(
      climate.rain3DaySum,
      zonalStats.flowAccumulationMean,
      climate.riverLevel
    );
    if (riverScore > 0.15) {
      hazards.push({
        type: "river_overflow",
        contributionScore: riverScore,
        explanation: climate.riverLevel !== null
          ? `${riverName} level at ${climate.riverLevel.toFixed(1)}m — trending above normal range`
          : `Heavy upstream rainfall (${climate.rain3DaySum.toFixed(0)}mm/3d) with flow accumulation index of ${zonalStats.flowAccumulationMean.toFixed(3)} — ${riverName} overflow risk elevated`,
      });
    }
  }

  // Sort hazards by contribution score descending
  hazards.sort((a, b) => b.contributionScore - a.contributionScore);

  // Determine primary hazard
  const primaryHazard: HazardType = hazards.length === 0
    ? "rainfall_overflow" // default when no hazards active
    : hazards.length > 1 && hazards[0].contributionScore - hazards[1].contributionScore < 0.15
      ? "compound"
      : hazards[0].type;

  const overallSeverity = deriveSeverityFromHazards(hazards);
  const rainfallTrend = computeRainfallTrend(climate);
  const estimatedTime = estimateTimeToThreshold(climate, overallSeverity);

  // Historical matching
  const similarHistoricalEvent = findSimilarHistoricalEvent(wardGid, climate, trainingTable);

  return {
    wardId: String(wardGid),
    wardName,
    city,
    overallSeverity,
    primaryHazard,
    activeHazards: hazards,
    rainfall3DaySum: climate.rain3DaySum,
    soilMoisture: climate.soilMoisture,
    elevationMean: zonalStats.elevationMean,
    twiMean: zonalStats.twiMean,
    flowAccumulationMean: zonalStats.flowAccumulationMean,
    rainfallTrend,
    estimatedTimeToThresholdHours: estimatedTime,
    similarHistoricalEvent,
  };
}
