'use client';

import AppSidebar from '@/components/flood-dashboard/AppSidebar';
import CommandBar from '@/components/flood-dashboard/CommandBar';
import { useFloodStore } from '@/store/flood-store';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const updateSeverities = useFloodStore((s) => s.updateSeverities);

  useEffect(() => {
    updateSeverities();
  }, [updateSeverities]);

  return (
    <div className="w-screen h-screen bg-[#0B0D12] flex overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-5 py-2.5 flex-shrink-0 bg-[#0B0D12] border-b border-[#1A1E27]">
          <CommandBar />
        </header>
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
