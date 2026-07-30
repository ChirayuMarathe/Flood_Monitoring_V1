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
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25, delay: 0.3 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="flex items-center gap-4 px-5 py-3 rounded-2xl"
        style={{
          background: 'rgba(20, 22, 29, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
          minWidth: 560,
        }}
      >
        {/* Date */}
        <div className="flex items-center gap-2 text-white/40 min-w-[100px]">
          <Calendar size={13} className="text-[#9CA3AF]" />
          <span className="text-[11px] font-mono font-medium">{td.date}</span>
        </div>

        <div className="w-px h-6 bg-white/6" />

        {/* Play/Pause */}
        <button onClick={handlePlayPause} className="w-8 h-8 rounded-full bg-white/4 hover:bg-white/8 flex items-center justify-center transition-colors">
          {isPlaying ? <Pause size={13} className="text-white/50" /> : <Play size={13} className="text-white/50 ml-0.5" />}
        </button>

        {/* Slider */}
        <div className="flex-1 flex flex-col gap-1 min-w-[200px]">
          <input
            type="range" min={0} max={29} value={timeIndex}
            onChange={(e) => setTimeIndex(parseInt(e.target.value, 10))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${(timeIndex / 29) * 100}%, rgba(255,255,255,0.06) ${(timeIndex / 29) * 100}%, rgba(255,255,255,0.06) 100%)` }}
          />
          <div className="flex justify-between">
            <span className="text-[9px] text-white/20 font-mono">Jul 01</span>
            <span className="text-[9px] text-amber-400/50 font-mono">Day {timeIndex + 1}</span>
            <span className="text-[9px] text-white/20 font-mono">Jul 30</span>
          </div>
        </div>

        <div className="w-px h-6 bg-white/6" />

        {/* Metrics */}
        <div className="flex items-center gap-4">
          <Metric icon={CloudRain} label="3-Day Rain" value={td.rainfall_3day_sum} unit="mm" />
          <Metric icon={Droplets} label="Soil Moist" value={td.soil_moisture * 100} unit="%" decimals={1} />
          <Metric icon={ThermometerSun} label="LST" value={td.land_surface_temp} unit="°C" decimals={1} />
        </div>
      </div>
    </motion.div>
  );
}

function Metric({ icon: Icon, label, value, unit, decimals = 0 }: { icon: React.ElementType; label: string; value: number; unit: string; decimals?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-[#9CA3AF]" />
      <div>
        <div className="text-[9px] text-white/25 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-bold text-white/85">
          <AnimatedNumber value={value} decimals={decimals} />
          <span className="text-[10px] text-white/30 ml-0.5">{unit}</span>
        </div>
      </div>
    </div>
  );
}
