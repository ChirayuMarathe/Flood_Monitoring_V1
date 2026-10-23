'use client';

import { motion } from 'framer-motion';
import { CloudRain, Thermometer, Radio } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { AnimatedNumber } from './AnimatedNumber';

export default function WeatherWidget() {
  const currentTimeData = useFloodStore((s) => s.currentTimeData);
  const activeCity = useFloodStore((s) => s.activeCity);
  const rainfallMumbaiAvg = useFloodStore((s) => s.rainfallMumbaiAvg);
  const landSurfaceTemp = useFloodStore((s) => s.landSurfaceTemp);

  const td = currentTimeData();
  const rainfall = td?.rainfall_3day_sum ?? rainfallMumbaiAvg ?? 186.4;
  const temp = td?.land_surface_temp ?? landSurfaceTemp ?? 26.5;
  const cityLabel = activeCity === 'navi_mumbai' ? 'Navi Mumbai' : activeCity.charAt(0).toUpperCase() + activeCity.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="absolute top-4 right-4 z-20"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="px-4 py-3 rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-1.5">
            <Radio size={10} className="text-white animate-pulse" />
            <span className="text-[9px] uppercase tracking-[0.14em] font-mono font-semibold text-[#8B919E]">
              Weather Telemetry
            </span>
          </div>
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded">
            {cityLabel}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <CloudRain size={14} className="text-white" />
            <div>
              <div className="text-[9px] text-[#8B919E] font-mono uppercase tracking-wider">3-Day Rain</div>
              <div className="text-[16px] font-bold font-clash text-white leading-tight">
                <AnimatedNumber value={Math.round(rainfall * 10) / 10} decimals={1} />
                <span className="text-[10px] text-[#8B919E] ml-1 font-mono">mm</span>
              </div>
            </div>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div className="flex items-center gap-2">
            <Thermometer size={14} className="text-white/80" />
            <div>
              <div className="text-[9px] text-[#8B919E] font-mono uppercase tracking-wider">Surface Temp</div>
              <div className="text-[16px] font-bold font-clash text-white leading-tight">
                <AnimatedNumber value={Math.round(temp * 10) / 10} decimals={1} />
                <span className="text-[10px] text-[#8B919E] ml-1 font-mono">°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}