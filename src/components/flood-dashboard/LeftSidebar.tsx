'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Mountain, Droplets, Thermometer, Building2,
  AlertTriangle, Layers, Activity
} from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards, severityColors } from '@/lib/mumbai-data';
import { useRef } from 'react';

function SeverityDot({ severity }: { severity: number }) {
  const color = severity === 0 ? '#10B981' : severity === 1 ? '#F59E0B' : severity === 2 ? '#F97316' : '#EF4444';
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{
        backgroundColor: color,
        boxShadow: severity >= 2 ? `0 0 8px ${color}60` : 'none',
      }}
    />
  );
}

function MetricCard({ icon: Icon, label, value, unit }: {
  icon: React.ElementType; label: string; value: string | number; unit?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/4">
        <Icon size={14} className="text-[#9CA3AF]" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/35 font-medium">{label}</div>
        <div className="text-sm font-semibold text-white/90 truncate">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="text-white/35 text-xs ml-0.5">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

// This component is kept for potential standalone use but is no longer rendered in the main layout.
// The AppSidebar component handles navigation now.
export default function LeftSidebar() {
  const {
    selectedWardId, setSelectedWard, selectedWard,
    wardSeverities
  } = useFloodStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;
  const sevStyle = severity === 0
    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
    : severity === 1
    ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
    : severity === 2
    ? 'bg-orange-500/10 border-orange-500/25 text-orange-400'
    : 'bg-red-500/10 border-red-500/25 text-red-400';

  return (
    <div
      className="h-full flex flex-col overflow-hidden w-[340px]"
      style={{
        background: 'rgba(20, 22, 29, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Ward Selector */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-2.5">
          <MapPin size={12} className="text-[#9CA3AF]" />
          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-white/35">Ward Selection</span>
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
                    ? 'bg-amber-500/8 border-l-2 border-amber-500/60'
                    : 'hover:bg-white/3 border-l-2 border-transparent'
                }`}
              >
                <SeverityDot severity={wSev} />
                <span className={`text-[13px] font-medium flex-1 truncate ${
                  isActive ? 'text-amber-300' : 'text-white/55 group-hover:text-white/75'
                }`}
                >
                  {w.name}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-amber-500/15 text-amber-400' : 'bg-white/4 text-white/25'
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
          <Layers size={12} className="text-[#9CA3AF]" />
          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-white/35">
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
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${sevStyle}`}>
                  {severity === 0 ? 'Normal' : severity === 1 ? 'Watch' : severity === 2 ? 'Moderate' : 'Critical'}
                </span>
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                  {ward.wardType} Zone
                </span>
              </div>

              <MetricCard icon={Mountain} label="Mean Elevation" value={ward.elevation} unit="m" />
              <MetricCard icon={Droplets} label="TWI Index" value={ward.twi.toFixed(2)} />
              <MetricCard icon={Building2} label="Urban Built-up" value={ward.urbanArea} unit="M sq m" />
              <MetricCard icon={Activity} label="Population" value={ward.population} />
              <MetricCard icon={Thermometer} label="Land Surface Temp" value={ward.landSurfaceTemp} unit="°C" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <MapPin size={24} className="text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/25">Select a ward to view metrics</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-white/6">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-[#9CA3AF]" />
            <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-white/35">Severity</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/2">
              <span className="w-2 h-2 rounded-sm bg-emerald-500" />
              <span className="text-[11px] text-white/45">Normal</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/2">
              <span className="w-2 h-2 rounded-sm bg-amber-500" />
              <span className="text-[11px] text-white/45">Watch</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/2">
              <span className="w-2 h-2 rounded-sm bg-orange-400" />
              <span className="text-[11px] text-white/45">Moderate</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/2">
              <span className="w-2 h-2 rounded-sm bg-red-500" />
              <span className="text-[11px] text-white/45">Critical</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
