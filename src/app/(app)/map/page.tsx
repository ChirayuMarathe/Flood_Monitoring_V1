'use client';

import dynamic from 'next/dynamic';

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
const WardInfoCard = dynamic(() => import('@/components/flood-dashboard/WardInfoCard'), { ssr: false });
const RAGTerminal = dynamic(() => import('@/components/flood-dashboard/RAGTerminal'), { ssr: false });

export default function MapPage() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0B0D12]">
      <CesiumMapView />
      <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
        <WardInfoCard />
        <WeatherWidget />
        <BottomPanel />
        <RAGTerminal />
        <CriticalAlert />
      </div>
    </div>
  );
}
