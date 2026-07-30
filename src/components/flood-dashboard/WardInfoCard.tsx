'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, ArrowRight, Waves, Mountain, Droplets } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { severityColorHex } from '@/lib/mumbai-data';

const statusColors: Record<number, { color: string; label: string; bg: string }> = {
  0: { color: '#10B981', label: 'Normal', bg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' },
  1: { color: '#F59E0B', label: 'Watch', bg: 'bg-amber-500/10 border-amber-500/25 text-amber-400' },
  2: { color: '#F59E0B', label: 'Moderate', bg: 'bg-amber-500/10 border-amber-500/25 text-amber-400' },
  3: { color: '#EF4444', label: 'Critical', bg: 'bg-red-500/10 border-red-500/25 text-red-400' },
};

export default function WardInfoCard() {
  const { selectedWardId, selectedWard, wardSeverities, toggleRAGPanel } = useFloodStore();
  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  if (!ward) return null;

  const waterHeight = severity === 3 ? '2.1m' : severity === 2 ? '1.2m' : severity === 1 ? '0.4m' : '0m';
  const st = statusColors[severity];
  const borderColor = severity === 0 ? 'rgba(255,255,255,0.06)' : `rgba(245, 158, 11, ${severity >= 2 ? 0.35 : 0.2})`;
  const glowColor = severity >= 2 ? (severity === 3 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.08)') : 'transparent';

  return (
    <AnimatePresence>
      {selectedWardId && (
        <motion.div
          key={selectedWardId}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 280, damping: 25 }}
          className="absolute top-[72px] left-[360px] z-20"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="w-[320px] rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(20, 22, 29, 0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${borderColor}`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), 0 0 30px ${glowColor}`,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/4">
                <Building2 size={18} className="text-[#9CA3AF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-white truncate">{ward.name}</h3>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${severity >= 2 ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: st.color }}
                  />
                </div>
                <p className="text-[11px] text-white/30 mt-0.5">{ward.wardType.charAt(0).toUpperCase() + ward.wardType.slice(1)} Zone · Code {ward.code}</p>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${st.bg}`}>
                {st.label}
              </span>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-0 p-3">
              <MetricBlock icon={Waves} label="Water Level" value={waterHeight} />
              <MetricBlock icon={Mountain} label="Elevation" value={`${ward.elevation}m`} />
              <MetricBlock icon={Droplets} label="TWI" value={ward.twi.toFixed(2)} />
              <MetricBlock icon={Users} label="Population" value={`${(ward.population / 1000).toFixed(0)}K`} />
            </div>

            {/* Action button */}
            {severity >= 1 && (
              <div className="px-3 pb-3">
                <button
                  onClick={toggleRAGPanel}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors hover:bg-white/4"
                  style={{
                    backgroundColor: `${st.color}08`,
                    border: `1px solid ${st.color}20`,
                  }}
                >
                  <span className="text-[12px] font-medium" style={{ color: st.color }}>
                    {severity === 3 ? 'View Evacuation Protocol' : severity === 2 ? 'View Advisory' : 'View Status Report'}
                  </span>
                  <ArrowRight size={14} style={{ color: st.color }} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricBlock({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/2">
      <Icon size={14} className="text-[#9CA3AF] flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-white/25 font-medium">{label}</div>
        <div className="text-[14px] font-bold text-white/85">{value}</div>
      </div>
    </div>
  );
}