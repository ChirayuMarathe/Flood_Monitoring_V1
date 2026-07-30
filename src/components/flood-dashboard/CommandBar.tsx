'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useFloodStore } from '@/store/flood-store';
import { mumbaiWards } from '@/lib/mumbai-data';
import { useRouter } from 'next/navigation';

export default function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setSelectedWard } = useFloodStore();

  const filtered = query.trim()
    ? mumbaiWards.filter(
        (w) =>
          w.name.toLowerCase().includes(query.toLowerCase()) ||
          w.code.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (wardId: string) => {
    setSelectedWard(wardId);
    setOpen(false);
    setQuery('');
    router.push('/map');
  };

  return (
    <div className="relative flex-1 max-w-[480px]" ref={dropdownRef}>
      <div
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-text bg-[#13161D] border border-[#242832]"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <Search size={14} className="text-[#525866] flex-shrink-0" />
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wards, zones..."
            className="flex-1 bg-transparent text-[13px] text-[#E1E4EA] placeholder-[#525866] outline-none"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-[13px] text-[#525866]">Search or try command bar</span>
        )}
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#525866] bg-[#1A1E27] border border-[#242832]">
          K
        </span>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden z-50 bg-[#13161D] border border-[#242832] shadow-xl">
          {filtered.slice(0, 8).map((ward) => (
            <button
              key={ward.id}
              onClick={() => handleSelect(ward.id)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#1A1E27] transition-colors"
            >
              <span className="w-6 h-6 rounded bg-[#1A1E27] flex items-center justify-center text-[9px] font-semibold text-[#8B919E] border border-[#242832]">
                {ward.code.length > 3 ? ward.code.slice(0, 2) : ward.code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#C1C5CD] truncate">{ward.name}</p>
                <p className="text-[10px] text-[#525866]">{ward.wardType} zone</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
