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
  const trendColor = trend === 'up' ? 'text-[#D94444]' : trend === 'down' ? 'text-[#5B8DEF]' : 'text-[#525866]';

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg bg-[#13161D] border border-[#242832]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[#525866]" />
          <span className="text-[11px] uppercase tracking-wider text-[#525866] font-medium">{label}</span>
        </div>
        {trendValue && (
          <span className={`text-[10px] font-medium ${trendColor}`}>{trendValue}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold text-[#E1E4EA] tracking-tight">
          <AnimatedNumber value={value} decimals={decimals} />
        </span>
        {unit && <span className="text-[13px] text-[#525866]">{unit}</span>}
      </div>
    </div>
  );
}
