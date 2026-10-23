'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Radio,
} from 'lucide-react';
import { usePredictions } from '@/hooks/usePredictions';
import { PROFILE_DESCRIPTIONS, PROFILE_THRESHOLDS, AlertProfile, ALERT_COLORS } from '@/lib/prediction-service';
import { useFloodStore } from '@/store/flood-store';
import { AnimatedNumber } from './AnimatedNumber';

const PROFILES: { id: AlertProfile; label: string; color: string }[] = [
  { id: 'A', label: 'Early Warning', color: 'bg-white text-black' },
  { id: 'B', label: 'Balanced', color: 'bg-white/10 text-white' },
  { id: 'C', label: 'Tactical', color: 'bg-white/10 text-white' },
];

interface LiveRiskPanelProps {
  rainfallMax?: number;
  soilMoisture?: number;
}

export default function LiveRiskPanel({
  rainfallMax: propRain,
  soilMoisture: propSoil,
}: LiveRiskPanelProps) {
  const { activeCity, currentTimeData } = useFloodStore();
  const td = currentTimeData ? currentTimeData() : null;

  const rainfallMax = propRain !== undefined ? propRain : (td?.rainfall_3day_sum ?? 0);
  const soilMoisture = propSoil !== undefined ? propSoil : (td?.soil_moisture ?? 0.35);

  const {
    snapshot,
    serverStatus,
    isLoading,
    error,
    profile,
    setProfile,
    refresh,
    lastUpdated,
  } = usePredictions(rainfallMax, soilMoisture);

  const flaggedCount = snapshot?.flagged_wards ?? 0;
  const totalCount = snapshot?.total_wards ?? 0;
  const elapsedMs = snapshot?.elapsed_ms ?? null;
  const mode = snapshot?.mode ?? serverStatus.mode;

  // Distribution by alert level
  const distribution = { green: 0, amber: 0, red: 0, critical: 0 };
  snapshot?.wards.forEach((w) => {
    distribution[w.alert_level as keyof typeof distribution] =
      (distribution[w.alert_level as keyof typeof distribution] ?? 0) + 1;
  });

  // Top 5 highest-risk wards
  const topRiskWards = [...(snapshot?.wards ?? [])]
    .filter((w) => w.city === activeCity || !activeCity)
    .sort((a, b) => b.type3_prob - a.type3_prob)
    .slice(0, 5);

  return (
    <div className="flex flex-col max-h-[305px] rounded-2xl bg-black/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_64px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.06)] font-satoshi overflow-hidden">
      
      {/* Header (Fixed) */}
      <div className="flex items-center justify-between p-3.5 pb-2 border-b border-white/10 shrink-0 bg-black/40">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity size={15} className="text-white" />
            {serverStatus.online && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white animate-ping" />
            )}
          </div>
          <span className="text-[11.5px] font-bold text-white uppercase tracking-wide">
            Live ML Risk Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[9px] text-zinc-500 font-mono">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30"
          >
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 flex flex-col gap-3">
        {/* Alert Profile Selector */}
        <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">
            Alert Profile (aidt.pdf §5)
          </div>
          <div className="text-[9px] font-mono text-zinc-400">
            Cut-off: <span className="text-white font-semibold">{(PROFILE_THRESHOLDS[profile] * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex gap-1 p-0.5 bg-white/[0.04] rounded-xl border border-white/10">
          {PROFILES.map((p) => {
            const thrPct = (PROFILE_THRESHOLDS[p.id] * 100).toFixed(0);
            return (
              <button
                key={p.id}
                onClick={() => setProfile(p.id)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  profile === p.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {p.id} — {p.label} <span className="opacity-70 text-[9px]">({thrPct}%)</span>
              </button>
            );
          })}
        </div>
        <div className="text-[9px] text-zinc-500 font-mono truncate">
          {PROFILE_DESCRIPTIONS[profile]}
        </div>
      </div>

      {/* Current snapshot stats */}
      {snapshot && (
        <div className="grid grid-cols-4 gap-2">
          <StatPill label="Total Wards" value={totalCount} />
          <StatPill label="Flagged" value={flaggedCount} highlight={flaggedCount > 0} />
          <StatPill
            label="Inference"
            value={elapsedMs !== null ? `${elapsedMs.toFixed(0)}ms` : '<1ms'}
            isString
          />
          <StatPill
            label="Safe Wards"
            value={Math.max(0, totalCount - flaggedCount)}
          />
        </div>
      )}

      {/* Risk Distribution Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">
            Risk Distribution
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            {(['green', 'amber', 'red', 'critical'] as const).map((level) => {
              const pct = totalCount > 0 ? (distribution[level] / totalCount) * 100 : 0;
              if (pct < 0.5) return null;
              const colors = {
                green: 'bg-[#00C853]', amber: 'bg-[#FFD600]',
                red: 'bg-[#FF6D00]', critical: 'bg-[#FF1744]',
              };
              return (
                <motion.div
                  key={level}
                  className={colors[level]}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  title={`${level}: ${distribution[level]} wards`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] font-mono text-zinc-500">
            <span>{distribution.green} safe</span>
            <span className="text-yellow-400">{distribution.amber} watch</span>
            <span className="text-orange-400">{distribution.red} alert</span>
            <span className="text-red-400">{distribution.critical} critical</span>
          </div>
        </div>
      )}

      {/* Top risk wards for active city */}
      {topRiskWards.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">
            Highest Risk Wards
            {activeCity && (
              <span className="ml-1 text-zinc-600 normal-case capitalize">
                ({activeCity.replace('_', ' ')})
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {topRiskWards.map((w) => (
              <WardRiskRow key={w.ward_uid} ward={w} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] text-zinc-500 font-mono">
          <XCircle size={12} className="text-zinc-600 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Server status footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 font-mono">
          <Server size={10} />
          <span>FastAPI :8000</span>
          {serverStatus.online
            ? <CheckCircle2 size={10} className="text-white/40" />
            : <XCircle size={10} className="text-zinc-700" />
          }
        </div>
        {!serverStatus.online && (
          <div className="text-[9px] text-zinc-600 font-mono">
            Run: python ml/server/api_server.py
          </div>
        )}
        {serverStatus.online && !serverStatus.models_available && (
          <div className="text-[9px] text-zinc-600 font-mono">
            Run: python ml/server/train_and_save.py
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({
  label, value, highlight = false, isString = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  isString?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border ${
      highlight
        ? 'bg-white/[0.06] border-white/20'
        : 'bg-white/[0.02] border-white/8'
    }`}>
      <div className="text-[9px] text-zinc-500 uppercase tracking-wide font-mono text-center">
        {label}
      </div>
      <div className={`text-[13px] font-bold font-mono leading-none ${highlight ? 'text-white' : 'text-zinc-300'}`}>
        {isString ? value : <AnimatedNumber value={Number(value)} decimals={0} />}
      </div>
    </div>
  );
}

function WardRiskRow({ ward }: { ward: ReturnType<typeof usePredictions>['snapshot'] extends infer S
  ? S extends object ? (S & { wards: readonly { ward_uid: string; ward_code: string | null; type3_prob: number; alert_level: string; color: string }[] })['wards'][number] : never
  : never
}) {
  const alertColor = {
    green: 'bg-[#00C853]',
    amber: 'bg-[#FFD600]',
    red: 'bg-[#FF6D00]',
    critical: 'bg-[#FF1744] animate-pulse',
  }[ward.alert_level as string] ?? 'bg-zinc-600';

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all">
      <div className={`w-2 h-2 rounded-full shrink-0 ${alertColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-white font-mono truncate">
          {ward.ward_code ?? ward.ward_uid.split('_').slice(1).join('_')}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: ward.color }}
            initial={{ width: 0 }}
            animate={{ width: `${ward.type3_prob * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-[9px] font-mono text-zinc-400 w-8 text-right">
          {(ward.type3_prob * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
