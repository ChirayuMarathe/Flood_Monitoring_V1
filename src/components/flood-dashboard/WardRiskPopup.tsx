'use client';

import React from 'react';
import { X, CloudRain, Waves, Navigation, Droplets, AlertTriangle, Sparkles } from 'lucide-react';
import type { WardRiskProfile, HazardType } from '@/lib/risk/WardRiskProfile';
import { severityColors } from '@/lib/mumbai-data';

interface WardRiskPopupProps {
  profile: WardRiskProfile;
  onClose: () => void;
  onRequestAIExplanation: () => void;
  isLoadingAI?: boolean;
}

const hazardTypeLabel = (type: HazardType) => {
  switch (type) {
    case 'rainfall_overflow': return 'Rainfall Overflow';
    case 'topographic_pooling': return 'Topographic Pooling';
    case 'tidal_backflow': return 'Tidal Backflow';
    case 'river_overflow': return 'River Overflow';
    case 'compound': return 'Compound Risk';
    default: return 'Environmental Risk';
  }
};

const HazardIcon = ({ type }: { type: HazardType }) => {
  const props = { className: "w-4 h-4 shrink-0 text-white/90" };
  switch (type) {
    case 'rainfall_overflow': return <CloudRain {...props} />;
    case 'topographic_pooling': return <Navigation {...props} className="w-4 h-4 shrink-0 rotate-180 text-white/90" />;
    case 'tidal_backflow': return <Waves {...props} />;
    case 'river_overflow': return <Droplets {...props} />;
    case 'compound': return <AlertTriangle {...props} />;
    default: return <AlertTriangle {...props} />;
  }
};

const SEVERITY_BADGES: Record<0 | 1 | 2 | 3, { label: string; badge: string; dot: string }> = {
  0: { label: 'Minimal Risk', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  1: { label: 'Low Risk', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  2: { label: 'Moderate Risk', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
  3: { label: 'Critical Risk', badge: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400 animate-ping' },
};

const ContributionBar = ({ value, severity }: { value: number; severity: 0 | 1 | 2 | 3 }) => {
  const barColor = 
    severity === 3 ? 'bg-red-500' :
    severity === 2 ? 'bg-orange-500' :
    severity === 1 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
      <div 
        className={`h-full rounded-full ${barColor}`}
        style={{ width: `${Math.min(100, Math.max(8, value * 100))}%` }}
      />
    </div>
  );
};

export function WardRiskPopup({ profile, onClose, onRequestAIExplanation, isLoadingAI }: WardRiskPopupProps) {
  const sevInfo = SEVERITY_BADGES[profile.overallSeverity] || SEVERITY_BADGES[0];

  return (
    <div className="w-[370px] bg-[#0A0D14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto text-white overflow-hidden font-satoshi animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="px-5 py-4 flex justify-between items-start border-b border-white/10 bg-white/[0.02]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-lg font-bold font-clash text-white tracking-tight leading-tight">
              {profile.wardName}
            </h3>
            <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase">
              {profile.city}
            </span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${sevInfo.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sevInfo.dot}`} />
            Severity {profile.overallSeverity}: {sevInfo.label}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close popup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 overflow-y-auto max-h-[58vh] custom-scrollbar">
        
        {/* Active Hazards */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] font-mono">
              Active Risk Factors
            </h4>
            <span className="text-[10px] text-gray-500 font-mono">
              {profile.activeHazards.length} factor{profile.activeHazards.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-2.5">
            {profile.activeHazards.length > 0 ? (
              profile.activeHazards.map((hazard) => (
                <div 
                  key={hazard.type} 
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <HazardIcon type={hazard.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs font-semibold text-white tracking-wide">
                        {hazardTypeLabel(hazard.type)}
                      </strong>
                      <span className="text-[10px] font-mono text-gray-400">
                        {(hazard.contributionScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">
                      {hazard.explanation}
                    </p>
                    <ContributionBar value={hazard.contributionScore} severity={profile.overallSeverity} />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 italic">
                No active flood hazards detected at current timeline parameters.
              </div>
            )}
          </div>
        </section>

        {/* Raw Metrics Grid */}
        <section>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] font-mono mb-2.5">
            Current Telemetry
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">3-Day Rain</div>
              <div className="font-clash font-bold text-sm text-white flex items-center gap-1.5">
                {profile.rainfall3DaySum.toFixed(0)} mm
                {profile.rainfallTrend === 'rising' && <span className="text-red-400 text-xs">↑</span>}
                {profile.rainfallTrend === 'falling' && <span className="text-emerald-400 text-xs">↓</span>}
              </div>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Soil Moisture</div>
              <div className="font-clash font-bold text-sm text-white">
                {(profile.soilMoisture * 100).toFixed(0)}%
              </div>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Elevation Mean</div>
              <div className="font-clash font-bold text-sm text-white">{profile.elevationMean.toFixed(1)} m</div>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Wetness (TWI)</div>
              <div className="font-clash font-bold text-sm text-white">{profile.twiMean.toFixed(1)}</div>
            </div>
          </div>
        </section>

        {/* Historical Match */}
        {profile.similarHistoricalEvent && (
          <section>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] font-mono mb-2">
              Historical Analogue
            </h4>
            <div className="p-3 bg-[#5B8DEF]/10 border border-[#5B8DEF]/20 rounded-xl text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-300">Closest Past Event:</span>
                <strong className="font-mono text-white font-semibold">{profile.similarHistoricalEvent.date}</strong>
              </div>
              <p className="text-white/90 font-medium mb-1.5">{profile.similarHistoricalEvent.outcome}</p>
              <p className="text-[11px] text-gray-400 italic">{profile.similarHistoricalEvent.similarityNote}</p>
            </div>
          </section>
        )}
      </div>

      {/* Footer / CTA */}
      <div className="p-4 border-t border-white/10 bg-white/[0.02]">
        <button
          onClick={onRequestAIExplanation}
          disabled={isLoadingAI}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-black hover:bg-gray-100 rounded-xl font-medium font-satoshi text-xs tracking-wide transition-all shadow-[0_0_25px_rgba(255,255,255,0.12)] hover:shadow-[0_0_35px_rgba(255,255,255,0.22)] disabled:opacity-50 cursor-pointer"
        >
          {isLoadingAI ? (
            <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-black" />
          )}
          Generate Plain-Language Alert
        </button>
      </div>
    </div>
  );
}
