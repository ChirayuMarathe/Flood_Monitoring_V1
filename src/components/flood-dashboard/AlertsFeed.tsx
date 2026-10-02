'use client';

import React from 'react';
import { useFloodStore } from '@/store/flood-store';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Bell, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const severityLabel: Record<number, { text: string; color: string }> = {
  0: { text: 'Normal', color: 'text-emerald-400' },
  1: { text: 'Watch', color: 'text-amber-400' },
  2: { text: 'Elevated', color: 'text-orange-400' },
  3: { text: 'Critical', color: 'text-red-400 font-bold' },
};

export default function AlertsFeed() {
  const { alertHistory } = useFloodStore();

  return (
    <div className="rounded-2xl overflow-hidden bg-[#0B0D14]/90 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Bell size={13} className="text-gray-300" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold font-clash text-white tracking-tight">Recent Activity</h3>
            <p className="text-[10px] text-gray-400 font-mono">Live telemetry event log</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            {alertHistory.length} events
          </span>
          <Link href="/alerts" className="text-[10px] text-[#5EA977] hover:underline font-mono ml-1 font-semibold">
            View All →
          </Link>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[360px] custom-scrollbar divide-y divide-white/[0.04]">
        {alertHistory.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={24} className="text-gray-600 mx-auto mb-2 opacity-50" />
            <p className="text-[11px] text-gray-400 font-satoshi">No recent telemetry transitions.</p>
          </div>
        ) : (
          <AnimatePresence>
            {alertHistory.slice(0, 20).map((alert) => {
              const isEscalation = alert.newSeverity > alert.oldSeverity;
              const isCritical = alert.newSeverity === 3;
              const newSev = severityLabel[alert.newSeverity] || severityLabel[0];
              const oldSev = severityLabel[alert.oldSeverity] || severityLabel[0];

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    isCritical 
                      ? 'bg-red-500/15 border-red-500/30 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)]' 
                      : isEscalation 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {isEscalation ? (
                      <TrendingUp size={13} className={isCritical ? 'animate-pulse' : ''} />
                    ) : (
                      <TrendingDown size={13} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-200 group-hover:text-white font-satoshi truncate">
                      {alert.wardName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono">
                      <span className="text-gray-500">{oldSev.text}</span>
                      <ArrowRight size={9} className="text-gray-500" />
                      <span className={newSev.color}>{newSev.text}</span>
                    </div>
                  </div>
                  <div className="text-right text-[9.5px] font-mono text-gray-500">
                    {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
