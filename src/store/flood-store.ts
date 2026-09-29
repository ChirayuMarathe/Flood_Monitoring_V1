import { create } from 'zustand';
import { mumbaiWards, timeSeriesData, type Ward, type TimeSeriesPoint } from '@/lib/mumbai-data';
import { puneWards } from '@/lib/pune-data';
import type { WardRiskProfile, ClimateSnapshot, WardZonalStats, TrainingTableRow } from '@/lib/risk/WardRiskProfile';
import { computeRiskProfile } from '@/lib/risk/computeRiskProfile';
import { loadWardZonalStats, loadTrainingTable, loadClimateTimeSeries, buildClimateIndex } from '@/lib/risk/dataLoader';

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
  const rainFactor = Math.max(0, (td.rainfall_3day_sum - 80) / 220);
  const soilFactor = Math.max(0, (td.soil_moisture - 0.25) / 0.55);
  const elevFactor = Math.max(0, (12 - ward.elevation) / 12);
  const twiFactor = Math.max(0, (ward.twi - 6) / 5);
  const typeFactor = ward.wardType === 'coastal' ? 0.15 : ward.wardType === 'lowland' ? 0.1 : 0;
  const score = rainFactor * 0.35 + soilFactor * 0.25 + elevFactor * 0.2 + twiFactor * 0.15 + typeFactor;
  if (score > 0.7) return 3;
  if (score > 0.45) return 2;
  if (score > 0.2) return 1;
  return 0;
}

export const useFloodStore = create<FloodState>((set, get) => ({
  selectedWardId: null,
  setSelectedWard: (id) => {
    set({ selectedWardId: id });
    if (id) {
      const ward = mumbaiWards.find((w) => w.id === id);
      if (ward && get().wardSeverities[id] === 3) {
        set({ criticalAlertVisible: true });
      }
    }
  },
  selectedWard: () => {
    const { selectedWardId, activeCity } = get();
    if (!selectedWardId) return null;
    const wards = activeCity === 'pune' ? puneWards : mumbaiWards;
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
    const { timeIndex, selectedWardId, wardSeverities: oldSeverities } = get();
    const newSeverities: Record<string, number> = {};
    const newAlerts: AlertEvent[] = [];

    const wards = get().activeCity === 'pune' ? puneWards : mumbaiWards;
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

    set((state) => ({
      wardSeverities: newSeverities,
      alertHistory: [...newAlerts, ...state.alertHistory].slice(0, 50),
    }));

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

    // Get the climate snapshot for the current time index
    // Map timeIndex (0-29) to an actual climate date — use the enriched CSV
    // For now, use the July monsoon dates from the time series
    const td = timeSeriesData[timeIndex];
    const climate: ClimateSnapshot = {
      date: td.date || '2024-07-15',
      rainfallMm: td.rainfall_3day_sum / 3, // approximate daily from 3-day sum
      soilMoisture: td.soil_moisture,
      landSurfaceTemp: td.land_surface_temp,
      rain2DaySum: td.rainfall_3day_sum * 0.67,
      rain3DaySum: td.rainfall_3day_sum,
      rainPrevDay: timeIndex > 0 ? timeSeriesData[timeIndex - 1].rainfall_3day_sum / 3 : 0,
      rainNextDay: timeIndex < 29 ? timeSeriesData[timeIndex + 1].rainfall_3day_sum / 3 : 0,
      tideLevel: null,
      riverLevel: null,
    };

    const profiles: Record<string, WardRiskProfile> = {};
    const wards = activeCity === 'pune' ? puneWards : mumbaiWards;

    for (const ward of wards) {
      const gid = parseInt(ward.id, 10);
      const stats = zonalStatsMap.get(gid);
      if (!stats) continue;

      const profile = computeRiskProfile(
        gid,
        ward.name,
        activeCity as 'mumbai' | 'pune' | 'navi_mumbai',
        stats,
        climate,
        trainingTable
      );
      profiles[ward.id] = profile;
    }

    set({ wardRiskProfiles: profiles });

    // Log 5 sample profiles for verification (Phase 1 checklist item)
    const sampleIds = Object.keys(profiles).slice(0, 5);
    for (const id of sampleIds) {
      const p = profiles[id];
      console.log(`[RiskProfile] ${p.wardName}: severity=${p.overallSeverity}, primary=${p.primaryHazard}, hazards=${p.activeHazards.length}`, p);
    }
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
    // Recompute severities for the new city
    setTimeout(() => get().updateSeverities(), 0);
  },
  getActiveWards: () => {
    return get().activeCity === 'pune' ? puneWards : mumbaiWards;
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
