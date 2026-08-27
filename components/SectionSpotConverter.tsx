'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Copy,
  Check,
  Zap,
  Banknote,
  Sliders,
  Coffee,
  Utensils,
  Car,
  Hotel,
  Globe2,
} from 'lucide-react';
import { PeriodStats, PopularCurrency } from '@/lib/types';
import { formatForeignRate, formatInverseRate, formatRateVND } from '@/lib/rate-service';

interface SectionSpotConverterProps {
  currentRate: number;
  inverseRate: number;
  stats: PeriodStats;
  change24h: number;
  change24hPct: number;
  source: string;
  lastUpdated: string | null;
  popularCurrencies?: PopularCurrency[];
  fromCode?: string;
  toCode?: string;
  onCurrencyChange?: (from: string, to: string) => void;
}

export function SectionSpotConverter({
  currentRate,
  inverseRate,
  stats,
  change24h,
  change24hPct,
  source,
  lastUpdated,
  popularCurrencies = [],
  fromCode: controlledFromCode,
  toCode: controlledToCode,
  onCurrencyChange,
}: SectionSpotConverterProps) {
  // Converter currencies: defaults to MYR -> VND on first open or uses controlled props
  const [internalFromCode, setInternalFromCode] = useState<string>('MYR');
  const [internalToCode, setInternalToCode] = useState<string>('VND');

  const fromCode = controlledFromCode !== undefined ? controlledFromCode : internalFromCode;
  const toCode = controlledToCode !== undefined ? controlledToCode : internalToCode;

  const setPair = (f: string, t: string) => {
    setInternalFromCode(f);
    setInternalToCode(t);
    if (onCurrencyChange) {
      onCurrencyChange(f, t);
    }
  };

  const setFromCode = (f: string) => {
    setPair(f, toCode);
  };

  const setToCode = (t: string) => {
    setPair(fromCode, t);
  };

  const [prevFromCode, setPrevFromCode] = useState<string>(fromCode);
  const [amount, setAmount] = useState<string>(fromCode === 'VND' ? '100000' : '100');
  const [copied, setCopied] = useState<boolean>(false);

  if (prevFromCode !== fromCode) {
    setPrevFromCode(fromCode);
    setAmount(fromCode === 'VND' ? '100000' : prevFromCode === 'VND' ? '100' : amount);
  }

  // Spread fee simulator
  const [spreadFeePct, setSpreadFeePct] = useState<number>(0); // 0% mid-market, 1% ATM, 2.5% card, 4.0% airport

  // All available currencies list with fallback definitions
  const allCurrencies = useMemo(() => {
    const defaultList: PopularCurrency[] = [
      { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', rateToUSD: 1 / 4.05, rateToMYR: 1.0, rateToVND: currentRate, change24hPct: 0.22, category: 'Regional ASEAN' },
      { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳', rateToUSD: (1 / currentRate) / 4.05, rateToMYR: 1 / currentRate, rateToVND: 1.0, change24hPct: -0.22, category: 'Regional ASEAN' },
      { code: 'USD', name: 'United States Dollar', symbol: '$', flag: '🇺🇸', rateToUSD: 1.0, rateToMYR: 4.425, rateToVND: 4.425 * currentRate, change24hPct: 0.12, category: 'Major' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', rateToUSD: 0.762, rateToMYR: 3.372, rateToVND: 3.372 * currentRate, change24hPct: -0.08, category: 'Regional ASEAN' },
      { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rateToUSD: 1.085, rateToMYR: 4.805, rateToVND: 4.805 * currentRate, change24hPct: 0.24, category: 'Major' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', rateToUSD: 0.0066, rateToMYR: 0.0295, rateToVND: 0.0295 * currentRate, change24hPct: -0.32, category: 'East Asia' },
      { code: 'CNY', name: 'Chinese Yuan (RMB)', symbol: '¥', flag: '🇨🇳', rateToUSD: 0.138, rateToMYR: 0.611, rateToVND: 0.611 * currentRate, change24hPct: 0.05, category: 'East Asia' },
      { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', rateToUSD: 1.295, rateToMYR: 5.735, rateToVND: 5.735 * currentRate, change24hPct: 0.18, category: 'Major' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', rateToUSD: 0.658, rateToMYR: 2.915, rateToVND: 2.915 * currentRate, change24hPct: -0.15, category: 'Major' },
      { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', rateToUSD: 0.029, rateToMYR: 0.128, rateToVND: 0.128 * currentRate, change24hPct: 0.14, category: 'Regional ASEAN' },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', rateToUSD: 0.00074, rateToMYR: 0.00328, rateToVND: 0.00328 * currentRate, change24hPct: -0.22, category: 'East Asia' },
      { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', rateToUSD: 0.000062, rateToMYR: 0.000275, rateToVND: 0.000275 * currentRate, change24hPct: -0.04, category: 'Regional ASEAN' },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', rateToUSD: 0.128, rateToMYR: 0.568, rateToVND: 0.568 * currentRate, change24hPct: 0.08, category: 'East Asia' },
      { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼', rateToUSD: 0.031, rateToMYR: 0.138, rateToVND: 0.138 * currentRate, change24hPct: -0.11, category: 'East Asia' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', flag: '🇨🇦', rateToUSD: 0.705, rateToMYR: 3.12, rateToVND: 3.12 * currentRate, change24hPct: 0.06, category: 'Major' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', rateToUSD: 1.118, rateToMYR: 4.95, rateToVND: 4.95 * currentRate, change24hPct: 0.15, category: 'Major' },
      { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', rateToUSD: 0.0173, rateToMYR: 0.0765, rateToVND: 0.0765 * currentRate, change24hPct: -0.05, category: 'Regional ASEAN' },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', rateToUSD: 0.592, rateToMYR: 2.62, rateToVND: 2.62 * currentRate, change24hPct: -0.18, category: 'Major' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rateToUSD: 0.0116, rateToMYR: 0.0515, rateToVND: 0.0515 * currentRate, change24hPct: 0.02, category: 'Major' },
      { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪', rateToUSD: 0.272, rateToMYR: 1.205, rateToVND: 1.205 * currentRate, change24hPct: 0.01, category: 'Major' },
      { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦', rateToUSD: 0.266, rateToMYR: 1.18, rateToVND: 1.18 * currentRate, change24hPct: 0.01, category: 'Major' },
    ];

    if (!popularCurrencies || popularCurrencies.length === 0) return defaultList;

    const map = new Map<string, PopularCurrency>();
    // Add MYR and VND first
    map.set('MYR', defaultList[0]);
    map.set('VND', defaultList[1]);

    // Add API currencies
    popularCurrencies.forEach((c) => {
      map.set(c.code, c);
    });

    // Add any remaining from default list
    defaultList.forEach((c) => {
      if (!map.has(c.code)) map.set(c.code, c);
    });

    return Array.from(map.values());
  }, [popularCurrencies, currentRate]);

  const fromCurrency = allCurrencies.find((c) => c.code === fromCode) || allCurrencies[0];
  const toCurrency = allCurrencies.find((c) => c.code === toCode) || allCurrencies[1];

  // Calculate live cross rate: 1 fromCurrency = X toCurrency
  const crossRate = useMemo(() => {
    if (fromCode === toCode) return 1;
    if (fromCode === 'MYR' && toCode === 'VND') return currentRate;
    if (fromCode === 'VND' && toCode === 'MYR') return inverseRate;

    // Via USD parity
    const fromUsd = fromCurrency.rateToUSD || 1;
    const toUsd = toCurrency.rateToUSD || 1;
    if (toUsd === 0) return 1;
    return fromUsd / toUsd;
  }, [fromCode, toCode, fromCurrency, toCurrency, currentRate, inverseRate]);

  const inverseCrossRate = crossRate > 0 ? 1 / crossRate : 0;
  const isPos = change24hPct >= 0;
  const numAmount = parseFloat(amount.replace(/,/g, '')) || 0;

  // Effective conversion calculation with optional spread margin
  const effectiveRate = crossRate * (1 - spreadFeePct / 100);
  const convertedValue = numAmount * effectiveRate;

  const handleSwap = () => {
    const oldFrom = fromCode;
    const oldTo = toCode;
    setPair(oldTo, oldFrom);

    // Adjust amount intelligently based on magnitude
    if (oldFrom === 'MYR' && oldTo === 'VND') {
      setAmount('100000');
    } else if (oldFrom === 'VND' && oldTo === 'MYR') {
      setAmount('100');
    } else if (oldTo === 'VND') {
      setAmount('100000');
    } else if (convertedValue > 0) {
      // Round to clean integer if large, or clean decimals
      if (convertedValue > 1000) {
        setAmount(Math.round(convertedValue).toString());
      } else {
        setAmount(parseFloat(convertedValue.toFixed(2)).toString());
      }
    }
  };

  const handleSelectPair = (f: string, t: string) => {
    setPair(f, t);
    if (f === 'VND') {
      setAmount('100000');
    } else if (f === 'IDR' || f === 'KRW') {
      setAmount('500000');
    } else {
      setAmount('100');
    }
  };

  const handlePreset = (val: number) => {
    setAmount(val.toString());
  };

  const handleCopyResult = () => {
    const formattedStr =
      toCode === 'VND' || toCode === 'IDR' || toCode === 'KRW'
        ? `${Math.round(convertedValue).toLocaleString()} ${toCode}`
        : `${toCurrency.symbol || ''} ${convertedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toCode}`;

    navigator.clipboard.writeText(formattedStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic quick preset buttons based on active source currency magnitude
  const presets = useMemo(() => {
    if (fromCode === 'VND') {
      return [100000, 200000, 500000, 1000000, 2000000, 5000000];
    }
    if (fromCode === 'IDR') {
      return [100000, 500000, 1000000, 2000000, 5000000, 10000000];
    }
    if (fromCode === 'KRW' || fromCode === 'JPY') {
      return [1000, 5000, 10000, 50000, 100000, 500000];
    }
    return [50, 100, 500, 1000, 2500, 5000];
  }, [fromCode]);

  // Vietnamese polymer banknotes reference
  const vnBanknotes = [
    { value: 500000, label: '500,000 ₫', color: 'bg-teal-50 border-teal-200 text-teal-800', equiv: 500000 / currentRate, desc: 'Highest note • Cyan polymer' },
    { value: 200000, label: '200,000 ₫', color: 'bg-amber-50 border-amber-200 text-amber-800', equiv: 200000 / currentRate, desc: 'Common note • Brown polymer' },
    { value: 100000, label: '100,000 ₫', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', equiv: 100000 / currentRate, desc: 'Wallet staple • Green polymer' },
    { value: 50000, label: '50,000 ₫', color: 'bg-pink-50 border-pink-200 text-pink-800', equiv: 50000 / currentRate, desc: 'Street food staple • Purple-pink' },
    { value: 20000, label: '20,000 ₫', color: 'bg-blue-50 border-blue-200 text-blue-800', equiv: 20000 / currentRate, desc: 'Small tip / Drink • Blue polymer' },
    { value: 10000, label: '10,000 ₫', color: 'bg-yellow-50 border-yellow-200 text-yellow-800', equiv: 10000 / currentRate, desc: 'Small change • Olive-yellow' },
  ];

  // Common travel spending benchmark items
  const travelPurchasingItems = [
    { icon: Coffee, title: 'Street Ca Phe Sua Da', costVND: 25000, costMYR: 25000 / currentRate },
    { icon: Utensils, title: 'Traditional Pho Bo Bowl', costVND: 55000, costMYR: 55000 / currentRate },
    { icon: Car, title: 'Grab Ride (City Center)', costVND: 80000, costMYR: 80000 / currentRate },
    { icon: Hotel, title: 'Boutique Hotel Room / Night', costVND: 850000, costMYR: 850000 / currentRate },
  ];

  // Format rate string for display
  const formatDisplayRate = (rateVal: number, code: string) => {
    if (code === 'VND' || code === 'IDR' || code === 'KRW') {
      return formatRateVND(rateVal);
    }
    return formatForeignRate(rateVal);
  };

  return (
    <div className="w-full flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Section Header Badge & Styled Line */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs ring-4 ring-indigo-500/10 flex-shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-heading">
                All-Currency Exchange & Interactive FX Converter
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 uppercase tracking-wider font-heading">
                Live Calculator
              </span>
            </div>
          </div>

          {/* Quick Active Pair Indicator */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-mono">
            <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-500">Active Pair:</span>
            <span className="font-bold text-slate-800">{fromCurrency.flag} {fromCode} ➔ {toCurrency.flag} {toCode}</span>
          </div>
        </div>

        {/* Soft Rounded Divider Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-indigo-500 via-indigo-200/70 to-slate-200/40 rounded-full" />
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
        {/* Left Column: Live Spot Benchmark Card + Travel Banknotes (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
          {/* Official Spot Overview Card with Changeable Currencies */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Spot Benchmark Rate
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                  Live Feed
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isPos
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{isPos ? '+' : ''}{change24hPct.toFixed(2)}%</span>
                <span className="text-[11px] font-normal font-mono">
                  ({isPos ? '+' : ''}{change24h.toFixed(1)} {toCode})
                </span>
              </span>
            </div>

            {/* Currency Selector Controls for the Rate Display */}
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50/90 rounded-xl border border-slate-200">
              <div className="flex-1 min-w-0">
                <select
                  value={fromCode}
                  onChange={(e) => setFromCode(e.target.value)}
                  id="select-rate-display-from"
                  className="w-full bg-white border border-slate-200 text-slate-900 font-bold font-mono text-xs px-2.5 py-1.5 rounded-lg shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {allCurrencies.map((c) => (
                    <option key={`rate-from-${c.code}`} value={c.code}>
                      {c.flag} {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSwap}
                title="Swap Base and Quote Currencies"
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition shadow-xs cursor-pointer flex-shrink-0"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 min-w-0">
                <select
                  value={toCode}
                  onChange={(e) => setToCode(e.target.value)}
                  id="select-rate-display-to"
                  className="w-full bg-white border border-indigo-200 text-indigo-950 font-bold font-mono text-xs px-2.5 py-1.5 rounded-lg shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {allCurrencies.map((c) => (
                    <option key={`rate-to-${c.code}`} value={c.code}>
                      {c.flag} {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary Big Numbers for Active Changeable Pair */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-1">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                    {fromCode === 'VND' ? (
                      <>100,000 {fromCode} = {formatDisplayRate(crossRate * 100000, toCode)}</>
                    ) : (
                      <>1 {fromCode} = {formatDisplayRate(crossRate, toCode)}</>
                    )}
                  </span>
                  <span className="text-xl font-bold text-indigo-600">{toCode}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Inverse:{' '}
                  {toCode === 'VND' ? (
                    <>100,000 {toCode} = <strong className="text-slate-700">{formatDisplayRate(inverseCrossRate * 100000, fromCode)}</strong> {fromCode}</>
                  ) : (
                    <>1 {toCode} = <strong className="text-slate-700">{formatDisplayRate(inverseCrossRate, fromCode)}</strong> {fromCode}</>
                  )}{' '}
                  ({fromCurrency.symbol || fromCode} {fromCode === 'VND' ? '100,000' : '1'} ≈ {formatDisplayRate(fromCode === 'VND' ? crossRate * 100000 : crossRate, toCode)} {toCurrency.symbol || toCode})
                </div>
              </div>
            </div>

            {/* 52-Week Visual Range Indicator (for benchmark pair) */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>52W Low: <strong className="text-slate-700">{formatRateVND(stats.week52Low)} ₫</strong></span>
                <span className="text-indigo-600 font-semibold">{stats.rangePositionPct.toFixed(0)}% of 52W Range</span>
                <span>52W High: <strong className="text-slate-700">{formatRateVND(stats.week52High)} ₫</strong></span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, Math.min(95, stats.rangePositionPct))}%` }}
                />
              </div>
            </div>

            {/* Micro Stats Matrix */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Pair</span>
                <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">{fromCode} ➔ {toCode}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Spread Margin</span>
                <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">{spreadFeePct.toFixed(1)}%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Feed Status</span>
                <span className="text-xs font-mono font-bold text-indigo-600 mt-0.5 block truncate">Live Interbank</span>
              </div>
            </div>
          </div>

          {/* Dynamic Denominations Quick Sheet for Base / Target Currencies */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {toCode} Denominations & Quick Conversion
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{fromCode} Equivalent</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(() => {
                // Generate dynamic denominations tailored to the target currency
                const targetDenoms = (() => {
                  if (toCode === 'VND' || toCode === 'IDR') {
                    return [
                      { val: 500000, label: `500,000 ${toCurrency.symbol || toCode}`, color: 'bg-teal-50 border-teal-200 text-teal-800', desc: 'Highest note' },
                      { val: 200000, label: `200,000 ${toCurrency.symbol || toCode}`, color: 'bg-amber-50 border-amber-200 text-amber-800', desc: 'Common large note' },
                      { val: 100000, label: `100,000 ${toCurrency.symbol || toCode}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-800', desc: 'Daily wallet staple' },
                      { val: 50000, label: `50,000 ${toCurrency.symbol || toCode}`, color: 'bg-pink-50 border-pink-200 text-pink-800', desc: 'Mid denomination' },
                      { val: 20000, label: `20,000 ${toCurrency.symbol || toCode}`, color: 'bg-blue-50 border-blue-200 text-blue-800', desc: 'Small spend / tip' },
                      { val: 10000, label: `10,000 ${toCurrency.symbol || toCode}`, color: 'bg-yellow-50 border-yellow-200 text-yellow-800', desc: 'Small change' },
                    ];
                  }
                  if (toCode === 'KRW' || toCode === 'JPY') {
                    return [
                      { val: 50000, label: `50,000 ${toCurrency.symbol || toCode}`, color: 'bg-teal-50 border-teal-200 text-teal-800', desc: 'High note' },
                      { val: 10000, label: `10,000 ${toCurrency.symbol || toCode}`, color: 'bg-amber-50 border-amber-200 text-amber-800', desc: 'Standard note' },
                      { val: 5000, label: `5,000 ${toCurrency.symbol || toCode}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-800', desc: 'Mid note' },
                      { val: 1000, label: `1,000 ${toCurrency.symbol || toCode}`, color: 'bg-pink-50 border-pink-200 text-pink-800', desc: 'Wallet staple' },
                      { val: 500, label: `500 ${toCurrency.symbol || toCode}`, color: 'bg-blue-50 border-blue-200 text-blue-800', desc: 'Coin / Note' },
                      { val: 100, label: `100 ${toCurrency.symbol || toCode}`, color: 'bg-yellow-50 border-yellow-200 text-yellow-800', desc: 'Small coin' },
                    ];
                  }
                  return [
                    { val: 100, label: `100 ${toCurrency.symbol || toCode}`, color: 'bg-teal-50 border-teal-200 text-teal-800', desc: 'Large note' },
                    { val: 50, label: `50 ${toCurrency.symbol || toCode}`, color: 'bg-amber-50 border-amber-200 text-amber-800', desc: 'Standard note' },
                    { val: 20, label: `20 ${toCurrency.symbol || toCode}`, color: 'bg-emerald-50 border-emerald-200 text-emerald-800', desc: 'Mid note' },
                    { val: 10, label: `10 ${toCurrency.symbol || toCode}`, color: 'bg-pink-50 border-pink-200 text-pink-800', desc: 'Daily staple' },
                    { val: 5, label: `5 ${toCurrency.symbol || toCode}`, color: 'bg-blue-50 border-blue-200 text-blue-800', desc: 'Small note' },
                    { val: 1, label: `1 ${toCurrency.symbol || toCode}`, color: 'bg-yellow-50 border-yellow-200 text-yellow-800', desc: 'Single unit' },
                  ];
                })();

                return targetDenoms.map((d) => {
                  const fromEquiv = crossRate > 0 ? d.val / crossRate : 0;
                  const formattedEquiv =
                    fromCode === 'VND' || fromCode === 'IDR' || fromCode === 'KRW'
                      ? `${Math.round(fromEquiv).toLocaleString()} ${fromCode}`
                      : `${fromCurrency.symbol || ''} ${fromEquiv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fromCode}`;

                  return (
                    <div
                      key={d.val}
                      onClick={() => {
                        // Set converter to calculate this denomination
                        setAmount(d.val.toString());
                        const oldFrom = fromCode;
                        const oldTo = toCode;
                        setFromCode(oldTo);
                        setToCode(oldFrom);
                      }}
                      className={`p-2.5 rounded-xl border ${d.color} hover:shadow-xs transition cursor-pointer flex flex-col justify-between`}
                      title={`Click to calculate ${d.label} in ${fromCode}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs">{d.label}</span>
                        <span className="text-[10px] font-bold font-mono">
                          ≈ {formattedEquiv}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 truncate">{d.desc}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Right Column: Universal Any-to-Any Currency Converter (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            {/* Header with Switch */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Universal FX Multi-Converter</h3>
                  <p className="text-[11px] text-slate-500">Instant real-time currency exchange for all world currencies</p>
                </div>
              </div>

              <button
                onClick={handleSwap}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition border border-slate-200 cursor-pointer"
                title="Swap source and target currencies"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Swap ({fromCode} ⇄ {toCode})</span>
              </button>
            </div>

            {/* Inputs & Conversion Fields */}
            <div className="space-y-3.5 pt-3">
              {/* Source Currency & Amount Input Field */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white transition">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">Source Currency & Amount</span>
                  <span className="font-mono text-slate-500 text-[11px] truncate max-w-[160px]">{fromCurrency.name}</span>
                </div>
                <div className="flex items-center justify-between gap-2.5">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    id="input-spot-converter-amount"
                    className="w-full bg-transparent text-xl sm:text-2xl font-mono font-bold text-slate-900 focus:outline-none"
                    placeholder="0"
                  />
                  {/* Currency Selector for FROM */}
                  <select
                    value={fromCode}
                    onChange={(e) => setFromCode(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 font-bold font-mono text-xs px-2.5 py-1.5 rounded-lg shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {allCurrencies.map((c) => (
                      <option key={`from-${c.code}`} value={c.code}>
                        {c.flag} {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Amount Presets */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                  <span>Quick Amount Presets:</span>
                  <span className="text-indigo-600 font-mono font-normal">Base: {fromCode}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePreset(preset)}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-mono font-medium text-slate-700 transition cursor-pointer border border-slate-200"
                    >
                      {preset >= 1000000
                        ? `${(preset / 1000000).toLocaleString()}M ${fromCode}`
                        : `${preset.toLocaleString()} ${fromCode}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Currency & Converted Output Field */}
              <div className="bg-indigo-50/70 rounded-xl p-3.5 border border-indigo-200 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-indigo-700 mb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px]">Target Currency & Converted Value</span>
                  {/* Currency Selector for TO */}
                  <select
                    value={toCode}
                    onChange={(e) => setToCode(e.target.value)}
                    className="bg-white border border-indigo-200 text-indigo-900 font-bold font-mono text-xs px-2 py-1 rounded-md shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {allCurrencies.map((c) => (
                      <option key={`to-${c.code}`} value={c.code}>
                        {c.flag} {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-2xl sm:text-3xl font-mono font-extrabold text-indigo-950 tracking-tight truncate">
                    {toCode === 'VND' || toCode === 'IDR' || toCode === 'KRW'
                      ? `${Math.round(convertedValue).toLocaleString()} ${toCode}`
                      : `${toCurrency.symbol || ''} ${convertedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toCode}`}
                  </div>

                  <button
                    onClick={handleCopyResult}
                    id="btn-copy-spot-result"
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 transition shadow-xs cursor-pointer flex-shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Channel Spread Simulator */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    <span>Channel Fee / Spread Simulation</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-600">
                    {spreadFeePct === 0 ? '0% (Pure Mid-Market)' : `-${spreadFeePct}% spread`}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                  {[
                    { label: 'Mid-Market', pct: 0 },
                    { label: 'ATM / Wise', pct: 1.0 },
                    { label: 'Bank Card', pct: 2.5 },
                    { label: 'Airport Booth', pct: 4.0 },
                  ].map((chan) => (
                    <button
                      key={chan.label}
                      onClick={() => setSpreadFeePct(chan.pct)}
                      className={`py-1 px-1.5 rounded-lg font-medium transition cursor-pointer border text-center ${
                        spreadFeePct === chan.pct
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div>{chan.label}</div>
                      <div className="font-mono text-[9px] opacity-80">({chan.pct}%)</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Purchasing Power Guide - Dynamically adapts to active pair */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Purchasing Power & Cost Reference ({fromCode} ➔ {toCode}):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: Coffee, title: 'Street Food / Coffee', costUSD: 1.5 },
                { icon: Utensils, title: 'Sit-Down Meal (2p)', costUSD: 12.0 },
                { icon: Car, title: 'Ride / Taxi Trip (5km)', costUSD: 3.5 },
                { icon: Hotel, title: 'Boutique Hotel / Night', costUSD: 35.0 },
              ].map((item) => {
                const Icon = item.icon;
                const costInTarget = item.costUSD * (toCurrency.rateToUSD ? 1 / toCurrency.rateToUSD : 1);
                const costInSource = item.costUSD * (fromCurrency.rateToUSD ? 1 / fromCurrency.rateToUSD : 1);

                const formattedTarget =
                  toCode === 'VND' || toCode === 'IDR'
                    ? `${(costInTarget / 1000).toFixed(0)}k ${toCode}`
                    : `${toCurrency.symbol || ''}${costInTarget.toFixed(toCode === 'KRW' || toCode === 'JPY' ? 0 : 2)}`;

                const formattedSource =
                  fromCode === 'VND' || fromCode === 'IDR'
                    ? `${(costInSource / 1000).toFixed(0)}k ${fromCode}`
                    : `${fromCurrency.symbol || ''} ${costInSource.toFixed(fromCode === 'KRW' || fromCode === 'JPY' ? 0 : 2)}`;

                return (
                  <div key={item.title} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                      <Icon className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between font-mono text-[10px]">
                      <span className="text-slate-500">{formattedTarget}</span>
                      <span className="font-bold text-slate-800">{formattedSource}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

