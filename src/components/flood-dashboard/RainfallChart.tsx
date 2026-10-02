'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { timeSeriesData } from '@/lib/mumbai-data';
import { useFloodStore } from '@/store/flood-store';
import { CloudRain } from 'lucide-react';

export default function RainfallChart() {
  const { timeIndex } = useFloodStore();

  const data = timeSeriesData.map((d, i) => ({
    day: `Jul ${d.day}`,
    rainfall: d.rainfall_3day_sum,
    soilMoisture: Math.round(d.soil_moisture * 100),
    isCurrent: i === timeIndex,
  }));

  const currentRain = timeSeriesData[timeIndex]?.rainfall_3day_sum ?? 0;
  const currentSoil = Math.round((timeSeriesData[timeIndex]?.soil_moisture ?? 0) * 100);

  return (
    <div className="p-5 rounded-2xl bg-[#0B0D14]/90 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <CloudRain size={13} className="text-[#06B6D4]" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold font-clash text-white tracking-tight">Rainfall & Soil Trend</h3>
            <p className="text-[10px] text-gray-400 font-mono">30-Day Monsoon Window</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{currentRain} mm</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>{currentSoil}% Soil</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[185px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="rainGradV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="soilGradV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#A855F7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8B919E', fontSize: 9, fontFamily: 'monospace' }}
              interval={4}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
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
            />
            <Area
              type="monotone"
              dataKey="rainfall"
              name="Rainfall (mm)"
              stroke="#06B6D4"
              strokeWidth={2}
              fill="url(#rainGradV2)"
            />
            <Area
              type="monotone"
              dataKey="soilMoisture"
              name="Soil (%)"
              stroke="#A855F7"
              strokeWidth={1.5}
              fill="url(#soilGradV2)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
