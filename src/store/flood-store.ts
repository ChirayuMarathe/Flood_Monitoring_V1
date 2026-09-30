import { create } from 'zustand';
import { mumbaiWards, timeSeriesData, type Ward, type TimeSeriesPoint } from '@/lib/mumbai-data';
import { puneWards } from '@/lib/pune-data';
import { naviMumbaiWards } from '@/lib/navi-mumbai-data';
import type { WardRiskProfile, ClimateSnapshot, WardZonalStats, TrainingTableRow } from '@/lib/risk/WardRiskProfile';
import { computeRiskProfile } from '@/lib/risk/computeRiskProfile';
import { loadWardZonalStats, loadTrainingTable, loadClimateTimeSeries, buildClimateIndex } from '@/lib/risk/dataLoader';

export function getWardsForCity(city: 'mumbai' | 'pune' | 'navi_mumbai'): Ward[] {
  if (city === 'pune') return puneWards;
  if (city === 'navi_mumbai') return naviMumbaiWards;
  return mumbaiWards;
}

/** 'photoreal' = Google photogrammetry; 'analytical' = our risk-colorable extrusions. */
export type BuildingMode = 'photoreal' | 'analytical';

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

function computeSeverity(ward: Ward, timeIdx: number): number {
  const td = timeSeriesData[timeIdx];
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

export const useFloodStore = create<FloodState>((set, get) => ({
  selectedWardId: null,
  setSelectedWard: (id) => {
    set({ selectedWardId: id });
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

  timeIndex: 14,
  setTimeIndex: (index) => {
    set({ timeIndex: Math.max(0, Math.min(29, index)) });
    get().updateSeverities();
    get().updateRiskProfiles();
  },
  currentTimeData: () => timeSeriesData[get().timeIndex],

  wardSeverities: {},
  updateSeverities: () => {
    const { timeIndex, selectedWardId, wardSeverities: oldSeverities, activeCity } = get();
    const newSeverities: Record<string, number> = {};
    const newAlerts: AlertEvent[] = [];

    const wards = getWardsForCity(activeCity);
    wards.forEach((ward) => {
      const newSev = computeSeverity(ward, timeIndex);
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
    const { riskDataLoaded, zonalStatsMap, trainingTable, timeIndex, activeCity } = get();
    if (!riskDataLoaded) return;

    const td = timeSeriesData[timeIndex];
    const climate: ClimateSnapshot = {
      date: td.date || '2024-07-15',
      rainfallMm: td.rainfall_3day_sum / 3,
      soilMoisture: td.soil_moisture,
      landSurfaceTemp: td.land_surface_temp,
      rain2DaySum: td.rainfall_3day_sum * 0.67,
      rain3DaySum: td.rainfall_3day_sum,
      rainPrevDay: timeIndex > 0 ? timeSeriesData[timeIndex - 1].rainfall_3day_sum / 3 : 0,
      rainNextDay: timeIndex < 29 ? timeSeriesData[timeIndex + 1].rainfall_3day_sum / 3 : 0,
      tideLevel: activeCity === 'pune' ? null : td.rainfall_3day_sum > 120 ? 4.2 : 2.8,
      riverLevel: activeCity === 'pune' ? (td.rainfall_3day_sum > 120 ? 3.8 : 1.5) : null,
    };

    const profiles: Record<string, WardRiskProfile> = {};
    const wards = getWardsForCity(activeCity);

    wards.forEach((ward, i) => {
      const numericPart = parseInt(ward.id.replace(/\D/g, ''), 10);
      const gid = isNaN(numericPart) ? (i + 1) : numericPart;
      let stats = zonalStatsMap.get(gid);
      if (!stats) {
        // Fallback zonal stats calculated from ward topographic metrics
        stats = {
          gid,
          name: ward.code || ward.name,
          elevationMean: ward.elevation,
          elevationMin: Math.max(1, ward.elevation - (ward.elevation > 100 ? 30 : 4)),
          elevationMax: ward.elevation + (ward.elevation > 100 ? 50 : 25),
          flowAccumulationMean: ward.wardType === 'coastal' ? 0.12 : ward.wardType === 'lowland' ? 0.08 : 0.03,
          flowAccumulationMin: 0.0002,
          flowAccumulationMax: 15.0,
          twiMean: ward.twi,
          twiMin: Math.max(3, ward.twi - 2.5),
          twiMax: ward.twi + 12,
        };
      }

      const profile = computeRiskProfile(
        gid,
        ward.name,
        activeCity,
        stats,
        climate,
        trainingTable
      );
      profiles[ward.id] = profile;
    });

    set({ wardRiskProfiles: profiles });
  },

  getWardRiskProfile: (wardId: string) => {
    return get().wardRiskProfiles[wardId] || null;
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

  buildingMode: 'photoreal',
  setBuildingMode: (mode) => set({ buildingMode: mode }),

  // Selected boundary ward from map click
  selectedBoundaryWard: null,
  setSelectedBoundaryWard: (ward) => set({ selectedBoundaryWard: ward }),
}));
