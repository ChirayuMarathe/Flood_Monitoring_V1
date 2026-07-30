'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards } from '@/lib/mumbai-data';

const severityMeta = [
  { key: 0, label: 'Normal', color: '#525866' },
  { key: 1, label: 'Watch', color: '#7C8594' },
  { key: 2, label: 'Elevated', color: '#8B919E' },
  { key: 3, label: 'Critical', color: '#D94444' },
];

export default function SeverityChart() {
  const { wardSeverities } = useFloodStore();

  const data = severityMeta.map((s) => ({
    name: s.label,
    count: mumbaiWards.filter((w) => (wardSeverities[w.id] ?? 0) === s.key).length,
    color: s.color,
  }));

  return (
    <div className="p-4 rounded-lg bg-[#13161D] border border-[#242832]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-[#E1E4EA]">Severity Distribution</h3>
        <span className="text-[10px] text-[#525866] font-mono">24 wards</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barCategoryGap="25%">
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#525866', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#525866', fontSize: 10 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: '#1A1E27',
              border: '1px solid #242832',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#C1C5CD',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
