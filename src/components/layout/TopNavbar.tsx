"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Activity, ShieldAlert } from 'lucide-react';

export function TopNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 w-full flex items-center justify-between px-6 lg:px-12 py-4 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2 cursor-pointer group">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white group-hover:scale-105 transition-transform">
          <path d="M12 2v20"></path>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        <span className="font-bold text-lg tracking-tight ml-1 font-clash text-white">MUMBAI FLOOD</span>
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
          href="/dashboard" 
          className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/dashboard' ? 'bg-white/15 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
        >
          Platform
        </Link>
        <Link 
          href="/map" 
          className={`px-5 py-2 rounded-full font-medium transition-colors flex items-center gap-2 ${pathname === '/map' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Wards <span className="text-[9px] bg-red-500/20 px-1.5 py-0.5 rounded text-red-400 border border-red-500/30">LIVE</span>
        </Link>
        <Link 
          href="/dashboard" 
          className="px-5 py-2 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          Climate Models
        </Link>
        <Link 
          href="/dashboard" 
          className="px-5 py-2 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          API
        </Link>
      </div>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-3 text-sm">
        <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/10 text-gray-300 hover:bg-white/5 transition-colors">
          <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
          BMC Admin <ChevronDown className="w-3.5 h-3.5 ml-1" />
        </Link>
        
        <Link href="/dashboard" className="flex items-center gap-3 pl-4 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
          <Activity className="w-4 h-4 text-[#5EA977]" />
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
