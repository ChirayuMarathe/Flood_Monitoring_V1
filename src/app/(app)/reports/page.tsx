'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CloudRain, Shield, AlertTriangle, Briefcase,
  Loader2, Download, Clock, MapPin, TrendingUp, Droplets,
  RefreshCw, ChevronRight, Zap, BarChart3, Copy, Check, Printer
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { timeSeriesData } from '@/lib/mumbai-data';
import dynamic from 'next/dynamic';

const BottomPanel = dynamic(() => import('@/components/flood-dashboard/BottomPanel'), { ssr: false });

type ReportType = 'forecast' | 'situation' | 'vulnerability' | 'executive';

interface GeneratedReport {
  reportType: ReportType;
  city: string;
  content: string;
  wardCount: number;
  criticalCount: number;
  elevatedCount: number;
  generatedAt: string;
}

const REPORT_TYPES: { key: ReportType; label: string; icon: typeof CloudRain; description: string; color: string; gradient: string }[] = [
  {
    key: 'forecast',
    label: 'Rainfall Forecast',
    icon: CloudRain,
    description: 'Area-wise rainfall predictions with upcoming flood risk analysis for each ward',
    color: '#FFFFFF',
    gradient: 'from-white/10 to-transparent',
  },
  {
    key: 'situation',
    label: 'Situation Report',
    icon: Shield,
    description: 'Current SITREP with complete ward status table and resource deployment recommendations',
    color: '#D4D4D8',
    gradient: 'from-white/[0.08] to-transparent',
  },
  {
    key: 'vulnerability',
    label: 'Vulnerability Assessment',
    icon: AlertTriangle,
    description: 'Deep terrain analysis, compound risk zones, and historical vulnerability patterns',
    color: '#A1A1AA',
    gradient: 'from-white/[0.06] to-transparent',
  },
  {
    key: 'executive',
    label: 'Executive Briefing',
    icon: Briefcase,
    description: 'One-page summary for municipal leadership with key metrics and action items',
    color: '#71717A',
    gradient: 'from-white/[0.04] to-transparent',
  },
];

export default function ReportsPage() {
  const {
    wardRiskProfiles,
    wardSeverities,
    activeCity,
    switchCity,
    timeIndex,
    riskDataLoaded,
    initRiskData,
    updateRiskProfiles,
    updateSeverities,
    currentTimeData,
  } = useFloodStore();

  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<GeneratedReport[]>([]);

  // Sync risk profiles and severities whenever activeCity or time changes
  useEffect(() => {
    updateSeverities();
    updateRiskProfiles();
    if (!riskDataLoaded) {
      initRiskData();
    }
  }, [activeCity, timeIndex, riskDataLoaded, initRiskData, updateRiskProfiles, updateSeverities]);

  const td = currentTimeData() || timeSeriesData[0];
  const cityWards = useMemo(() => getWardsForCity(activeCity), [activeCity]);
  const cityLabel = activeCity === 'navi_mumbai' ? 'Navi Mumbai' : activeCity.charAt(0).toUpperCase() + activeCity.slice(1);

  // Derive risk profiles strictly for the current city
  const profiles = useMemo(() => {
    return cityWards.map(w => {
      const existing = wardRiskProfiles[w.id];
      if (existing && existing.city === activeCity) {
        return existing;
      }
      const sev = (wardSeverities[w.id] ?? (w.severity as 0 | 1 | 2 | 3));
      return {
        wardId: w.id,
        wardName: w.name,
        city: activeCity,
        overallSeverity: sev,
        primaryHazard: w.wardType === 'coastal' ? 'tidal_backflow' : w.wardType === 'lowland' ? 'topographic_pooling' : 'rainfall_overflow',
        activeHazards: [],
        rainfall3DaySum: w.rainfall3day,
        soilMoisture: w.soilMoisture,
        elevationMean: w.elevation,
        twiMean: w.twi,
        flowAccumulationMean: 0.05,
        rainfallTrend: 'rising' as const,
        estimatedTimeToThresholdHours: sev >= 2 ? 6 : null,
        similarHistoricalEvent: null,
      };
    });
  }, [cityWards, wardRiskProfiles, wardSeverities, activeCity]);

  const criticalCount = profiles.filter(p => p.overallSeverity >= 3).length;
  const elevatedCount = profiles.filter(p => p.overallSeverity >= 2).length;

  // City-calibrated climate parameters
  const cityRainMultiplier = activeCity === 'pune' ? 0.62 : activeCity === 'navi_mumbai' ? 1.04 : 1.0;
  const citySoilMultiplier = activeCity === 'pune' ? 0.82 : activeCity === 'navi_mumbai' ? 1.12 : 1.0;

  const activeRainfall = Math.round(td.rainfall_3day_sum * cityRainMultiplier);
  const activeSoilPercent = Math.min(96, Math.round(td.soil_moisture * citySoilMultiplier * 100));

  const generateReport = useCallback(async (type: ReportType) => {
    if (profiles.length === 0) {
      setError('Risk data is still loading. Please wait a moment and try again.');
      return;
    }

    setSelectedType(type);
    setIsGenerating(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: type,
          city: cityLabel,
          profiles,
          climateData: {
            rainfall3DaySum: activeRainfall,
            soilMoisture: activeSoilPercent / 100,
            landSurfaceTemp: td.land_surface_temp,
            date: td.date,
            timeIndex,
          },
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setReport(data);
        setReportHistory(prev => [data, ...prev].slice(0, 10));
      }
    } catch {
      setError('Failed to connect to report generation service.');
    } finally {
      setIsGenerating(false);
    }
  }, [profiles, cityLabel, activeRainfall, activeSoilPercent, td, timeIndex]);

  const [copied, setCopied] = useState(false);

  const copyReport = useCallback(() => {
    if (!report) return;
    navigator.clipboard.writeText(report.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [report]);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  const downloadReport = useCallback(() => {
    if (!report) return;
    const typeLabel = REPORT_TYPES.find(t => t.key === report.reportType)?.label || report.reportType;
    const filename = `${report.city}_${report.reportType}_${new Date(report.generatedAt).toISOString().split('T')[0]}.md`;
    const header = `# ${typeLabel} — ${report.city}\n\nGenerated: ${new Date(report.generatedAt).toLocaleString()}\nWards Monitored: ${report.wardCount} | Critical: ${report.criticalCount} | Elevated: ${report.elevatedCount}\n\n---\n\n`;
    const blob = new Blob([header + report.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent">
      <div className="p-6 space-y-5 max-w-[1440px]">
        {/* Page Header with 3-City Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-white/5 gap-4">
          <div>
            <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-zinc-400 uppercase">AI-POWERED ANALYSIS</span>
            <h2 className="text-[26px] font-bold font-clash text-white tracking-tight">Flood Reports</h2>
            <p className="text-[12px] text-[#8B919E] font-satoshi mt-0.5">
              Dynamic NLP report generation powered by real-time ward risk profiles in {cityLabel}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* 3-City Switcher Bar */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#13161D] border border-white/10 shadow-sm">
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

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/80 border border-white/10 shadow-sm">
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

        {/* High-End Mission Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[
            {
              label: 'Wards Monitored',
              value: cityWards.length,
              unit: 'zones',
              tag: `${activeCity === 'navi_mumbai' ? 'NM' : activeCity.toUpperCase()} SECTOR`,
              icon: BarChart3,
              color: '#FFFFFF',
              glow: 'rgba(255, 255, 255, 0.04)',
              progress: 100,
              sub: `${cityLabel} coverage`,
            },
            {
              label: 'Critical Alert',
              value: criticalCount,
              unit: 'wards',
              tag: criticalCount > 0 ? `${criticalCount} IN HAZARD` : 'ALL CLEAR',
              icon: AlertTriangle,
              color: criticalCount > 0 ? '#FFFFFF' : '#A1A1AA',
              glow: criticalCount > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              progress: cityWards.length > 0 ? Math.min(100, (criticalCount / cityWards.length) * 100) : 0,
              sub: criticalCount > 0 ? `Immediate hazard in ${cityLabel}` : `Zero critical sectors in ${cityLabel}`,
              pulse: criticalCount > 0,
            },
            {
              label: 'Elevated Watch',
              value: elevatedCount,
              unit: 'wards',
              tag: elevatedCount > 0 ? 'WATCHLIST' : 'NOMINAL',
              icon: TrendingUp,
              color: '#D4D4D8',
              glow: 'rgba(255, 255, 255, 0.05)',
              progress: cityWards.length > 0 ? Math.min(100, (elevatedCount / cityWards.length) * 100) : 0,
              sub: `${elevatedCount} of ${cityWards.length} rising water thresholds`,
            },
            {
              label: '3-Day Rainfall',
              value: activeRainfall,
              unit: 'mm',
              tag: activeRainfall > 120 ? 'HEAVY SURGE' : activeRainfall > 70 ? 'MODERATE' : 'LIGHT PRECIP',
              icon: CloudRain,
              color: '#E4E4E7',
              glow: 'rgba(255, 255, 255, 0.04)',
              progress: Math.min(100, (activeRainfall / 240) * 100),
              sub: `Cumulative 72h across ${cityLabel}`,
            },
            {
              label: 'Soil Moisture',
              value: `${activeSoilPercent}%`,
              unit: 'sat.',
              tag: activeSoilPercent > 55 ? 'SATURATED' : 'PERMEABLE',
              icon: Droplets,
              color: '#71717A',
              glow: 'rgba(255, 255, 255, 0.02)',
              progress: activeSoilPercent,
              sub: `${cityLabel} terrain absorption`,
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative overflow-hidden rounded-2xl bg-black/85 backdrop-blur-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300 shadow-[0_12px_32px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.06)] group"
            >
              {/* Radial glow */}
              <div
                className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full blur-xl opacity-40 group-hover:opacity-100 transition-opacity"
                style={{ background: stat.glow }}
              />

              <div className="relative z-10 flex items-center justify-between gap-1 mb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center border"
                    style={{ backgroundColor: `${stat.color}15`, borderColor: `${stat.color}30` }}
                  >
                    <stat.icon size={13} style={{ color: stat.color }} className={stat.pulse ? 'animate-pulse' : ''} />
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#8B919E] font-semibold truncate">
                    {stat.label}
                  </span>
                </div>
                <span
                  className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${stat.color}12`,
                    borderColor: `${stat.color}25`,
                    color: stat.color,
                  }}
                >
                  {stat.tag}
                </span>
              </div>

              <div className="relative z-10 flex items-baseline gap-1.5">
                <p className="text-[26px] font-bold font-clash text-white tracking-tight leading-none">
                  {stat.value}
                </p>
                {stat.unit && <span className="text-[11px] font-mono text-[#8B919E]">{stat.unit}</span>}
              </div>

              <p className="relative z-10 text-[10px] text-[#69707D] font-satoshi mt-1 truncate">
                {stat.sub}
              </p>

              {/* Progress bar */}
              <div className="relative z-10 mt-2.5 pt-2 border-t border-white/5">
                <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, stat.progress))}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: stat.color }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Report Type Selector + Generated Report */}
        <div className="grid grid-cols-3 gap-5">
          {/* Left: Report Types */}
          <div className="col-span-1 space-y-3">
            <h3 className="text-[11px] font-mono font-semibold tracking-[0.15em] text-[#8B919E] uppercase px-1">
              Select Intelligence Mode
            </h3>
            {REPORT_TYPES.map((rt, i) => {
              const isSelected = selectedType === rt.key;
              const Icon = rt.icon;
              return (
                <motion.button
                  key={rt.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => generateReport(rt.key)}
                  disabled={isGenerating}
                  className={`w-full text-left px-4 py-4 rounded-2xl border transition-all duration-300 group relative overflow-hidden ${
                    isSelected
                      ? 'bg-black/95 border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)]'
                      : 'bg-black/75 border-white/10 hover:border-white/20 hover:bg-black/90'
                  } ${isGenerating ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {/* Left accent bar for selected state */}
                  {isSelected && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r shadow-[0_0_10px]"
                      style={{ backgroundColor: rt.color, color: rt.color }}
                    />
                  )}

                  <div className="flex items-start gap-3.5 relative z-10">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105 border"
                      style={{
                        backgroundColor: isSelected ? `${rt.color}22` : `${rt.color}12`,
                        borderColor: `${rt.color}30`,
                      }}
                    >
                      <Icon size={18} style={{ color: rt.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] font-bold ${isSelected ? 'text-white' : 'text-[#D0D4DC]'} font-clash tracking-tight`}>
                          {rt.label}
                        </p>
                        {isSelected && isGenerating && (
                          <Loader2 size={12} className="animate-spin" style={{ color: rt.color }} />
                        )}
                      </div>
                      <p className="text-[10px] text-[#6E7583] mt-1 leading-relaxed font-satoshi">{rt.description}</p>
                    </div>
                    <ChevronRight size={14} className={`flex-shrink-0 mt-1 transition-transform ${
                      isSelected ? 'text-white translate-x-0' : 'text-[#525866] group-hover:translate-x-0.5'
                    }`} />
                  </div>
                </motion.button>
              );
            })}

            {/* Report History */}
            {reportHistory.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[11px] font-mono font-semibold tracking-[0.15em] text-[#525866] uppercase px-1 mb-2">
                  Recent Reports
                </h3>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {reportHistory.map((r, i) => {
                    const rt = REPORT_TYPES.find(t => t.key === r.reportType);
                    return (
                      <button
                        key={`${r.reportType}-${r.generatedAt}`}
                        onClick={() => { setReport(r); setSelectedType(r.reportType); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1A1E27] border border-white/5 hover:border-white/15 transition-colors text-left"
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: rt?.color }} />
                        <span className="text-[10px] text-[#8B919E] flex-1 truncate font-satoshi">{rt?.label}</span>
                        <span className="text-[9px] text-[#525866] font-mono">
                          {new Date(r.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Report Content */}
          <div className="col-span-2">
            <AnimatePresence mode="wait">
              {!selectedType && !isGenerating && !report && (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[500px] rounded-xl bg-[#13161D] border border-white/10 flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#A78BFA]/10 flex items-center justify-center mb-4">
                    <FileText size={28} className="text-[#A78BFA]/40" />
                  </div>
                  <p className="text-[14px] text-[#525866] font-satoshi">Select a report type to generate</p>
                  <p className="text-[11px] text-[#525866]/60 mt-1 font-satoshi">Reports are generated using real-time ward data + AI analysis</p>
                  {!riskDataLoaded && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                      <Loader2 size={12} className="animate-spin text-[#F59E0B]" />
                      <span className="text-[10px] text-[#F59E0B]">Loading risk data...</span>
                    </div>
                  )}
                </motion.div>
              )}

              {isGenerating && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-full min-h-[500px] rounded-xl bg-[#13161D] border border-white/10 flex flex-col items-center justify-center"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-[#5B8DEF]/10 flex items-center justify-center">
                      <Zap size={24} className="text-[#5B8DEF]" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#5B8DEF] flex items-center justify-center">
                      <Loader2 size={10} className="animate-spin text-white" />
                    </div>
                  </div>
                  <p className="text-[14px] text-[#E1E4EA] font-semibold font-satoshi mt-4">Generating Report...</p>
                  <p className="text-[11px] text-[#525866] mt-1 font-satoshi">
                    Analyzing {profiles.length} wards across {cityLabel}
                  </p>
                  <div className="mt-4 flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-2 h-2 rounded-full bg-[#5B8DEF] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[500px] rounded-xl bg-[#13161D] border border-red-500/20 flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <p className="text-[14px] text-red-400 font-semibold font-satoshi">Report Generation Failed</p>
                  <p className="text-[11px] text-[#525866] mt-1 max-w-[400px] text-center font-satoshi">{error}</p>
                  <button
                    onClick={() => selectedType && generateReport(selectedType)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors"
                  >
                    <RefreshCw size={12} /> Retry
                  </button>
                </motion.div>
              )}

              {report && !isGenerating && !error && (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl bg-black/90 border border-white/10 overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
                >
                  {/* Report Header */}
                  <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/90">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const rt = REPORT_TYPES.find(t => t.key === report.reportType);
                        const Icon = rt?.icon || FileText;
                        return (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/10" style={{ backgroundColor: `${rt?.color}18` }}>
                            <Icon size={16} style={{ color: rt?.color }} />
                          </div>
                        );
                      })()}
                      <div>
                        <h3 className="text-[14px] font-bold text-white font-clash">
                          {REPORT_TYPES.find(t => t.key === report.reportType)?.label}
                        </h3>
                        <p className="text-[10px] text-[#8B919E] font-mono mt-0.5">
                          {report.city} · {report.wardCount} wards · Generated {new Date(report.generatedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.criticalCount > 0 && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] font-medium text-red-400">
                          <AlertTriangle size={10} /> {report.criticalCount} Critical
                        </span>
                      )}
                      <button
                        onClick={copyReport}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:text-white transition-colors text-[11px] text-[#C1C5CD]"
                        title="Copy report text"
                      >
                        {copied ? <Check size={12} className="text-white" /> : <Copy size={12} className="text-[#8B919E]" />}
                        <span className="text-[10px] font-mono">{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={printReport}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center hover:bg-white/[0.08] hover:text-white transition-colors"
                        title="Print / PDF"
                      >
                        <Printer size={12} className="text-[#8B919E]" />
                      </button>
                      <button
                        onClick={() => selectedType && generateReport(selectedType)}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center hover:bg-white/[0.08] hover:text-white transition-colors"
                        title="Regenerate"
                      >
                        <RefreshCw size={12} className="text-[#8B919E]" />
                      </button>
                      <button
                        onClick={downloadReport}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center hover:bg-white/[0.08] hover:text-white transition-colors"
                        title="Download as Markdown"
                      >
                        <Download size={12} className="text-[#8B919E]" />
                      </button>
                    </div>
                  </div>

                  {/* Report Body with Rich GFM Formatting */}
                  <div className="px-6 py-6 overflow-y-auto max-h-[620px] custom-scrollbar bg-black/60">
                    <div className="report-markdown-content font-satoshi text-[#C1C5CD]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-[18px] font-bold font-clash text-white tracking-tight mt-6 mb-3 pb-2 border-b border-white/10 flex items-center gap-2">
                              <span className="w-1.5 h-4.5 rounded-full bg-white" />
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-[15px] font-bold font-clash text-white tracking-tight mt-6 mb-3 px-3.5 py-2 rounded-lg bg-white/[0.03] border-l-2 border-white flex items-center gap-2">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-[13px] font-semibold font-clash text-[#E1E4EA] mt-4 mb-2 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-[12.5px] text-[#C1C5CD] leading-relaxed my-2">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="space-y-1.5 my-3 pl-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="space-y-1.5 my-3 pl-4 list-decimal text-[12.5px] text-[#C1C5CD]">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="flex items-start gap-2 text-[12.5px] text-[#C1C5CD] leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 flex-shrink-0" />
                              <div className="flex-1">{children}</div>
                            </li>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-white/40 bg-white/[0.04] rounded-r-xl px-4 py-3 my-3 text-[12px] text-[#E1E4EA] italic">
                              {children}
                            </blockquote>
                          ),
                          code: ({ children }) => (
                            <code className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-mono text-white">
                              {children}
                            </code>
                          ),
                          strong: ({ children }) => (
                            <strong className="text-white font-semibold">{children}</strong>
                          ),
                          hr: () => <hr className="border-white/10 my-5" />,
                          table: ({ children }) => (
                            <div className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-[#141720] shadow-md">
                              <table className="w-full text-left border-collapse">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-[#1C202B] text-[11px] font-mono uppercase text-[#8B919E] tracking-wider border-b border-white/10">
                              {children}
                            </thead>
                          ),
                          tbody: ({ children }) => (
                            <tbody className="divide-y divide-white/5">{children}</tbody>
                          ),
                          tr: ({ children }) => (
                            <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>
                          ),
                          th: ({ children }) => (
                            <th className="px-4 py-3 text-left font-semibold text-white text-[11px] font-mono">{children}</th>
                          ),
                          td: ({ children }) => (
                            <td className="px-4 py-2.5 text-[12px] text-[#C1C5CD]">{children}</td>
                          ),
                        }}
                      >
                        {cleanMarkdown(report.content)}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Report Footer */}
                  <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between bg-[#0F1117]">
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] text-[#525866] font-mono">MODEL: gpt-oss-120b</span>
                      <span className="text-[9px] text-[#525866] font-mono">CITY: {report.city}</span>
                      <span className="text-[9px] text-[#525866] font-mono">WARDS: {report.wardCount}</span>
                      <span className="text-[9px] text-[#525866] font-mono">
                        CRITICAL: {report.criticalCount} / ELEVATED: {report.elevatedCount}
                      </span>
                    </div>
                    <span className="text-[9px] text-[#525866] font-mono">
                      {new Date(report.generatedAt).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cleans raw HTML tags like <br> and trims formatting before markdown parsing */
function cleanMarkdown(content: string): string {
  if (!content) return '';
  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/&nbsp;/g, ' ');
}
