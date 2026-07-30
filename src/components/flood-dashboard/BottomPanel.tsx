'use client';

import { motion } from 'framer-motion';
import { Play, Pause, CloudRain, Droplets, ThermometerSun, Calendar } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatedNumber } from './AnimatedNumber';

export default function BottomPanel() {
  const { timeIndex, setTimeIndex, currentTimeData } = useFloodStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const td = currentTimeData();

  const handlePlayPause = useCallback(() => setIsPlaying((p) => !p), []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const c = useFloodStore.getState().timeIndex;
        useFloodStore.getState().setTimeIndex(c >= 29 ? 0 : c + 1);
      }, 1200);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="flex items-center gap-4 px-4 py-2.5 rounded-lg bg-[#13161D] border border-[#242832]"
        style={{ minWidth: 520 }}
      >
        {/* Date */}
        <div className="flex items-center gap-2 text-[#8B919E] min-w-[90px]">
          <Calendar size={12} className="text-[#525866]" />
          <span className="text-[11px] font-mono">{td.date}</span>
        </div>

        <div className="w-px h-5 bg-[#242832]" />

        {/* Play/Pause */}
        <button onClick={handlePlayPause} className="w-7 h-7 rounded bg-[#1A1E27] border border-[#242832] flex items-center justify-center hover:bg-[#242832] transition-colors">
          {isPlaying ? <Pause size={11} className="text-[#8B919E]" /> : <Play size={11} className="text-[#8B919E] ml-0.5" />}
        </button>

        {/* Slider */}
        <div className="flex-1 flex flex-col gap-1 min-w-[180px]">
          <input
            type="range" min={0} max={29} value={timeIndex}
            onChange={(e) => setTimeIndex(parseInt(e.target.value, 10))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #5B8DEF 0%, #5B8DEF ${(timeIndex / 29) * 100}%, #1A1E27 ${(timeIndex / 29) * 100}%, #1A1E27 100%)` }}
          />
          <div className="flex justify-between">
            <span className="text-[9px] text-[#525866] font-mono">Jul 01</span>
            <span className="text-[9px] text-[#8B919E] font-mono">Day {timeIndex + 1}</span>
            <span className="text-[9px] text-[#525866] font-mono">Jul 30</span>
          </div>
        </div>

        <div className="w-px h-5 bg-[#242832]" />

        {/* Metrics */}
        <div className="flex items-center gap-4">
          <Metric icon={CloudRain} label="3-Day Rain" value={td.rainfall_3day_sum} unit="mm" />
          <Metric icon={Droplets} label="Soil" value={td.soil_moisture * 100} unit="%" decimals={1} />
          <Metric icon={ThermometerSun} label="LST" value={td.land_surface_temp} unit="C" decimals={1} />
        </div>
      </div>
    </motion.div>
  );
}

function Metric({ icon: Icon, label, value, unit, decimals = 0 }: { icon: React.ElementType; label: string; value: number; unit: string; decimals?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={11} className="text-[#525866]" />
      <div>
        <div className="text-[8px] text-[#525866] uppercase tracking-wider">{label}</div>
        <div className="text-[13px] font-semibold text-[#E1E4EA]">
          <AnimatedNumber value={value} decimals={decimals} />
          <span className="text-[9px] text-[#525866] ml-0.5">{unit}</span>
        </div>
      </div>
    </div>
  );
}
