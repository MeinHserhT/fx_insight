'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  CartesianGrid,
} from 'recharts';
import {
  Download,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { RateDataPoint, TimeRange } from '@/lib/types';
import { formatRateVND } from '@/lib/rate-service';

interface SectionHistoricalChartProps {
  historicalByRange?: Record<TimeRange, RateDataPoint[]>;
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  isLoading: boolean;
  currentRate: number;
  baseCode?: string;
  quoteCode?: string;
  baseFlag?: string;
  quoteFlag?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly any[];
  label?: string | number;
  showSMA7?: boolean;
  showSMA30?: boolean;
  baseCode?: string;
  quoteCode?: string;
  [key: string]: any;
}

function formatChartValue(val: number, qCode: string): string {
  if (isNaN(val)) return '0.00';
  if (qCode === 'VND' || qCode === 'IDR') {
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }
  if (qCode === 'KRW' || qCode === 'JPY') {
    return val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  }
  if (val >= 100) {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (val < 0.01) {
    return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }
  return val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function ChartTooltipContent({ active, payload, showSMA7, showSMA30, baseCode = 'MYR', quoteCode = 'VND' }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const point = payload[0].payload as RateDataPoint;
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs backdrop-blur-md space-y-1 z-50">
        <div className="text-slate-400 font-mono text-[11px] flex items-center justify-between gap-3">
          <span>{point.date}</span>
          {point.eventNote && (
            <span className="text-amber-400 font-sans font-semibold text-[10px]">
              ★ Milestone
            </span>
          )}
        </div>

        <div className="font-mono text-base font-bold text-emerald-400 flex items-center gap-1.5">
          <span>{formatChartValue(point.rate, quoteCode)} {quoteCode}</span>
          <span className="text-[10px] text-slate-400 font-normal">/ {baseCode === 'VND' ? '100,000' : '1'} {baseCode}</span>
        </div>

        {point.eventNote && (
          <div className="text-[11px] text-amber-200 border-t border-slate-800 pt-1 mt-1 max-w-[220px]">
            {point.eventNote}
          </div>
        )}

        {point.sma7 && showSMA7 && (
          <div className="text-[10px] text-amber-400 font-mono">
            7-Day SMA: {formatChartValue(point.sma7, quoteCode)} {quoteCode}
          </div>
        )}
        {point.sma30 && showSMA30 && (
          <div className="text-[10px] text-sky-400 font-mono">
            30-Day SMA: {formatChartValue(point.sma30, quoteCode)} {quoteCode}
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function SectionHistoricalChart({
  historicalByRange,
  selectedRange,
  onRangeChange,
  isLoading,
  currentRate,
  baseCode = 'MYR',
  quoteCode = 'VND',
  baseFlag = '🇲🇾',
  quoteFlag = '🇻🇳',
}: SectionHistoricalChartProps) {
  const [showSMA7, setShowSMA7] = useState<boolean>(true);
  const [showSMA30, setShowSMA30] = useState<boolean>(false);
  const [showHighLow, setShowHighLow] = useState<boolean>(true);

  // Active range data slice - scaled by 100,000 if baseCode is VND
  const data = useMemo(() => {
    if (!historicalByRange) return [];
    const raw = historicalByRange[selectedRange] || [];
    if (baseCode === 'VND') {
      return raw.map((pt) => ({
        ...pt,
        rate: pt.rate * 100000,
        sma7: pt.sma7 ? pt.sma7 * 100000 : undefined,
        sma30: pt.sma30 ? pt.sma30 * 100000 : undefined,
      }));
    }
    return raw;
  }, [historicalByRange, selectedRange, baseCode]);

  // Compute metrics for the active range
  const metrics = useMemo(() => {
    const effectiveCurrentRate = baseCode === 'VND' ? currentRate * 100000 : currentRate;
    if (!data || data.length === 0) {
      return {
        high: effectiveCurrentRate,
        low: effectiveCurrentRate,
        first: effectiveCurrentRate,
        last: effectiveCurrentRate,
        change: 0,
        changePct: 0,
        avg: effectiveCurrentRate,
      };
    }

    let high = -Infinity;
    let low = Infinity;
    let sum = 0;

    data.forEach((p) => {
      if (p.rate > high) high = p.rate;
      if (p.rate < low) low = p.rate;
      sum += p.rate;
    });

    const first = data[0].rate;
    const last = data[data.length - 1].rate;
    const change = last - first;
    const changePct = first > 0 ? (change / first) * 100 : 0;
    const avg = sum / data.length;

    return {
      high,
      low,
      first,
      last,
      change,
      changePct,
      avg,
    };
  }, [data, currentRate, baseCode]);

  // Find exact highest and lowest points in the timeseries
  const { highestPoint, lowestPoint } = useMemo(() => {
    if (!data || data.length === 0) {
      return { highestPoint: null, lowestPoint: null };
    }
    let maxP = data[0];
    let minP = data[0];
    for (const p of data) {
      if (p.rate > maxP.rate) maxP = p;
      if (p.rate < minP.rate) minP = p;
    }
    return { highestPoint: maxP, lowestPoint: minP };
  }, [data]);

  const isRangePositive = metrics.changePct >= 0;

  // CSV Export handler
  const handleExportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = `Date,Rate_${quoteCode}_per_${baseCode},Inverse_${baseCode}_per_${quoteCode}\n`;
    const rows = data.map((d) => `${d.date},${d.rate},${d.inverseRate}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${baseCode}_${quoteCode}_${selectedRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ranges: { id: TimeRange; label: string; fullTitle: string; desc: string }[] = [
    { id: '1D', label: '1D', fullTitle: '1D (24-hour intraday hourly points)', desc: '24-hour intraday hourly points' },
    { id: '1W', label: '1W', fullTitle: '1W (Past 7 Days)', desc: 'Past 7 Days' },
    { id: '1M', label: '1M', fullTitle: '1M (Past 30 Days)', desc: 'Past 30 Days' },
    { id: '1Y', label: '1Y', fullTitle: '1Y (1 Year Daily)', desc: '1 Year Daily' },
    { id: '5Y', label: '5Y', fullTitle: '5Y (5 Years Macro)', desc: '5 Years Macro' },
    { id: '10Y', label: '10Y', fullTitle: '10Y (10 Years Cycle)', desc: '10 Years Cycle' },
    { id: 'MAX', label: '2001 - Now', fullTitle: '2001 - Now (MAX) spanning over 25 years of macroeconomic cycles', desc: 'Spanning over 25 years of macroeconomic cycles' },
  ];

  // Y-axis bounds with padding
  const yMin = metrics.low >= 10 ? Math.floor(metrics.low * 0.985) : metrics.low * 0.985;
  const yMax = metrics.high >= 10 ? Math.ceil(metrics.high * 1.015) : metrics.high * 1.015;

  return (
    <div
      className="w-full flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-5"
    >
      {/* Section Header & Styled Line */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs ring-4 ring-emerald-500/10 flex-shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-heading">
                  Multi-Horizon Historical Chart ({baseFlag} {baseCode} ➔ {quoteFlag} {quoteCode})
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase tracking-wider font-heading">
                  Macro Trends
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
                Tracking historical currency parity between {baseCode} and {quoteCode} across 1D, 1W, 1M, 1Y, 5Y, 10Y, and 2001-Present.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono hidden md:inline bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/80">
            Real Interbank Series
          </span>
        </div>
        {/* Soft Rounded Filson-matching Divider Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-emerald-200/70 to-slate-200/40 rounded-full" />
      </div>

      {/* Main Chart Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex-1 flex flex-col justify-between space-y-4">
        {/* 1-Line Metric Summary Header & Range + View Controls Toolbar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 overflow-x-auto no-scrollbar">
          {/* Rate & % Change Badge */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900">
              {baseCode === 'VND' ? (
                <>100,000 {baseCode} = {formatChartValue(metrics.last, quoteCode)} {quoteCode}</>
              ) : (
                <>1 {baseCode} = {formatChartValue(metrics.last, quoteCode)} {quoteCode}</>
              )}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap ${
                isRangePositive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {isRangePositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isRangePositive ? '+' : ''}{metrics.changePct.toFixed(2)}%</span>
              <span className="text-[10px] font-normal hidden xl:inline">
                ({isRangePositive ? '+' : ''}{formatChartValue(metrics.change, quoteCode)} {quoteCode} in {selectedRange})
              </span>
            </span>
          </div>

          {/* 1-Line Controls Toolbar: Range Horizons + SMA Toggles + High/Low + CSV */}
          <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
            {/* Horizon Selectors */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-xs">
              {ranges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onRangeChange(r.id)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer whitespace-nowrap ${
                    selectedRange === r.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                  title={r.fullTitle}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* SMA Toggles */}
            {selectedRange !== '1D' && (
              <>
                <button
                  onClick={() => setShowSMA7(!showSMA7)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                    showSMA7
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle 7-period Simple Moving Average"
                >
                  SMA 7
                </button>
                <button
                  onClick={() => setShowSMA30(!showSMA30)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                    showSMA30
                      ? 'bg-sky-50 text-sky-800 border-sky-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle 30-period Simple Moving Average"
                >
                  SMA 30
                </button>
              </>
            )}

            {/* High/Low Reference Line Toggle */}
            <button
              onClick={() => setShowHighLow(!showHighLow)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                showHighLow
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
              title="Toggle High/Low Lines"
            >
              High/Low
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition cursor-pointer text-[11px] whitespace-nowrap"
              title="Download CSV historical dataset"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="w-full h-[320px] sm:h-[360px] relative">
          {isLoading ? (
            <div className="w-full h-full flex flex-col justify-between p-4 bg-slate-50/60 rounded-xl border border-slate-100 animate-pulse">
              {/* Top skeleton metrics bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-28 bg-slate-200 rounded-md" />
                  <div className="h-4 w-16 bg-slate-200 rounded-md" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  Crawling real-time market data...
                </div>
              </div>

              {/* Chart Grid Lines & Wave Skeleton */}
              <div className="w-full h-44 flex items-end justify-between gap-2 px-3 pb-2 pt-6">
                <div className="w-full h-12 bg-slate-200/70 rounded-t-lg" />
                <div className="w-full h-20 bg-slate-200/80 rounded-t-lg" />
                <div className="w-full h-32 bg-slate-200/90 rounded-t-lg" />
                <div className="w-full h-24 bg-slate-200/70 rounded-t-lg" />
                <div className="w-full h-40 bg-indigo-200/60 rounded-t-lg" />
                <div className="w-full h-28 bg-slate-200/80 rounded-t-lg" />
                <div className="w-full h-36 bg-slate-200/90 rounded-t-lg" />
                <div className="w-full h-20 bg-slate-200/70 rounded-t-lg" />
                <div className="w-full h-32 bg-slate-200/80 rounded-t-lg" />
                <div className="w-full h-28 bg-slate-200/90 rounded-t-lg" />
                <div className="w-full h-38 bg-indigo-200/60 rounded-t-lg" />
                <div className="w-full h-30 bg-slate-200/80 rounded-t-lg" />
              </div>

              {/* Bottom X-Axis tick placeholders */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                <div className="h-3 w-12 bg-slate-200 rounded" />
                <div className="h-3 w-12 bg-slate-200 rounded" />
                <div className="h-3 w-12 bg-slate-200 rounded" />
                <div className="h-3 w-12 bg-slate-200 rounded" />
                <div className="h-3 w-12 bg-slate-200 rounded" />
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 32, right: 24, left: 10, bottom: 8 }}>
                <defs>
                  <linearGradient id="colorMYR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                  minTickGap={selectedRange === '1W' ? 8 : 35}
                  tickFormatter={(val: string) => {
                    if (selectedRange === '1W' && val.includes('-')) {
                      try {
                        const d = new Date(val + 'T00:00:00');
                        return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
                      } catch {
                        return val;
                      }
                    }
                    if ((selectedRange === 'MAX' || selectedRange === '10Y' || selectedRange === '5Y') && val.includes('-')) {
                      const parts = val.split('-');
                      if (parts.length >= 2) {
                        return parts[0]; // Display year cleanly
                      }
                    }
                    return val;
                  }}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                  orientation="right"
                  tickFormatter={(v) => formatChartValue(v, quoteCode)}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltipContent {...props} showSMA7={showSMA7} showSMA30={showSMA30} baseCode={baseCode} quoteCode={quoteCode} />
                  )}
                />

                <Area
                  type="linear"
                  dataKey="rate"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMYR)"
                />
                {showSMA7 && (
                  <Line type="linear" dataKey="sma7" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                )}
                {showSMA30 && (
                  <Line type="linear" dataKey="sma30" stroke="#0284c7" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                )}

                {/* High/Low Horizontal Reference Lines without text labels (clean dashed guide lines) */}
                {showHighLow && (
                  <>
                    <ReferenceLine
                      y={metrics.high}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <ReferenceLine
                      y={metrics.low}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  </>
                )}

                {/* Dedicated Highest (Peak) Point Dot & Badge (Always on Front) */}
                {highestPoint && (
                  <ReferenceDot
                    x={highestPoint.date}
                    y={highestPoint.rate}
                    r={7}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={3}
                    label={{
                      value: `▲ Peak: ${formatChartValue(highestPoint.rate, quoteCode)} ${quoteCode}`,
                      fill: '#065f46',
                      fontSize: 11,
                      fontWeight: 700,
                      position: 'top',
                    }}
                  />
                )}

                {/* Dedicated Lowest (Bottom) Point Dot & Badge (Always on Front) */}
                {lowestPoint && (
                  <ReferenceDot
                    x={lowestPoint.date}
                    y={lowestPoint.rate}
                    r={7}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={3}
                    label={{
                      value: `▼ Bottom: ${formatChartValue(lowestPoint.rate, quoteCode)} ${quoteCode}`,
                      fill: '#991c1c',
                      fontSize: 11,
                      fontWeight: 700,
                      position: 'bottom',
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Range High / Low / Average Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Period High</span>
            <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">
              {formatChartValue(metrics.high, quoteCode)} {quoteCode}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Period Low</span>
            <span className="font-mono font-bold text-rose-700 text-sm mt-0.5 block">
              {formatChartValue(metrics.low, quoteCode)} {quoteCode}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Period Average</span>
            <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
              {formatChartValue(metrics.avg, quoteCode)} {quoteCode}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Period Spread</span>
            <span className="font-mono font-bold text-indigo-700 text-sm mt-0.5 block">
              {formatChartValue(metrics.high - metrics.low, quoteCode)} {quoteCode}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
