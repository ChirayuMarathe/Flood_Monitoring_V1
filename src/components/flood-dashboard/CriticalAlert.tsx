'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';

export default function CriticalAlert() {
  const { criticalAlertVisible, setCriticalAlert, selectedWard, selectedWardId, wardSeverities, toggleRAGPanel } = useFloodStore();
  const ward = selectedWard();
  const severity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  return (
    <AnimatePresence>
      {criticalAlertVisible && ward && severity === 3 && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute top-5 left-1/2 -translate-x-1/2 z-30"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="flex items-center gap-4 px-5 py-3 rounded-xl"
            style={{
              background: 'rgba(127, 29, 29, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.15), 0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div className="relative">
              <ShieldAlert size={22} className="text-red-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-red-200">CRITICAL FLOOD ALERT</span>
                <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-[10px] font-bold text-red-300">SEV-3</span>
              </div>
              <p className="text-[11px] text-red-300/70 mt-0.5">
                {ward.name} — Water levels expected to exceed 1.5m. Immediate evacuation recommended.
              </p>
            </div>
            <button
              onClick={toggleRAGPanel}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-[11px] font-semibold text-red-200 transition-colors whitespace-nowrap"
            >
              View Protocol
            </button>
            <button
              onClick={() => setCriticalAlert(false)}
              className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X size={12} className="text-white/50" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
