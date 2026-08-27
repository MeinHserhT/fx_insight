'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from '@/components/Header';
import { SectionSpotConverter } from '@/components/SectionSpotConverter';
import { SectionHistoricalChart } from '@/components/SectionHistoricalChart';
import { SectionMarketProviders } from '@/components/SectionMarketProviders';
import { SectionCurrencyMatrix } from '@/components/SectionCurrencyMatrix';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { RatesApiResponse, TimeRange, PopularCurrency } from '@/lib/types';
import { computePeriodStats, transformHistoricalForPair } from '@/lib/rate-service';
import { getDefaultRatesApiResponse } from '@/lib/default-rates';
import { AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

const SECTIONS = ['section-1', 'section-2', 'section-3', 'section-4'] as const;

const SECTION_METADATA = [
  { id: 'section-1', number: 1, title: 'Spot & Converter', label: '1. Spot & Converter' },
  { id: 'section-2', number: 2, title: 'Historical Chart', label: '2. 2001-2026 Chart' },
  { id: 'section-3', number: 3, title: 'Remittance Apps', label: '3. Market Apps' },
  { id: 'section-4', number: 4, title: 'Currency Matrix', label: '4. Forex Matrix' },
];

export default function Home() {
  const [data, setData] = useState<RatesApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1Y');
  const [activeSection, setActiveSection] = useState<string>('section-1');

  // Global currency pair state (defaults to MYR -> VND on first open)
  const [fromCode, setFromCode] = useState<string>('MYR');
  const [toCode, setToCode] = useState<string>('VND');
  const [isChartLoading, setIsChartLoading] = useState<boolean>(false);

  const anchorSectionRef = useRef<string>('section-1');
  const isSnappingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef<number>(0);
  const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number>(0);
  const touchDeltaRef = useRef<number>(0);

  // Helper to fetch live rate client-side on static hosting environments (like GitHub Pages)
  const fetchLiveFallbackClient = async (): Promise<RatesApiResponse | null> => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/MYR', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json = await res.json();
        if (json && json.rates && json.rates.VND) {
          const liveVND = parseFloat(json.rates.VND.toFixed(2));
          const defaultData = getDefaultRatesApiResponse();
          return {
            ...defaultData,
            currentRate: liveVND,
            inverseRate: parseFloat((1 / liveVND).toFixed(7)),
            lastUpdated: new Date().toISOString(),
            source: 'Live Interbank (open.er-api)',
          };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  };

  // Fetch exchange rate data from Next.js server route with static hosting fallback
  const fetchData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsLoading(true);
      setError(null);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const url = isManual ? `${basePath}/api/rates?refresh=true` : `${basePath}/api/rates`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: RatesApiResponse = await res.json();
      if (json && json.currentRate) {
        setData(json);
      } else {
        throw new Error('Invalid rate response');
      }
    } catch (err: any) {
      console.warn('Rates API fetch fallback (static GitHub Pages mode):', err);
      const liveClient = await fetchLiveFallbackClient();
      setData((prev) => liveClient || prev || getDefaultRatesApiResponse());
      if (isManual && !liveClient) {
        setError('Using latest offline benchmark rates.');
      }
    } finally {
      setIsLoading(false);
      setIsChartLoading(false);
    }
  }, []);

  // Handle horizon range change with realtime live crawl refresh
  const handleRangeChange = useCallback(async (range: TimeRange) => {
    setSelectedRange(range);
    setIsChartLoading(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${basePath}/api/rates?refresh=true`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json: RatesApiResponse = await res.json();
        if (json && json.currentRate) {
          setData(json);
        }
      }
    } catch (err) {
      console.warn('Live range update error:', err);
    } finally {
      setIsChartLoading(false);
    }
  }, []);

  // Initial load + periodic 60s background refresh
  useEffect(() => {
    let isSubscribed = true;

    async function loadInitial() {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${basePath}/api/rates`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: RatesApiResponse = await res.json();
        if (isSubscribed && json && json.currentRate) {
          setData(json);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.warn('Initial rates load fallback (GitHub Pages):', err);
        const liveClient = await fetchLiveFallbackClient();
        if (isSubscribed) {
          setData(liveClient || getDefaultRatesApiResponse());
          setIsLoading(false);
        }
      }
    }

    loadInitial();

    const interval = setInterval(() => {
      fetchData(false);
    }, 60000); // 60s auto refresh

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  // Calculate target scroll Y coordinate for any section with header top offset
  const getSectionTargetY = useCallback((id: string): number => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const headerOffset = 50;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.round(rect.top + window.scrollY - headerOffset));
  }, []);

  // Slower, graceful ease-in-out smooth scroll animation engine (~1050ms)
  const smoothScrollToTarget = useCallback((targetY: number, targetId?: string, duration = 1050) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startY = window.scrollY;
    const diff = targetY - startY;
    if (Math.abs(diff) < 2) {
      window.scrollTo(0, targetY);
      if (targetId) {
        setActiveSection(targetId);
        anchorSectionRef.current = targetId;
      }
      return;
    }

    isSnappingRef.current = true;
    const startTime = performance.now();

    // Smooth cubic ease-in-out curve for gentle, refined acceleration & deceleration
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY + diff * ease);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        window.scrollTo(0, targetY);
        if (targetId) {
          setActiveSection(targetId);
          anchorSectionRef.current = targetId;
        }
        // Small settle buffer to avoid momentum bounce
        setTimeout(() => {
          isSnappingRef.current = false;
        }, 150);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Smooth scroll directly to a specific section id aligning with the header top offset
  const scrollToSection = useCallback((id: string, duration = 1050) => {
    const targetY = getSectionTargetY(id);
    smoothScrollToTarget(targetY, id, duration);
  }, [getSectionTargetY, smoothScrollToTarget]);

  // Section-by-section wheel, touch and keyboard gesture snapping with peek support
  useEffect(() => {
    const WHEEL_THRESHOLD = 110; // Increased threshold for deliberate scroll
    const TOUCH_THRESHOLD = 80;  // Touch swipe threshold
    const MAX_PEEK_PX = 75;       // Maximum peek offset when below threshold

    const handleWheel = (e: WheelEvent) => {
      // Allow natural internal scrolling in interactive scrollable elements
      const target = e.target as HTMLElement;
      if (target && target.closest('.overflow-y-auto, .overflow-x-auto, textarea, input')) {
        const scrollable = target.closest('.overflow-y-auto') as HTMLElement;
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
          return;
        }
      }

      if (isSnappingRef.current) {
        e.preventDefault();
        return;
      }

      const currentIdx = SECTIONS.indexOf(anchorSectionRef.current as any);
      if (currentIdx === -1) return;

      const currentAnchorEl = document.getElementById(anchorSectionRef.current);
      const sectionTop = getSectionTargetY(anchorSectionRef.current);
      const sectionHeight = currentAnchorEl ? currentAnchorEl.offsetHeight : window.innerHeight;
      const headerOffset = 50;
      const viewHeight = window.innerHeight - headerOffset;
      const isLastSection = currentIdx === SECTIONS.length - 1;

      // For the last section, bottom boundary includes the footer at the bottom of document
      const maxDocScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const sectionBottomScrollY = isLastSection
        ? maxDocScrollY
        : Math.max(sectionTop, sectionTop + sectionHeight - viewHeight);

      const isScrollingDown = e.deltaY > 0;
      const isScrollingUp = e.deltaY < 0;

      const isAtSectionBottom = window.scrollY >= sectionBottomScrollY - 6;
      const isAtSectionTop = window.scrollY <= sectionTop + 6;

      // If user is inside the section (or scrolling down to the footer in the last section), allow natural scroll
      if (isScrollingDown && !isAtSectionBottom) {
        wheelDeltaRef.current = 0;
        return;
      }

      if (isScrollingUp && !isAtSectionTop) {
        wheelDeltaRef.current = 0;
        return;
      }

      // If at boundary (end of section scrolling down, or top of section scrolling up), handle threshold snap
      e.preventDefault();

      wheelDeltaRef.current += e.deltaY;

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);

      if (Math.abs(wheelDeltaRef.current) >= WHEEL_THRESHOLD) {
        // Threshold met: snap smoothly to the next or previous section
        if (isScrollingDown && currentIdx < SECTIONS.length - 1) {
          wheelDeltaRef.current = 0;
          scrollToSection(SECTIONS[currentIdx + 1], 1050);
        } else if (isScrollingUp && currentIdx > 0) {
          wheelDeltaRef.current = 0;
          scrollToSection(SECTIONS[currentIdx - 1], 1050);
        } else {
          // At outermost edge boundaries, smoothly return to anchor
          wheelDeltaRef.current = 0;
          const targetY = isScrollingDown ? sectionBottomScrollY : sectionTop;
          smoothScrollToTarget(targetY, anchorSectionRef.current, 450);
        }
      } else {
        // Threshold NOT met: only peek a small amount of the adjacent section
        const sign = Math.sign(wheelDeltaRef.current);
        const ratio = Math.min(Math.abs(wheelDeltaRef.current) / WHEEL_THRESHOLD, 1);
        const peekOffset = sign * ratio * MAX_PEEK_PX;
        const baseAnchorY = sign > 0 ? sectionBottomScrollY : sectionTop;

        // Prevent peeking beyond outermost page boundaries
        if ((currentIdx === 0 && sign < 0) || (isLastSection && sign > 0)) {
          window.scrollTo(0, Math.max(0, baseAnchorY + peekOffset * 0.3));
        } else {
          window.scrollTo(0, Math.max(0, baseAnchorY + peekOffset));
        }

        // When scrolling pauses without meeting threshold, smoothly spring back
        wheelTimerRef.current = setTimeout(() => {
          if (!isSnappingRef.current && Math.abs(wheelDeltaRef.current) > 0) {
            smoothScrollToTarget(baseAnchorY, anchorSectionRef.current, 500);
            wheelDeltaRef.current = 0;
          }
        }, 160);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = e.touches[0].clientY;
        touchDeltaRef.current = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isSnappingRef.current || e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartRef.current - currentY;
      touchDeltaRef.current = deltaY;

      const currentIdx = SECTIONS.indexOf(anchorSectionRef.current as any);
      if (currentIdx === -1) return;

      const currentAnchorEl = document.getElementById(anchorSectionRef.current);
      const sectionTop = getSectionTargetY(anchorSectionRef.current);
      const sectionHeight = currentAnchorEl ? currentAnchorEl.offsetHeight : window.innerHeight;
      const headerOffset = 50;
      const viewHeight = window.innerHeight - headerOffset;
      const isLastSection = currentIdx === SECTIONS.length - 1;

      const maxDocScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const sectionBottomScrollY = isLastSection
        ? maxDocScrollY
        : Math.max(sectionTop, sectionTop + sectionHeight - viewHeight);

      const isScrollingDown = deltaY > 0;
      const isScrollingUp = deltaY < 0;
      const isAtSectionBottom = window.scrollY >= sectionBottomScrollY - 6;
      const isAtSectionTop = window.scrollY <= sectionTop + 6;

      // Allow natural touch scroll inside section content & down to footer in last section
      if (isScrollingDown && !isAtSectionBottom) return;
      if (isScrollingUp && !isAtSectionTop) return;

      // Peek displacement when touching at section boundaries
      const sign = Math.sign(deltaY);
      const ratio = Math.min(Math.abs(deltaY) / TOUCH_THRESHOLD, 1);
      const peekOffset = sign * ratio * MAX_PEEK_PX;
      const baseAnchorY = sign > 0 ? sectionBottomScrollY : sectionTop;

      if ((currentIdx === 0 && sign < 0) || (isLastSection && sign > 0)) {
        window.scrollTo(0, Math.max(0, baseAnchorY + peekOffset * 0.3));
      } else {
        window.scrollTo(0, Math.max(0, baseAnchorY + peekOffset));
      }
    };

    const handleTouchEnd = () => {
      if (isSnappingRef.current) return;
      const deltaY = touchDeltaRef.current;
      const currentIdx = SECTIONS.indexOf(anchorSectionRef.current as any);
      if (currentIdx === -1) return;

      const currentAnchorEl = document.getElementById(anchorSectionRef.current);
      const sectionTop = getSectionTargetY(anchorSectionRef.current);
      const sectionHeight = currentAnchorEl ? currentAnchorEl.offsetHeight : window.innerHeight;
      const headerOffset = 50;
      const viewHeight = window.innerHeight - headerOffset;
      const isLastSection = currentIdx === SECTIONS.length - 1;

      const maxDocScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const sectionBottomScrollY = isLastSection
        ? maxDocScrollY
        : Math.max(sectionTop, sectionTop + sectionHeight - viewHeight);

      const isScrollingDown = deltaY > 0;
      const isScrollingUp = deltaY < 0;
      const isAtSectionBottom = window.scrollY >= sectionBottomScrollY - 8;
      const isAtSectionTop = window.scrollY <= sectionTop + 8;

      if (isScrollingDown && isAtSectionBottom && Math.abs(deltaY) >= TOUCH_THRESHOLD) {
        if (currentIdx < SECTIONS.length - 1) {
          scrollToSection(SECTIONS[currentIdx + 1], 1050);
        } else {
          smoothScrollToTarget(sectionBottomScrollY, anchorSectionRef.current, 450);
        }
      } else if (isScrollingUp && isAtSectionTop && Math.abs(deltaY) >= TOUCH_THRESHOLD) {
        if (currentIdx > 0) {
          scrollToSection(SECTIONS[currentIdx - 1], 1050);
        } else {
          smoothScrollToTarget(sectionTop, anchorSectionRef.current, 450);
        }
      } else if (Math.abs(deltaY) > 5) {
        const baseAnchorY = deltaY > 0 ? sectionBottomScrollY : sectionTop;
        smoothScrollToTarget(baseAnchorY, anchorSectionRef.current, 500);
      }
      touchDeltaRef.current = 0;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentIdx = SECTIONS.indexOf(anchorSectionRef.current as any);
      if (currentIdx === -1) return;

      if ((e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') && !e.shiftKey) {
        if (currentIdx < SECTIONS.length - 1) {
          e.preventDefault();
          scrollToSection(SECTIONS[currentIdx + 1], 1050);
        } else {
          // In last section, scroll down to reveal footer
          const maxDocScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          if (window.scrollY < maxDocScrollY - 4) {
            e.preventDefault();
            smoothScrollToTarget(maxDocScrollY, 'section-4', 700);
          }
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        if (currentIdx > 0) {
          e.preventDefault();
          scrollToSection(SECTIONS[currentIdx - 1], 1050);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToSection(SECTIONS[0], 1050);
      } else if (e.key === 'End') {
        e.preventDefault();
        const maxDocScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        smoothScrollToTarget(maxDocScrollY, SECTIONS[SECTIONS.length - 1], 1050);
      }
    };

    // Track active section during regular scrolling
    const handleScroll = () => {
      if (isSnappingRef.current) return;
      const scrollPos = window.scrollY + window.innerHeight / 3;
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop - 50;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            anchorSectionRef.current = id;
            break;
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [getSectionTargetY, scrollToSection, smoothScrollToTarget]);

  const liveRate = data?.currentRate || 6436.9;
  const inverseRate = data?.inverseRate || 0.0001553;

  // Complete available currency list for lookup
  const allCurrenciesWithLocal: PopularCurrency[] = useMemo(() => [
    {
      code: 'MYR',
      name: 'Malaysian Ringgit',
      symbol: 'RM',
      flag: '🇲🇾',
      rateToUSD: 1 / 4.425,
      rateToMYR: 1.0,
      rateToVND: liveRate,
      change24hPct: data?.change24hPct || 0.22,
      category: 'Major',
    },
    {
      code: 'VND',
      name: 'Vietnamese Dong',
      symbol: '₫',
      flag: '🇻🇳',
      rateToUSD: 1 / (4.425 * liveRate),
      rateToMYR: 1 / liveRate,
      rateToVND: 1.0,
      change24hPct: -(data?.change24hPct || 0.22),
      category: 'Major',
    },
    ...(data?.popularCurrencies || []),
  ], [data, liveRate]);

  const fromCurrency = useMemo(() => {
    return allCurrenciesWithLocal.find((c) => c.code === fromCode) || allCurrenciesWithLocal[0];
  }, [allCurrenciesWithLocal, fromCode]);

  const toCurrency = useMemo(() => {
    return allCurrenciesWithLocal.find((c) => c.code === toCode) || allCurrenciesWithLocal[1];
  }, [allCurrenciesWithLocal, toCode]);

  // Dynamic cross-currency spot rate
  const activeCrossRate = useMemo(() => {
    if (fromCode === 'MYR' && toCode === 'VND') return liveRate;
    if (fromCode === 'VND' && toCode === 'MYR') return inverseRate;
    const fromUSD = fromCurrency?.rateToUSD || (1 / 4.425);
    const toUSD = toCurrency?.rateToUSD || (1 / (4.425 * liveRate));
    return fromUSD / toUSD;
  }, [fromCode, toCode, liveRate, inverseRate, fromCurrency, toCurrency]);

  const activeInverseCrossRate = useMemo(() => {
    return activeCrossRate > 0 ? 1 / activeCrossRate : 0;
  }, [activeCrossRate]);

  // Transformed historical series calibrated dynamically for the selected pair
  const transformedHistoricalByRange = useMemo(() => {
    if (!data?.historicalByRange) return undefined;
    const fromUSD = fromCurrency?.rateToUSD || (1 / 4.425);
    const toUSD = toCurrency?.rateToUSD || (1 / (4.425 * liveRate));
    const isDefaultPair = fromCode === 'MYR' && toCode === 'VND';
    return transformHistoricalForPair(data.historicalByRange, fromUSD, toUSD, activeCrossRate, isDefaultPair);
  }, [data, fromCurrency, toCurrency, activeCrossRate, liveRate, fromCode, toCode]);

  // Compute period stats based on selected time range and active currency pair
  const currentStats = useMemo(() => {
    if (!transformedHistoricalByRange) {
      return {
        currentRate: activeCrossRate,
        inverseRate: activeInverseCrossRate,
        change24h: activeCrossRate * 0.0022,
        change24hPct: 0.22,
        high: activeCrossRate * 1.02,
        highDate: '2026-06-15',
        low: activeCrossRate * 0.96,
        lowDate: '2024-10-10',
        average: activeCrossRate * 0.99,
        totalChange: activeCrossRate * 0.03,
        totalChangePct: 3.3,
        week52High: activeCrossRate * 1.03,
        week52HighDate: '2026-06-15',
        week52Low: activeCrossRate * 0.95,
        week52LowDate: '2025-09-02',
        volatility: 2.1,
        rangePositionPct: 75,
      };
    }

    const series = transformedHistoricalByRange[selectedRange] || transformedHistoricalByRange['1Y'] || [];
    const allPoints = transformedHistoricalByRange['MAX'] || series;
    return computePeriodStats(series, allPoints);
  }, [transformedHistoricalByRange, selectedRange, activeCrossRate, activeInverseCrossRate]);

  const handleCurrencyChange = useCallback((from: string, to: string) => {
    setFromCode(from);
    setToCode(to);
  }, []);

  const activeIdx = SECTIONS.indexOf(activeSection as any);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white font-sans antialiased scroll-smooth">
      {/* Top Fixed Header with Navigation and Refresh */}
      <Header
        lastUpdated={data?.lastUpdated || null}
        isLoading={isLoading}
        onRefresh={() => fetchData(true)}
        source={data?.source || 'Interbank Mid-Market'}
        activeSection={activeSection}
        onNavigateSection={scrollToSection}
        baseCode={fromCode}
        quoteCode={toCode}
        baseFlag={fromCurrency.flag}
        quoteFlag={toCurrency.flag}
      />

      {/* Minimal Floating Section Scroll Indicator (Right Side) */}
      <aside
        aria-label="Section navigation"
        className="fixed right-3.5 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-2 bg-white/80 backdrop-blur-md py-2.5 px-2 rounded-full border border-slate-200/80 shadow-sm transition-all"
      >
        <button
          onClick={() => activeIdx > 0 && scrollToSection(SECTIONS[activeIdx - 1])}
          disabled={activeIdx <= 0}
          className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
          title="Previous section"
          aria-label="Previous section"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        <div className="flex flex-col items-center gap-2 py-0.5">
          {SECTION_METADATA.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="group relative flex items-center justify-center p-1 cursor-pointer"
                title={s.label}
                aria-label={`Scroll to ${s.label}`}
              >
                {/* Minimal dot / active bar indicator */}
                <div
                  className={`rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-2 h-5 bg-indigo-600 shadow-xs'
                      : 'w-2 h-2 bg-slate-300 group-hover:bg-slate-400 group-hover:scale-125'
                  }`}
                />

                {/* Minimal Tooltip */}
                <span className="absolute right-7 px-2.5 py-1 rounded-md bg-slate-900/90 text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-sm backdrop-blur-xs">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => activeIdx < SECTIONS.length - 1 && scrollToSection(SECTIONS[activeIdx + 1])}
          disabled={activeIdx >= SECTIONS.length - 1}
          className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
          title="Next section"
          aria-label="Next section"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </aside>

      {/* Error Alert if any */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-700 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchData(true)}
              className="px-3 py-1 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main 4-Section Stack with Smooth Scrolling */}
      <main className="flex-1 w-full flex flex-col">
        {isLoading && !data ? (
          <div className="max-w-7xl mx-auto px-4 py-8 w-full">
            <SkeletonLoader />
          </div>
        ) : (
          <>
            {/* SECTION 1: Spot Benchmark & Converter with Presets & Useful Info */}
            <section
              id="section-1"
              className="min-h-[calc(100vh-50px)] border-b border-slate-200 flex items-center bg-slate-50 relative scroll-mt-[50px] snap-section snap-start"
            >
              <SectionSpotConverter
                currentRate={liveRate}
                inverseRate={inverseRate}
                stats={currentStats}
                change24h={data?.change24h || 12.5}
                change24hPct={data?.change24hPct || 0.22}
                source={data?.source || 'Interbank Mid-Market'}
                lastUpdated={data?.lastUpdated || null}
                popularCurrencies={data?.popularCurrencies || []}
                fromCode={fromCode}
                toCode={toCode}
                onCurrencyChange={handleCurrencyChange}
              />
            </section>

            {/* SECTION 2: Historical Chart with 1D, 1W, 1M, 1Y, 5Y, 10Y, and 2001-now */}
            <section
              id="section-2"
              className="min-h-[calc(100vh-50px)] border-b border-slate-200 flex items-center bg-slate-100/50 relative scroll-mt-[50px] snap-section snap-start"
            >
              <SectionHistoricalChart
                historicalByRange={transformedHistoricalByRange}
                selectedRange={selectedRange}
                onRangeChange={handleRangeChange}
                isLoading={isChartLoading || (isLoading && !data)}
                currentRate={activeCrossRate}
                baseCode={fromCode}
                quoteCode={toCode}
                baseFlag={fromCurrency.flag}
                quoteFlag={toCurrency.flag}
              />
            </section>

            {/* SECTION 3: Realtime Exchange Rate of Popular Apps on the Market */}
            <section
              id="section-3"
              className="min-h-[calc(100vh-50px)] border-b border-slate-200 flex items-center bg-slate-50 relative scroll-mt-[50px] snap-section snap-start"
            >
              <SectionMarketProviders
                providers={data?.providers || []}
                midMarketRate={activeCrossRate}
                baseCode={fromCode}
                quoteCode={toCode}
                baseFlag={fromCurrency.flag}
                quoteFlag={toCurrency.flag}
                baseRateToMYR={fromCurrency.rateToMYR || 1.0}
              />
            </section>

            {/* SECTION 4: Matrix of Currency Exchange for Popular Currencies */}
            <section
              id="section-4"
              className="min-h-[90vh] md:h-[90vh] flex items-center bg-slate-100/50 relative scroll-mt-[50px] snap-section snap-start"
            >
              <SectionCurrencyMatrix
                popularCurrencies={data?.popularCurrencies || []}
                liveMYRtoVND={liveRate}
                baseCode={fromCode}
                quoteCode={toCode}
                baseFlag={fromCurrency.flag}
                quoteFlag={toCurrency.flag}
                onCurrencyChange={handleCurrencyChange}
              />
            </section>
          </>
        )}
      </main>

      {/* Global Bottom Sticky / Footer */}
      <footer id="app-footer" className="w-full border-t border-slate-200 bg-slate-50/95 text-slate-500 z-10 relative pt-7 pb-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Platform & Navigation Overview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                <span className="font-bold text-slate-900 text-sm tracking-tight">ForexSync: {fromCode}/{toCode} Global Benchmark</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                  v2.6 Enterprise
                </span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed max-w-xl">
                ForexSync is an independent high-precision currency benchmark and analytics terminal built for international trade, remittance intelligence, and historical FX modeling across Southeast Asia and global currency corridors.
              </p>
            </div>

            <div className="md:col-span-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-heading">
                Navigation Directory
              </span>
              <ul className="space-y-1 text-[11px]">
                <li>
                  <button
                    onClick={() => scrollToSection('section-1')}
                    className="hover:text-indigo-600 transition cursor-pointer text-slate-600 hover:underline"
                  >
                    Spot Exchange & Smart Remittance
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('section-2')}
                    className="hover:text-indigo-600 transition cursor-pointer text-slate-600 hover:underline"
                  >
                    25-Year Historical Analytics (2001-2026)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('section-3')}
                    className="hover:text-indigo-600 transition cursor-pointer text-slate-600 hover:underline"
                  >
                    Live Market Providers Benchmark
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('section-4')}
                    className="hover:text-indigo-600 transition cursor-pointer text-slate-600 hover:underline"
                  >
                    Global FX Cross Matrix & Multi-Currency
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-heading">
                Engineering & Operations
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Engineered with Next.js, Tailwind CSS, and Recharts architecture. Real-time rate telemetry refreshes every 60 seconds with sub-millisecond calculation pipelines.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

