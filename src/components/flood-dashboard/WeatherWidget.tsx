'use client';

import { motion } from 'framer-motion';
import { CloudRain, Thermometer, Radio } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { AnimatedNumber } from './AnimatedNumber';

export default function WeatherWidget() {
  const { rainfallMumbaiAvg, landSurfaceTemp } = useFloodStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="absolute top-4 right-4 z-20"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="px-4 py-2.5 rounded-lg bg-[#13161D] border border-[#242832]">
        <div className="flex items-center gap-1.5 mb-2">
          <Radio size={9} className="text-[#5B8DEF]" />
          <span className="text-[9px] uppercase tracking-[0.1em] font-medium text-[#525866]">Live Weather</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <CloudRain size={13} className="text-[#525866]" />
            <div>
              <div className="text-[9px] text-[#525866] uppercase tracking-wider">Rainfall</div>
              <div className="text-[16px] font-semibold text-[#E1E4EA] leading-tight">
                <AnimatedNumber value={rainfallMumbaiAvg} />
                <span className="text-[10px] text-[#525866] ml-1">mm</span>
              </div>
            </div>
          </div>
          <div className="w-px h-7 bg-[#242832]" />
          <div className="flex items-center gap-2">
            <Thermometer size={13} className="text-[#525866]" />
            <div>
              <div className="text-[9px] text-[#525866] uppercase tracking-wider">Surface Temp</div>
              <div className="text-[16px] font-semibold text-[#E1E4EA] leading-tight">
                <AnimatedNumber value={landSurfaceTemp} decimals={1} />
                <span className="text-[10px] text-[#525866] ml-1">C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}