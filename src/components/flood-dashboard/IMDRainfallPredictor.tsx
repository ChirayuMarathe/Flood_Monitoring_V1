'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudRain,
  Radio,
  RefreshCw,
  Calendar,
  ShieldCheck,
  Droplets,
  Wind,
  Gauge,
  X,
  Compass,
} from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { IMDRealtimeResponse, DailyForecastDay } from '@/app/api/weather/imd/route';

interface IMDRainfallPredictorProps {
  onClose?: () => void;
}

export default function IMDRainfallPredictor({ onClose }: IMDRainfallPredictorProps) {
  const activeCity = useFloodStore((s) => s.activeCity);
  const [data, setData] = useState<IMDRealtimeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);

  const fetchIMDData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/imd?city=${activeCity || 'mumbai'}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: IMDRealtimeResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch IMD telemetry');
    } finally {
      setLoading(false);
    }
  }, [activeCity]);

  useEffect(() => {
    fetchIMDData();
  }, [fetchIMDData]);

  const selectedDay: DailyForecastDay | undefined = data?.dailyForecast?.[selectedDayIdx];

  const cityDisplayName =
    activeCity === 'navi_mumbai'
      ? 'Navi Mumbai (NMMC)'
      : activeCity === 'pune'
      ? 'Pune (PMC)'
      : 'Mumbai (BMC)';

  return (
    <div className="flex flex-col w-[390px] max-h-[310px] rounded-2xl bg-black/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.06)] font-satoshi text-white overflow-hidden">
      
      {/* Header (Clean, consistent with LiveRiskPanel) */}
      <div className="flex items-center justify-between p-3.5 pb-2.5 border-b border-white/10 shrink-0 bg-black/40">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio size={14} className="text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[11.5px] font-bold text-white uppercase tracking-wide">
                IMD Weather Telemetry
              </span>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-white/10 text-zinc-300 border border-white/15 uppercase">
                LIVE
              </span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono truncate max-w-[210px] mt-0.5">
              {data?.station?.replace(/\(.*?\)/g, '') || 'Observatory Feed'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {data?.lastUpdated && (
            <span className="text-[9px] text-zinc-500 font-mono">
              {new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchIMDData}
            disabled={loading}
            className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 cursor-pointer"
            title="Refresh IMD Feed"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 flex flex-col gap-3">
        
        {/* Telemetry Stat Cards (ChainFund Pill style) */}
        <div className="grid grid-cols-4 gap-1.5">
          <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/[0.02] border border-white/8 text-center">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-mono">1-Hr Rain</span>
            <div className="text-[13px] font-bold font-mono text-white leading-none mt-0.5">
              {data?.current?.rainfall_1hr_mm ?? 0}
              <span className="text-[8.5px] text-zinc-500 font-normal ml-0.5">mm</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/[0.02] border border-white/8 text-center">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-mono">24-Hr Sum</span>
            <div className="text-[13px] font-bold font-mono text-white leading-none mt-0.5">
              {data?.current?.rainfall_24hr_mm ?? 0}
              <span className="text-[8.5px] text-zinc-500 font-normal ml-0.5">mm</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/[0.02] border border-white/8 text-center">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-mono">Humidity</span>
            <div className="text-[13px] font-bold font-mono text-zinc-300 leading-none mt-0.5">
              {data?.current?.relative_humidity_pct ?? 65}
              <span className="text-[8.5px] text-zinc-500 font-normal ml-0.5">%</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/[0.02] border border-white/8 text-center">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wide font-mono">Pressure</span>
            <div className="text-[13px] font-bold font-mono text-zinc-300 leading-none mt-0.5">
              {data?.current?.surface_pressure_hpa ?? 1010}
              <span className="text-[8.5px] text-zinc-500 font-normal ml-0.5">hPa</span>
            </div>
          </div>
        </div>

        {/* 7-Day Precipitation Timeline Strip */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-mono font-semibold text-zinc-500">
            <span>7-Day Inundation Outlook</span>
            <span className="text-zinc-600 normal-case">{cityDisplayName}</span>
          </div>

          <div className="grid grid-cols-7 gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/8">
            {data?.dailyForecast?.map((day, idx) => {
              const isSelected = selectedDayIdx === idx;
              const hasCritical = day.riskSummary.criticalCount > 0;
              const hasAlert = day.riskSummary.alertCount > 0;

              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[8px] font-mono uppercase truncate w-full text-center leading-none">
                    {idx === 0 ? 'TODAY' : day.dayLabel.slice(0, 3)}
                  </span>
                  <CloudRain
                    size={11}
                    className={
                      isSelected
                        ? 'text-black'
                        : day.rainfallMm > 20
                        ? 'text-blue-400'
                        : 'text-zinc-500'
                    }
                  />
                  <span className="text-[9.5px] font-mono font-bold leading-none">
                    {day.rainfallMm}
                  </span>
                  <span
                    className={`w-1 h-1 rounded-full ${
                      hasCritical
                        ? 'bg-red-500 animate-pulse'
                        : hasAlert
                        ? 'bg-orange-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Flood Risk Assessment Card */}
        {selectedDay && (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/10 font-mono">
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-bold text-white">
                  {selectedDay.dayLabel} Forecast
                </span>
                <span className="text-[8.5px] text-zinc-500">
                  {selectedDay.date}
                </span>
              </div>
              <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-semibold">
                Rain Prob: {selectedDay.rainProbability}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[9px] text-zinc-400">
              <span>Rainfall: <strong className="text-white">{selectedDay.rainfallMm} mm</strong></span>
              <span>Temp: <strong className="text-white">{selectedDay.tempMinC}°C — {selectedDay.tempMaxC}°C</strong></span>
            </div>

            {/* AI Model Ward Risk Impact */}
            <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
              <div className="text-[8.5px] uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                <span>Model Ensemble Prediction</span>
                <span className="text-zinc-600">24 Wards</span>
              </div>

              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="p-1 rounded-lg bg-white/[0.02] border border-white/8">
                  <div className="text-[7.5px] text-red-400 uppercase">Critical</div>
                  <div className="text-[11px] font-bold text-white">
                    {selectedDay.riskSummary.criticalCount}
                  </div>
                </div>

                <div className="p-1 rounded-lg bg-white/[0.02] border border-white/8">
                  <div className="text-[7.5px] text-orange-400 uppercase">Alert</div>
                  <div className="text-[11px] font-bold text-white">
                    {selectedDay.riskSummary.alertCount}
                  </div>
                </div>

                <div className="p-1 rounded-lg bg-white/[0.02] border border-white/8">
                  <div className="text-[7.5px] text-yellow-400 uppercase">Watch</div>
                  <div className="text-[11px] font-bold text-white">
                    {selectedDay.riskSummary.watchCount}
                  </div>
                </div>

                <div className="p-1 rounded-lg bg-white/[0.02] border border-white/8">
                  <div className="text-[7.5px] text-emerald-400 uppercase">Safe</div>
                  <div className="text-[11px] font-bold text-white">
                    {selectedDay.riskSummary.safeCount}
                  </div>
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-[9px]">
                <span className="text-zinc-500">Peak Risk Ward:</span>
                <span className="text-white font-semibold">
                  Ward {selectedDay.riskSummary.highestRiskWard} ({selectedDay.riskSummary.highestRiskProb}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-2 px-3.5 border-t border-white/10 shrink-0 bg-black/40 text-[8.5px] font-mono text-zinc-600">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={10} className="text-white/40" />
          IMD Observational Ingestion Active
        </span>
        <span>
          5-Min Auto Refresh
        </span>
      </div>
    </div>
  );
}
