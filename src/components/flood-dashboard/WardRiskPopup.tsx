import React from 'react';
import { X, CloudRain, Waves, Navigation, Droplets, AlertTriangle } from 'lucide-react';
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
    default: return 'Unknown Hazard';
  }
};

const HazardIcon = ({ type }: { type: HazardType }) => {
  const props = { className: "w-5 h-5 mt-1 opacity-80 shrink-0" };
  switch (type) {
    case 'rainfall_overflow': return <CloudRain {...props} />;
    case 'topographic_pooling': return <Navigation {...props} className="w-5 h-5 mt-1 opacity-80 shrink-0 rotate-180" />;
    case 'tidal_backflow': return <Waves {...props} />;
    case 'river_overflow': return <Droplets {...props} />;
    case 'compound': return <AlertTriangle {...props} />;
    default: return <AlertTriangle {...props} />;
  }
};

const ContributionBar = ({ value }: { value: number }) => (
  <div className="w-full h-1.5 bg-black/10 rounded-full mt-2 overflow-hidden">
    <div 
      className="h-full bg-current rounded-full" 
      style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
    />
  </div>
);

export function WardRiskPopup({ profile, onClose, onRequestAIExplanation, isLoadingAI }: WardRiskPopupProps) {
  const sevStyle = severityColors[profile.overallSeverity];

  return (
    <div className="w-96 bg-white/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl flex flex-col pointer-events-auto">
      {/* Header */}
      <div className={`p-4 rounded-t-xl flex justify-between items-start border-b border-black/5 ${sevStyle.bg}`}>
        <div>
          <h3 className="text-xl font-bold font-display text-gray-900 leading-none mb-1.5">
            {profile.wardName}
          </h3>
          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white/50 border border-black/10 text-current">
            Severity {profile.overallSeverity}: {sevStyle.label}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
        
        {/* Active Hazards */}
        <section>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Active Risk Factors</h4>
          <div className="space-y-3">
            {profile.activeHazards.length > 0 ? (
              profile.activeHazards.map((hazard) => (
                <div key={hazard.type} className={`p-3 rounded-lg border ${sevStyle.bg.split(' ')[1]} bg-black/[0.02] flex gap-3`}>
                  <div className={sevStyle.bg.split(' ')[2]}>
                    <HazardIcon type={hazard.type} />
                  </div>
                  <div className="flex-1">
                    <strong className="block text-sm font-semibold text-gray-900 mb-1">
                      {hazardTypeLabel(hazard.type)}
                    </strong>
                    <p className="text-sm text-gray-600 leading-snug">
                      {hazard.explanation}
                    </p>
                    <div className={sevStyle.bg.split(' ')[2]}>
                      <ContributionBar value={hazard.contributionScore} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic px-2">No active risk factors at current conditions.</div>
            )}
          </div>
        </section>

        {/* Raw Metrics Grid */}
        <section>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Current Readings</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 mb-0.5">3-Day Rainfall</div>
              <div className="font-semibold text-gray-900 flex items-center gap-1">
                {profile.rainfall3DaySum.toFixed(0)}mm
                {profile.rainfallTrend === 'rising' && <span className="text-red-500 text-xs">↑</span>}
                {profile.rainfallTrend === 'falling' && <span className="text-green-500 text-xs">↓</span>}
              </div>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 mb-0.5">Soil Saturation</div>
              <div className="font-semibold text-gray-900">
                {(profile.soilMoisture * 100).toFixed(0)}%
              </div>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 mb-0.5">Avg Elevation</div>
              <div className="font-semibold text-gray-900">{profile.elevationMean.toFixed(1)}m</div>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 mb-0.5">Wetness (TWI)</div>
              <div className="font-semibold text-gray-900">{profile.twiMean.toFixed(1)}</div>
            </div>
          </div>
        </section>

        {/* Historical Match */}
        {profile.similarHistoricalEvent && (
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Historical Precedent</h4>
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm">
              <p className="text-gray-800 mb-1">
                Closest match: <strong className="font-semibold">{profile.similarHistoricalEvent.date}</strong>
              </p>
              <p className="text-gray-600 mb-2">{profile.similarHistoricalEvent.outcome}</p>
              <p className="text-xs text-gray-500 italic">{profile.similarHistoricalEvent.similarityNote}</p>
            </div>
          </section>
        )}
      </div>

      {/* Footer / CTA */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
        <button
          onClick={onRequestAIExplanation}
          disabled={isLoadingAI}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isLoadingAI ? (
            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          Generate Plain-Language Alert
        </button>
      </div>
    </div>
  );
}
