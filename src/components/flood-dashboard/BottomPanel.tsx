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

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const current = useFloodStore.getState().timeIndex;
        if (current >= 29) {
          useFloodStore.getState().setTimeIndex(0);
        } else {
          useFloodStore.getState().setTimeIndex(current + 1);
        }
      }, 1200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeIndex(parseInt(e.target.value, 10));
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25, delay: 0.3 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="flex items-center gap-4 px-5 py-3 rounded-2xl"
        style={{
          background: 'rgba(12, 14, 20, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          minWidth: 560,
        }}
      >
        {/* Date display */}
        <div className="flex items-center gap-2 text-white/50 min-w-[100px]">
          <Calendar size={13} />
          <span className="text-[11px] font-mono font-medium">{td.date}</span>
        </div>

        <div className="w-px h-6 bg-white/8" />

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          {isPlaying ? <Pause size={13} className="text-white/70" /> : <Play size={13} className="text-white/70 ml-0.5" />}
        </button>

        {/* Slider track */}
        <div className="flex-1 flex flex-col gap-1 min-w-[200px]">
          <input
            type="range"
            min={0}
            max={29}
            value={timeIndex}
            onChange={handleSliderChange}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #D4A853 0%, #D4A853 ${(timeIndex / 29) * 100}%, rgba(255,255,255,0.1) ${(timeIndex / 29) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
          <div className="flex justify-between">
            <span className="text-[9px] text-white/25 font-mono">Jul 01</span>
            <span className="text-[9px] text-[#D4A853]/60 font-mono">Day {timeIndex + 1}</span>
            <span className="text-[9px] text-white/25 font-mono">Jul 30</span>
          </div>
        </div>

        <div className="w-px h-6 bg-white/8" />

        {/* Metrics row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CloudRain size={12} className="text-blue-400/60" />
            <div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">3-Day Rain</div>
              <div className="text-sm font-bold text-white/90">
                <AnimatedNumber value={td.rainfall_3day_sum} />
                <span className="text-[10px] text-white/40 ml-0.5">mm</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Droplets size={12} className="text-cyan-400/60" />
            <div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">Soil Moist</div>
              <div className="text-sm font-bold text-white/90">
                <AnimatedNumber value={td.soil_moisture * 100} decimals={1} />
                <span className="text-[10px] text-white/40 ml-0.5">%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThermometerSun size={12} className="text-orange-400/60" />
            <div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">LST</div>
              <div className="text-sm font-bold text-white/90">
                <AnimatedNumber value={td.land_surface_temp} decimals={1} />
                <span className="text-[10px] text-white/40 ml-0.5">°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
