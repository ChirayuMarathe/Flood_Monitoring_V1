'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, ArrowRight, Waves, Mountain, Droplets } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { severityColors, severityColorHex } from '@/lib/mumbai-data';

export default function WardInfoCard() {
  const { selectedWardId, selectedWard, wardSeverities, toggleRAGPanel } = useFloodStore();
  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  if (!ward) return null;

  const waterHeight = severity === 3 ? '2.1m' : severity === 2 ? '1.2m' : severity === 1 ? '0.4m' : '0m';
  const sev = severityColors[severity];

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
              background: 'rgba(12, 14, 20, 0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `2px solid ${severityColorHex[severity]}40`,
              boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), 0 0 30px ${severityColorHex[severity]}15`,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${severityColorHex[severity]}15` }}
              >
                <Building2 size={18} style={{ color: severityColorHex[severity] }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-white truncate">{ward.name}</h3>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${severity >= 2 ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: severityColorHex[severity] }}
                  />
                </div>
                <p className="text-[11px] text-white/40 mt-0.5">{ward.wardType.charAt(0).toUpperCase() + ward.wardType.slice(1)} Zone • Code {ward.code}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${sev.bg}`}
              >
                {sev.label}
              </span>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-0 p-3">
              <MetricBlock icon={Waves} label="Water Level" value={waterHeight} color={severityColorHex[severity]} />
              <MetricBlock icon={Mountain} label="Elevation" value={`${ward.elevation}m`} color="#22c55e" />
              <MetricBlock icon={Droplets} label="TWI" value={ward.twi.toFixed(2)} color="#3b82f6" />
              <MetricBlock icon={Users} label="Population" value={`${(ward.population / 1000).toFixed(0)}K`} color="#D4A853" />
            </div>

            {/* Action button */}
            {severity >= 2 && (
              <div className="px-3 pb-3">
                <button
                  onClick={toggleRAGPanel}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors"
                  style={{
                    backgroundColor: `${severityColorHex[severity]}12`,
                    border: `1px solid ${severityColorHex[severity]}25`,
                  }}
                >
                  <span className="text-[12px] font-medium" style={{ color: severityColorHex[severity] }}>
                    {severity === 3 ? 'View Evacuation Protocol' : 'View Advisory Details'}
                  </span>
                  <ArrowRight size={14} style={{ color: severityColorHex[severity] }} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetricBlock({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/3">
      <Icon size={14} style={{ color }} className="flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-white/30 font-medium">{label}</div>
        <div className="text-[14px] font-bold text-white/90">{value}</div>
      </div>
    </div>
  );
}