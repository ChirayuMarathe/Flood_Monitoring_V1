'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Bell, TrendingUp, TrendingDown, ArrowRight,
  Filter, MapPin, Clock, Shield, Zap, CloudRain, Droplets,
  ChevronDown, Search, Activity
} from 'lucide-react';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { timeSeriesData, severityColorHex } from '@/lib/mumbai-data';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const BottomPanel = dynamic(() => import('@/components/flood-dashboard/BottomPanel'), { ssr: false });

const severityLabel: Record<number, string> = { 0: 'Normal', 1: 'Watch', 2: 'Elevated', 3: 'Critical' };
const severityIcon: Record<number, string> = { 0: '●', 1: '◐', 2: '◉', 3: '⬤' };

type FilterLevel = 'all' | 'critical' | 'elevated' | 'watch';

export default function AlertsPage() {
  const { alertHistory, wardSeverities, wardRiskProfiles, activeCity, switchCity, timeIndex, selectedWardId, setSelectedWard, currentTimeData } = useFloodStore();
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWard, setExpandedWard] = useState<string | null>(null);

  const td = currentTimeData() || timeSeriesData[0];
  const cityLabel = activeCity === 'navi_mumbai' ? 'Navi Mumbai' : activeCity.charAt(0).toUpperCase() + activeCity.slice(1);
  const cityWards = useMemo(() => getWardsForCity(activeCity), [activeCity]);

  // Compute ward alert status for active city
  const wardAlerts = useMemo(() => {
    return cityWards
      .map(w => {
        const sev = wardSeverities[w.id] ?? 0;
        const profile = wardRiskProfiles[w.id];
        return { ward: w, severity: sev, profile };
      })
      .filter(wa => {
        if (filterLevel === 'critical') return wa.severity >= 3;
        if (filterLevel === 'elevated') return wa.severity >= 2;
        if (filterLevel === 'watch') return wa.severity >= 1;
        return true;
      })
      .filter(wa => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return wa.ward.name.toLowerCase().includes(q) || wa.ward.code.toLowerCase().includes(q);
      })
      .sort((a, b) => b.severity - a.severity);
  }, [cityWards, wardSeverities, wardRiskProfiles, filterLevel, searchQuery]);

  const criticalCount = cityWards.filter(w => (wardSeverities[w.id] ?? 0) >= 3).length;
  const elevatedCount = cityWards.filter(w => (wardSeverities[w.id] ?? 0) >= 2).length;
  const watchCount = cityWards.filter(w => (wardSeverities[w.id] ?? 0) >= 1).length;
  const totalAlerts = alertHistory.length;

  const filteredHistory = useMemo(() => {
    return alertHistory
      .filter(a => {
        if (filterLevel === 'critical') return a.newSeverity >= 3;
        if (filterLevel === 'elevated') return a.newSeverity >= 2;
        if (filterLevel === 'watch') return a.newSeverity >= 1;
        return true;
      })
      .slice(0, 50);
  }, [alertHistory, filterLevel]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent">
      <div className="p-6 space-y-5 max-w-[1440px]">
        {/* Page Header with City Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-white/5 gap-4">
          <div>
            <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-zinc-400 uppercase">MONITORING ACTIVE</span>
            <h2 className="text-[26px] font-bold font-clash text-white tracking-tight">Alert Center</h2>
            <p className="text-[12px] text-[#8B919E] font-satoshi mt-0.5">
              Real-time flood risk monitoring across {cityWards.length} wards in {cityLabel}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* 3-City Switcher Bar */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/80 border border-white/10 shadow-sm">
              {(['mumbai', 'pune', 'navi_mumbai'] as const).map(city => (
                <button
                  key={city}
                  onClick={() => switchCity(city)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    activeCity === city
                      ? 'bg-white/15 text-white font-semibold shadow-inner'
                      : 'text-[#8B919E] hover:text-white'
                  }`}
                >
                  {city === 'navi_mumbai' ? 'Navi Mumbai' : city.charAt(0).toUpperCase() + city.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/80 border border-white/10 shadow-sm">
              <Activity size={13} className="text-white animate-pulse" />
              <span className="text-[11px] text-[#E1E4EA] font-mono font-medium">Live</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/80 border border-white/10 shadow-sm">
              <Clock size={13} className="text-white" />
              <span className="text-[11px] text-[#E1E4EA] font-mono font-medium">
                Day {timeIndex + 1} — {td.date ?? '2024-07-09'}
              </span>
            </div>
          </div>
        </div>

        {/* Embedded Interactive Simulation Timeline Controller */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/70 p-1 shadow-lg">
          <BottomPanel mode="embedded" />
        </div>

        {/* High-End Mission Alert Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Critical Hazards',
              value: criticalCount,
              unit: 'wards',
              tag: criticalCount > 0 ? 'ACTIVE EVAC' : 'ALL CLEAR',
              color: '#FFFFFF',
              icon: Zap,
              glow: 'rgba(255, 255, 255, 0.08)',
              sub: criticalCount > 0 ? 'Severe inundation threshold exceeded' : 'Zero wards in critical state',
              pulse: criticalCount > 0,
              progress: criticalCount > 0 ? Math.min(100, criticalCount * 33) : 0,
            },
            {
              label: 'Elevated Watch',
              value: elevatedCount,
              unit: 'wards',
              tag: elevatedCount > 0 ? 'MONITOR' : 'NOMINAL',
              color: '#D4D4D8',
              icon: AlertTriangle,
              glow: 'rgba(255, 255, 255, 0.05)',
              sub: 'Approaching critical rainfall limits',
              pulse: false,
              progress: cityWards.length > 0 ? (elevatedCount / cityWards.length) * 100 : 0,
            },
            {
              label: 'Watch Status',
              value: watchCount,
              unit: 'wards',
              tag: 'STANDBY',
              color: '#A1A1AA',
              icon: Shield,
              glow: 'rgba(255, 255, 255, 0.03)',
              sub: 'Moderate topographic runoff watch',
              pulse: false,
              progress: cityWards.length > 0 ? (watchCount / cityWards.length) * 100 : 0,
            },
            {
              label: 'Telemetry Events',
              value: totalAlerts,
              unit: 'logged',
              tag: 'FEED SYNC',
              color: '#71717A',
              icon: Bell,
              glow: 'rgba(255, 255, 255, 0.02)',
              sub: 'Real-time severity transition events',
              pulse: false,
              progress: Math.min(100, totalAlerts * 4),
            },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative overflow-hidden rounded-2xl bg-black/85 backdrop-blur-xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.06)] group"
            >
              {/* Radial glow */}
              <div
                className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-40 group-hover:opacity-100 transition-opacity"
                style={{ background: card.glow }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border"
                    style={{ backgroundColor: `${card.color}15`, borderColor: `${card.color}30` }}
                  >
                    <card.icon size={15} style={{ color: card.color }} className={card.pulse ? 'animate-pulse' : ''} />
                  </div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#8B919E]">
                    {card.label}
                  </span>
                </div>
                <span
                  className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${card.color}12`,
                    borderColor: `${card.color}25`,
                    color: card.color,
                  }}
                >
                  {card.tag}
                </span>
              </div>

              <div className="relative z-10 flex items-baseline gap-2">
                <p className="text-[32px] font-bold font-clash text-white tracking-tight leading-none">
                  {card.value}
                </p>
                <span className="text-[12px] font-mono text-[#8B919E]">{card.unit}</span>
              </div>

              <p className="relative z-10 text-[11px] text-[#69707D] font-satoshi mt-1.5 truncate">
                {card.sub}
              </p>

              {/* Progress bar */}
              <div className="relative z-10 mt-3 pt-2.5 border-t border-white/5">
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: card.color }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/80 border border-white/10">
            {(['all', 'critical', 'elevated', 'watch'] as FilterLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  filterLevel === level
                    ? 'bg-white/15 text-white shadow-sm font-semibold'
                    : 'text-[#8B919E] hover:text-white'
                }`}
              >
                {level === 'all' ? 'All Wards' : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search wards..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/80 border border-white/10 text-[12px] text-white placeholder-[#64748B] outline-none focus:border-white/30 transition-colors font-satoshi"
            />
          </div>
        </div>

        {/* Main Content: Ward Status Grid + Event Timeline */}
        <div className="grid grid-cols-3 gap-4">
          {/* Ward Status Grid (2 cols) */}
          <div className="col-span-2 space-y-2">
            <h3 className="text-[11px] font-mono font-semibold tracking-[0.15em] text-[#8B919E] uppercase px-1">
              Ward Risk Status ({wardAlerts.length} wards)
            </h3>
            <div className="space-y-1.5">
              <AnimatePresence>
                {wardAlerts.map((wa, i) => {
                  const sevColor = severityColorHex[wa.severity] || '#525866';
                  const isExpanded = expandedWard === wa.ward.id;
                  const profile = wa.profile;

                  return (
                    <motion.div
                      key={wa.ward.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      className={`rounded-xl border overflow-hidden transition-all ${
                        wa.severity >= 3
                          ? 'bg-black/90 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.08)]'
                          : wa.severity >= 2
                          ? 'bg-black/90 border-white/25'
                          : 'bg-black/80 border-white/10'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedWard(isExpanded ? null : wa.ward.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors"
                      >
                        {/* Severity Indicator */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${sevColor}15` }}
                        >
                          <span className="text-[10px] font-bold font-mono" style={{ color: sevColor }}>
                            {wa.severity}
                          </span>
                        </div>

                        {/* Ward Info */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-white truncate font-satoshi">{wa.ward.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium" style={{
                              backgroundColor: `${sevColor}15`,
                              color: sevColor,
                            }}>
                              {severityLabel[wa.severity]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-[#525866] font-mono">
                              Zone: {wa.ward.wardType}
                            </span>
                            <span className="text-[10px] text-[#525866] font-mono">
                              Elev: {wa.ward.elevation.toFixed(1)}m
                            </span>
                            <span className="text-[10px] text-[#525866] font-mono">
                              TWI: {wa.ward.twi.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* Quick Metrics */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[11px] text-[#8B919E] font-mono flex items-center gap-1">
                              <CloudRain size={10} /> {td.rainfall_3day_sum}mm
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-[#8B919E] font-mono flex items-center gap-1">
                              <Droplets size={10} /> {(td.soil_moisture * 100).toFixed(0)}%
                            </p>
                          </div>
                          <ChevronDown
                            size={14}
                            className={`text-[#525866] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      <AnimatePresence>
                        {isExpanded && profile && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 py-3 border-t border-white/5 space-y-3">
                              {/* Hazard Factors */}
                              {profile.activeHazards.length > 0 && (
                                <div>
                                  <p className="text-[10px] text-[#525866] uppercase tracking-wider font-mono mb-1.5">Active Hazards</p>
                                  <div className="space-y-1.5">
                                    {profile.activeHazards.map((h, hi) => (
                                      <div key={hi} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 mt-1.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-[11px] font-medium text-white font-satoshi">
                                            {h.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            <span className="text-[#525866] ml-2">({(h.contributionScore * 100).toFixed(0)}%)</span>
                                          </p>
                                          <p className="text-[10px] text-[#8B919E] mt-0.5 font-satoshi">{h.explanation}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Historical Match */}
                              {profile.similarHistoricalEvent && (
                                <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10">
                                  <p className="text-[10px] text-zinc-300 uppercase tracking-wider font-mono mb-1">Historical Match</p>
                                  <p className="text-[11px] text-[#C1C5CD] font-satoshi">
                                    <strong className="text-white">{profile.similarHistoricalEvent.date}</strong>: {profile.similarHistoricalEvent.outcome}
                                  </p>
                                  <p className="text-[10px] text-[#8B919E] mt-0.5 font-satoshi">{profile.similarHistoricalEvent.similarityNote}</p>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Link
                                  href="/map"
                                  onClick={() => setSelectedWard(wa.ward.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[10px] font-medium text-white hover:bg-white/20 transition-colors"
                                >
                                  <MapPin size={10} /> View on Map
                                </Link>
                                <span className="text-[10px] text-[#525866] font-mono">
                                  Trend: {profile.rainfallTrend === 'rising' ? '↑ Rising' : profile.rainfallTrend === 'falling' ? '↓ Falling' : '→ Steady'}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {wardAlerts.length === 0 && (
                <div className="py-12 text-center rounded-2xl bg-black/80 border border-white/10">
                  <Shield size={28} className="text-[#64748B] mx-auto mb-3" />
                  <p className="text-[13px] text-[#8B919E] font-satoshi">No wards match the current filter</p>
                </div>
              )}
            </div>
          </div>

          {/* Event Timeline (1 col) */}
          <div className="col-span-1">
            <h3 className="text-[11px] font-mono font-semibold tracking-[0.15em] text-[#8B919E] uppercase px-1 mb-2">
              Event Timeline ({filteredHistory.length})
            </h3>
            <div className="rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.65)] overflow-hidden">
              <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                {filteredHistory.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell size={24} className="text-[#64748B] mx-auto mb-2" />
                    <p className="text-[11px] text-[#8B919E] font-satoshi">No events recorded.</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5 font-satoshi">Scrub simulation timeline above to advance events</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[23px] top-0 bottom-0 w-px bg-white/10" />

                    {filteredHistory.map((alert, i) => {
                      const isEscalation = alert.newSeverity > alert.oldSeverity;
                      const isCritical = alert.newSeverity === 3;
                      const newColor = severityColorHex[alert.newSeverity] || '#8B919E';

                      return (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.5) }}
                          className="relative flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                        >
                          {/* Timeline dot */}
                          <div className="relative z-10 mt-0.5">
                            <div
                              className="w-3 h-3 rounded-full border-2"
                              style={{
                                borderColor: newColor,
                                backgroundColor: isCritical ? newColor : 'transparent',
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-[#C1C5CD] truncate font-satoshi">{alert.wardName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isEscalation ? (
                                <TrendingUp size={10} className={isCritical ? 'text-white' : 'text-zinc-400'} />
                              ) : (
                                <TrendingDown size={10} className="text-zinc-400" />
                              )}
                              <span className="text-[10px] font-medium text-[#525866]">
                                {severityLabel[alert.oldSeverity]}
                              </span>
                              <ArrowRight size={9} className="text-[#525866]" />
                              <span className="text-[10px] font-medium text-white">
                                {severityLabel[alert.newSeverity]}
                              </span>
                            </div>
                          </div>

                          <span className="text-[9px] text-[#525866] font-mono flex-shrink-0 mt-0.5">
                            {alert.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
