'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Globe2,
  Copy,
  Check,
  Calculator,
  Search,
  ArrowRightLeft,
  DollarSign,
  Filter,
} from 'lucide-react';
import { PopularCurrency } from '@/lib/types';
import { formatForeignRate, formatRateVND } from '@/lib/rate-service';

interface SectionCurrencyMatrixProps {
  popularCurrencies: PopularCurrency[];
  liveMYRtoVND: number;
  baseCode?: string;
  quoteCode?: string;
  baseFlag?: string;
  quoteFlag?: string;
  onCurrencyChange?: (from: string, to: string) => void;
}

export function SectionCurrencyMatrix({
  popularCurrencies,
  liveMYRtoVND,
  baseCode: controlledBaseCode,
  quoteCode: controlledQuoteCode = 'VND',
  baseFlag = '🇲🇾',
  quoteFlag = '🇻🇳',
  onCurrencyChange,
}: SectionCurrencyMatrixProps) {
  const [internalBaseCode, setInternalBaseCode] = useState<string>('MYR');
  const baseCode = controlledBaseCode !== undefined ? controlledBaseCode : internalBaseCode;
  const quoteCode = controlledQuoteCode;

  const isVND = baseCode === 'VND';
  const isHighDenom = isVND || baseCode === 'IDR' || baseCode === 'KRW';
  const [prevBaseCode, setPrevBaseCode] = useState<string>(baseCode);
  const [calcAmount, setCalcAmount] = useState<string>(isVND ? '100000' : isHighDenom ? '1000000' : '100');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  if (prevBaseCode !== baseCode) {
    setPrevBaseCode(baseCode);
    setCalcAmount(isVND ? '100000' : prevBaseCode === 'VND' ? '100' : calcAmount);
  }

  const numAmount = parseFloat(calcAmount.replace(/,/g, '')) || 0;

  // Complete list including MYR and VND for matrix calculations
  const allCurrenciesWithLocal: PopularCurrency[] = [
    {
      code: 'MYR',
      name: 'Malaysian Ringgit',
      symbol: 'RM',
      flag: '🇲🇾',
      rateToUSD: 1 / 4.425,
      rateToMYR: 1.0,
      rateToVND: liveMYRtoVND,
      change24hPct: 0.05,
      category: 'Major',
    },
    {
      code: 'VND',
      name: 'Vietnamese Dong',
      symbol: '₫',
      flag: '🇻🇳',
      rateToUSD: 1 / (4.425 * liveMYRtoVND),
      rateToMYR: 1 / liveMYRtoVND,
      rateToVND: 1.0,
      change24hPct: -0.05,
      category: 'Major',
    },
    ...popularCurrencies,
  ];

  // Selected base and quote currency details
  const baseCurrency =
    allCurrenciesWithLocal.find((c) => c.code === baseCode) || allCurrenciesWithLocal[0];
  const quoteCurrency =
    allCurrenciesWithLocal.find((c) => c.code === quoteCode) || allCurrenciesWithLocal[1];

  // Calculate cross rate from Base to Target
  const getCrossRate = (target: PopularCurrency) => {
    if (target.code === baseCurrency.code) return 1.0;
    return baseCurrency.rateToUSD / target.rateToUSD;
  };

  const handleBaseCodeChange = (newBase: string) => {
    setInternalBaseCode(newBase);
    if (onCurrencyChange) {
      onCurrencyChange(newBase, quoteCode);
    }
  };

  const handleCopy = (code: string, valueStr: string) => {
    navigator.clipboard.writeText(valueStr);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter list
  const filteredCurrencies = popularCurrencies.filter((c) => {
    if (categoryFilter === 'All') return true;
    return c.category === categoryFilter;
  });

  return (
    <div
      className="w-full h-full max-h-[90vh] flex flex-col justify-between py-2 sm:py-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-2"
    >
      {/* Section Header & Styled Line */}
      <div className="space-y-1.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs ring-4 ring-purple-500/10 flex-shrink-0">
              <Globe2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight font-heading">
                Global Forex Cross Matrix & Multi-Currency ({baseFlag} {baseCode} / {quoteFlag} {quoteCode})
              </h2>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 uppercase tracking-wider font-heading">
                Live Rates
              </span>
            </div>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono hidden sm:inline bg-slate-100/80 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
            Active: {baseCode} ➔ {quoteCode}
          </span>
        </div>
        {/* Soft Rounded Divider Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-purple-500 via-purple-200/70 to-slate-200/40 rounded-full" />
      </div>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 flex-1 items-stretch min-h-0">
        {/* Left Column: Universal Multi-Currency Quick Converter (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-sm flex flex-col justify-between min-h-0 space-y-2">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <Calculator className="w-3 h-3" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">Universal FX Multi-Converter</h3>
                  <p className="text-[10px] text-slate-500">Calculate simultaneous cross conversions from {baseCode}</p>
                </div>
              </div>
            </div>

            {/* Base Currency & Amount Input */}
            <div className="space-y-1.5 pt-1.5 flex-shrink-0">
              <div className="bg-slate-50 rounded-xl p-2 sm:p-2.5 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white transition">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 mb-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Source Currency & Amount
                  </span>
                  <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px] truncate max-w-[130px]">{baseCurrency.name}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    id="input-matrix-calc-amount"
                    className="w-full bg-transparent text-base sm:text-lg font-mono font-bold text-slate-900 focus:outline-none"
                    placeholder="100"
                  />
                  <select
                    value={baseCode}
                    onChange={(e) => handleBaseCodeChange(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 font-bold font-mono text-[10px] sm:text-[11px] px-2 py-1 rounded-md shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="MYR">🇲🇾 MYR</option>
                    <option value="VND">🇻🇳 VND</option>
                    <option value="USD">🇺🇸 USD</option>
                    <option value="EUR">🇪🇺 EUR</option>
                    <option value="SGD">🇸🇬 SGD</option>
                    <option value="CNY">🇨🇳 CNY (RMB)</option>
                    <option value="JPY">🇯🇵 JPY</option>
                    <option value="GBP">🇬🇧 GBP</option>
                    <option value="AUD">🇦🇺 AUD</option>
                    <option value="THB">🇹🇭 THB</option>
                  </select>
                </div>
              </div>

              {/* Quick Amount Presets */}
              <div className="flex flex-wrap gap-1">
                {(isVND ? [100000, 200000, 500000, 1000000, 5000000] : isHighDenom ? [100000, 500000, 1000000, 2500000, 5000000] : [50, 100, 500, 1000, 5000]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCalcAmount(v.toString())}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-medium text-slate-700 transition cursor-pointer border border-slate-200"
                  >
                    {v.toLocaleString()} {baseCode}
                  </button>
                ))}
              </div>
            </div>

            {/* Instant Multi-Currency Result Grid */}
            <div className="mt-1 space-y-0.5 flex-1 min-h-0 overflow-y-auto pr-0.5 no-scrollbar">
              {allCurrenciesWithLocal
                .filter((c) => c.code !== baseCode)
                .map((cur) => {
                  const crossRate = getCrossRate(cur);
                  const converted = numAmount * crossRate;
                  const isLargeDenom = cur.code === 'VND' || cur.code === 'IDR' || cur.code === 'KRW';
                  const formattedVal = isLargeDenom
                    ? `${Math.round(converted).toLocaleString()} ${cur.symbol || cur.code}`
                    : `${cur.symbol} ${formatForeignRate(converted)}`;

                  const isCopied = copiedCode === cur.code;

                  return (
                    <div
                      key={cur.code}
                      onClick={() => handleCopy(cur.code, formattedVal)}
                      className="px-2 py-1 rounded-md bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 flex items-center justify-between transition-all cursor-pointer group"
                      title="Click to copy value"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs shrink-0">{cur.flag}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-[10px] flex items-center gap-1 leading-tight">
                            <span>{cur.code}</span>
                            <span className="text-[8.5px] text-slate-400 font-normal truncate max-w-[80px] sm:max-w-[100px]">
                              {cur.name}
                            </span>
                          </div>
                          <span className="text-[8.5px] text-slate-400 font-mono leading-none block">
                            1 {baseCode} = {isLargeDenom ? formatRateVND(crossRate) : formatForeignRate(crossRate)} {cur.code}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <span className="text-[11px] font-bold font-mono text-indigo-700 group-hover:text-indigo-900">
                          {formattedVal}
                        </span>
                        <div className="text-slate-400 group-hover:text-indigo-600">
                          {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="text-[9px] text-slate-400 pt-1.5 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
            <span>Click any row to copy value</span>
            <span className="font-mono">Realtime FX</span>
          </div>
        </div>

        {/* Right Column: Interactive FX Cross Matrix Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-sm space-y-2 flex flex-col justify-between min-h-0">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Table Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Popular World & ASEAN Currencies Matrix</span>
                </h3>
                <p className="text-[10px] text-slate-500">Live exchange rates paired with {baseCode}, {quoteCode}, and USD</p>
              </div>

              {/* Category Filter */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                {['All', 'Major', 'Regional ASEAN', 'East Asia'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-1.5 sm:px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-white text-indigo-600 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 no-scrollbar pb-0">
              <table className="w-full text-left border-collapse text-[10px] sm:text-[11px]">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-xs">
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="py-1.5 px-2">Currency</th>
                    <th className="py-1.5 px-2">In {baseCode} ({baseCurrency.symbol || baseCode})</th>
                    <th className="py-1.5 px-2">In {quoteCode} ({quoteCurrency.symbol || quoteCode})</th>
                    <th className="py-1.5 px-2">In USD ($)</th>
                    <th className="py-1.5 px-2 text-right">24h Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal font-mono">
                  {filteredCurrencies.map((cur) => {
                    const isPos = cur.change24hPct >= 0;
                    // Rate of 1 cur in Base
                    const curInBase = cur.rateToUSD / (baseCurrency.rateToUSD || 1);
                    // Rate of 1 cur in Quote
                    const curInQuote = cur.rateToUSD / (quoteCurrency.rateToUSD || 1);

                    const isQuoteLarge = quoteCode === 'VND' || quoteCode === 'IDR' || quoteCode === 'KRW';
                    const isBaseLarge = baseCode === 'VND' || baseCode === 'IDR' || baseCode === 'KRW';

                    return (
                      <tr key={cur.code} className="hover:bg-slate-50/80 transition-colors">
                        {/* Currency Code & Name */}
                        <td className="py-1 px-2 font-sans">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm">{cur.flag}</span>
                            <div>
                              <div className="font-bold text-slate-900 text-[10px] sm:text-[11px]">{cur.code}</div>
                              <span className="text-[8.5px] text-slate-400 block font-normal leading-tight">{cur.name}</span>
                            </div>
                          </div>
                        </td>

                        {/* In Base Currency */}
                        <td className="py-1 px-2">
                          <div className="font-bold text-slate-800 text-[10px] sm:text-[11px]">
                            {isBaseLarge ? formatRateVND(curInBase) : formatForeignRate(curInBase)}
                          </div>
                          <span className="text-[8.5px] text-slate-400 font-sans">
                            1 {cur.code} in {baseCode}
                          </span>
                        </td>

                        {/* In Quote Currency */}
                        <td className="py-1 px-2">
                          <div className="font-bold text-indigo-600 text-[10px] sm:text-[11px]">
                            {isQuoteLarge ? formatRateVND(curInQuote) : formatForeignRate(curInQuote)}
                          </div>
                          <span className="text-[8.5px] text-slate-400 font-sans">
                            1 {cur.code} in {quoteCode}
                          </span>
                        </td>

                        {/* In USD */}
                        <td className="py-1 px-2">
                          <div className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">
                            ${cur.rateToUSD.toFixed(4)}
                          </div>
                          <span className="text-[8.5px] text-slate-400 font-sans">USD parity</span>
                        </td>

                        {/* 24h Change */}
                        <td className="py-1 px-2 text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded font-bold text-[9px] ${
                              isPos
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isPos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                            <span>
                              {isPos ? '+' : ''}
                              {cur.change24hPct.toFixed(2)}%
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Currency Takeaway Cards */}
          <div className="pt-1.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs flex-shrink-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block">USD Benchmark</span>
              <span className="font-mono font-bold text-slate-800 block text-[10px] sm:text-[11px] mt-0.5">
                $1 USD = {formatForeignRate(1 / (baseCurrency.rateToUSD || 1))} {baseCode}
              </span>
              <span className="text-[8.5px] text-slate-500 font-mono block">
                ≈ {quoteCode === 'VND' ? formatRateVND(1 / (quoteCurrency.rateToUSD || 1)) : formatForeignRate(1 / (quoteCurrency.rateToUSD || 1))} {quoteCode}
              </span>
            </div>

            <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block">SGD ASEAN Anchor</span>
              <span className="font-mono font-bold text-slate-800 block text-[10px] sm:text-[11px] mt-0.5">
                S$1 SGD = {formatForeignRate((1 / 1.345) / (baseCurrency.rateToUSD || 1))} {baseCode}
              </span>
              <span className="text-[8.5px] text-slate-500 font-mono block">
                ≈ {quoteCode === 'VND' ? formatRateVND((1 / 1.345) / (quoteCurrency.rateToUSD || 1)) : formatForeignRate((1 / 1.345) / (quoteCurrency.rateToUSD || 1))} {quoteCode}
              </span>
            </div>

            <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block">CNY Trade Corridor</span>
              <span className="font-mono font-bold text-slate-800 block text-[10px] sm:text-[11px] mt-0.5">
                ¥1 RMB = {formatForeignRate((1 / 7.24) / (baseCurrency.rateToUSD || 1))} {baseCode}
              </span>
              <span className="text-[8.5px] text-slate-500 font-mono block">
                ≈ {quoteCode === 'VND' ? formatRateVND((1 / 7.24) / (quoteCurrency.rateToUSD || 1)) : formatForeignRate((1 / 7.24) / (quoteCurrency.rateToUSD || 1))} {quoteCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
