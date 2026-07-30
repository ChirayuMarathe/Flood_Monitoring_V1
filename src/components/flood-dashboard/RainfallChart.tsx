'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { timeSeriesData } from '@/lib/mumbai-data';
import { useFloodStore } from '@/store/flood-store';

export default function RainfallChart() {
  const { timeIndex } = useFloodStore();

  const data = timeSeriesData.map((d, i) => ({
    day: `Jul ${d.day}`,
    rainfall: d.rainfall_3day_sum,
    soilMoisture: Math.round(d.soil_moisture * 100),
    isCurrent: i === timeIndex,
  }));

  return (
    <div className="p-4 rounded-lg bg-[#13161D] border border-[#242832]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-[#E1E4EA]">Rainfall & Soil Moisture</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#5B8DEF]" />
            <span className="text-[10px] text-[#525866]">Rainfall (mm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#8B919E]" />
            <span className="text-[10px] text-[#525866]">Soil (%)</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5B8DEF" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#5B8DEF" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B919E" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#8B919E" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#242832" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#525866', fontSize: 9 }}
            interval={4}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#525866', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: '#1A1E27',
              border: '1px solid #242832',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#C1C5CD',
            }}
          />
          <Area
            type="monotone"
            dataKey="rainfall"
            stroke="#5B8DEF"
            strokeWidth={2}
            fill="url(#rainGrad)"
          />
          <Area
            type="monotone"
            dataKey="soilMoisture"
            stroke="#8B919E"
            strokeWidth={1.5}
            fill="url(#soilGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
