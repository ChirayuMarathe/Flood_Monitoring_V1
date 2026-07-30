'use client';

import { motion } from 'framer-motion';
import { CloudRain, Thermometer, Radio } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { AnimatedNumber } from './AnimatedNumber';

export default function WeatherWidget() {
  const { rainfallMumbaiAvg, landSurfaceTemp } = useFloodStore();

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25, delay: 0.2 }}
      className="absolute top-5 right-5 z-20"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="px-4 py-3 rounded-xl"
        style={{
          background: 'rgba(12, 14, 20, 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Radio size={10} className="text-emerald-400" />
          <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">Live Weather</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <CloudRain size={15} className="text-blue-400/70" />
            <div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">Rainfall (Avg)</div>
              <div className="text-lg font-bold text-white/90 leading-tight">
                <AnimatedNumber value={rainfallMumbaiAvg} />
                <span className="text-[10px] text-white/40 ml-1">mm</span>
              </div>
            </div>
          </div>
          <div className="w-px h-8 bg-white/8" />
          <div className="flex items-center gap-2">
            <Thermometer size={15} className="text-orange-400/70" />
            <div>
              <div className="text-[9px] text-white/30 uppercase tracking-wider">Surface Temp</div>
              <div className="text-lg font-bold text-white/90 leading-tight">
                <AnimatedNumber value={landSurfaceTemp} decimals={1} />
                <span className="text-[10px] text-white/40 ml-1">°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}