'use client';

import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  CloudRain,
  Droplets,
  ThermometerSun,
  Calendar,
  SkipBack,
  SkipForward,
  RotateCcw,
  History,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { timeSeriesData } from '@/lib/mumbai-data';
import { AVAILABLE_YEARS, MONTH_NAMES, NOTABLE_HISTORICAL_EVENTS } from '@/lib/climate-service';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';

interface BottomPanelProps {
  mode?: 'floating' | 'embedded';
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${monthNames[mIdx] || parts[1]} ${parts[2]}, ${parts[0]}`;
}

export default function BottomPanel({ mode = 'floating' }: BottomPanelProps) {
  const {
    timeIndex,
    setTimeIndex,
    currentTimeData,
    wardSeverities,
    activeCity,
    selectedYear,
    selectedMonth,
    activeTimeSeries,
    setYear,
    setMonth,
    ragPanelOpen,
  } = useFloodStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const series = activeTimeSeries && activeTimeSeries.length > 0 ? activeTimeSeries : timeSeriesData;
  const totalDays = series.length;
  const maxIdx = Math.max(0, totalDays - 1);
  const td = currentTimeData() || series[0];

  const cityWards = useMemo(() => getWardsForCity(activeCity), [activeCity]);
  const criticalWardsCount = useMemo(
    () => cityWards.filter((w) => (wardSeverities[w.id] ?? 0) >= 3).length,
    [cityWards, wardSeverities]
  );
  const elevatedWardsCount = useMemo(
    () => cityWards.filter((w) => (wardSeverities[w.id] ?? 0) === 2).length,
    [cityWards, wardSeverities]
  );

  // Close year dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setYearMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlayPause = useCallback(() => setIsPlaying((p) => !p), []);
  const handleStepBack = useCallback(() => {
    setTimeIndex(Math.max(0, timeIndex - 1));
  }, [timeIndex, setTimeIndex]);
  const handleStepForward = useCallback(() => {
    setTimeIndex(Math.min(maxIdx, timeIndex + 1));
  }, [timeIndex, maxIdx, setTimeIndex]);
  const handleReset = useCallback(() => {
    setTimeIndex(0);
    setIsPlaying(false);
  }, [setTimeIndex]);

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
  }, []);

  const speedIntervalMs = useMemo(() => {
    if (playbackSpeed === 4) return 200;
    if (playbackSpeed === 2) return 400;
    return 800;
  }, [playbackSpeed]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const c = useFloodStore.getState().timeIndex;
        const currentSeries = useFloodStore.getState().activeTimeSeries;
        const currentMax = Math.max(0, currentSeries.length - 1);
        useFloodStore.getState().setTimeIndex(c >= currentMax ? 0 : c + 1);
      }, speedIntervalMs);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speedIntervalMs]);

  // Max rainfall across all days in the currently active period
  const maxRain = useMemo(() => {
    return Math.max(...series.map((d) => d.rainfall_3day_sum), 1);
  }, [series]);

  // Notable storms matching current year or general historical records
  const relevantEvents = useMemo(() => {
    const matchingYearEvents = NOTABLE_HISTORICAL_EVENTS.filter((e) => e.year === selectedYear);
    if (matchingYearEvents.length > 0) return matchingYearEvents;
    return NOTABLE_HISTORICAL_EVENTS.slice(0, 3);
  }, [selectedYear]);

  // Jump to specific storm date
  const jumpToDate = (targetDate: string) => {
    const idx = series.findIndex((d) => d.date === targetDate);
    if (idx !== -1) {
      setTimeIndex(idx);
    }
  };

  const containerClasses =
    mode === 'floating'
      ? `absolute bottom-5 z-20 pointer-events-auto transition-all duration-300 ${
          ragPanelOpen
            ? 'left-1/2 -translate-x-[calc(50%+130px)] w-[900px] max-w-[calc(100vw-450px-270px)]'
            : 'left-1/2 -translate-x-1/2 w-[980px] max-w-[calc(100vw-300px)]'
        }`
      : 'w-full relative z-10';

  return (
    <motion.div
      initial={mode === 'floating' ? { y: 30, opacity: 0 } : { opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={containerClasses}
    >
      <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-black/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.06)] font-satoshi">
        
        {/* ROW 1: Year & Month Selectors + Historical Fast Jumps */}
        <div className="flex items-center justify-between gap-2.5 text-xs pb-2 border-b border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            
            {/* Year Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setYearMenuOpen(!yearMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-white font-mono text-[11px] font-bold transition-all shadow-sm"
              >
                <History size={12} className="text-zinc-400" />
                <span>{selectedYear}</span>
                <ChevronDown size={11} className={`text-zinc-400 transition-transform ${yearMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {yearMenuOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-64 max-h-72 overflow-y-auto bg-black/95 border border-white/20 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-2xl font-mono text-[11px] scrollbar-thin">
                  <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Key Historical Deluges
                  </div>
                  <div className="grid grid-cols-2 gap-1 mb-2 pb-2 border-b border-white/10">
                    {[
                      { y: 2024, note: 'Recent' },
                      { y: 2019, note: '375mm Surge' },
                      { y: 2005, note: '566mm Deluge' },
                      { y: 1991, note: '646mm Record' },
                    ].map((item) => (
                      <button
                        key={item.y}
                        onClick={() => {
                          setYear(item.y);
                          setYearMenuOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-left transition-all ${
                          selectedYear === item.y
                            ? 'bg-white text-black font-bold'
                            : 'bg-white/[0.04] text-zinc-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="font-bold">{item.y}</div>
                        <div className="text-[9px] opacity-70 truncate">{item.note}</div>
                      </button>
                    ))}
                  </div>

                  <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                    All Recorded Years (1990 - 2024)
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {AVAILABLE_YEARS.map((y) => (
                      <button
                        key={y}
                        onClick={() => {
                          setYear(y);
                          setYearMenuOpen(false);
                        }}
                        className={`px-1.5 py-1 text-center rounded-lg transition-all ${
                          selectedYear === y
                            ? 'bg-white text-black font-bold'
                            : 'text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Month Filter Selector */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10 text-[10px] font-mono">
              <button
                onClick={() => setMonth('monsoon')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  selectedMonth === 'monsoon'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Monsoon (Jun-Sep)
              </button>
              <button
                onClick={() => setMonth('all')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  selectedMonth === 'all'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Full Year
              </button>
              {[6, 7, 8, 9].map((mVal) => {
                const mInfo = MONTH_NAMES.find((m) => m.value === mVal);
                return (
                  <button
                    key={mVal}
                    onClick={() => setMonth(mVal)}
                    className={`px-1.5 py-1 rounded-lg transition-all ${
                      selectedMonth === mVal
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {mInfo?.label}
                  </button>
                );
              })}
            </div>

            {/* Event fast-jump pills */}
            <div className="hidden xl:flex items-center gap-1 bg-white/[0.02] p-1 rounded-xl border border-white/5 text-[10px] font-mono">
              <Sparkles size={11} className="text-zinc-500 ml-1 mr-0.5" />
              {relevantEvents.map((evt) => (
                <button
                  key={evt.title}
                  onClick={() => {
                    if (selectedYear !== evt.year) {
                      setYear(evt.year);
                    }
                    setTimeout(() => jumpToDate(evt.date), 50);
                  }}
                  className={`px-2 py-0.5 rounded-lg transition-all text-zinc-400 hover:text-white hover:bg-white/10 ${
                    td.date === evt.date ? 'bg-white text-black font-bold' : ''
                  }`}
                  title={`${evt.title}: ${evt.rainfall3Day}mm (${evt.description})`}
                >
                  {evt.title} ({evt.rainfall3Day.toFixed(0)}mm)
                </button>
              ))}
            </div>
          </div>

          {/* High-Contrast Monochrome Status Badge */}
          <div className="flex items-center gap-2">
            {criticalWardsCount > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-black font-mono text-[11px] font-bold shadow-[0_0_20px_rgba(255,255,255,0.25)] border border-white">
                <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                <span>{criticalWardsCount} WARDS CRITICAL</span>
              </div>
            ) : elevatedWardsCount > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{elevatedWardsCount} ELEVATED WATCH</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span>ALL SECTORS NOMINAL</span>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Real Historical Precipitation Histogram Scrub Track */}
        <div className="relative px-1 pt-1">
          {/* Micro-bar histogram of all daily observations in active period */}
          <div className="flex items-end gap-[1.5px] h-9 w-full cursor-pointer group" style={{ minWidth: 460 }}>
            {series.map((d, idx) => {
              const heightPct = Math.max(10, Math.min(100, (d.rainfall_3day_sum / maxRain) * 100));
              const isSelected = idx === timeIndex;
              const isHovered = idx === hoveredIndex;
              const isExtreme = d.rainfall_3day_sum >= 180;
              const isHigh = d.rainfall_3day_sum >= 100 && !isExtreme;

              let barColor = 'bg-white/15';
              if (isSelected) {
                barColor = 'bg-white shadow-[0_0_12px_rgba(255,255,255,1)]';
              } else if (isExtreme) {
                barColor = 'bg-white/85 group-hover:bg-white';
              } else if (isHigh) {
                barColor = 'bg-white/45 group-hover:bg-white/65';
              } else {
                barColor = 'bg-white/15 group-hover:bg-white/30';
              }

              return (
                <div
                  key={`${d.date}-${idx}`}
                  onClick={() => setTimeIndex(idx)}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="flex-1 h-full flex flex-col justify-end items-center relative py-0.5"
                >
                  <div
                    className={`w-full rounded-t-sm transition-all duration-100 ${barColor}`}
                    style={{ height: `${heightPct}%` }}
                  />

                  {/* Active Beacon dot at bottom */}
                  {isSelected && (
                    <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                  )}

                  {/* Hover tooltip */}
                  {isHovered && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black border border-white/20 text-[10px] font-mono text-white whitespace-nowrap shadow-2xl z-50 pointer-events-none">
                      {d.date} · {d.rainfall_3day_sum}mm 3-Day · {(d.soil_moisture * 100).toFixed(0)}% Soil
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Range Slider for precision scrubbing */}
          <div className="relative mt-2">
            <input
              type="range"
              min={0}
              max={maxIdx}
              value={timeIndex}
              onChange={(e) => setTimeIndex(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
            />
            <div className="flex justify-between mt-1 text-[9px] text-zinc-500 font-mono">
              <span>{series[0]?.date}</span>
              <span className="text-white font-semibold">
                Active: {formatFullDate(td.date)} (Day {timeIndex + 1} of {totalDays})
              </span>
              <span>{series[maxIdx]?.date}</span>
            </div>
          </div>
        </div>

        {/* ROW 3: Playback Controls + Real-Time Telemetry Readouts */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/10">
          {/* Controls: StepBack, Play/Pause, StepForward, Speed, Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStepBack}
              disabled={timeIndex <= 0}
              title="Step Back 1 Day"
              className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:pointer-events-none transition-all"
            >
              <SkipBack size={13} />
            </button>

            <button
              onClick={handlePlayPause}
              title={isPlaying ? 'Pause Simulation' : 'Play Historical Progression'}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] font-bold'
                  : 'bg-white/[0.08] text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>

            <button
              onClick={handleStepForward}
              disabled={timeIndex >= maxIdx}
              title="Step Forward 1 Day"
              className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:pointer-events-none transition-all"
            >
              <SkipForward size={13} />
            </button>

            {/* Playback speed multiplier */}
            <button
              onClick={cycleSpeed}
              title="Toggle Playback Speed (1x, 2x, 4x)"
              className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[10px] font-mono font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all ml-1"
            >
              {playbackSpeed}x
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              title="Reset to Day 1"
              className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Pure Monochrome Telemetry Metrics */}
          <div className="flex items-center gap-5">
            <Metric icon={CloudRain} label="3-Day Rain" value={td.rainfall_3day_sum} unit="mm" />
            <Metric icon={Droplets} label="Soil Saturation" value={td.soil_moisture * 100} unit="%" decimals={1} />
            <Metric icon={ThermometerSun} label="Surface Temp" value={td.land_surface_temp} unit="°C" decimals={1} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  decimals = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
  decimals?: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
        <Icon size={13} className="text-zinc-300" />
      </div>
      <div>
        <div className="text-[8.5px] text-zinc-500 uppercase tracking-wider font-mono font-medium">{label}</div>
        <div className="text-[13px] font-bold text-white font-mono leading-none mt-0.5">
          <AnimatedNumber value={value} decimals={decimals} />
          <span className="text-[9px] text-zinc-500 ml-0.5 font-normal">{unit}</span>
        </div>
      </div>
    </div>
  );
}
