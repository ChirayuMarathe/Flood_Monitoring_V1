'use client';

import AppSidebar from '@/components/flood-dashboard/AppSidebar';
import CommandBar from '@/components/flood-dashboard/CommandBar';
import { WaveCanvas } from '@/components/landing/WaveCanvas';
import { useFloodStore } from '@/store/flood-store';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const updateSeverities = useFloodStore((s) => s.updateSeverities);

  useEffect(() => {
    updateSeverities();
  }, [updateSeverities]);

  return (
    <div className="w-screen h-screen bg-black text-white font-satoshi flex overflow-hidden relative">
      {/* Background Wave Canvas Animation */}
      <WaveCanvas />

      {/* Re-instated AppSidebar with ChainFund styling */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header className="flex items-center justify-between gap-4 px-6 py-3 flex-shrink-0 bg-black/80 backdrop-blur-xl border-b border-white/10">
          <CommandBar />
          <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
            <span className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] tracking-wider">
              LAT: 19.0760° N | LON: 72.8777° E
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative z-10 bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
