'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

const CesiumMapView = dynamic(() => import('@/components/flood-dashboard/CesiumMapView'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[#0B0D12] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#242832] border-t-[#5B8DEF] rounded-full animate-spin" />
        <p className="text-[11px] text-[#525866] font-mono">Initializing 3D Engine...</p>
      </div>
    </div>
  ),
});

const BottomPanel = dynamic(() => import('@/components/flood-dashboard/BottomPanel'), { ssr: false });
const WeatherWidget = dynamic(() => import('@/components/flood-dashboard/WeatherWidget'), { ssr: false });
const CriticalAlert = dynamic(() => import('@/components/flood-dashboard/CriticalAlert'), { ssr: false });
const RAGTerminal = dynamic(() => import('@/components/flood-dashboard/RAGTerminal'), { ssr: false });
const LiveRiskPanel = dynamic(() => import('@/components/flood-dashboard/LiveRiskPanel'), { ssr: false });
const IMDRainfallPredictor = dynamic(() => import('@/components/flood-dashboard/IMDRainfallPredictor'), { ssr: false });

import { useFloodStore } from '@/store/flood-store';
import { CloudRain } from 'lucide-react';

export default function MapPage() {
  const [mlPanelOpen, setMlPanelOpen] = useState(false);
  const [imdPanelOpen, setImdPanelOpen] = useState(false);
  const activeCity = useFloodStore((s) => s.activeCity);
  const switchCity = useFloodStore((s) => s.switchCity);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0B0D12]">
      <CesiumMapView />
      <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
        <WeatherWidget />

        {/* Top Controls Bar: AIDT ML Engine + IMD Realtime + 3-City Switcher HUD */}
        <div className="absolute top-4 left-4 z-30 pointer-events-auto flex items-center gap-2">
          {/* AIDT ML Engine Toggle */}
          <button
            onClick={() => {
              setMlPanelOpen((prev) => !prev);
              if (!mlPanelOpen) setImdPanelOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/90 backdrop-blur-2xl border border-white/15 text-white shadow-[0_8px_24px_rgba(0,0,0,0.7)] hover:bg-white/10 hover:border-white/30 transition-all font-satoshi text-xs font-semibold cursor-pointer group"
          >
            <div className="relative">
              <Activity size={13} className="text-white group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <span>AIDT ML Engine</span>
            {mlPanelOpen ? <ChevronUp size={12} className="text-zinc-400" /> : <ChevronDown size={12} className="text-zinc-400" />}
          </button>

          {/* IMD Real-Time Rainfall & Daily Prediction Button */}
          <button
            onClick={() => {
              setImdPanelOpen((prev) => !prev);
              if (!imdPanelOpen) setMlPanelOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/90 backdrop-blur-2xl border border-white/15 text-white shadow-[0_8px_24px_rgba(0,0,0,0.7)] hover:bg-white/10 hover:border-white/30 transition-all font-satoshi text-xs font-semibold cursor-pointer group"
          >
            <div className="relative">
              <CloudRain size={13} className="text-white group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white/80 animate-ping" />
            </div>
            <span>IMD Rainfall & Forecast</span>
            {imdPanelOpen ? <ChevronUp size={12} className="text-zinc-400" /> : <ChevronDown size={12} className="text-zinc-400" />}
          </button>
        </div>

        {/* Live Risk Panel Popup */}
        {mlPanelOpen && (
          <div className="absolute top-16 left-4 z-30 w-[380px] max-h-[305px] overflow-hidden pointer-events-auto rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.9)]">
            <LiveRiskPanel />
          </div>
        )}

        {/* IMD Real-Time Rainfall & Daily Prediction Component */}
        {imdPanelOpen && (
          <div className="absolute top-16 left-4 z-30 pointer-events-auto">
            <IMDRainfallPredictor onClose={() => setImdPanelOpen(false)} />
          </div>
        )}

        <BottomPanel />
        <RAGTerminal />
        <CriticalAlert />
      </div>
    </div>
  );
}
