'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, AlertTriangle, Building2, FileText,
  ChevronDown, ChevronUp, Radio
} from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards } from '@/lib/mumbai-data';
import { useState } from 'react';
import { Logo } from './Logo';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Live Map', icon: Map, live: true },
  { href: '/dashboard', label: 'Alerts', icon: AlertTriangle, badgeCount: true },
  { href: '/dashboard', label: 'Wards', icon: Building2 },
  { href: '/dashboard', label: 'Reports', icon: FileText },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { pinnedWards, wardSeverities, setSelectedWard } = useFloodStore();
  const [pinnedOpen, setPinnedOpen] = useState(true);

  const alertCount = Object.values(wardSeverities).filter((s) => s >= 2).length;

  return (
    <aside className="h-full flex flex-col w-[240px] flex-shrink-0 bg-[#0F1117] border-r border-[#242832]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Logo size={30} />
        <div>
          <h1 className="text-[14px] font-semibold text-[#E1E4EA] tracking-tight leading-tight">Mumbai Flood</h1>
          <p className="text-[9px] text-[#525866] uppercase tracking-[0.12em] font-medium">Command Center</p>
        </div>
      </div>

      <div className="mx-4 border-t border-[#1A1E27]" />

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive =
            (item.href === '/dashboard' && item.label === 'Dashboard' && (pathname === '/dashboard' || pathname === '/')) ||
            (item.href === '/map' && pathname === '/map');
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#1A1E27] text-[#E1E4EA]'
                  : 'text-[#8B919E] hover:text-[#C1C5CD] hover:bg-[#13161D]'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-[#C1C5CD]' : 'text-[#525866]'} />
              <span className="flex-1">{item.label}</span>
              {item.live && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-[#5B8DEF] bg-[#5B8DEF]/8 border border-[#5B8DEF]/15">
                  <Radio size={8} />
                  Live
                </span>
              )}
              {item.badgeCount && alertCount > 0 && (
                <span className="min-w-[20px] h-[20px] rounded text-[10px] font-semibold text-[#D94444] bg-[#D94444]/8 border border-[#D94444]/15 flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 border-t border-[#1A1E27]" />

      {/* Pinned Wards */}
      <div className="px-3 pt-3 pb-4">
        <button
          onClick={() => setPinnedOpen(!pinnedOpen)}
          className="flex items-center justify-between w-full px-2 py-1 mb-1.5"
        >
          <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-[#525866]">
            Pinned Stations
          </span>
          {pinnedOpen ? (
            <ChevronUp size={11} className="text-[#525866]" />
          ) : (
            <ChevronDown size={11} className="text-[#525866]" />
          )}
        </button>

        <AnimatePresence>
          {pinnedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden space-y-0.5"
            >
              {pinnedWards.map((wardId) => {
                const ward = mumbaiWards.find((w) => w.id === wardId);
                if (!ward) return null;
                const sev = wardSeverities[wardId] ?? 0;
                return (
                  <Link
                    key={wardId}
                    href="/map"
                    onClick={() => setSelectedWard(wardId)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors hover:bg-[#13161D] group"
                  >
                    <span className="w-6 h-6 rounded bg-[#1A1E27] flex items-center justify-center text-[9px] font-semibold text-[#8B919E] flex-shrink-0 border border-[#242832]">
                      {ward.code.length > 2 ? ward.code.slice(0, 2) : ward.code}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-[12px] text-[#8B919E] group-hover:text-[#C1C5CD] truncate block">
                        {ward.name}
                      </span>
                    </span>
                    {sev >= 3 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D94444] flex-shrink-0" />
                    )}
                    {sev === 2 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B919E] flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
