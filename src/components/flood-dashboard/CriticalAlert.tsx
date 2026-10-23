'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';

export default function CriticalAlert() {
  const {
    criticalAlertVisible,
    setCriticalAlert,
    selectedWard,
    selectedWardId,
    wardSeverities,
    toggleRAGPanel,
    activeCity,
    livePredictions,
    setSelectedWard,
  } = useFloodStore();

  const ward = selectedWard();
  const selectedSeverity = selectedWardId ? (wardSeverities[selectedWardId] ?? 0) : 0;

  // Find all critical wards in the current city
  const cityWards = useMemo(() => getWardsForCity(activeCity), [activeCity]);
  const criticalWards = useMemo(() => {
    return cityWards.filter((w) => (wardSeverities[w.id] ?? wardSeverities[w.code] ?? 0) >= 3);
  }, [cityWards, wardSeverities]);

  const cityLabel =
    activeCity === 'navi_mumbai' ? 'Navi Mumbai (NMMC)' :
    activeCity === 'pune' ? 'Pune (PMC)' : 'Mumbai (BMC)';

  const hasWardCritical = Boolean(ward && selectedSeverity === 3);
  const hasCityCritical = criticalWards.length > 0;
  const shouldShow = criticalAlertVisible && (hasWardCritical || hasCityCritical);

  const title = hasWardCritical
    ? `Critical Hazard Alert · ${ward?.name}`
    : `Emergency Flood Warning · ${cityLabel}`;

  const topCriticalCode = criticalWards[0]?.code;
  const topPred = topCriticalCode ? livePredictions[topCriticalCode] : null;
  const probText = topPred ? ` (${(topPred.type3_prob * 100).toFixed(1)}% ML Risk)` : '';

  const subtitle = hasWardCritical
    ? `${ward?.name} (${cityLabel}) — Inundation limits exceeded. High flood susceptibility.`
    : `${criticalWards.length} Wards Exceeded Critical Safety Threshold (Top: Ward ${criticalWards.slice(0, 3).map(w => w.name.replace(/^Ward\s*/i, '')).join(', ')})${probText}`;

  const handleViewProtocol = () => {
    if (!selectedWardId && criticalWards.length > 0) {
      setSelectedWard(criticalWards[0].id);
    }
    toggleRAGPanel();
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-2.5 left-[266px] z-50 pointer-events-auto max-w-[calc(100vw-540px)]"
        >
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-2xl">
            <div className="w-6 h-6 rounded-lg bg-red-950/40 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={12} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-[200px] max-w-[420px]">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white font-clash leading-none tracking-wide">{title}</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold bg-red-500/15 text-red-300 border border-red-500/25 uppercase">CRITICAL</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-satoshi truncate mt-0.5 leading-tight">
                {subtitle}
              </p>
            </div>
            <button
              onClick={handleViewProtocol}
              className="px-2.5 py-1 rounded-lg text-[9.5px] font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-colors font-mono cursor-pointer whitespace-nowrap"
            >
              View Protocol
            </button>
            <button
              onClick={() => setCriticalAlert(false)}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-zinc-400 hover:text-white"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
