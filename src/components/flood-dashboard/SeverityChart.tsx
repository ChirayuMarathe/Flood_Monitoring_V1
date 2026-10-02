'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { ShieldCheck } from 'lucide-react';

const severityMeta = [
  { key: 0, label: 'Normal', color: '#10B981', gradId: 'gradNorm' },
  { key: 1, label: 'Watch', color: '#F59E0B', gradId: 'gradWatch' },
  { key: 2, label: 'Elevated', color: '#F97316', gradId: 'gradElev' },
  { key: 3, label: 'Critical', color: '#EF4444', gradId: 'gradCrit' },
];

export default function SeverityChart() {
  const { wardSeverities, activeCity } = useFloodStore();
  const currentWards = getWardsForCity(activeCity);

  const data = severityMeta.map((s) => ({
    name: s.label,
    count: currentWards.filter((w) => (wardSeverities[w.id] ?? 0) === s.key).length,
    color: s.color,
    gradId: s.gradId,
  }));

  return (
    <div className="p-5 rounded-2xl bg-[#0B0D14]/90 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <ShieldCheck size={13} className="text-[#10B981]" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold font-clash text-white tracking-tight">Severity Distribution</h3>
            <p className="text-[10px] text-gray-400 font-mono">Real-time risk classification</p>
          </div>
        </div>
        <span className="text-[10px] text-gray-400 font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          {currentWards.length} wards
        </span>
      </div>

      <div className="w-full h-[185px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="28%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradNorm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="gradWatch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#D97706" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="gradElev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#EA580C" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="gradCrit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#DC2626" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8B919E', fontSize: 10, fontFamily: 'monospace' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#0D1017',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#FFFFFF',
                boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
              }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="count" radius={[6, 6, 2, 2]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#${entry.gradId})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
