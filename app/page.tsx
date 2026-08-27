'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RatesApiResponse, TimeRange } from '@/lib/types';
import { Header } from '@/components/Header';
import { SectionSpotConverter } from '@/components/SectionSpotConverter';
import { SectionHistoricalChart } from '@/components/SectionHistoricalChart';
import { SectionMarketProviders } from '@/components/SectionMarketProviders';
import { SectionCurrencyMatrix } from '@/components/SectionCurrencyMatrix';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  RefreshCw,
  AlertCircle,
  TrendingUp,
  ArrowRightLeft,
  ChevronDown,
  Layers,
  Globe2,
} from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<RatesApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('MAX');
  const [activeSection, setActiveSection] = useState<string>('section-1');

  // Multi-Currency Selection States (Sync across whole dashboard)
  const [selectedFromCurrency, setSelectedFromCurrency] = useState<string>('MYR');
  const [selectedToCurrency, setSelectedToCurrency] = useState<string>('VND');

  // Handle currency pair change and update API data query
  const handleCurrencyChange = useCallback((from: string, to: string) => {
    setSelectedFromCurrency(from);
    setSelectedToCurrency(to);
  }, []);

  // Fetch exchange rates from backend API with currency pair params
  const fetchRates = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      try {
        const res = await fetch(
          `/api/rates?base=${encodeURIComponent(selectedFromCurrency)}&quote=${encodeURIComponent(selectedToCurrency)}&range=${selectedRange}`,
          {
            cache: 'no-store',
          }
        );
        if (!res.ok) {
          throw new Error(`API returned status ${res.status}`);
        }
        const json: RatesApiResponse = await res.json();
        setData(json);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch rates:', err);
        setError(err.message || 'Unable to fetch exchange rates');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedFromCurrency, selectedToCurrency, selectedRange]
  );

  // Initial load & when currency pair / range changes
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/rates?base=${encodeURIComponent(selectedFromCurrency)}&quote=${encodeURIComponent(selectedToCurrency)}&range=${selectedRange}`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`API returned status ${res.status}`);
        const json: RatesApiResponse = await res.json();
        if (!ignore) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(err.message || 'Unable to fetch exchange rates');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [selectedFromCurrency, selectedToCurrency, selectedRange]);

  // Auto-refresh rate feed every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRates(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  // IntersectionObserver to sync active nav pill when scrolling
  useEffect(() => {
    const sectionIds = ['section-1', 'section-2', 'section-3', 'section-4'];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [data]);

  const handleNavigateSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Flag helpers
  const getFlag = (code: string) => {
    switch (code) {
      case 'MYR':
        return '🇲🇾';
      case 'VND':
        return '🇻🇳';
      case 'USD':
        return '🇺🇸';
      case 'SGD':
        return '🇸🇬';
      case 'EUR':
        return '🇪🇺';
      case 'JPY':
        return '🇯🇵';
      case 'CNY':
        return '🇨🇳';
      case 'GBP':
        return '🇬🇧';
      case 'AUD':
        return '🇦🇺';
      case 'THB':
        return '🇹🇭';
      case 'KRW':
        return '🇰🇷';
      case 'IDR':
        return '🇮🇩';
      case 'HKD':
        return '🇭🇰';
      case 'TWD':
        return '🇹🇼';
      case 'CAD':
        return '🇨🇦';
      case 'CHF':
        return '🇨🇭';
      case 'PHP':
        return '🇵🇭';
      case 'NZD':
        return '🇳🇿';
      case 'INR':
        return '🇮🇳';
      case 'AED':
        return '🇦🇪';
      case 'SAR':
        return '🇸🇦';
      default:
        return '🌐';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Sticky Header with Section Nav Pills & Refresh */}
      <Header
        lastUpdated={data?.lastUpdated || null}
        isLoading={isRefreshing || isLoading}
        onRefresh={() => fetchRates(true)}
        source={data?.source || 'Interbank Live'}
        activeSection={activeSection}
        onNavigateSection={handleNavigateSection}
        baseCode={selectedFromCurrency}
        quoteCode={selectedToCurrency}
        baseFlag={getFlag(selectedFromCurrency)}
        quoteFlag={getFlag(selectedToCurrency)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isLoading && !data ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <SkeletonLoader />
          </div>
        ) : error && !data ? (
          <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Connection Interrupted</h2>
            <p className="text-slate-600 text-sm">{error}</p>
            <button
              onClick={() => fetchRates(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Try Again
            </button>
          </div>
        ) : data ? (
          <div className="w-full">
            {/* SECTION 1: Spot Benchmark & Converter */}
            <section
              id="section-1"
              className="w-full border-b border-slate-200/60 bg-white/50 backdrop-blur-xs scroll-mt-[50px]"
            >
              <SectionSpotConverter
                currentRate={data.currentRate}
                inverseRate={data.inverseRate}
                stats={data.stats}
                change24h={data.change24h}
                change24hPct={data.change24hPct}
                source={data.source}
                lastUpdated={data.lastUpdated}
                popularCurrencies={data.popularCurrencies}
                fromCode={selectedFromCurrency}
                toCode={selectedToCurrency}
                onCurrencyChange={handleCurrencyChange}
              />
            </section>

            {/* SECTION 2: Multi-Horizon Historical Chart */}
            <section
              id="section-2"
              className="w-full border-b border-slate-200/60 bg-slate-50/70 scroll-mt-[50px]"
            >
              <SectionHistoricalChart
                historicalByRange={data.historicalByRange}
                selectedRange={selectedRange}
                onRangeChange={(r) => setSelectedRange(r)}
                isLoading={isRefreshing}
                currentRate={data.currentRate}
                baseCode={selectedFromCurrency}
                quoteCode={selectedToCurrency}
                baseFlag={getFlag(selectedFromCurrency)}
                quoteFlag={getFlag(selectedToCurrency)}
              />
            </section>

            {/* SECTION 3: Remittance & Market Exchange Providers Table */}
            <section
              id="section-3"
              className="w-full border-b border-slate-200/60 bg-white/50 backdrop-blur-xs scroll-mt-[50px]"
            >
              <SectionMarketProviders
                providers={data.providers}
                midMarketRate={data.currentRate}
                baseCode={selectedFromCurrency}
                quoteCode={selectedToCurrency}
                baseFlag={getFlag(selectedFromCurrency)}
                quoteFlag={getFlag(selectedToCurrency)}
                baseRateToMYR={
                  data.popularCurrencies?.find((c) => c.code === selectedFromCurrency)?.rateToMYR ||
                  (selectedFromCurrency === 'MYR' ? 1.0 : selectedFromCurrency === 'VND' ? 1 / data.currentRate : 1.0)
                }
              />
            </section>

            {/* SECTION 4: Global FX Cross-Rate Matrix & Travel Denominations */}
            <section
              id="section-4"
              className="w-full bg-slate-50/70 scroll-mt-[50px]"
            >
              <SectionCurrencyMatrix
                popularCurrencies={data.popularCurrencies}
                liveMYRtoVND={data.currentRate}
                baseCode={selectedFromCurrency}
                quoteCode={selectedToCurrency}
                baseFlag={getFlag(selectedFromCurrency)}
                quoteFlag={getFlag(selectedToCurrency)}
                onCurrencyChange={handleCurrencyChange}
              />
            </section>
          </div>
        ) : null}
      </main>

      {/* Global Clean Sticky Footer Bar */}
      <footer className="w-full bg-white border-t border-slate-200 py-3 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ForexSync</span>
            <span>•</span>
            <span>Real-time Interbank & Remittance Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>Pairs: MYR, VND, USD, EUR, SGD, JPY, CNY, GBP + 15 others</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
