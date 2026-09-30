'use client';

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
    accent: '#5EA977',
    glow: 'rgba(94, 169, 119, 0.12)',
    border: 'border-white/10 hover:border-[#5EA977]/30',
    badgeBg: 'bg-[#5EA977]/10 text-[#5EA977] border-[#5EA977]/20',
    barBg: 'bg-[#5EA977]',
  },
  critical: {
    accent: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.16)',
    border: 'border-red-500/25 hover:border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.12)]',
    badgeBg: 'bg-red-500/15 text-red-400 border-red-500/30',
    barBg: 'bg-gradient-to-r from-red-600 to-red-400',
  },
  warning: {
    accent: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.12)',
    border: 'border-amber-500/20 hover:border-amber-500/35',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    barBg: 'bg-gradient-to-r from-amber-600 to-amber-400',
  },
  info: {
    accent: '#3B82F6',
    glow: 'rgba(59, 130, 246, 0.12)',
    border: 'border-blue-500/20 hover:border-blue-500/35',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    barBg: 'bg-gradient-to-r from-blue-600 to-blue-400',
  },
  rain: {
    accent: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.14)',
    border: 'border-cyan-500/20 hover:border-cyan-500/35',
    badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    barBg: 'bg-gradient-to-r from-cyan-600 to-cyan-400',
  },
  soil: {
    accent: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.14)',
    border: 'border-purple-500/20 hover:border-purple-500/35',
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    barBg: 'bg-gradient-to-r from-purple-600 to-purple-400',
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
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#151821] via-[#10131B] to-[#0D0F15] p-5 border transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.06)] group ${style.border}`}
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-60"
        style={{ background: style.glow }}
      />

      {/* Top Header Row */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-md transition-transform duration-300 group-hover:scale-105"
            style={{
              backgroundColor: `${style.accent}15`,
              borderColor: `${style.accent}30`,
            }}
          >
            <Icon size={15} style={{ color: style.accent }} className={isCritical ? 'animate-pulse' : ''} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#8B919E]">
              {label}
            </span>
          </div>
        </div>

        {trendValue && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${style.badgeBg}`}
          >
            {isCritical && <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />}
            {trendValue}
          </span>
        )}
      </div>

      {/* Primary Value Readout */}
      <div className="relative z-10 mt-4 flex items-baseline gap-2">
        <span className="text-[34px] font-bold font-clash text-white tracking-tight leading-none">
          <AnimatedNumber value={value} decimals={decimals} />
        </span>
        {unit && (
          <span className="text-[13px] font-mono font-medium text-[#8B919E]">
            {unit}
          </span>
        )}
      </div>

      {/* Subtitle / Context note */}
      {subtitle && (
        <p className="relative z-10 mt-1 text-[11px] text-[#69707D] font-satoshi truncate">
          {subtitle}
        </p>
      )}

      {/* Bottom Progress / Capacity Indicator */}
      {progress !== undefined && (
        <div className="relative z-10 mt-3 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-[9px] font-mono text-[#525866] mb-1">
            <span>INDEX METER</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${style.barBg}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
