'use client';

import dynamic from 'next/dynamic';
import LeftSidebar from '@/components/flood-dashboard/LeftSidebar';
import BottomPanel from '@/components/flood-dashboard/BottomPanel';
import WeatherWidget from '@/components/flood-dashboard/WeatherWidget';
import CriticalAlert from '@/components/flood-dashboard/CriticalAlert';
import WardInfoCard from '@/components/flood-dashboard/WardInfoCard';
import RAGTerminal from '@/components/flood-dashboard/RAGTerminal';
import { useFloodStore } from '@/store/flood-store';
import { useEffect } from 'react';

const MapView = dynamic(() => import('@/components/flood-dashboard/MapView'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[#080a10] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
        <p className="text-xs text-white/30 font-mono">Initializing 3D Engine...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const updateSeverities = useFloodStore((s) => s.updateSeverities);

  useEffect(() => {
    updateSeverities();
  }, [updateSeverities]);

  return (
    <div className="w-screen h-screen bg-[#080a10] relative overflow-hidden">
      <MapView />
      <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
        <LeftSidebar />
        <WardInfoCard />
        <WeatherWidget />
        <BottomPanel />
        <RAGTerminal />
        <CriticalAlert />
      </div>
    </div>
  );
}
