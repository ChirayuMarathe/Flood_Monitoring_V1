'use client';

import React from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { motion } from 'framer-motion';

export interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  variant?: 'default' | 'critical' | 'warning' | 'info' | 'rain' | 'soil';
  progress?: number; // 0 to 100
  subtitle?: string;
}

const variantStyles = {
  default: {
    accent: '#E4E4E7',
    glow: 'rgba(255, 255, 255, 0.03)',
    border: 'border-white/10 hover:border-white/20',
    badgeBg: 'bg-white/[0.06] text-zinc-300 border-white/15',
    barBg: 'bg-zinc-400',
    progressLabel: 'SECTOR READINESS',
  },
  critical: {
    accent: '#FFFFFF',
    glow: 'rgba(255, 255, 255, 0.08)',
    border: 'border-white/40 hover:border-white/60 shadow-[0_0_24px_rgba(255,255,255,0.06)]',
    badgeBg: 'bg-white text-black font-bold border-white',
    barBg: 'bg-white',
    progressLabel: 'EMERGENCY SEVERITY LOAD',
  },
  warning: {
    accent: '#D4D4D8',
    glow: 'rgba(255, 255, 255, 0.04)',
    border: 'border-white/20 hover:border-white/30',
    badgeBg: 'bg-white/[0.08] text-white border-white/20',
    barBg: 'bg-zinc-300',
    progressLabel: 'WATCH THRESHOLD',
  },
  info: {
    accent: '#A1A1AA',
    glow: 'rgba(255, 255, 255, 0.03)',
    border: 'border-white/10 hover:border-white/20',
    badgeBg: 'bg-white/[0.04] text-zinc-400 border-white/10',
    barBg: 'bg-zinc-500',
    progressLabel: 'MONITORED COVERAGE',
  },
  rain: {
    accent: '#F4F4F5',
    glow: 'rgba(255, 255, 255, 0.05)',
    border: 'border-white/15 hover:border-white/25',
    badgeBg: 'bg-white/[0.07] text-white border-white/20',
    barBg: 'bg-zinc-200',
    progressLabel: 'PRECIPITATION CAPACITY',
  },
  soil: {
    accent: '#71717A',
    glow: 'rgba(255, 255, 255, 0.02)',
    border: 'border-white/10 hover:border-white/20',
    badgeBg: 'bg-white/[0.05] text-zinc-300 border-white/15',
    barBg: 'bg-zinc-400',
    progressLabel: 'SOIL SATURATION INDEX',
  },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  decimals = 0,
  trend = 'flat',
  trendValue,
  variant = 'default',
  progress,
  subtitle,
}: StatCardProps) {
  const style = variantStyles[variant] || variantStyles.default;
  const isCritical = variant === 'critical' && value > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black/85 backdrop-blur-xl p-5 border transition-all duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.8)] group ${style.border}`}
    >
      {/* Dynamic ambient radial glow */}
      <div
        className="pointer-events-none absolute -top-14 -right-14 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-40"
        style={{ background: style.glow }}
      />

      {/* Top Header Row */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-md transition-transform duration-300 group-hover:scale-105 shadow-sm"
            style={{
              backgroundColor: `${style.accent}14`,
              borderColor: `${style.accent}30`,
            }}
          >
            <Icon size={16} style={{ color: style.accent }} className={isCritical ? 'animate-pulse' : ''} />
          </div>
          <div>
            <span className="text-[10.5px] font-mono font-semibold uppercase tracking-[0.16em] text-gray-400">
              {label}
            </span>
          </div>
        </div>

        {trendValue && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border backdrop-blur-md ${style.badgeBg}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'bg-white animate-ping' : ''}`}
              style={{ backgroundColor: !isCritical ? style.accent : '#FFFFFF' }}
            />
            {trendValue}
          </span>
        )}
      </div>

      {/* Primary Value Readout */}
      <div className="relative z-10 mt-4 flex items-baseline gap-2">
        <span className="text-[36px] font-bold font-clash text-white tracking-tight leading-none drop-shadow-sm">
          <AnimatedNumber value={value} decimals={decimals} />
        </span>
        {unit && (
          <span className="text-[13px] font-mono font-medium text-gray-400">
            {unit}
          </span>
        )}
      </div>

      {/* Subtitle / Context note */}
      {subtitle && (
        <p className="relative z-10 mt-1.5 text-[11.5px] text-gray-400 font-satoshi truncate">
          {subtitle}
        </p>
      )}

      {/* Bottom Progress / Capacity Indicator */}
      {progress !== undefined && (
        <div className="relative z-10 mt-3.5 pt-2.5 border-t border-white/5">
          <div className="flex items-center justify-between text-[9.5px] font-mono text-gray-400 mb-1.5">
            <span className="tracking-wider">{style.progressLabel}</span>
            <span className="font-semibold text-white/90">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden p-[1px]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full shadow-sm ${style.barBg}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
