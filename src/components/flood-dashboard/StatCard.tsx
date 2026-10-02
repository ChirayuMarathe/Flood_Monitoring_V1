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
    accent: '#10B981',
    glow: 'rgba(16, 185, 129, 0.15)',
    border: 'border-white/10 hover:border-emerald-500/40',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    barBg: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    progressLabel: 'SECTOR READINESS',
  },
  critical: {
    accent: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.22)',
    border: 'border-red-500/30 hover:border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.14)]',
    badgeBg: 'bg-red-500/15 text-red-400 border-red-500/35',
    barBg: 'bg-gradient-to-r from-red-600 via-rose-500 to-red-400',
    progressLabel: 'EMERGENCY SEVERITY LOAD',
  },
  warning: {
    accent: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.16)',
    border: 'border-amber-500/25 hover:border-amber-500/40',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    barBg: 'bg-gradient-to-r from-amber-600 to-amber-400',
    progressLabel: 'WATCH THRESHOLD',
  },
  info: {
    accent: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.16)',
    border: 'border-blue-500/25 hover:border-blue-500/40',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    barBg: 'bg-gradient-to-r from-blue-600 to-cyan-400',
    progressLabel: 'MONITORED COVERAGE',
  },
  rain: {
    accent: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.18)',
    border: 'border-cyan-500/25 hover:border-cyan-500/40',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
    barBg: 'bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400',
    progressLabel: 'PRECIPITATION CAPACITY',
  },
  soil: {
    accent: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.18)',
    border: 'border-purple-500/25 hover:border-purple-500/40',
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    barBg: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-400',
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
      className={`relative overflow-hidden rounded-2xl bg-[#0B0D14]/90 backdrop-blur-xl p-5 border transition-all duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.7)] group ${style.border}`}
    >
      {/* Dynamic ambient radial glow */}
      <div
        className="pointer-events-none absolute -top-14 -right-14 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60"
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
              className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'bg-red-400 animate-ping' : ''}`}
              style={{ backgroundColor: !isCritical ? style.accent : undefined }}
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
