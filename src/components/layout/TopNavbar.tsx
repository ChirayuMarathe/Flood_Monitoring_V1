import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import { Logo } from '@/components/flood-dashboard/Logo';

export function TopNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 w-full flex items-center justify-between px-6 lg:px-12 py-4 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2.5 cursor-pointer group">
        <Logo size={26} />
        <span className="font-bold text-lg tracking-tight font-clash text-white group-hover:text-[#5EA977] transition-colors">
          MUMBAI FLOOD
        </span>
      </Link>

      {/* Middle: Navigation Pills */}
      <div className="hidden lg:flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/10 text-sm backdrop-blur-md">
        <Link 
          href="/" 
          className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
        >
          Home
        </Link>
        <Link 
          href="/map" 
          className={`px-5 py-2 rounded-full font-medium transition-colors flex items-center gap-2 ${pathname === '/map' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          3D Simulation <span className="text-[9px] bg-red-500/20 px-1.5 py-0.5 rounded text-red-400 border border-red-500/30 font-mono">LIVE</span>
        </Link>
        <Link 
          href="/dashboard" 
          className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/dashboard' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
        >
          Command Center
        </Link>
        <Link 
          href="/alerts" 
          className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/alerts' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
        >
          Alerts
        </Link>
        <Link 
          href="/reports" 
          className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/reports' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
        >
          Reports
        </Link>
      </div>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-3 text-sm">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all"
        >
          <Activity className="w-4 h-4 text-[#5EA977] animate-pulse" />
          <div className="flex flex-col pr-3 border-r border-white/10">
            <span className="text-[11px] text-gray-300 font-mono tracking-wider">SYSTEM_OPT</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-medium text-white leading-tight">ONLINE</span>
            <span className="text-[9px] text-gray-400 leading-tight">v2.4</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}
