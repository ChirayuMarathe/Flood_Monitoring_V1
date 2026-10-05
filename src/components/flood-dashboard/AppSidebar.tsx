'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Map, AlertTriangle, Building2, FileText,
  ChevronDown, ChevronUp, Radio, ArrowLeft, Eye, EyeOff, Paintbrush, Boxes
} from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards } from '@/lib/mumbai-data';
import { puneWards } from '@/lib/pune-data';
import { useState } from 'react';
import { Logo } from './Logo';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Live Map', icon: Map, live: true },
  { href: '/alerts', label: 'Alerts', icon: AlertTriangle, badgeCount: true },
  { href: '#wards', label: 'Wards', icon: Building2, expandable: true },
  { href: '/reports', label: 'Reports', icon: FileText },
];

// City layer config for the ward controls
const CITY_LAYERS = [
  { key: 'mumbai' as const, label: 'Mumbai', color: '#FFFFFF', wardCount: 24 },
  { key: 'pune' as const, label: 'Pune', color: '#D4D4D8', wardCount: 58 },
  { key: 'navi_mumbai' as const, label: 'Navi Mumbai', color: '#A1A1AA', wardCount: 111 },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { 
    pinnedWards, wardSeverities, setSelectedWard, 
    activeCity, switchCity,
    wardLayerVisibility, toggleWardLayerVisibility,
    wardFillMode, toggleWardFillMode,
    buildingMode, setBuildingMode,
  } = useFloodStore();
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [wardsOpen, setWardsOpen] = useState(true);
  const isOnMap = pathname === '/map';

  const alertCount = Object.values(wardSeverities).filter((s) => s >= 2).length;

  return (
    <aside className="h-full flex flex-col w-[250px] flex-shrink-0 bg-black/90 backdrop-blur-xl border-r border-white/10 z-20 font-satoshi">
      {/* Brand & Home Link */}
      <div className="px-4 pt-4 pb-3 flex flex-col gap-2">
        <Link href="/" className="flex items-center justify-between text-[11px] text-gray-400 hover:text-white transition-colors group mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Landing
          </span>
          <span className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-300">MAIN</span>
        </Link>
        <Link href="/" className="flex items-center gap-3 group">
          <Logo size={28} />
          <div>
            <h1 className="text-[15px] font-bold font-clash text-white tracking-tight leading-tight group-hover:text-zinc-200 transition-colors">Mumbai Flood</h1>
            <p className="text-[9px] text-zinc-400 uppercase tracking-[0.15em] font-mono font-semibold">Command Center</p>
          </div>
        </Link>
      </div>

      <div className="mx-4 border-t border-white/10" />

      {/* City Switcher — now includes Navi Mumbai */}
      <div className="px-4 py-3">
        <div className="flex bg-white/[0.04] rounded-xl p-1 border border-white/10">
          {(['mumbai', 'pune', 'navi_mumbai'] as const).map((city) => (
            <button
              key={city}
              onClick={() => switchCity(city)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                activeCity === city
                  ? 'bg-white/15 text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {city === 'navi_mumbai' ? 'Navi Mum.' : city.charAt(0).toUpperCase() + city.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-4 border-t border-white/10" />

      {/* Navigation Links */}
      <nav className="flex-1 px-3 pt-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive =
            (item.href === '/dashboard' && item.label === 'Dashboard' && (pathname === '/dashboard' || pathname === '/')) ||
            (item.href !== '/dashboard' && item.href !== '#wards' && pathname === item.href);
          const Icon = item.icon;

          // Handle expandable "Wards" item
          if (item.expandable) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setWardsOpen(!wardsOpen)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                    wardsOpen && isOnMap
                      ? 'bg-white/10 text-white border border-white/15 shadow-sm font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} className={wardsOpen && isOnMap ? 'text-white' : 'text-gray-400'} />
                  <span className="flex-1 text-left font-satoshi">{item.label}</span>
                  {wardsOpen ? (
                    <ChevronUp size={12} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={12} className="text-gray-400" />
                  )}
                </button>

                {/* Ward Layer Controls (collapsible accordion) */}
                <AnimatePresence>
                  {wardsOpen && isOnMap && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pr-2 py-2 space-y-1.5">
                        {/* Per-city visibility toggles */}
                        {CITY_LAYERS.map((cityLayer) => (
                          <button
                            key={cityLayer.key}
                            onClick={() => toggleWardLayerVisibility(cityLayer.key)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all hover:bg-white/5 group"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 border"
                              style={{
                                backgroundColor: wardLayerVisibility[cityLayer.key] ? cityLayer.color : 'transparent',
                                borderColor: cityLayer.color,
                                opacity: wardLayerVisibility[cityLayer.key] ? 1 : 0.4,
                              }}
                            />
                            <span className={`flex-1 text-left text-[11px] font-medium ${
                              wardLayerVisibility[cityLayer.key] ? 'text-white' : 'text-gray-500'
                            }`}>
                              {cityLayer.label}
                            </span>
                            <span className="text-[9px] font-mono text-gray-500">
                              {cityLayer.wardCount}
                            </span>
                            {wardLayerVisibility[cityLayer.key] ? (
                              <Eye size={12} className="text-gray-400 flex-shrink-0" />
                            ) : (
                              <EyeOff size={12} className="text-gray-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}

                        {/* Building layer: toggle ward-only 3D buildings on / off */}
                        <div className="border-t border-white/5 pt-1.5 mt-1">
                          <button
                            onClick={() => setBuildingMode(buildingMode === 'analytical' ? 'off' : 'analytical')}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all hover:bg-white/5"
                          >
                            <Boxes size={12} className={buildingMode === 'analytical' ? 'text-white' : 'text-gray-500'} />
                            <span className={`flex-1 text-left text-[11px] font-medium ${
                              buildingMode === 'analytical' ? 'text-white' : 'text-gray-400'
                            }`}>
                              Ward Buildings
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                              buildingMode === 'analytical'
                                ? 'bg-white/15 text-white'
                                : 'bg-white/5 text-gray-500'
                            }`}>
                              {buildingMode === 'analytical' ? 'ACTIVE' : 'OFF'}
                            </span>
                          </button>
                        </div>

                        {/* Fill mode toggle */}
                        <div className="border-t border-white/5 pt-1.5 mt-1">
                          <button
                            onClick={toggleWardFillMode}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all hover:bg-white/5"
                          >
                            <Paintbrush size={12} className={wardFillMode ? 'text-white' : 'text-gray-500'} />
                            <span className={`flex-1 text-left text-[11px] font-medium ${
                              wardFillMode ? 'text-white' : 'text-gray-400'
                            }`}>
                              Fill Mode
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                              wardFillMode 
                                ? 'bg-white/15 text-white' 
                                : 'bg-white/5 text-gray-500'
                            }`}>
                              {wardFillMode ? 'ON' : 'OFF'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-white/10 text-white border border-white/15 shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400'} />
              <span className="flex-1 font-satoshi">{item.label}</span>
              {item.live && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium text-white bg-white/10 border border-white/20">
                  <Radio size={8} className="animate-pulse" />
                  Live
                </span>
              )}
              {item.badgeCount && alertCount > 0 && (
                <span className="min-w-[20px] h-[20px] rounded-full text-[10px] font-bold text-black bg-white border border-white flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 border-t border-white/10" />

      {/* Pinned Wards Section */}
      <div className="px-3 pt-3 pb-4">
        <button
          onClick={() => setPinnedOpen(!pinnedOpen)}
          className="flex items-center justify-between w-full px-2 py-1 mb-1.5 text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-[10px] uppercase tracking-[0.15em] font-mono font-semibold text-gray-400">
            Pinned Wards
          </span>
          {pinnedOpen ? (
            <ChevronUp size={12} className="text-gray-400" />
          ) : (
            <ChevronDown size={12} className="text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {pinnedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden space-y-1"
            >
              {pinnedWards.map((wardId) => {
                const allWards = activeCity === 'pune' ? puneWards : mumbaiWards;
                const ward = allWards.find((w) => w.id === wardId);
                if (!ward) return null;
                const sev = wardSeverities[wardId] ?? 0;
                return (
                  <Link
                    key={wardId}
                    href="/map"
                    onClick={() => setSelectedWard(wardId)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all border border-transparent hover:border-white/10 hover:bg-white/5 group"
                  >
                    <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-mono font-bold text-white flex-shrink-0 border border-white/10">
                      {ward.code.length > 2 ? ward.code.slice(0, 2) : ward.code}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-[12px] text-gray-300 group-hover:text-white truncate block font-satoshi">
                        {ward.name}
                      </span>
                    </span>
                    {sev >= 3 && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] flex-shrink-0" />
                    )}
                    {sev === 2 && (
                      <span className="w-2 h-2 rounded-full bg-zinc-400 flex-shrink-0" />
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
