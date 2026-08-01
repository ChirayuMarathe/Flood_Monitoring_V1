'use client';

import { useFloodStore } from '@/store/flood-store';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Bell } from 'lucide-react';

const severityLabel: Record<number, string> = { 0: 'Normal', 1: 'Watch', 2: 'Elevated', 3: 'Critical' };

export default function AlertsFeed() {
  const { alertHistory } = useFloodStore();

  return (
    <div className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#242832]">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-[#8B919E]" />
          <h3 className="text-[13px] font-semibold text-[#E1E4EA]">Recent Activity</h3>
        </div>
        <span className="text-[10px] text-[#525866] font-mono">{alertHistory.length} events</span>
      </div>
      <div className="overflow-y-auto max-h-[300px] custom-scrollbar">
        {alertHistory.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={24} className="text-[#242832] mx-auto mb-2" />
            <p className="text-[11px] text-[#525866]">No recent activity.</p>
          </div>
        ) : (
          <AnimatePresence>
            {alertHistory.slice(0, 20).map((alert) => {
              const isEscalation = alert.newSeverity > alert.oldSeverity;
              const isCritical = alert.newSeverity === 3;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1E27] hover:bg-[#1A1E27] transition-colors"
                >
                  <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 border ${
                    isCritical ? 'bg-[#D94444]/10 border-[#D94444]/20' : 'bg-[#1A1E27] border-[#242832]'
                  }`}>
                    {isEscalation ? (
                      <TrendingUp size={12} className={isCritical ? 'text-[#D94444]' : 'text-[#8B919E]'} />
                    ) : (
                      <TrendingDown size={12} className="text-[#5B8DEF]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#C1C5CD] truncate">{alert.wardName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-medium text-[#525866]">
                        {severityLabel[alert.oldSeverity]}
                      </span>
                      <ArrowRight size={9} className="text-[#525866]" />
                      <span className={`text-[10px] font-medium ${isCritical ? 'text-[#D94444]' : 'text-[#E1E4EA]'}`}>
                        {severityLabel[alert.newSeverity]}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] text-[#525866] font-mono flex-shrink-0">
                    {alert.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
