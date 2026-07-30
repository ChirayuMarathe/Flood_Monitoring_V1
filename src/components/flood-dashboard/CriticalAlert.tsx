'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';

export default function CriticalAlert() {
  const { criticalAlertVisible, setCriticalAlert, selectedWard, selectedWardId, wardSeverities, toggleRAGPanel } = useFloodStore();
  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  return (
    <AnimatePresence>
      {criticalAlertVisible && ward && severity === 3 && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#1A1117] border border-[#D94444]/20">
            <AlertTriangle size={16} className="text-[#D94444] flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[12px] font-semibold text-[#E1E4EA]">Critical Alert</span>
              <span className="text-[11px] text-[#8B919E] ml-2">
                {ward.name} — Water levels expected to exceed 1.5m
              </span>
            </div>
            <button
              onClick={toggleRAGPanel}
              className="px-2.5 py-1 rounded text-[10px] font-medium text-[#D94444] bg-[#D94444]/8 border border-[#D94444]/15 hover:bg-[#D94444]/12 transition-colors"
            >
              View Protocol
            </button>
            <button
              onClick={() => setCriticalAlert(false)}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#242832] transition-colors"
            >
              <X size={11} className="text-[#525866]" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
