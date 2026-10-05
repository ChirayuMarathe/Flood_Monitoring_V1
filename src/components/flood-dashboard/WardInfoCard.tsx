'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ArrowRight, X } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';

const statusLabels: Record<number, string> = {
  0: 'Normal',
  1: 'Watch',
  2: 'Elevated',
  3: 'Critical',
};

export default function WardInfoCard() {
  const { selectedWardId, selectedWard, wardSeverities, toggleRAGPanel, setSelectedWard, popupPosition } = useFloodStore();
  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  if (!ward) return null;

  const waterHeight = severity === 3 ? '2.1m' : severity === 2 ? '1.2m' : severity === 1 ? '0.4m' : '0m';
  const isCritical = severity === 3;

  const top = popupPosition ? Math.min(popupPosition.y - 20, window.innerHeight - 280) : 80;
  const left = popupPosition ? Math.min(popupPosition.x + 20, window.innerWidth - 340) : 40;

  return (
    <AnimatePresence>
      {selectedWardId && (
        <motion.div
          key={selectedWardId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.15 }}
          className="absolute z-20"
          style={{
            pointerEvents: 'auto',
            top: Math.max(10, top),
            left: Math.max(10, left),
          }}
        >
          <div
            className="w-[280px] rounded-2xl overflow-hidden backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)]"
            style={{
              background: 'rgba(5, 7, 10, 0.95)',
              border: `1px solid ${isCritical ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.12)'}`,
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-bold text-white truncate font-clash">{ward.name}</h3>
                  {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-[#8B919E] mt-0.5 capitalize font-mono">
                  {ward.wardType} zone, Mumbai
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium ${
                  isCritical ? 'text-black bg-white font-bold border-white' : 'text-gray-300 bg-white/[0.06] border-white/10'
                } border`}>
                  {statusLabels[severity]}
                </span>
                <button
                  onClick={() => setSelectedWard(null)}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X size={11} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="mx-3 border-t border-white/10" />

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-px p-3">
              <div className="pr-3">
                <div className="text-[9px] text-[#8B919E] font-mono uppercase tracking-wider">Water Level</div>
                <div className="text-[15px] font-bold font-mono text-white mt-0.5">{waterHeight}</div>
              </div>
              <div className="pl-3 border-l border-white/10">
                <div className="text-[9px] text-[#8B919E] font-mono uppercase tracking-wider">Elevation</div>
                <div className="text-[15px] font-bold font-mono text-white mt-0.5">{ward.elevation}m</div>
              </div>
            </div>

            {/* Action */}
            {severity >= 1 && (
              <div className="px-3 pb-3">
                <button
                  onClick={toggleRAGPanel}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all hover:bg-white/[0.08] bg-white/[0.04] border border-white/10"
                >
                  <span className="text-[11px] text-gray-200 font-satoshi font-medium">
                    {severity === 3 ? 'View Emergency Protocol' : 'View Ward Intelligence'}
                  </span>
                  <ArrowRight size={12} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}