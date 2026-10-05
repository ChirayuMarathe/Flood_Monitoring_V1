'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { ShieldCheck } from 'lucide-react';

const severityMeta = [
  { key: 0, label: 'Nominal', color: '#52525B', gradId: 'gradNominal' },
  { key: 1, label: 'Watch', color: '#71717A', gradId: 'gradWatch' },
  { key: 2, label: 'Elevated', color: '#A1A1AA', gradId: 'gradElevated' },
  { key: 3, label: 'Critical', color: '#FFFFFF', gradId: 'gradCritical' },
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
    <div className="p-5 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <ShieldCheck size={13} className="text-white" />
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
              <linearGradient id="gradNominal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#71717A" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#3F3F46" stopOpacity={0.25} />
              </linearGradient>
              <linearGradient id="gradWatch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A1A1AA" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#52525B" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="gradElevated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4D4D8" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#71717A" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.98} />
                <stop offset="100%" stopColor="#A1A1AA" stopOpacity={0.5} />
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
                background: '#090B10',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#FFFFFF',
                boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
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
