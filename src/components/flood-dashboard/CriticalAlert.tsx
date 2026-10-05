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
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/95 border border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.12)] backdrop-blur-xl">
            <AlertTriangle size={16} className="text-white flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <span className="text-[12px] font-bold text-white font-clash">Critical Hazard Alert</span>
              <span className="text-[11px] text-zinc-300 ml-2 font-satoshi">
                {ward.name} — Water levels approaching critical threshold
              </span>
            </div>
            <button
              onClick={toggleRAGPanel}
              className="px-3 py-1 rounded-lg text-[10px] font-bold text-black bg-white hover:bg-zinc-200 transition-colors font-mono"
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
