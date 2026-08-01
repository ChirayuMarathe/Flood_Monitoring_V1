'use client';

import { Building2, AlertTriangle, CloudRain, Droplets, ArrowUpRight, Clock } from 'lucide-react';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards, timeSeriesData } from '@/lib/mumbai-data';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const StatCard = dynamic(() => import('@/components/flood-dashboard/StatCard'), { ssr: false });
const SeverityChart = dynamic(() => import('@/components/flood-dashboard/SeverityChart'), { ssr: false });
const RainfallChart = dynamic(() => import('@/components/flood-dashboard/RainfallChart'), { ssr: false });
const WardTable = dynamic(() => import('@/components/flood-dashboard/WardTable'), { ssr: false });
const AlertsFeed = dynamic(() => import('@/components/flood-dashboard/AlertsFeed'), { ssr: false });

export default function DashboardPage() {
  const { wardSeverities, currentTimeData, rainfallMumbaiAvg, timeIndex } = useFloodStore();
  const td = currentTimeData();

  const criticalCount = Object.values(wardSeverities).filter((s) => s >= 3).length;
  const alertCount = Object.values(wardSeverities).filter((s) => s >= 2).length;
  const normalCount = Object.values(wardSeverities).filter((s) => s === 0).length;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-transparent">
      <div className="p-6 space-y-5 max-w-[1440px]">
        {/* Page Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div>
            <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-[#5EA977] uppercase">REAL-TIME MONITORING</span>
            <h2 className="text-[26px] font-bold font-clash text-white tracking-tight">System Dashboard</h2>
            <p className="text-[12px] text-[#8B919E] font-satoshi mt-0.5">
              Monitoring {mumbaiWards.length} administrative wards across Mumbai
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#13161D] border border-white/10 shadow-sm">
              <Clock size={13} className="text-[#5EA977]" />
              <span className="text-[11px] text-[#E1E4EA] font-mono font-medium">
                Day {timeIndex + 1} — Jul {timeSeriesData[timeIndex]?.day}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#13161D] border border-white/10 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#5EA977] animate-pulse" />
              <span className="text-[11px] font-medium text-white font-satoshi">Live Telemetry</span>
            </div>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            icon={Building2}
            label="Total Wards"
            value={24}
            trend="flat"
            trendValue={`${normalCount} normal`}
          />
          <StatCard
            icon={AlertTriangle}
            label="Critical"
            value={criticalCount}
            trend={criticalCount > 0 ? 'up' : 'flat'}
            trendValue={alertCount > 0 ? `${alertCount} elevated` : 'All clear'}
          />
          <StatCard
            icon={CloudRain}
            label="Avg Rainfall"
            value={rainfallMumbaiAvg}
            unit="mm"
            trend="up"
            trendValue="+12%"
          />
          <StatCard
            icon={Droplets}
            label="Soil Saturation"
            value={td.soil_moisture * 100}
            unit="%"
            decimals={1}
            trend={td.soil_moisture > 0.5 ? 'up' : 'down'}
            trendValue={td.soil_moisture > 0.5 ? 'High' : 'Normal'}
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
              <Link href="/map" className="flex items-center justify-between px-3.5 py-3 rounded-lg bg-[#1A1E27] border border-white/10 hover:border-[#5EA977]/50 transition-colors group">
                <div>
                  <p className="text-[12px] font-semibold text-white group-hover:text-[#5EA977] transition-colors">Open Live Map</p>
                  <p className="text-[10px] text-[#8B919E] mt-0.5">3D geospatial ward view</p>
                </div>
                <ArrowUpRight size={14} className="text-[#8B919E] group-hover:text-[#5EA977] transition-colors" />
              </Link>
              <div className="px-3.5 py-3 rounded-lg bg-[#1A1E27] border border-white/10">
                <p className="text-[12px] font-semibold text-white">Critical Wards</p>
                <div className="mt-2 space-y-1.5">
                  {mumbaiWards
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
