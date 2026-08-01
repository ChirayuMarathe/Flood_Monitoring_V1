'use client';

import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  decimals = 0,
  trend = 'flat',
  trendValue,
}: StatCardProps) {
  const trendColor = trend === 'up' ? 'text-[#D94444]' : trend === 'down' ? 'text-[#5EA977]' : 'text-[#525866]';

  return (
    <div className="flex flex-col gap-3 p-4.5 rounded-xl bg-[#13161D] border border-white/10 hover:border-white/20 transition-all shadow-sm group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[#5EA977] group-hover:scale-110 transition-transform" />
          <span className="text-[11px] uppercase tracking-wider text-[#8B919E] font-satoshi font-medium">{label}</span>
        </div>
        {trendValue && (
          <span className={`text-[10px] font-medium font-satoshi ${trendColor}`}>{trendValue}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[30px] font-bold font-clash text-white tracking-tight">
          <AnimatedNumber value={value} decimals={decimals} />
        </span>
        {unit && <span className="text-[13px] text-[#8B919E] font-satoshi">{unit}</span>}
      </div>
    </div>
  );
}
