'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { timeSeriesData } from '@/lib/mumbai-data';
import { useFloodStore } from '@/store/flood-store';
import { CloudRain } from 'lucide-react';

export default function RainfallChart() {
  const { timeIndex, activeTimeSeries, selectedYear, selectedMonth } = useFloodStore();
  const series = activeTimeSeries && activeTimeSeries.length > 0 ? activeTimeSeries : timeSeriesData;

  const data = series.map((d, i) => {
    // Format date string nicely e.g. "Jun 01", "Jul 09", "Sep 30"
    const parsed = d.date ? new Date(d.date) : null;
    const formatted = parsed && !isNaN(parsed.getTime())
      ? parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `Day ${d.day}`;

    return {
      day: formatted,
      fullDate: d.date,
      rainfall: d.rainfall_3day_sum,
      soilMoisture: Math.round(d.soil_moisture * 100),
      isCurrent: i === timeIndex,
    };
  });

  const currentRain = series[timeIndex]?.rainfall_3day_sum ?? 0;
  const currentSoil = Math.round((series[timeIndex]?.soil_moisture ?? 0) * 100);

  const periodLabel = selectedMonth === 'monsoon' ? 'Monsoon' : selectedMonth === 'all' ? 'Annual' : 'Month';

  return (
    <div className="p-5 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <CloudRain size={13} className="text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold font-clash text-white tracking-tight">Rainfall & Soil Trend</h3>
            <p className="text-[10px] text-gray-400 font-mono">{selectedYear} · {periodLabel} ({series.length} Days)</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/20 text-[10px] font-mono text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>{currentRain} mm</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>{currentSoil}% Soil</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[185px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="rainGradV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="soilGradV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A1A1AA" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#A1A1AA" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8B919E', fontSize: 9, fontFamily: 'monospace' }}
              interval={15}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
            />
            <Tooltip
              contentStyle={{
                background: '#050505',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '10px',
                fontSize: '11px',
                color: '#FFFFFF',
                boxShadow: '0 10px 25px rgba(0,0,0,0.9)',
              }}
            />
            <Area
              type="monotone"
              dataKey="rainfall"
              name="Rainfall (mm)"
              stroke="#FFFFFF"
              strokeWidth={1.8}
              fill="url(#rainGradV2)"
            />
            <Area
              type="monotone"
              dataKey="soilMoisture"
              name="Soil (%)"
              stroke="#71717A"
              strokeWidth={1.5}
              fill="url(#soilGradV2)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
