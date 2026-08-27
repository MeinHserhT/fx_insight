'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  CreditCard,
  Building2,
  Store,
  Smartphone,
  Banknote,
} from 'lucide-react';
import { MarketProvider } from '@/lib/types';
import { calculateUniversalProviderPayout } from '@/lib/rate-service';

export const APP_BRAND_COLORS: Record<
  string,
  { c1: string; c2: string; text: string; bg: string; border: string }
> = {
  wise: {
    c1: '#9FE870', // Wise Bright Electric Lime
    c2: '#163300', // Wise Deep Forest Green
    text: '#163300',
    bg: '#F2FCE8',
    border: '#9FE870',
  },
  xe: {
    c1: '#0052FF', // Xe Electric Blue
    c2: '#002D80', // Xe Deep Navy Blue
    text: '#0052FF',
    bg: '#EFF4FF',
    border: '#0052FF',
  },
  remitly: {
    c1: '#0F1B4C', // Remitly Midnight Navy
    c2: '#00C389', // Remitly Vibrant Emerald Teal
    text: '#0F1B4C',
    bg: '#ECFDF5',
    border: '#00C389',
  },
  worldremit: {
    c1: '#660066', // WorldRemit Plum Purple
    c2: '#FF4F00', // WorldRemit Sunset Coral
    text: '#660066',
    bg: '#FDF2F8',
    border: '#DA291C',
  },
  western_union: {
    c1: '#FFDD00', // Western Union Vivid Yellow
    c2: '#111827', // WU Charcoal Black
    text: '#111827',
    bg: '#FEFCE8',
    border: '#FFDD00',
  },
  touch_n_go: {
    c1: '#0055A5', // Touch 'n Go Royal Blue
    c2: '#FFD100', // Touch 'n Go Golden Yellow
    text: '#0055A5',
    bg: '#EFF6FF',
    border: '#0055A5',
  },
  ria: {
    c1: '#FF6600', // Ria Electric Orange
    c2: '#0A1E3F', // Ria Midnight Navy
    text: '#EA580C',
    bg: '#FFF7ED',
    border: '#FF6600',
  },
  maybank: {
    c1: '#FFC800', // Maybank Tiger Yellow
    c2: '#1F2937', // Maybank Charcoal Black
    text: '#B45309',
    bg: '#FEF3C7',
    border: '#FFC800',
  },
  cimb: {
    c1: '#ED1B24', // CIMB Red
    c2: '#7A0019', // CIMB Maroon
    text: '#DC2626',
    bg: '#FEF2F2',
    border: '#ED1B24',
  },
  vietcombank: {
    c1: '#008853', // Vietcombank Jade Green
    c2: '#004C2E', // Vietcombank Forest Dark
    text: '#047857',
    bg: '#ECFDF5',
    border: '#008853',
  },
  merchantrade: {
    c1: '#E31B23', // Merchantrade Red
    c2: '#F7931E', // Merchantrade Vivid Orange
    text: '#DC2626',
    bg: '#FFF1F2',
    border: '#E31B23',
  },
  sunway_money: {
    c1: '#003399', // Sunway Cobalt Blue
    c2: '#FF6600', // Sunway Sunrise Orange
    text: '#003399',
    bg: '#EFF6FF',
    border: '#003399',
  },
};

interface SectionMarketProvidersProps {
  providers: MarketProvider[];
  midMarketRate: number;
  baseCode?: string;
  quoteCode?: string;
  baseFlag?: string;
  quoteFlag?: string;
  baseRateToMYR?: number;
}

function formatProviderCurrency(val: number, code: string): string {
  if (isNaN(val)) return '0';
  if (code === 'VND' || code === 'IDR') {
    return `${Math.round(val).toLocaleString('en-US')} ${code}`;
  }
  if (code === 'KRW' || code === 'JPY') {
    return `${Math.round(val).toLocaleString('en-US')} ${code}`;
  }
  if (val >= 100) {
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
  }
  return `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${code}`;
}

function formatRateDisplay(val: number, quoteCode: string): string {
  if (isNaN(val)) return '0.00';
  if (quoteCode === 'VND' || quoteCode === 'IDR') {
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }
  if (quoteCode === 'KRW' || quoteCode === 'JPY') {
    return val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  }
  if (val >= 100) {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function SectionMarketProviders({
  providers,
  midMarketRate,
  baseCode = 'MYR',
  quoteCode = 'VND',
  baseFlag = '🇲🇾',
  quoteFlag = '🇻🇳',
  baseRateToMYR = 1.0,
}: SectionMarketProvidersProps) {
  const isVND = baseCode === 'VND';
  const isHighDenom = isVND || baseCode === 'IDR' || baseCode === 'KRW';
  const defaultSendAmount = isVND ? 100000 : isHighDenom ? 1000000 : 1000;

  const [prevBaseCode, setPrevBaseCode] = useState<string>(baseCode);
  const [sendAmount, setSendAmount] = useState<number>(defaultSendAmount);
  const [sortBy, setSortBy] = useState<'payout' | 'fee' | 'speed' | 'rating'>('payout');
  const [filterType, setFilterType] = useState<string>('all');

  if (prevBaseCode !== baseCode) {
    setPrevBaseCode(baseCode);
    setSendAmount(isVND ? 100000 : prevBaseCode === 'VND' ? 1000 : sendAmount);
  }

  const presets = isVND
    ? [100000, 200000, 500000, 1000000, 2000000, 5000000]
    : isHighDenom
    ? [200000, 500000, 1000000, 2500000, 5000000, 10000000]
    : [100, 250, 500, 1000, 2500, 5000];

  // Calculate payouts for all providers
  const evaluatedProviders = providers
    .map((p) => ({
      ...p,
      calc: calculateUniversalProviderPayout(sendAmount, p, midMarketRate, baseRateToMYR),
    }))
    .filter((p) => {
      if (filterType === 'all') return true;
      return p.type === filterType;
    })
    .sort((a, b) => {
      if (sortBy === 'payout') {
        return b.calc.payout - a.calc.payout;
      }
      if (sortBy === 'fee') {
        return a.calc.totalFee - b.calc.totalFee;
      }
      if (sortBy === 'rating') {
        return b.reliabilityScore - a.reliabilityScore;
      }
      if (sortBy === 'speed') {
        const isAInstant = a.transferSpeed.toLowerCase().includes('instant') || a.transferSpeed.includes('Minutes');
        const isBInstant = b.transferSpeed.toLowerCase().includes('instant') || b.transferSpeed.includes('Minutes');
        if (isAInstant && !isBInstant) return -1;
        if (!isAInstant && isBInstant) return 1;
        return 0;
      }
      return 0;
    });

  const bestProvider = evaluatedProviders[0];

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'app':
        return <Smartphone className="w-3.5 h-3.5 text-indigo-600" />;
      case 'wallet':
        return <Smartphone className="w-3.5 h-3.5 text-cyan-600" />;
      case 'bank':
        return <Building2 className="w-3.5 h-3.5 text-amber-600" />;
      case 'cash':
        return <CreditCard className="w-3.5 h-3.5 text-rose-600" />;
      case 'booth':
        return <Store className="w-3.5 h-3.5 text-teal-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="w-full flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5">
      {/* Section Header & Styled Line */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs ring-4 ring-blue-500/10 flex-shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-heading">
                Remittance & Market Exchange Providers ({baseFlag} {baseCode} → {quoteFlag} {quoteCode})
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 uppercase tracking-wider font-heading">
                Live Rates & Fees
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/80">
            Mid-Market Benchmark: 1 {baseCode} = {formatRateDisplay(midMarketRate, quoteCode)} {quoteCode}
          </span>
        </div>

        {/* Soft Rounded Filson-matching Divider Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-blue-500 via-blue-200/70 to-slate-200/40 rounded-full" />
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex-1 flex flex-col justify-between space-y-4">
        {/* Interactive Send Calculator Bar (Organized in 2 clean responsive rows) */}
        <div className="bg-slate-50 rounded-xl p-3 sm:p-3.5 border border-slate-200 flex flex-col gap-2.5">
          {/* Row 1: Amount input & Quick preset buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">
                Send {baseCode}:
              </span>
              <div className="relative w-36 sm:w-44">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold font-mono text-slate-400 text-xs">
                  {baseCode}
                </span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                  id="input-provider-send-amount"
                  className="w-full pl-12 pr-2.5 py-1.5 bg-white rounded-lg border border-slate-300 font-mono font-bold text-sm sm:text-base text-slate-900 focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>

              {/* Quick Presets in Row 1 */}
              <div className="flex flex-wrap items-center gap-1">
                {presets.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSendAmount(amt)}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono font-medium transition cursor-pointer border ${
                      sendAmount === amt
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {amt.toLocaleString()} {baseCode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Filter Categories & Sorting Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
            {/* Filter by Provider Type */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              {[
                { id: 'all', label: `All (${providers.length})` },
                { id: 'app', label: 'Fintech Apps' },
                { id: 'wallet', label: 'eWallet (TNG)' },
                { id: 'cash', label: 'Cash / Remittance' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-2 py-1 rounded-md transition cursor-pointer text-[11px] font-medium ${
                    filterType === f.id ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              {[
                { id: 'payout', label: 'Recipient Gets Most' },
                { id: 'fee', label: 'Lowest Fee' },
                { id: 'speed', label: 'Fastest' },
                { id: 'rating', label: 'Rating' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id as any)}
                  className={`px-2 py-1 rounded-md transition cursor-pointer text-[11px] font-medium ${
                    sortBy === s.id ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Providers Table / Cards List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">
                <th className="py-2 px-2.5">Provider</th>
                <th className="py-2 px-2.5">Exchange Rate</th>
                <th className="py-2 px-2.5">Transfer Fee</th>
                <th className="py-2 px-2.5">Speed</th>
                <th className="py-2 px-2.5 text-right">Recipient Receives</th>
                <th className="py-2 px-2.5 text-right">Net Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evaluatedProviders.map((p, idx) => {
                const isTop = idx === 0 && sortBy === 'payout';
                const brand = APP_BRAND_COLORS[p.id] || {
                  c1: '#6366f1',
                  c2: '#4f46e5',
                  text: '#4f46e5',
                  bg: '#eef2ff',
                  border: '#c7d2fe',
                };
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isTop ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* Provider Name + App Primary 2-Color Line */}
                    <td className="py-2 px-2.5">
                      <div className="flex items-center gap-2">
                        {/* Dual-Color Brand Line */}
                        <div
                          className="w-1.5 h-7 rounded-full shrink-0 shadow-xs"
                          style={{
                            background: `linear-gradient(180deg, ${brand.c1} 0%, ${brand.c2} 100%)`,
                          }}
                          title={`${p.name} Brand Colors (${brand.c1}, ${brand.c2})`}
                        />
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[9.5px] font-mono border flex-shrink-0 shadow-xs"
                          style={{
                            backgroundColor: brand.bg,
                            borderColor: `${brand.c1}80`,
                            color: brand.text,
                          }}
                        >
                          {p.logoText}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-[11.5px] flex items-center gap-1.5 whitespace-nowrap leading-tight">
                            <span className="whitespace-nowrap">{p.name}</span>
                            {isTop && (
                              <span className="bg-emerald-600 text-white text-[8.5px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
                                Best Payout
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 mt-0.5 whitespace-nowrap">
                            {getCategoryIcon(p.type)}
                            <span>{p.category}</span>
                            <span>•</span>
                            <span className="text-amber-600 font-semibold">★ {p.reliabilityScore}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rate */}
                    <td className="py-2 px-2.5 font-mono">
                      <div className="font-bold text-slate-800 text-[11.5px]">
                        1 {baseCode} = {formatRateDisplay(p.calc.effectiveProviderRate, quoteCode)} {quoteCode}
                      </div>
                      <div className="text-[9.5px] text-slate-400">
                        {p.calc.spreadMarginPct.toFixed(2)}% FX spread
                      </div>
                    </td>

                    {/* Fee */}
                    <td className="py-2 px-2.5 font-mono">
                      <div className="font-bold text-slate-800 text-[11.5px]">
                        {p.calc.totalFee === 0 ? (
                          <span className="text-emerald-600 font-bold">FREE</span>
                        ) : (
                          formatProviderCurrency(p.calc.totalFee, baseCode)
                        )}
                      </div>
                      <div className="text-[9.5px] text-slate-400">
                        {p.fixedFeeMYR > 0 ? `${formatProviderCurrency(p.fixedFeeMYR * (1 / (baseRateToMYR || 1)), baseCode)} + ` : ''}
                        {p.variableFeePct}%
                      </div>
                    </td>

                    {/* Speed */}
                    <td className="py-2 px-2.5">
                      <div className="flex items-center gap-1 text-slate-700 font-medium text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{p.transferSpeed}</span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 block truncate max-w-[130px]">
                        {p.receiveMethods[0]}
                      </span>
                    </td>

                    {/* Net Quote Received */}
                    <td className="py-2 px-2.5 text-right font-mono">
                      <div className="text-[13px] font-bold text-indigo-900 leading-tight">
                        {formatProviderCurrency(p.calc.payout, quoteCode)}
                      </div>
                      <span className="text-[9.5px] text-slate-400">
                        net after all fees
                      </span>
                    </td>

                    {/* Net Difference vs Mid-Market */}
                    <td className="py-2 px-2.5 text-right font-mono">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                          p.calc.diff >= -0.01 * p.calc.benchmarkPayout
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {p.calc.diff >= 0 ? '+' : ''}
                        {formatProviderCurrency(p.calc.diff, quoteCode)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        -{formatProviderCurrency(p.calc.totalCostBase, baseCode)} total cost
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tip Badge / Advice Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-slate-600">
              <strong>Real-Time Comparison:</strong> Live rates & fees for Wise, Xe, Remitly, WorldRemit, Western Union, Touch &apos;n Go eWallet (GOremit), and Ria are dynamically calibrated against live spot interbank rates ({baseCode} → {quoteCode}) to reflect real net recipient payout.
            </span>
          </div>
          <span className="text-[11px] text-indigo-600 font-bold whitespace-nowrap">
            Live Streamed
          </span>
        </div>
      </div>
    </div>
  );
}
