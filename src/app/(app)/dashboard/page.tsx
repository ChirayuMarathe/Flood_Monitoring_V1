'use client';

import { Building2, AlertTriangle, CloudRain, Droplets, ArrowUpRight, Clock } from 'lucide-react';
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
          {/* Quick Access Card */}
          <div className="rounded-xl bg-[#13161D] border border-white/10 flex flex-col shadow-sm">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="text-[14px] font-bold font-clash text-white">Quick Access</h3>
            </div>
            <div className="flex-1 p-3 space-y-2 font-satoshi">
              <Link href="/map" className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#1A1E27] border border-white/10 hover:border-[#5EA977]/50 transition-colors group">
                <div>
                  <p className="text-[12px] font-semibold text-white group-hover:text-[#5EA977] transition-colors">Live 3D Map</p>
                  <p className="text-[10px] text-[#8B919E]">Geospatial terrain & simulation</p>
                </div>
                <ArrowUpRight size={14} className="text-[#8B919E] group-hover:text-[#5EA977] transition-colors" />
              </Link>
              <Link href="/reports" className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#1A1E27] border border-white/10 hover:border-[#A78BFA]/50 transition-colors group">
                <div>
                  <p className="text-[12px] font-semibold text-white group-hover:text-[#A78BFA] transition-colors">AI Flood Reports</p>
                  <p className="text-[10px] text-[#8B919E]">Dynamic NLP forecast & SITREP</p>
                </div>
                <ArrowUpRight size={14} className="text-[#8B919E] group-hover:text-[#A78BFA] transition-colors" />
              </Link>
              <Link href="/alerts" className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#1A1E27] border border-white/10 hover:border-[#EF4444]/50 transition-colors group">
                <div>
                  <p className="text-[12px] font-semibold text-white group-hover:text-[#EF4444] transition-colors">Alert Center</p>
                  <p className="text-[10px] text-[#8B919E]">Ward hazard status & timeline</p>
                </div>
                <ArrowUpRight size={14} className="text-[#8B919E] group-hover:text-[#EF4444] transition-colors" />
              </Link>
              <div className="px-3.5 py-3 rounded-lg bg-[#1A1E27] border border-white/10">
                <p className="text-[12px] font-semibold text-white">Critical Wards</p>
                <div className="mt-2 space-y-1.5">
                  {cityWards
                    .filter((w) => (wardSeverities[w.id] ?? 0) >= 2)
                    .slice(0, 4)
                    .map((w) => {
                      const sev = wardSeverities[w.id] ?? 0;
                      return (
                        <div key={w.id} className="flex items-center justify-between">
                          <span className="text-[11px] text-[#8B919E]">{w.name}</span>
                          <span className={`text-[10px] font-medium ${sev === 3 ? 'text-[#D94444]' : 'text-[#8B919E]'}`}>
                            {sev === 3 ? 'Critical' : 'Elevated'}
                          </span>
                        </div>
                      );
                    })}
                  {Object.values(wardSeverities).filter((s) => s >= 2).length === 0 && (
                    <p className="text-[10px] text-[#525866]">No elevated wards</p>
                  )}
                </div>
              </div>
              <div className="px-3.5 py-3 rounded-lg bg-[#1A1E27] border border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-white">Rainfall 3-Day</p>
                  <p className="text-[14px] font-bold font-clash text-white">{td.rainfall_3day_sum}<span className="text-[10px] text-[#8B919E] ml-0.5 font-satoshi">mm</span></p>
                </div>
                <div className="mt-2 w-full h-1.5 rounded-full bg-[#242832] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#5EA977] transition-all duration-500"
                    style={{ width: `${Math.min(100, (td.rainfall_3day_sum / 300) * 100)}%` }}
                  />
                </div>
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
