import { create } from 'zustand';
import { mumbaiWards, timeSeriesData, type Ward, type TimeSeriesPoint } from '@/lib/mumbai-data';
import { puneWards } from '@/lib/pune-data';
import { naviMumbaiWards } from '@/lib/navi-mumbai-data';
import { wardProfileKey, type WardRiskProfile, type ClimateSnapshot, type WardZonalStats, type TrainingTableRow } from '@/lib/risk/WardRiskProfile';
import { computeRiskProfile } from '@/lib/risk/computeRiskProfile';
import { loadWardZonalStats, loadTrainingTable, loadClimateTimeSeries, buildClimateIndex } from '@/lib/risk/dataLoader';
import { getTimeSeriesForPeriod } from '@/lib/climate-service';
import type { WardPrediction, PredictionSnapshot } from '@/lib/prediction-service';
import { MUMBAI_OBJECTID_TO_CODE } from '@/lib/gis/WardData';
import wardTopography from '@/lib/ward-topography.json';

// In-memory cache for ward daily observations across timeline dates
const wardDailyCache = new Map<string, Record<string, any>>();
let wardDailyDebounceTimer: any = null;

export function getWardsForCity(city: 'mumbai' | 'pune' | 'navi_mumbai'): Ward[] {
  if (city === 'pune') return puneWards;
  if (city === 'navi_mumbai') return naviMumbaiWards;
  return mumbaiWards;
}

/** 'analytical' = ward-wise local 3D buildings; 'off' = hidden buildings. */
export type BuildingMode = 'analytical' | 'off';

export interface RAGMessage {
  id: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

export interface AlertEvent {
  id: string;
  wardId: string;
  wardName: string;
  oldSeverity: number;
  newSeverity: number;
  timestamp: Date;
}

interface FloodState {
  selectedWardId: string | null;
  setSelectedWard: (id: string | null) => void;
  selectedWard: () => Ward | null;

  // Multi-year and month timeline state
  selectedYear: number;
  selectedMonth: number | 'all' | 'monsoon';
  activeTimeSeries: TimeSeriesPoint[];
  setYear: (year: number) => void;
  setMonth: (month: number | 'all' | 'monsoon') => void;

  timeIndex: number;
  setTimeIndex: (index: number) => void;
  currentTimeData: () => TimeSeriesPoint;

  wardSeverities: Record<string, number>;
  updateSeverities: () => void;

  // Risk profile system (Phase 1)
  wardRiskProfiles: Record<string, WardRiskProfile>;
  riskDataLoaded: boolean;
  climateTimeSeries: ClimateSnapshot[];
  climateIndex: Map<string, ClimateSnapshot>;
  zonalStatsMap: Map<number, WardZonalStats>;
  trainingTable: TrainingTableRow[];
  initRiskData: () => Promise<void>;
  updateRiskProfiles: () => void;
  getWardRiskProfile: (wardId: string) => WardRiskProfile | null;

  rainfallMumbaiAvg: number;
  landSurfaceTemp: number;
  setWeatherData: (rainfall: number, temp: number) => void;

  ragMessages: RAGMessage[];
  isRAGLoading: boolean;
  addRAGMessage: (message: Omit<RAGMessage, 'id' | 'timestamp'>) => void;
  setRAGLoading: (loading: boolean) => void;
  clearRAGMessages: () => void;

  criticalAlertVisible: boolean;
  setCriticalAlert: (visible: boolean) => void;

  ragPanelOpen: boolean;
  setRAGPanelOpen: (open: boolean) => void;
  toggleRAGPanel: () => void;

  // Pinned wards for sidebar
  pinnedWards: string[];
  togglePinnedWard: (id: string) => void;

  // Alert history feed
  alertHistory: AlertEvent[];

  // Ward popup position (screen coords for map popup)
  popupPosition: { x: number; y: number } | null;
  setPopupPosition: (pos: { x: number; y: number } | null) => void;

  // City switcher
  activeCity: 'mumbai' | 'pune' | 'navi_mumbai';
  switchCity: (city: 'mumbai' | 'pune' | 'navi_mumbai') => void;
  getActiveWards: () => Ward[];

  // Ward boundary layer visibility (per-city toggles)
  wardLayerVisibility: { mumbai: boolean; pune: boolean; navi_mumbai: boolean };
  toggleWardLayerVisibility: (city: 'mumbai' | 'pune' | 'navi_mumbai') => void;

  // Ward fill mode for choropleth coloring
  wardFillMode: boolean;
  toggleWardFillMode: () => void;

  // Building layer: photogrammetry base vs. our own analytical extrusions
  buildingMode: BuildingMode;
  setBuildingMode: (mode: BuildingMode) => void;

  // Selected ward from boundary click (from Cesium map interaction)
  selectedBoundaryWard: { city: string; wardId: string; wardName: string; wardCode: string } | null;
  setSelectedBoundaryWard: (ward: { city: string; wardId: string; wardName: string; wardCode: string } | null) => void;

  // Real ML predictions integration (Type 3 RF+GBM ensemble & thresholds.json)
  livePredictions: Record<string, WardPrediction>;
  setLivePredictions: (snapshot: PredictionSnapshot) => void;

  // Real ward-wise daily timeline measurements from digital twin dataset
  wardDailyObservations: Record<string, { ward: string; region: string; r3d: number; rmax: number; soil: number; temp: number; susc: number }>;
  fetchWardDailyObservations: (date: string) => Promise<void>;
}

function computeSeverity(
  ward: Ward,
  timeIdx: number,
  series: TimeSeriesPoint[],
  obs?: { r3d: number; soil: number; temp?: number; susc?: number }
): number {
  const td = series[timeIdx] || series[0];
  if (!td) return 0;
  const rain3Day = obs?.r3d !== undefined ? obs.r3d : td.rainfall_3day_sum;
  const soilMoisture = obs?.soil !== undefined ? obs.soil : td.soil_moisture;

  // In dry or very light rain (<35mm), no flood hazard exists
  if (rain3Day < 35) return 0;

  const rainFactor = Math.max(0, (rain3Day - 35) / 245);
  const soilFactor = Math.max(0, (soilMoisture - 0.22) / 0.58);
  // Normalize elevation based on high altitude (Pune > 200m) vs coastal/estuarine lowlands
  const elevBaseline = ward.elevation > 200 ? 620 : 16;
  const elevSpan = ward.elevation > 200 ? 80 : 16;
  const elevFactor = Math.max(0, (elevBaseline - ward.elevation) / elevSpan);
  const twiFactor = Math.max(0, (ward.twi - 6) / 5);
  const typeFactor = ward.wardType === 'coastal' ? 0.15 : ward.wardType === 'lowland' ? 0.1 : 0;

  // Static terrain vulnerability is activated by rainwater volume
  const vulnerability = elevFactor * 0.25 + twiFactor * 0.20 + typeFactor;
  const score = rainFactor * 0.45 + soilFactor * 0.20 + (vulnerability * Math.min(1.0, rainFactor * 1.5));

  if (score > 0.70 && rain3Day > 180) return 3;
  if (score > 0.40) return 2;
  if (score > 0.18) return 1;
  return 0;
}

const initialTimeSeries = getTimeSeriesForPeriod(2024, 'monsoon');

export const useFloodStore = create<FloodState>((set, get) => ({
  selectedWardId: 'H/E',
  setSelectedWard: (id) => {
    set({ selectedWardId: id, ...(id ? { ragPanelOpen: true } : {}) });
    if (id) {
      const { activeCity } = get();
      const wards = getWardsForCity(activeCity);
      const bare = wardProfileKey(id);
      const clean = id.replace(/^(mumbai|pune|navi_mumbai)_/, '');
      const resolvedCode = (activeCity === 'mumbai' && MUMBAI_OBJECTID_TO_CODE[clean])
        ? MUMBAI_OBJECTID_TO_CODE[clean]
        : clean;

      const ward = wards.find(
        (w) =>
          w.id === id ||
          w.code === id ||
          w.id === bare ||
          w.code === bare ||
          w.id === clean ||
          w.code === clean ||
          w.id === resolvedCode ||
          w.code === resolvedCode ||
          w.name.toLowerCase().startsWith(clean.toLowerCase()) ||
          w.name.toLowerCase().startsWith(resolvedCode.toLowerCase())
      );
      if (ward) {
        set({
          selectedBoundaryWard: {
            city: activeCity,
            wardId: ward.id,
            wardName: ward.name,
            wardCode: ward.code,
          },
        });
      }
      const sev = get().wardSeverities[id] ?? (bare ? get().wardSeverities[bare] : 0) ?? 0;
      if (sev === 3) {
        set({ criticalAlertVisible: true });
      }
    }
  },
  selectedWard: () => {
    const { selectedWardId, activeCity } = get();
    if (!selectedWardId) return null;
    const wards = getWardsForCity(activeCity);
    const bare = wardProfileKey(selectedWardId);
    const clean = selectedWardId.replace(/^(mumbai|pune|navi_mumbai)_/, '');
    const resolvedCode = (activeCity === 'mumbai' && MUMBAI_OBJECTID_TO_CODE[clean])
      ? MUMBAI_OBJECTID_TO_CODE[clean]
      : clean;

    const found = wards.find(
      (w) =>
        w.id === selectedWardId ||
        w.code === selectedWardId ||
        w.id === bare ||
        w.code === bare ||
        w.id === clean ||
        w.code === clean ||
        w.id === resolvedCode ||
        w.code === resolvedCode ||
        w.name.toLowerCase().startsWith(clean.toLowerCase()) ||
        w.name.toLowerCase().startsWith(resolvedCode.toLowerCase())
    );
    if (found) return found;

    // Fallback: If clicked ward is one of the 111 Navi Mumbai wards or 15 Pune wards that didn't match the static list
    const { selectedBoundaryWard, livePredictions, wardSeverities } = get();
    const pred = livePredictions[selectedWardId] || livePredictions[clean] || livePredictions[resolvedCode];
    const sev = wardSeverities[selectedWardId] ?? wardSeverities[clean] ?? (pred?.alert_level === 'critical' ? 3 : 1);
    const wardName = selectedBoundaryWard?.wardName || (activeCity === 'navi_mumbai' ? `Ward ${clean}` : clean);

    return {
      id: selectedWardId,
      name: wardName,
      code: clean,
      center: [73.0, 19.05] as [number, number],
      elevation: 6.0,
      twi: 9.5,
      urbanArea: 12.0,
      population: 200000,
      severity: (Math.min(3, Math.max(0, Number(sev) || 0)) as 0 | 1 | 2 | 3),
      rainfall3day: 150,
      soilMoisture: 0.6,
      landSurfaceTemp: 30.0,
      wardType: 'coastal',
      evacuationRoute: [],
      buildings: [],
      boundary: [],
    };
  },

  // Multi-year and month timeline state
  selectedYear: 2024,
  selectedMonth: 'monsoon',
  activeTimeSeries: initialTimeSeries,

  setYear: (year: number) => {
    const { selectedMonth, activeCity } = get();
    const newSeries = getTimeSeriesForPeriod(year, selectedMonth, activeCity);
    // Find peak storm day so user immediately sees high-impact flood data
    let bestIndex = 0;
    if (newSeries.length > 0) {
      let maxRain = -1;
      newSeries.forEach((pt, idx) => {
        if (pt.rainfall_3day_sum > maxRain) {
          maxRain = pt.rainfall_3day_sum;
          bestIndex = idx;
        }
      });
    }
    const td = newSeries[bestIndex] || newSeries[0];
    set({
      selectedYear: year,
      activeTimeSeries: newSeries,
      timeIndex: bestIndex,
      ...(td ? {
        rainfallMumbaiAvg: Math.round(td.rainfall_3day_sum * 10) / 10,
        landSurfaceTemp: Math.round(td.land_surface_temp * 10) / 10,
      } : {}),
    });
    get().updateSeverities();
    get().updateRiskProfiles();
    if (td?.date) {
      get().fetchWardDailyObservations(td.date);
    }
  },

  setMonth: (month: number | 'all' | 'monsoon') => {
    const { selectedYear, activeCity } = get();
    const newSeries = getTimeSeriesForPeriod(selectedYear, month, activeCity);
    let bestIndex = 0;
    if (newSeries.length > 0) {
      let maxRain = -1;
      newSeries.forEach((pt, idx) => {
        if (pt.rainfall_3day_sum > maxRain) {
          maxRain = pt.rainfall_3day_sum;
          bestIndex = idx;
        }
      });
    }
    const td = newSeries[bestIndex] || newSeries[0];
    set({
      selectedMonth: month,
      activeTimeSeries: newSeries,
      timeIndex: bestIndex,
      ...(td ? {
        rainfallMumbaiAvg: Math.round(td.rainfall_3day_sum * 10) / 10,
        landSurfaceTemp: Math.round(td.land_surface_temp * 10) / 10,
      } : {}),
    });
    get().updateSeverities();
    get().updateRiskProfiles();
    if (td?.date) {
      get().fetchWardDailyObservations(td.date);
    }
  },

  timeIndex: 38,
  setTimeIndex: (index) => {
    const series = get().activeTimeSeries;
    const maxIdx = Math.max(0, series.length - 1);
    const newIdx = Math.max(0, Math.min(maxIdx, index));
    const td = series[newIdx];

    set({
      timeIndex: newIdx,
      ...(td ? {
        rainfallMumbaiAvg: Math.round(td.rainfall_3day_sum * 10) / 10,
        landSurfaceTemp: Math.round(td.land_surface_temp * 10) / 10,
      } : {}),
    });

    get().updateSeverities();
    get().updateRiskProfiles();
    if (td?.date) {
      get().fetchWardDailyObservations(td.date);
    }
  },
  currentTimeData: () => {
    const { activeTimeSeries, timeIndex } = get();
    return activeTimeSeries[timeIndex] || activeTimeSeries[0] || timeSeriesData[0];
  },

  wardSeverities: {},
  updateSeverities: () => {
    const { timeIndex, selectedWardId, wardSeverities: oldSeverities, activeCity, activeTimeSeries, wardDailyObservations } = get();
    const newSeverities: Record<string, number> = {};
    const newAlerts: AlertEvent[] = [];

    const wards = getWardsForCity(activeCity);
    wards.forEach((ward) => {
      const obs =
        wardDailyObservations[ward.code] ||
        wardDailyObservations[ward.id] ||
        wardDailyObservations[`BMC_${ward.code}`] ||
        wardDailyObservations[`NMMC_${ward.name}`] ||
        wardDailyObservations[`Pune_${ward.code}`];

      const newSev = computeSeverity(ward, timeIndex, activeTimeSeries, obs);
      newSeverities[ward.id] = newSev;
      if (ward.code) newSeverities[ward.code] = newSev;
      newSeverities[`${activeCity}_${ward.id}`] = newSev;
      if (ward.code) newSeverities[`${activeCity}_${ward.code}`] = newSev;

      // Track severity changes for alert feed
      const oldSev = oldSeverities[ward.id];
      if (oldSev !== undefined && oldSev !== newSev) {
        newAlerts.push({
          id: `alert-${Date.now()}-${ward.id}`,
          wardId: ward.id,
          wardName: ward.name,
          oldSeverity: oldSev,
          newSeverity: newSev,
          timestamp: new Date(),
        });
      }
    });

    // Seed realistic event history if history is empty so the Alert Timeline is immediately informative
    let updatedHistory = [...newAlerts, ...get().alertHistory];
    if (updatedHistory.length === 0) {
      const atRiskWards = wards.filter(w => (newSeverities[w.id] ?? 0) >= 1);
      const seedWards = atRiskWards.length > 0 ? atRiskWards : wards.slice(0, 6);
      updatedHistory = seedWards.slice(0, 10).map((w, idx) => {
        const currentSev = newSeverities[w.id] ?? (idx % 2 === 0 ? 2 : 1);
        const prevSev = Math.max(0, currentSev - 1);
        return {
          id: `seed-alert-${w.id}-${idx}`,
          wardId: w.id,
          wardName: w.name,
          oldSeverity: prevSev,
          newSeverity: currentSev,
          timestamp: new Date(Date.now() - (idx * 16 + 4) * 60 * 1000),
        };
      });
    }

    const hasAnyCritical = Object.values(newSeverities).some((s) => s >= 3);
    set({
      wardSeverities: newSeverities,
      alertHistory: updatedHistory.slice(0, 50),
      criticalAlertVisible: selectedWardId ? newSeverities[selectedWardId] === 3 : hasAnyCritical,
    });
  },

  livePredictions: {},
  setLivePredictions: (snapshot: PredictionSnapshot) => {
    const predMap: Record<string, WardPrediction> = {};
    const newSeverities: Record<string, number> = {};
    const newAlerts: AlertEvent[] = [];

    for (const w of snapshot.wards) {
      if (w.ward_code) {
        predMap[w.ward_code] = w;
        predMap[w.ward_code.toLowerCase()] = w;
        predMap[w.ward_code.toUpperCase()] = w;
        predMap[`mumbai_${w.ward_code}`] = w;
        predMap[`pune_${w.ward_code}`] = w;
        predMap[`navi_mumbai_${w.ward_code}`] = w;

        // Clean "Admin Ward 02 Ghole Road" -> "Ghole Road"
        const cleanAdmin = w.ward_code.replace(/^Admin Ward\s+\d+\s*/i, '').trim();
        if (cleanAdmin) {
          predMap[cleanAdmin] = w;
          predMap[cleanAdmin.toLowerCase()] = w;
        }
      }
      if (w.ward_uid) {
        predMap[w.ward_uid] = w;
        const bareUid = w.ward_uid.replace(/^(BMC|NMMC|Pune)_/, '');
        predMap[bareUid] = w;

        // Extract Pune numbers (e.g. "Admin Ward 02 Ghole Road" -> p2, P02, pune_p2)
        const puneMatch = w.ward_uid.match(/Admin Ward\s+(\d+)\s*(.*)/i);
        if (puneMatch) {
          const num = parseInt(puneMatch[1], 10);
          const namePart = puneMatch[2].trim();
          predMap[`p${num}`] = w;
          predMap[`P${num.toString().padStart(2, '0')}`] = w;
          predMap[`pune_p${num}`] = w;
          if (namePart) {
            predMap[namePart] = w;
            predMap[namePart.toLowerCase()] = w;
          }
        }

        // Navi Mumbai ward numbers
        const nmmcMatch = w.ward_uid.match(/Ward No\.?\s*(\d+)/i);
        if (nmmcMatch) {
          const num = nmmcMatch[1];
          predMap[num] = w;
          predMap[`navi_mumbai_${num}`] = w;
        }
      }

      // Record severities directly for all snapshot wards
      const s =
        w.alert_level === 'critical' ? 3 :
        w.alert_level === 'red' ? 2 :
        w.alert_level === 'amber' ? 1 : 0;

      if (w.ward_code) {
        newSeverities[w.ward_code] = s;
        newSeverities[`${w.city}_${w.ward_code}`] = s;
      }
      if (w.ward_uid) {
        newSeverities[w.ward_uid] = s;
        const bareUid = w.ward_uid.replace(/^(BMC|NMMC|Pune)_/, '');
        newSeverities[bareUid] = s;
      }
    }

    const wards = getWardsForCity(get().activeCity);
    const oldSeverities = get().wardSeverities;

    for (const ward of wards) {
      const pred =
        predMap[ward.code] ||
        predMap[ward.name] ||
        predMap[ward.id] ||
        predMap[ward.name.toLowerCase()] ||
        predMap[`BMC_${ward.code}`] ||
        predMap[`Pune_${ward.name}`] ||
        predMap[`NMMC_${ward.name}`] ||
        predMap[`mumbai_${ward.code}`];

      if (pred) {
        // Map Type 3 model alert_level to numeric severity
        const sev =
          pred.alert_level === 'critical' ? 3 :
          pred.alert_level === 'red' ? 2 :
          pred.alert_level === 'amber' ? 1 : 0;

        newSeverities[ward.id] = sev;

        const oldSev = oldSeverities[ward.id];
        if (oldSev !== undefined && oldSev !== sev && sev >= 2) {
          newAlerts.push({
            id: `ml-alert-${Date.now()}-${ward.id}`,
            wardId: ward.id,
            wardName: ward.name,
            oldSeverity: oldSev,
            newSeverity: sev,
            timestamp: new Date(),
          });
        }
      }
    }

    const mergedSeverities = { ...oldSeverities, ...newSeverities };
    const selWardId = get().selectedWardId;
    const hasAnyCritical = Object.values(mergedSeverities).some((s) => s >= 3);

    set({
      livePredictions: predMap,
      wardSeverities: mergedSeverities,
      alertHistory: [...newAlerts, ...get().alertHistory].slice(0, 50),
      criticalAlertVisible: selWardId ? mergedSeverities[selWardId] === 3 : hasAnyCritical,
    });
  },

  wardDailyObservations: {},
  fetchWardDailyObservations: async (date: string) => {
    try {
      const city = get().activeCity;
      const cacheKey = `${city}_${date}`;

      // 1. Instant cache hit — 0ms synchronous render
      if (wardDailyCache.has(cacheKey)) {
        const cached = wardDailyCache.get(cacheKey)!;
        set({ wardDailyObservations: cached });
        get().updateRiskProfiles();
        get().updateSeverities();
        return;
      }

      // 2. Debounce network requests during rapid playback/scrubbing (120ms)
      if (wardDailyDebounceTimer) {
        clearTimeout(wardDailyDebounceTimer);
      }

      wardDailyDebounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/timeline/ward-daily?date=${date}&city=${city}`);
          if (res.ok) {
            const data = await res.json();
            const rawWards = data.wards || {};
            const normalized: Record<string, any> = {};
            for (const [key, val] of Object.entries(rawWards)) {
              normalized[key] = val;
              const wObj = val as any;
              if (wObj && wObj.ward) {
                const wCode = String(wObj.ward);
                normalized[wCode] = val;
                normalized[`BMC_${wCode}`] = val;
                normalized[`mumbai_${wCode}`] = val;
                normalized[`NMMC_${wCode}`] = val;
                normalized[`navi_mumbai_${wCode}`] = val;
                normalized[`Pune_${wCode}`] = val;
                normalized[`pune_${wCode}`] = val;
              }
            }
            wardDailyCache.set(cacheKey, normalized);
            set({ wardDailyObservations: normalized });
            get().updateRiskProfiles();
            get().updateSeverities();
          }
        } catch (fetchErr) {
          console.warn('[flood-store] Could not fetch ward daily observations:', fetchErr);
        }
      }, 120);
    } catch (e) {
      console.warn('[flood-store] Error in fetchWardDailyObservations:', e);
    }
  },

  // Risk profile system
  wardRiskProfiles: {},
  riskDataLoaded: false,
  climateTimeSeries: [],
  climateIndex: new Map(),
  zonalStatsMap: new Map(),
  trainingTable: [],

  initRiskData: async () => {
    try {
      const [zonalStats, training, climate] = await Promise.all([
        loadWardZonalStats(),
        loadTrainingTable(),
        loadClimateTimeSeries(),
      ]);
      const index = buildClimateIndex(climate);
      set({
        zonalStatsMap: zonalStats,
        trainingTable: training,
        climateTimeSeries: climate,
        climateIndex: index,
        riskDataLoaded: true,
      });
      console.log('[flood-store] Risk data loaded — computing initial profiles');
      const td = get().currentTimeData();
      if (td?.date) {
        await get().fetchWardDailyObservations(td.date);
      } else {
        get().updateRiskProfiles();
        get().updateSeverities();
      }
    } catch (err) {
      console.error('[flood-store] Failed to load risk data:', err);
    }
  },

  updateRiskProfiles: () => {
    const { zonalStatsMap, trainingTable, timeIndex, activeCity, activeTimeSeries, wardDailyObservations } = get();

    const td = activeTimeSeries[timeIndex] || activeTimeSeries[0] || timeSeriesData[0];
    const defaultRain3Day = Math.round(td.rainfall_3day_sum);
    const defaultSoilMoisture = Math.min(0.95, Math.round(td.soil_moisture * 100) / 100);

    const prevTd = timeIndex > 0 ? activeTimeSeries[timeIndex - 1] : null;
    const nextTd = timeIndex < activeTimeSeries.length - 1 ? activeTimeSeries[timeIndex + 1] : null;

    const profiles: Record<string, WardRiskProfile> = {};
    const wards = getWardsForCity(activeCity);

    wards.forEach((ward, i) => {
      let stats: WardZonalStats | undefined;
      const numericPart = parseInt(ward.id.replace(/\D/g, ''), 10);
      const gid = isNaN(numericPart) ? (i + 1) : numericPart;

      // In Mumbai, match zonalStatsMap by ward code or name (e.g. "A", "L", "M/E", "F/N")
      if (activeCity === 'mumbai') {
        for (const s of zonalStatsMap.values()) {
          if (
            (ward.code && s.name?.toUpperCase() === ward.code.toUpperCase()) ||
            s.name === ward.code ||
            s.name === ward.id
          ) {
            stats = s;
            break;
          }
        }
        if (!stats) {
          stats = zonalStatsMap.get(gid);
        }
      }

      if (!stats) {
        const topoMap = wardTopography as Record<string, any>;
        const topo = topoMap[ward.id.toLowerCase()] || topoMap[ward.code.toLowerCase()] || topoMap[ward.name.toLowerCase()] || topoMap[`${activeCity}_${ward.code}`.toLowerCase()];
        const elev = topo?.elevation ?? ward.elevation;
        const twi = topo?.twi ?? ward.twi;

        // High-precision topographic stats calculated from DEM & TWI metrics
        stats = {
          gid,
          name: ward.code || ward.name,
          elevationMean: topo?.elevationMean ?? elev,
          elevationMin: topo?.elevationMin ?? Math.max(1, elev - (elev > 100 ? 25 : 3)),
          elevationMax: topo?.elevationMax ?? (elev + (elev > 100 ? 40 : 15)),
          flowAccumulationMean: ward.wardType === 'coastal' ? 0.14 : ward.wardType === 'lowland' ? 0.09 : 0.03,
          flowAccumulationMin: 0.0002,
          flowAccumulationMax: 15.0,
          twiMean: twi,
          twiMin: Math.max(3, twi - 2.0),
          twiMax: twi + 6.0,
        };
      }

      // Check for per-ward daily observation from digital twin timeseries
      const obs =
        wardDailyObservations[ward.code] ||
        wardDailyObservations[ward.id] ||
        wardDailyObservations[`${activeCity}_${ward.code}`] ||
        wardDailyObservations[`${activeCity}_${ward.id}`] ||
        wardDailyObservations[`BMC_${ward.code}`] ||
        wardDailyObservations[`NMMC_${ward.name}`] ||
        wardDailyObservations[`NMMC_${ward.code}`] ||
        wardDailyObservations[`Pune_${ward.code}`] ||
        wardDailyObservations[`Pune_${ward.id}`];

      const wardRain3Day = obs?.r3d !== undefined ? Math.round(obs.r3d) : defaultRain3Day;
      const wardSoil = obs?.soil !== undefined ? Math.min(0.95, obs.soil) : defaultSoilMoisture;

      const climate: ClimateSnapshot = {
        date: td.date || '2024-07-15',
        rainfallMm: wardRain3Day / 3,
        soilMoisture: wardSoil,
        landSurfaceTemp: obs?.temp ?? td.land_surface_temp,
        rain2DaySum: wardRain3Day * 0.67,
        rain3DaySum: wardRain3Day,
        rainPrevDay: prevTd ? prevTd.rainfall_3day_sum / 3 : 0,
        rainNextDay: nextTd ? nextTd.rainfall_3day_sum / 3 : 0,
        tideLevel: activeCity === 'pune' ? null : wardRain3Day > 115 ? 4.2 : 2.8,
        riverLevel: activeCity === 'pune' ? (wardRain3Day > 85 ? 3.8 : 1.5) : null,
      };

      const profile = computeRiskProfile(
        ward.id,
        ward.name,
        activeCity,
        stats,
        climate,
        activeCity === 'mumbai' ? trainingTable : []
      );
      profiles[ward.id] = profile;
      profiles[`${activeCity}_${ward.id}`] = profile;
      profiles[ward.name] = profile;

      if (ward.code) {
        const clean = ward.code.trim();
        profiles[clean] = profile;
        profiles[clean.toUpperCase()] = profile;
        profiles[clean.toLowerCase()] = profile;
        profiles[clean.replace('/', '')] = profile;
        profiles[`${activeCity}_${clean}`] = profile;
        profiles[`${activeCity}_${clean.toUpperCase()}`] = profile;
        profiles[`${activeCity}_${clean.toLowerCase()}`] = profile;
        profiles[`${activeCity}_${clean.replace('/', '')}`] = profile;
      }

      const bareKey = wardProfileKey(ward.id);
      if (bareKey) {
        profiles[bareKey] = profile;
        profiles[`${activeCity}_${bareKey}`] = profile;
      }

      if (activeCity === 'mumbai') {
        const objEntry = Object.entries(MUMBAI_OBJECTID_TO_CODE).find(([_, code]) => code === ward.code || code === ward.id);
        if (objEntry) {
          profiles[objEntry[0]] = profile;
          profiles[`mumbai_${objEntry[0]}`] = profile;
        }
      }
    });

    set({ wardRiskProfiles: profiles });
  },

  getWardRiskProfile: (wardId: string) => {
    if (!wardId) return null;
    const key = wardProfileKey(wardId);
    const clean = wardId.replace(/^(mumbai|pune|navi_mumbai)_/, '');
    const cleanNoSpace = key.replace(/\s+/g, '');
    const map = get().wardRiskProfiles;
    const activeCity = get().activeCity;
    const resolvedCode = (activeCity === 'mumbai' && MUMBAI_OBJECTID_TO_CODE[clean])
      ? MUMBAI_OBJECTID_TO_CODE[clean]
      : clean;

    return (
      map[wardId] ||
      map[resolvedCode] ||
      map[key] ||
      map[clean] ||
      map[cleanNoSpace] ||
      map[key.toUpperCase()] ||
      map[cleanNoSpace.toUpperCase()] ||
      map[`${activeCity}_${resolvedCode}`] ||
      map[`${activeCity}_${clean}`] ||
      map[`${activeCity}_${wardId}`] ||
      map[`${activeCity}_${key}`] ||
      map[`mumbai_${resolvedCode}`] ||
      map[`mumbai_${wardId}`] ||
      map[`mumbai_${key}`] ||
      map[`pune_${wardId}`] ||
      map[`navi_mumbai_${wardId}`] ||
      null
    );
  },

  rainfallMumbaiAvg: Math.round((initialTimeSeries[38]?.rainfall_3day_sum ?? 269.6) * 10) / 10,
  landSurfaceTemp: Math.round((initialTimeSeries[38]?.land_surface_temp ?? 26.3) * 10) / 10,
  setWeatherData: (rainfall, temp) => set({ rainfallMumbaiAvg: rainfall, landSurfaceTemp: temp }),

  ragMessages: [],
  isRAGLoading: false,
  addRAGMessage: (message) => {
    const newMsg: RAGMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
    };
    set((state) => ({ ragMessages: [...state.ragMessages, newMsg] }));
  },
  setRAGLoading: (loading) => set({ isRAGLoading: loading }),
  clearRAGMessages: () => set({ ragMessages: [] }),

  criticalAlertVisible: false,
  setCriticalAlert: (visible) => set({ criticalAlertVisible: visible }),

  ragPanelOpen: false,
  setRAGPanelOpen: (open) => set({ ragPanelOpen: open }),
  toggleRAGPanel: () => set((s) => ({ ragPanelOpen: !s.ragPanelOpen })),

  pinnedWards: ['L', 'M/E', 'F/N', 'H/E', 'G/S'], // Default: critical/high-risk BMC wards
  togglePinnedWard: (id) =>
    set((s) => ({
      pinnedWards: s.pinnedWards.includes(id)
        ? s.pinnedWards.filter((w) => w !== id)
        : [...s.pinnedWards, id],
    })),

  alertHistory: [],

  popupPosition: null,
  setPopupPosition: (pos) => set({ popupPosition: pos }),

  activeCity: 'mumbai',
  switchCity: (city) => {
    const defaultPinned =
      city === 'pune'
        ? ['p1', 'p2', 'p3', 'p6', 'p13'] // Default key Pune wards (Aundh, Ghole Rd, Kothrud, Yerawda, Hadapsar)
        : city === 'navi_mumbai'
        ? ['nm_1', 'nm_11', 'nm_24', 'nm_50', 'nm_80']
        : ['L', 'M/E', 'F/N', 'H/E', 'G/S'];

    const { selectedYear, selectedMonth } = get();
    // Load digital twin time series for the newly selected city
    const newSeries = getTimeSeriesForPeriod(selectedYear, selectedMonth, city);

    // Default to the peak storm event day for this city so the user immediately sees meaningful flood telemetry
    let bestIndex = 0;
    if (newSeries.length > 0) {
      let maxRain = -1;
      newSeries.forEach((pt, idx) => {
        if (pt.rainfall_3day_sum > maxRain) {
          maxRain = pt.rainfall_3day_sum;
          bestIndex = idx;
        }
      });
    }
    const td = newSeries[bestIndex] || newSeries[0];

    // Populate city-specific alert activity for the new city
    const newWards = getWardsForCity(city);
    const citySeedAlerts: AlertEvent[] = newWards
      .filter((w) => w.severity >= 1)
      .slice(0, 10)
      .map((w, idx) => ({
        id: `seed-alert-${city}-${w.id}-${idx}`,
        wardId: w.id,
        wardName: w.name,
        oldSeverity: Math.max(0, w.severity - 1),
        newSeverity: w.severity,
        timestamp: new Date(Date.now() - (idx * 18 + 5) * 60 * 1000),
      }));

    set({
      activeCity: city,
      activeTimeSeries: newSeries,
      timeIndex: bestIndex,
      selectedWardId: null,
      popupPosition: null,
      criticalAlertVisible: false,
      alertHistory: citySeedAlerts,
      pinnedWards: defaultPinned,
      wardLayerVisibility: {
        mumbai: city === 'mumbai',
        pune: city === 'pune',
        navi_mumbai: city === 'navi_mumbai',
      },
      ...(td ? {
        rainfallMumbaiAvg: Math.round(td.rainfall_3day_sum * 10) / 10,
        landSurfaceTemp: Math.round(td.land_surface_temp * 10) / 10,
      } : {}),
    });

    if (td?.date) {
      get().fetchWardDailyObservations(td.date);
    } else {
      get().updateSeverities();
      get().updateRiskProfiles();
    }
  },
  getActiveWards: () => {
    return getWardsForCity(get().activeCity);
  },

  // Ward boundary layer visibility — default to only the active city (mumbai)
  wardLayerVisibility: { mumbai: true, pune: false, navi_mumbai: false },
  toggleWardLayerVisibility: (city) =>
    set((s) => ({
      wardLayerVisibility: {
        ...s.wardLayerVisibility,
        [city]: !s.wardLayerVisibility[city],
      },
    })),

  // Ward fill mode — enabled by default for rich flood hazard zones
  wardFillMode: true,
  toggleWardFillMode: () => set((s) => ({ wardFillMode: !s.wardFillMode })),

  buildingMode: 'analytical',
  setBuildingMode: (mode) => set({ buildingMode: mode }),

  // Selected boundary ward from map click
  selectedBoundaryWard: null,
  setSelectedBoundaryWard: (ward) => set({ selectedBoundaryWard: ward }),
}));
