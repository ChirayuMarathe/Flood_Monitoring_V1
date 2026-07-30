'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, MapPin, Mountain, Droplets, Thermometer, Building2,
  AlertTriangle, Layers, Zap, Activity
} from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards, severityColors, severityColorHex } from '@/lib/mumbai-data';
import { useRef } from 'react';

function SeverityDot({ severity }: { severity: number }) {
  const color = severityColorHex[severity];
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{
        backgroundColor: color,
        boxShadow: severity >= 2 ? `0 0 8px ${color}` : 'none',
      }}
    />
  );
}

function MetricCard({ icon: Icon, label, value, unit, color = '#94a3b8' }: {
  icon: React.ElementType; label: string; value: string | number; unit?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={14} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{label}</div>
        <div className="text-sm font-semibold text-white/90 truncate">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="text-white/40 text-xs ml-0.5">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

export default function LeftSidebar() {
  const {
    selectedWardId, setSelectedWard, selectedWard, sidebarCollapsed, toggleSidebar,
    wardSeverities, criticalAlertVisible
  } = useFloodStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 0 : 340 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute left-0 top-0 bottom-0 z-20 flex"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="h-full flex flex-col overflow-hidden"
        style={{
          width: 340,
          pointerEvents: 'auto',
          background: 'rgba(12, 14, 20, 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4A853]/15 flex items-center justify-center">
              <Zap size={16} className="text-[#D4A853]" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-white tracking-tight">Mumbai Flood</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Command Center</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} className="text-white/60" />
          </button>
        </div>

        <div className="mx-4 border-t border-white/6" />

        {/* Ward Selector */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5 mb-2.5">
            <MapPin size={12} className="text-white/40" />
            <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">Ward Selection</span>
          </div>
          <div ref={scrollRef} className="max-h-52 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
            {mumbaiWards.map((w) => {
              const wSev = wardSeverities[w.id] ?? 0;
              const isActive = selectedWardId === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWard(w.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#D4A853]/10 border-l-2 border-[#D4A853]'
                      : 'hover:bg-white/4 border-l-2 border-transparent'
                  }`}
                >
                  <SeverityDot severity={wSev} />
                  <span className={`text-[13px] font-medium flex-1 truncate ${
                    isActive ? 'text-[#D4A853]' : 'text-white/70 group-hover:text-white/90'
                  }`}
                  >
                    {w.name}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-[#D4A853]/20 text-[#D4A853]' : 'bg-white/5 text-white/30'
                  }`}
                  >
                    {w.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-4 border-t border-white/6" />

        {/* Topography & LULC HUD */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 custom-scrollbar">
          <div className="flex items-center gap-1.5 mb-3">
            <Layers size={12} className="text-white/40" />
            <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">
              Topography & LULC
            </span>
          </div>

          <AnimatePresence mode="wait">
            {ward ? (
              <motion.div
                key={ward.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-sm font-bold px-2 py-0.5 rounded-md border ${severityColors[severity].bg}`}
                  >
                    {severityColors[severity].label}
                  </span>
                  <span className="text-xs text-white/40">
                    {ward.wardType.toUpperCase()} ZONE
                  </span>
                </div>

                <MetricCard icon={Mountain} label="Mean Elevation" value={ward.elevation} unit="m" color="#22c55e" />
                <MetricCard icon={Droplets} label="TWI Index" value={ward.twi.toFixed(2)} color="#3b82f6" />
                <MetricCard icon={Building2} label="Urban Built-up Area" value={ward.urbanArea} unit="M sq m" color="#a855f7" />
                <MetricCard icon={Activity} label="Population" value={ward.population} color="#D4A853" />
                <MetricCard icon={Thermometer} label="Land Surface Temp" value={ward.landSurfaceTemp} unit="°C" color="#ef4444" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <MapPin size={24} className="text-white/15 mx-auto mb-2" />
                <p className="text-xs text-white/30">Select a ward to view metrics</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-white/6">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={12} className="text-white/40" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">Severity Legend</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(severityColors).map(([sev, val]) => (
                <div key={sev} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/3">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: severityColorHex[Number(sev)] }} />
                  <span className="text-[11px] text-white/60">{val.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed toggle */}
      <AnimatePresence>
        {sidebarCollapsed && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={toggleSidebar}
            className="self-center mt-4 w-8 h-16 rounded-r-lg bg-[rgba(12,14,20,0.9)] border border-l-0 border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ pointerEvents: 'auto' }}
          >
            <ChevronRight size={14} className="text-white/60" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
