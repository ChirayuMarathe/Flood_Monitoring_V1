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
            className="w-[280px] rounded-lg overflow-hidden"
            style={{
              background: '#13161D',
              border: `1px solid ${isCritical ? '#D9444440' : '#242832'}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-[#E1E4EA] truncate">{ward.name}</h3>
                  {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-[#D94444] flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-[#525866] mt-0.5 capitalize">
                  {ward.wardType} zone, Mumbai
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  isCritical ? 'text-[#D94444] bg-[#D94444]/8' : 'text-[#8B919E] bg-[#1A1E27]'
                } border ${isCritical ? 'border-[#D94444]/15' : 'border-[#242832]'}`}>
                  {statusLabels[severity]}
                </span>
                <button
                  onClick={() => setSelectedWard(null)}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#1A1E27] transition-colors"
                >
                  <X size={11} className="text-[#525866]" />
                </button>
              </div>
            </div>

            <div className="mx-3 border-t border-[#1A1E27]" />

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-px p-3">
              <div className="pr-3">
                <div className="text-[9px] text-[#525866] uppercase tracking-wider">Water Level</div>
                <div className="text-[15px] font-semibold text-[#E1E4EA] mt-0.5">{waterHeight}</div>
              </div>
              <div className="pl-3 border-l border-[#1A1E27]">
                <div className="text-[9px] text-[#525866] uppercase tracking-wider">Elevation</div>
                <div className="text-[15px] font-semibold text-[#E1E4EA] mt-0.5">{ward.elevation}m</div>
              </div>
            </div>

            {/* Action */}
            {severity >= 1 && (
              <div className="px-3 pb-3">
                <button
                  onClick={toggleRAGPanel}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-[#1A1E27] bg-[#13161D] border border-[#242832]"
                >
                  <span className="text-[11px] text-[#8B919E]">
                    {severity === 3 ? 'View Protocol' : 'View Report'}
                  </span>
                  <ArrowRight size={12} className="text-[#525866]" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}