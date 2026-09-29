/**
 * dataLoader.ts
 * 
 * CSV parsing utilities for the risk profile system.
 * Loads ward_zonal_stats.csv, training_table_master.csv, and the enriched
 * daily climate CSV into typed arrays/maps.
 * 
 * All CSVs are served from /public/data/ and fetched client-side.
 */

import type { WardZonalStats, TrainingTableRow, ClimateSnapshot } from './WardRiskProfile';

/**
 * Generic CSV parser — splits lines and maps headers to values.
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  
  return rows;
}

function safeFloat(val: string | undefined): number {
  if (!val || val === '') return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function safeInt(val: string | undefined): number {
  if (!val || val === '') return 0;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Load ward_zonal_stats.csv → Map<gid, WardZonalStats>
 * 
 * Columns: gid, name, elevation_conditioned_m_mean, elevation_conditioned_m_min,
 * elevation_conditioned_m_max, elevation_raw_m_mean, elevation_raw_m_min,
 * elevation_raw_m_max, flow_accumulation_mean, flow_accumulation_min,
 * flow_accumulation_max, twi_mean, twi_min, twi_max
 */
export async function loadWardZonalStats(): Promise<Map<number, WardZonalStats>> {
  const response = await fetch('/data/ward_zonal_stats.csv');
  const text = await response.text();
  const rows = parseCSV(text);
  
  const map = new Map<number, WardZonalStats>();
  
  for (const row of rows) {
    const gid = safeInt(row['gid']);
    if (gid === 0) continue;
    
    map.set(gid, {
      gid,
      name: row['name'] || '',
      elevationMean: safeFloat(row['elevation_conditioned_m_mean']),
      elevationMin: safeFloat(row['elevation_conditioned_m_min']),
      elevationMax: safeFloat(row['elevation_conditioned_m_max']),
      flowAccumulationMean: safeFloat(row['flow_accumulation_mean']),
      flowAccumulationMin: safeFloat(row['flow_accumulation_min']),
      flowAccumulationMax: safeFloat(row['flow_accumulation_max']),
      twiMean: safeFloat(row['twi_mean']),
      twiMin: safeFloat(row['twi_min']),
      twiMax: safeFloat(row['twi_max']),
    });
  }
  
  console.log(`[dataLoader] Loaded ${map.size} ward zonal stats`);
  return map;
}

/**
 * Load training_table_master.csv → TrainingTableRow[]
 * 
 * 111 rows across 4 historical flood events (2005, 2017, 2019, 2021).
 * Some rows have free-text in the severity/notes columns that can cause
 * CSV parsing issues — we handle this gracefully.
 */
export async function loadTrainingTable(): Promise<TrainingTableRow[]> {
  const response = await fetch('/data/training_table_master.csv');
  const text = await response.text();
  const rows = parseCSV(text);
  
  const result: TrainingTableRow[] = [];
  
  for (const row of rows) {
    const severity = safeInt(row['severity']);
    const wardGid = safeInt(row['ward_gid']);
    if (wardGid === 0) continue;
    
    result.push({
      date: row['date'] || '',
      localityMentioned: row['locality_mentioned'] || '',
      lat: safeFloat(row['lat']),
      lon: safeFloat(row['lon']),
      wardName: row['ward_name'] || '',
      wardGid,
      severity,
      source: row['source'] || '',
      notes: row['notes'] || '',
      rainfallMm: safeFloat(row['rainfall_mm_mumbai_avg']),
      soilMoisture: safeFloat(row['soil_moisture_m3m3_mumbai_avg']),
      landSurfaceTemp: safeFloat(row['land_surface_temp_c_mumbai_avg']),
      rain2DaySum: safeFloat(row['rain_2day_sum']),
      rain3DaySum: safeFloat(row['rain_3day_sum']),
      rainPrevDay: safeFloat(row['rain_prev_day']),
      rainNextDay: safeFloat(row['rain_next_day']),
      elevationMean: safeFloat(row['elevation_conditioned_m_mean']),
      elevationMin: safeFloat(row['elevation_conditioned_m_min']),
      elevationMax: safeFloat(row['elevation_conditioned_m_max']),
      flowAccumulationMean: safeFloat(row['flow_accumulation_mean']),
      twiMean: safeFloat(row['twi_mean']),
    });
  }
  
  console.log(`[dataLoader] Loaded ${result.length} training table rows`);
  return result;
}

/**
 * Load mumbai_climate_daily_avg.csv → ClimateSnapshot[]
 * 
 * ~12,775 daily rows from 1990-01-01 to 2024-12-31.
 * Each row is a city-wide average (not per-ward).
 * 
 * Columns: date, rainfall_mm_mumbai_avg, soil_moisture_m3m3_mumbai_avg,
 * land_surface_temp_c_mumbai_avg, rain_2day_sum, rain_3day_sum,
 * rain_prev_day, rain_next_day
 */
export async function loadClimateTimeSeries(): Promise<ClimateSnapshot[]> {
  const response = await fetch('/data/mumbai_climate_daily_avg.csv');
  const text = await response.text();
  const rows = parseCSV(text);
  
  const result: ClimateSnapshot[] = [];
  
  for (const row of rows) {
    if (!row['date']) continue;
    
    result.push({
      date: row['date'],
      rainfallMm: safeFloat(row['rainfall_mm_mumbai_avg']),
      soilMoisture: safeFloat(row['soil_moisture_m3m3_mumbai_avg']),
      landSurfaceTemp: safeFloat(row['land_surface_temp_c_mumbai_avg']),
      rain2DaySum: safeFloat(row['rain_2day_sum']),
      rain3DaySum: safeFloat(row['rain_3day_sum']),
      rainPrevDay: safeFloat(row['rain_prev_day']),
      rainNextDay: safeFloat(row['rain_next_day']),
      tideLevel: null,   // Not available in current dataset
      riverLevel: null,   // Not available in current dataset
    });
  }
  
  console.log(`[dataLoader] Loaded ${result.length} climate time-series rows`);
  return result;
}

/**
 * Build an index of climate data by date string for O(1) lookup.
 */
export function buildClimateIndex(series: ClimateSnapshot[]): Map<string, ClimateSnapshot> {
  return new Map(series.map(s => [s.date, s]));
}
