'use client';

import React from 'react';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ShieldCheck, Layers } from 'lucide-react';

const severityPill: Record<number, { label: string; badge: string; dot: string }> = {
  0: { label: 'Normal', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  1: { label: 'Watch', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  2: { label: 'Elevated', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
  3: { label: 'Critical', badge: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400 animate-ping' },
};

export default function WardTable() {
  const { wardSeverities, setSelectedWard, activeCity } = useFloodStore();
  const router = useRouter();

  const currentWards = getWardsForCity(activeCity);

  const wards = [...currentWards].sort((a, b) => {
    const sevA = wardSeverities[a.id] ?? 0;
    const sevB = wardSeverities[b.id] ?? 0;
    return sevB - sevA;
  });

  const handleClick = (wardId: string) => {
    setSelectedWard(wardId);
    router.push('/map');
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-[#0B0D14]/90 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Layers size={13} className="text-gray-300" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold font-clash text-white tracking-tight">Ward Risk Assessment</h3>
            <p className="text-[10px] text-gray-400 font-mono">Real-time vulnerability & hydrologic metrics</p>
          </div>
        </div>
        <span className="text-[10px] text-gray-400 font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
          Sorted by Severity
        </span>
      </div>

      <div className="overflow-y-auto max-h-[360px] custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-black/40 sticky top-0 z-10 backdrop-blur-md">
              <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono font-semibold px-5 py-3">Ward</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono font-semibold px-3 py-3">Code</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono font-semibold px-3 py-3">Zone Type</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-mono font-semibold px-3 py-3">Risk Status</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 font-mono font-semibold px-3 py-3">Elevation</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 font-mono font-semibold px-3 py-3">Wetness (TWI)</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 font-mono font-semibold px-4 py-3">Population</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {wards.map((ward) => {
              const sev = wardSeverities[ward.id] ?? 0;
              const badge = severityPill[sev] || severityPill[0];
              return (
                <tr
                  key={ward.id}
                  onClick={() => handleClick(ward.id)}
                  className="hover:bg-white/[0.04] cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3 text-[12.5px] font-medium text-gray-200 group-hover:text-white font-satoshi">
                    {ward.name}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-gray-300 border border-white/10">
                      {ward.code}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-gray-400 capitalize font-satoshi">
                    {ward.wardType}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${badge.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-[11px] font-mono text-gray-300">
                    {ward.elevation.toFixed(1)}m
                  </td>
                  <td className="px-3 py-3 text-right text-[11px] font-mono text-gray-300">
                    {ward.twi.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] font-mono text-gray-400">
                    {(ward.population / 1000).toFixed(0)}k
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ArrowUpRight size={13} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all inline-block" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
