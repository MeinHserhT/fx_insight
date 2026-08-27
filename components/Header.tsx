'use client';

import React from 'react';
import { RefreshCw, Clock, ArrowRightLeft } from 'lucide-react';

interface HeaderProps {
  lastUpdated: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  source: string;
  activeSection?: string;
  onNavigateSection?: (sectionId: string) => void;
  baseCode?: string;
  quoteCode?: string;
  baseFlag?: string;
  quoteFlag?: string;
}

export function Header({
  lastUpdated,
  isLoading,
  onRefresh,
  source,
  activeSection = 'section-1',
  onNavigateSection,
  baseCode = 'MYR',
  quoteCode = 'VND',
  baseFlag = '🇲🇾',
  quoteFlag = '🇻🇳',
}: HeaderProps) {
  const formattedTime = lastUpdated
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date(lastUpdated))
    : 'Connecting...';

  const navItems = [
    { id: 'section-1', label: 'Spot & Converter' },
    { id: 'section-2', label: 'Historical Chart' },
    { id: 'section-3', label: 'Market Rates' },
    { id: 'section-4', label: 'Currency Matrix' },
  ];

  const handleNav = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateSection) {
      onNavigateSection(id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="w-full bg-slate-50/35 backdrop-blur-md border-b border-slate-200/40 sticky top-0 z-40 h-[50px] flex items-center transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between gap-3 w-full">
        {/* Brand & Pair */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg shadow-sm flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-slate-800 uppercase">
                Forex<span className="text-indigo-600">Sync</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/80 font-mono">
                {baseFlag} {baseCode} ⇄ {quoteFlag} {quoteCode}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Interbank Feed</span>
            </p>
          </div>
        </div>

        {/* Section Navigation Pills (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-white/40 backdrop-blur-md p-1 rounded-full border border-slate-200/40 shadow-xs">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={(e) => handleNav(item.id, e)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Status, Timestamp & Refresh */}
        <div className="flex items-center justify-end gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-200/40">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-slate-700" suppressHydrationWarning>
              {formattedTime}
            </span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            id="btn-refresh-rates"
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-600 border border-indigo-200/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-xs"
            title="Refresh exchange rates"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

