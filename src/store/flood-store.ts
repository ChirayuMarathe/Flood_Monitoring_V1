import { create } from 'zustand';
import { mumbaiWards, timeSeriesData, type Ward, type TimeSeriesPoint } from '@/lib/mumbai-data';
import { puneWards } from '@/lib/pune-data';
import { naviMumbaiWards } from '@/lib/navi-mumbai-data';
import { wardProfileKey, type WardRiskProfile, type ClimateSnapshot, type WardZonalStats, type TrainingTableRow } from '@/lib/risk/WardRiskProfile';
import { computeRiskProfile } from '@/lib/risk/computeRiskProfile';
import { loadWardZonalStats, loadTrainingTable, loadClimateTimeSeries, buildClimateIndex } from '@/lib/risk/dataLoader';
import { getTimeSeriesForPeriod } from '@/lib/climate-service';

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
}

function computeSeverity(ward: Ward, timeIdx: number, series: TimeSeriesPoint[]): number {
  const td = series[timeIdx] || series[0];
  if (!td) return 0;
  const rainFactor = Math.max(0, (td.rainfall_3day_sum - 70) / 230);
  const soilFactor = Math.max(0, (td.soil_moisture - 0.22) / 0.58);
  // Normalize elevation based on high altitude (Pune > 200m) vs coastal/estuarine lowlands
  const elevBaseline = ward.elevation > 200 ? 620 : 16;
  const elevSpan = ward.elevation > 200 ? 80 : 16;
  const elevFactor = Math.max(0, (elevBaseline - ward.elevation) / elevSpan);
  const twiFactor = Math.max(0, (ward.twi - 6) / 5);
  const typeFactor = ward.wardType === 'coastal' ? 0.15 : ward.wardType === 'lowland' ? 0.1 : 0;
  const score = rainFactor * 0.35 + soilFactor * 0.25 + elevFactor * 0.2 + twiFactor * 0.15 + typeFactor;
  if (score > 0.65) return 3;
  if (score > 0.40) return 2;
  if (score > 0.18) return 1;
  return 0;
}

const initialTimeSeries = getTimeSeriesForPeriod(2024, 'monsoon');

export const useFloodStore = create<FloodState>((set, get) => ({
  selectedWardId: null,
  setSelectedWard: (id) => {
    set({ selectedWardId: id, ...(id ? { ragPanelOpen: true } : {}) });
    if (id) {
      const wards = getWardsForCity(get().activeCity);
      const ward = wards.find((w) => w.id === id);
      if (ward && get().wardSeverities[id] === 3) {
        set({ criticalAlertVisible: true });
      }
    }
  },
  selectedWard: () => {
    const { selectedWardId, activeCity } = get();
    if (!selectedWardId) return null;
    const wards = getWardsForCity(activeCity);
    return wards.find((w) => w.id === selectedWardId) ?? null;
  },

  // Multi-year and month timeline state
  selectedYear: 2024,
  selectedMonth: 'monsoon',
  activeTimeSeries: initialTimeSeries,

  setYear: (year: number) => {
    const { selectedMonth, timeIndex } = get();
    const newSeries = getTimeSeriesForPeriod(year, selectedMonth);
    const newTimeIndex = Math.min(timeIndex, Math.max(0, newSeries.length - 1));
    set({ selectedYear: year, activeTimeSeries: newSeries, timeIndex: newTimeIndex });
    get().updateSeverities();
    get().updateRiskProfiles();
  },

  setMonth: (month: number | 'all' | 'monsoon') => {
    const { selectedYear } = get();
    const newSeries = getTimeSeriesForPeriod(selectedYear, month);
    set({ selectedMonth: month, activeTimeSeries: newSeries, timeIndex: 0 });
    get().updateSeverities();
    get().updateRiskProfiles();
  },

  timeIndex: 38,
  setTimeIndex: (index) => {
    const series = get().activeTimeSeries;
    const maxIdx = Math.max(0, series.length - 1);
    set({ timeIndex: Math.max(0, Math.min(maxIdx, index)) });
    get().updateSeverities();
    get().updateRiskProfiles();
  },
  currentTimeData: () => {
    const { activeTimeSeries, timeIndex } = get();
    return activeTimeSeries[timeIndex] || activeTimeSeries[0] || timeSeriesData[0];
  },

  wardSeverities: {},
  updateSeverities: () => {
    const { timeIndex, selectedWardId, wardSeverities: oldSeverities, activeCity, activeTimeSeries } = get();
    const newSeverities: Record<string, number> = {};
    const newAlerts: AlertEvent[] = [];

    const wards = getWardsForCity(activeCity);
    wards.forEach((ward) => {
      const newSev = computeSeverity(ward, timeIndex, activeTimeSeries);
      newSeverities[ward.id] = newSev;

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

    set({
      wardSeverities: newSeverities,
      alertHistory: updatedHistory.slice(0, 50),
    });

    if (selectedWardId && newSeverities[selectedWardId] === 3) {
      set({ criticalAlertVisible: true });
    } else {
      set({ criticalAlertVisible: false });
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
      get().updateRiskProfiles();
    } catch (err) {
      console.error('[flood-store] Failed to load risk data:', err);
    }
  },

  updateRiskProfiles: () => {
    const { zonalStatsMap, trainingTable, timeIndex, activeCity, activeTimeSeries } = get();

    const td = activeTimeSeries[timeIndex] || activeTimeSeries[0] || timeSeriesData[0];
    // City-calibrated precipitation and soil moisture:
    // Pune: Deccan rain shadow plateau (~0.62x coastal deluge)
    // Navi Mumbai: Konkan creek & wetland micro-climate (~1.04x)
    // Mumbai: coastal island baseline (1.0x)
    const cityRainMultiplier = activeCity === 'pune' ? 0.62 : activeCity === 'navi_mumbai' ? 1.04 : 1.0;
    const citySoilMultiplier = activeCity === 'pune' ? 0.82 : activeCity === 'navi_mumbai' ? 1.12 : 1.0;

    const rain3Day = Math.round(td.rainfall_3day_sum * cityRainMultiplier);
    const soilMoisture = Math.min(0.95, Math.round(td.soil_moisture * citySoilMultiplier * 100) / 100);

    const prevTd = timeIndex > 0 ? activeTimeSeries[timeIndex - 1] : null;
    const nextTd = timeIndex < activeTimeSeries.length - 1 ? activeTimeSeries[timeIndex + 1] : null;

    const climate: ClimateSnapshot = {
      date: td.date || '2024-07-15',
      rainfallMm: rain3Day / 3,
      soilMoisture,
      landSurfaceTemp: td.land_surface_temp,
      rain2DaySum: rain3Day * 0.67,
      rain3DaySum: rain3Day,
      rainPrevDay: prevTd ? (prevTd.rainfall_3day_sum * cityRainMultiplier) / 3 : 0,
      rainNextDay: nextTd ? (nextTd.rainfall_3day_sum * cityRainMultiplier) / 3 : 0,
      tideLevel: activeCity === 'pune' ? null : rain3Day > 115 ? 4.2 : 2.8,
      riverLevel: activeCity === 'pune' ? (rain3Day > 85 ? 3.8 : 1.5) : null,
    };

    const profiles: Record<string, WardRiskProfile> = {};
    const wards = getWardsForCity(activeCity);

    wards.forEach((ward, i) => {
      let stats: WardZonalStats | undefined;
      const numericPart = parseInt(ward.id.replace(/\D/g, ''), 10);
      const gid = isNaN(numericPart) ? (i + 1) : numericPart;

      // Only Mumbai GIDs 1-24 exist in CSV zonalStatsMap
      if (activeCity === 'mumbai') {
        stats = zonalStatsMap.get(gid);
      }

      if (!stats) {
        // High-precision topographic stats calculated from ward metrics
        stats = {
          gid,
          name: ward.code || ward.name,
          elevationMean: ward.elevation,
          elevationMin: Math.max(1, ward.elevation - (ward.elevation > 100 ? 25 : 3)),
          elevationMax: ward.elevation + (ward.elevation > 100 ? 40 : 15),
          flowAccumulationMean: ward.wardType === 'coastal' ? 0.14 : ward.wardType === 'lowland' ? 0.09 : 0.03,
          flowAccumulationMin: 0.0002,
          flowAccumulationMax: 15.0,
          twiMean: ward.twi,
          twiMin: Math.max(3, ward.twi - 2.0),
          twiMax: ward.twi + 6.0,
        };
      }

      const profile = computeRiskProfile(
        ward.id,
        ward.name,
        activeCity,
        stats,
        climate,
        activeCity === 'mumbai' ? trainingTable : []
      );
      profiles[ward.id] = profile;
      if (ward.code) profiles[ward.code] = profile;
      if (ward.code) profiles[`mumbai_${ward.code}`] = profile;
      profiles[`mumbai_${ward.id}`] = profile;
      profiles[ward.name] = profile;
    });

    set({ wardRiskProfiles: profiles });
  },

  getWardRiskProfile: (wardId: string) => {
    const key = wardProfileKey(wardId);
    const map = get().wardRiskProfiles;
    return map[key] || map[wardId] || map[`mumbai_${wardId}`] || map[`mumbai_${key}`] || null;
  },

  rainfallMumbaiAvg: 156,
  landSurfaceTemp: 31.8,
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

  pinnedWards: ['11', '10', '20', '4', '23'], // Default: critical/high-risk wards
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
    set({ activeCity: city, selectedWardId: null, popupPosition: null });
    get().updateSeverities();
    get().updateRiskProfiles();
  },
  getActiveWards: () => {
    return getWardsForCity(get().activeCity);
  },

  // Ward boundary layer visibility — all cities visible by default
  wardLayerVisibility: { mumbai: true, pune: true, navi_mumbai: true },
  toggleWardLayerVisibility: (city) =>
    set((s) => ({
      wardLayerVisibility: {
        ...s.wardLayerVisibility,
        [city]: !s.wardLayerVisibility[city],
      },
    })),

  // Ward fill mode — off by default (outline only)
  wardFillMode: false,
  toggleWardFillMode: () => set((s) => ({ wardFillMode: !s.wardFillMode })),

  buildingMode: 'analytical',
  setBuildingMode: (mode) => set({ buildingMode: mode }),

  // Selected boundary ward from map click
  selectedBoundaryWard: null,
  setSelectedBoundaryWard: (ward) => set({ selectedBoundaryWard: ward }),
}));
