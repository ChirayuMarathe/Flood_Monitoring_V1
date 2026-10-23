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
  { href: '/map', label: 'Live 3D Map', icon: Map, live: true },
  { href: '/dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alerts', icon: AlertTriangle, badgeCount: true },
  { href: '#wards', label: 'Wards', icon: Building2, expandable: true },
  { href: '/reports', label: 'Reports', icon: FileText },
];

// City layer config for the ward controls
const CITY_LAYERS = [
  { key: 'mumbai' as const, label: 'BMC (Mumbai)', color: '#FFFFFF', wardCount: 24 },
  { key: 'pune' as const, label: 'PMC (Pune)', color: '#D4D4D8', wardCount: 15 },
  { key: 'navi_mumbai' as const, label: 'NMMC (Navi Mumbai)', color: '#A1A1AA', wardCount: 111 },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { 
    pinnedWards, wardSeverities, setSelectedWard, 
    activeCity, switchCity, getActiveWards,
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
      <div className="px-4 pt-3 pb-2 flex flex-col gap-1.5">
        <Link href="/" className="flex items-center justify-between text-[11px] text-gray-400 hover:text-white transition-colors group mb-0.5">
          <span className="flex items-center gap-1.5 font-medium">
            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Landing
          </span>
          <span className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-300">MAIN</span>
        </Link>
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo size={26} />
          <div>
            <h1 className="text-[14px] font-bold font-clash text-white tracking-tight leading-tight group-hover:text-zinc-200 transition-colors">
              {activeCity === 'pune' ? 'Pune Flood' : activeCity === 'navi_mumbai' ? 'Navi Mumbai Flood' : 'Mumbai Flood'}
            </h1>
            <p className="text-[9px] text-zinc-400 uppercase tracking-[0.15em] font-mono font-semibold">
              {activeCity === 'pune' ? 'PMC Command Center' : activeCity === 'navi_mumbai' ? 'NMMC Command Center' : 'BMC Command Center'}
            </p>
          </div>
        </Link>
      </div>

      <div className="mx-4 border-t border-white/10" />

      {/* City Switcher — BMC, Pune, NMMC */}
      <div className="px-4 py-2">
        <div className="flex bg-white/[0.04] rounded-xl p-0.5 border border-white/10">
          {(['mumbai', 'pune', 'navi_mumbai'] as const).map((city) => (
            <button
              key={city}
              onClick={() => switchCity(city)}
              className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
                activeCity === city
                  ? 'bg-white/15 text-white shadow-sm font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {city === 'mumbai' ? 'BMC' : city === 'pune' ? 'Pune' : 'NMMC'}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-4 border-t border-white/10" />

      {/* Navigation Links */}
      <nav className="flex-1 px-3 pt-2 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = item.href !== '#wards' && pathname === item.href;
          const Icon = item.icon;

          // Handle expandable "Wards" item
          if (item.expandable) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setWardsOpen(!wardsOpen)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all ${
                    wardsOpen && isOnMap
                      ? 'bg-white/10 text-white border border-white/15 shadow-sm font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} className={wardsOpen && isOnMap ? 'text-white' : 'text-gray-400'} />
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
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-3 pr-1 py-1 space-y-0.5">
                        {/* Per-city region selection */}
                        {CITY_LAYERS.map((cityLayer) => {
                          const isSelected = activeCity === cityLayer.key;
                          const isVisible = wardLayerVisibility[cityLayer.key];
                          return (
                            <div
                              key={cityLayer.key}
                              onClick={() => switchCity(cityLayer.key)}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-white/10 text-white font-medium border border-white/15 shadow-sm'
                                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 border transition-all ${
                                  isSelected ? 'ring-2 ring-white/30' : ''
                                }`}
                                style={{
                                  backgroundColor: isSelected ? '#FFFFFF' : isVisible ? cityLayer.color : 'transparent',
                                  borderColor: isSelected ? '#FFFFFF' : cityLayer.color,
                                  opacity: isVisible || isSelected ? 1 : 0.35,
                                }}
                              />
                              <span className="flex-1 text-left text-[11px]">
                                {cityLayer.label}
                              </span>
                              <span className="text-[9px] font-mono text-gray-500">
                                {cityLayer.wardCount}
                              </span>
                              <button
                                type="button"
                                title={isVisible ? 'Hide boundary layer' : 'Show boundary layer'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWardLayerVisibility(cityLayer.key);
                                }}
                                className="p-0.5 hover:bg-white/10 rounded transition-colors"
                              >
                                {isVisible ? (
                                  <Eye size={12} className="text-gray-300 hover:text-white flex-shrink-0" />
                                ) : (
                                  <EyeOff size={12} className="text-gray-600 hover:text-gray-400 flex-shrink-0" />
                                )}
                              </button>
                            </div>
                          );
                        })}

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
      <div className="px-3 pt-2 pb-2">
        <button
          onClick={() => setPinnedOpen(!pinnedOpen)}
          className="flex items-center justify-between w-full px-2 py-0.5 mb-1 text-gray-400 hover:text-white transition-colors"
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
              className="overflow-hidden space-y-0.5"
            >
              {pinnedWards.map((wardId) => {
                const allWards = getActiveWards();
                const ward = allWards.find((w) => w.id === wardId);
                if (!ward) return null;
                const sev = wardSeverities[wardId] ?? 0;
                return (
                  <Link
                    key={wardId}
                    href="/map"
                    onClick={() => setSelectedWard(wardId)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all border border-transparent hover:border-white/10 hover:bg-white/5 group"
                  >
                    <span className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[9px] font-mono font-bold text-white flex-shrink-0 border border-white/10">
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
