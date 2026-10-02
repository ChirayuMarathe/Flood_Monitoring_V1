'use client';

import { Building2, AlertTriangle, CloudRain, Droplets, ArrowUpRight, Clock, Map, FileText, Sparkles, CheckCircle2, Compass, Shield } from 'lucide-react';
import { useFloodStore, getWardsForCity } from '@/store/flood-store';
import { timeSeriesData } from '@/lib/mumbai-data';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';

const StatCard = dynamic(() => import('@/components/flood-dashboard/StatCard'), { ssr: false });
const SeverityChart = dynamic(() => import('@/components/flood-dashboard/SeverityChart'), { ssr: false });
const RainfallChart = dynamic(() => import('@/components/flood-dashboard/RainfallChart'), { ssr: false });
const WardTable = dynamic(() => import('@/components/flood-dashboard/WardTable'), { ssr: false });
const AlertsFeed = dynamic(() => import('@/components/flood-dashboard/AlertsFeed'), { ssr: false });

export default function DashboardPage() {
  const { wardSeverities, currentTimeData, activeCity, switchCity, timeIndex } = useFloodStore();
  const td = currentTimeData();

  const cityWards = useMemo(() => getWardsForCity(activeCity), [activeCity]);
  const cityLabel = activeCity === 'navi_mumbai' ? 'Navi Mumbai' : activeCity.charAt(0).toUpperCase() + activeCity.slice(1);

  const criticalCount = cityWards.filter((w) => (wardSeverities[w.id] ?? 0) >= 3).length;
  const alertCount = cityWards.filter((w) => (wardSeverities[w.id] ?? 0) >= 2).length;
  const normalCount = cityWards.filter((w) => (wardSeverities[w.id] ?? 0) === 0).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent">
      <div className="p-6 space-y-6 max-w-[1440px]">
        {/* Page Header with City Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-white/5 gap-4">
          <div>
            <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-[#5EA977] uppercase">REAL-TIME MISSION TELEMETRY</span>
            <h2 className="text-[26px] font-bold font-clash text-white tracking-tight">System Dashboard</h2>
            <p className="text-[12px] text-[#8B919E] font-satoshi mt-0.5">
              Monitoring {cityWards.length} administrative wards across {cityLabel}
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

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#13161D] border border-white/10 shadow-sm">
              <Clock size={13} className="text-[#5EA977]" />
              <span className="text-[11px] text-[#E1E4EA] font-mono font-medium">
                Day {timeIndex + 1} — Jul {timeSeriesData[timeIndex]?.day}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#13161D] border border-white/10 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#5EA977] animate-pulse" />
              <span className="text-[11px] font-medium text-white font-satoshi">Live Feed</span>
            </div>
          </div>
        </div>

        {/* High-End Telemetry Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Monitored Wards"
            value={cityWards.length}
            unit="zones"
            variant="info"
            trend="flat"
            trendValue={`${normalCount} Nominal`}
            subtitle={`${cityLabel} Municipal Sector`}
            progress={cityWards.length > 0 ? (normalCount / cityWards.length) * 100 : 100}
          />
          <StatCard
            icon={AlertTriangle}
            label="Critical Risk"
            value={criticalCount}
            unit="zones"
            variant={criticalCount > 0 ? 'critical' : 'default'}
            trend={criticalCount > 0 ? 'up' : 'flat'}
            trendValue={criticalCount > 0 ? `${criticalCount} Severe` : 'Nominal'}
            subtitle={alertCount > 0 ? `${alertCount} wards on elevated watch` : 'No immediate flooding detected'}
            progress={criticalCount > 0 ? Math.min(100, criticalCount * 25) : 0}
          />
          <StatCard
            icon={CloudRain}
            label="3-Day Cumulative"
            value={td.rainfall_3day_sum}
            unit="mm"
            variant="rain"
            trend={td.rainfall_3day_sum > 100 ? 'up' : 'flat'}
            trendValue={td.rainfall_3day_sum > 150 ? 'Monsoon Surge' : td.rainfall_3day_sum > 80 ? 'Heavy Rain' : 'Moderate'}
            subtitle="Precipitation Basin Accumulation"
            progress={Math.min(100, (td.rainfall_3day_sum / 300) * 100)}
          />
          <StatCard
            icon={Droplets}
            label="Soil Moisture Saturation"
            value={td.soil_moisture * 100}
            unit="%"
            decimals={1}
            variant="soil"
            trend={td.soil_moisture > 0.5 ? 'up' : 'down'}
            trendValue={td.soil_moisture > 0.6 ? 'Near Saturation' : td.soil_moisture > 0.35 ? 'Moderate' : 'Dry Basin'}
            subtitle="Sub-surface Infiltration Margin"
            progress={Math.min(100, td.soil_moisture * 100)}
          />
        </div>

        {/* Charts + Quick Access Row */}
        <div className="grid grid-cols-3 gap-3">
          <SeverityChart />
          <RainfallChart />
          {/* Command Action Hub Card */}
          <div className="rounded-2xl bg-[#0B0D14]/90 backdrop-blur-xl border border-white/10 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Compass size={13} className="text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold font-clash text-white tracking-tight">Command Hub</h3>
                    <p className="text-[10px] text-gray-400 font-mono">Mission control shortcuts</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Link 
                  href="/map" 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Map size={13} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white group-hover:text-emerald-300 transition-colors font-satoshi">Live 3D Map</p>
                      <p className="text-[10px] text-gray-400 font-mono">3D Terrain & Building Simulation</p>
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>

                <Link 
                  href="/reports" 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/[0.04] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileText size={13} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white group-hover:text-purple-300 transition-colors font-satoshi">AI Flood Reports</p>
                      <p className="text-[10px] text-gray-400 font-mono">Dynamic LLM Situation Reports</p>
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>

                <Link 
                  href="/alerts" 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-red-500/40 hover:bg-red-500/[0.04] transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <AlertTriangle size={13} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-white group-hover:text-red-300 transition-colors font-satoshi">Alert Center</p>
                      <p className="text-[10px] text-gray-400 font-mono">Incident Feed & Live Chronology</p>
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="text-gray-500 group-hover:text-red-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Link>
              </div>
            </div>

            {/* At-Risk Wards Live Watch */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-gray-400 font-semibold uppercase tracking-wider">Hazard Watchlist</span>
                <span className="text-[9.5px] font-mono text-gray-500">
                  {alertCount > 0 ? `${alertCount} elevated` : 'All Clear'}
                </span>
              </div>
              <div className="space-y-1.5">
                {cityWards
                  .filter((w) => (wardSeverities[w.id] ?? 0) >= 2)
                  .slice(0, 3)
                  .map((w) => {
                    const sev = wardSeverities[w.id] ?? 0;
                    return (
                      <Link
                        key={w.id}
                        href="/map"
                        onClick={() => useFloodStore.getState().setSelectedWard(w.id)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/20 transition-colors"
                      >
                        <span className="text-[11px] text-gray-300 font-satoshi font-medium truncate max-w-[150px]">{w.name}</span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          sev === 3 ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                        }`}>
                          {sev === 3 ? 'Critical' : 'Elevated'}
                        </span>
                      </Link>
                    );
                  })}
                {cityWards.filter((w) => (wardSeverities[w.id] ?? 0) >= 2).length === 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15 text-[11px] text-emerald-400">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>No elevated risk zones detected in sector</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table + Alerts Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <WardTable />
          </div>
          <AlertsFeed />
        </div>
      </div>
    </div>
  );
}
