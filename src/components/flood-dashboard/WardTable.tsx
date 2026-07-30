'use client';

import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards } from '@/lib/mumbai-data';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';

const severityBadge: Record<number, { label: string; classes: string }> = {
  0: { label: 'Normal', classes: 'text-[#8B919E]' },
  1: { label: 'Watch', classes: 'text-[#8B919E]' },
  2: { label: 'Elevated', classes: 'text-[#E1E4EA]' },
  3: { label: 'Critical', classes: 'text-[#D94444]' },
};

export default function WardTable() {
  const { wardSeverities, setSelectedWard } = useFloodStore();
  const router = useRouter();

  const wards = [...mumbaiWards].sort((a, b) => {
    const sevA = wardSeverities[a.id] ?? 0;
    const sevB = wardSeverities[b.id] ?? 0;
    return sevB - sevA;
  });

  const handleClick = (wardId: string) => {
    setSelectedWard(wardId);
    router.push('/map');
  };

  return (
    <div className="rounded-lg overflow-hidden bg-[#13161D] border border-[#242832]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#242832]">
        <h3 className="text-[13px] font-semibold text-[#E1E4EA]">Ward Risk Assessment</h3>
        <span className="text-[10px] text-[#525866] font-mono">sorted by severity</span>
      </div>
      <div className="overflow-y-auto max-h-[380px] custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#242832] bg-[#0F1117]">
              <th className="text-left text-[10px] uppercase tracking-wider text-[#525866] font-medium px-4 py-2.5">Ward</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-[#525866] font-medium px-3 py-2.5">Code</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-[#525866] font-medium px-3 py-2.5">Zone</th>
              <th className="text-left text-[10px] uppercase tracking-wider text-[#525866] font-medium px-3 py-2.5">Severity</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-[#525866] font-medium px-3 py-2.5">Elev</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-[#525866] font-medium px-3 py-2.5">TWI</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-[#525866] font-medium px-4 py-2.5">Pop</th>
              <th className="px-3 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {wards.map((ward) => {
              const sev = wardSeverities[ward.id] ?? 0;
              const badge = severityBadge[sev];
              return (
                <tr
                  key={ward.id}
                  onClick={() => handleClick(ward.id)}
                  className="border-b border-[#1A1E27] hover:bg-[#1A1E27] cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-2.5 text-[12px] font-medium text-[#C1C5CD] group-hover:text-[#E1E4EA]">{ward.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1A1E27] text-[#8B919E] border border-[#242832]">{ward.code}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-[#8B919E] capitalize">{ward.wardType}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[11px] font-medium ${badge.classes} flex items-center gap-1.5`}>
                      {sev >= 3 && <span className="w-1.5 h-1.5 rounded-full bg-[#D94444]" />}
                      {sev === 2 && <span className="w-1.5 h-1.5 rounded-full bg-[#8B919E]" />}
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-[#525866] text-right font-mono">{ward.elevation}m</td>
                  <td className="px-3 py-2.5 text-[11px] text-[#525866] text-right font-mono">{ward.twi.toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-[11px] text-[#525866] text-right font-mono">{(ward.population / 1000).toFixed(0)}K</td>
                  <td className="px-3 py-2.5">
                    <ArrowUpRight size={12} className="text-[#525866] group-hover:text-[#5B8DEF] transition-colors" />
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
