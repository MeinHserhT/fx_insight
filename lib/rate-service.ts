import { MarketProvider, PeriodStats, RateDataPoint, TimeRange } from './types';

/**
 * Formats a number with appropriate decimal places for VND (Dong)
 */
export function formatVND(value: number, includeSymbol = true, decimals = 0): string {
  if (isNaN(value)) return '0 ₫';
  const formatted = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.round(value));
  return includeSymbol ? `${formatted} ₫` : formatted;
}

/**
 * Formats exchange rate (MYR to VND) with high precision (e.g. 5,642.85)
 */
export function formatRateVND(value: number, decimals = 2): string {
  if (isNaN(value)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a number for MYR (Ringgit) (e.g. RM 1,250.00)
 */
export function formatMYR(value: number, includeSymbol = true, decimals = 2): string {
  if (isNaN(value)) return 'RM 0.00';
  const formatted = new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return includeSymbol ? `RM ${formatted}` : formatted;
}

/**
 * Formats inverse rate (1 VND to MYR, e.g. 0.0001772)
 */
export function formatInverseRate(value: number): string {
  if (isNaN(value) || value === 0) return '0.0000000';
  return value.toFixed(7);
}

/**
 * Formats other foreign currency values
 */
export function formatForeignRate(value: number, decimals = 4): string {
  if (isNaN(value)) return '0.0000';
  if (value >= 100) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(3);
  return value.toFixed(decimals);
}

/**
 * Computes moving averages (SMA7 and SMA30) for chart points
 */
export function enrichWithMovingAverages(data: RateDataPoint[]): RateDataPoint[] {
  return data.map((point, index) => {
    let sma7: number | undefined = undefined;
    if (index >= 6) {
      const slice7 = data.slice(index - 6, index + 1);
      const sum7 = slice7.reduce((acc, curr) => acc + curr.rate, 0);
      sma7 = parseFloat((sum7 / 7).toFixed(2));
    }

    let sma30: number | undefined = undefined;
    if (index >= 29) {
      const slice30 = data.slice(index - 29, index + 1);
      const sum30 = slice30.reduce((acc, curr) => acc + curr.rate, 0);
      sma30 = parseFloat((sum30 / 30).toFixed(2));
    }

    return {
      ...point,
      sma7,
      sma30,
    };
  });
}

/**
 * Computes summary statistics for a given filtered slice of historical data
 */
export function computePeriodStats(
  filteredData: RateDataPoint[],
  fullData: RateDataPoint[]
): PeriodStats {
  const current = filteredData[filteredData.length - 1] || fullData[fullData.length - 1];
  const first = filteredData[0] || current;

  const currentRate = current ? current.rate : 5642.85;
  const inverseRate = current ? current.inverseRate : 1 / currentRate;
  const change24h = current?.change24h || 0;
  const change24hPct = current?.change24hPct || 0;

  // Selected period High/Low
  let high = -Infinity;
  let highDate = '';
  let low = Infinity;
  let lowDate = '';
  let sum = 0;

  filteredData.forEach((d) => {
    if (d.rate > high) {
      high = d.rate;
      highDate = d.date;
    }
    if (d.rate < low) {
      low = d.rate;
      lowDate = d.date;
    }
    sum += d.rate;
  });

  if (filteredData.length === 0) {
    high = currentRate;
    low = currentRate;
    sum = currentRate;
  }

  const average = sum / (filteredData.length || 1);
  const totalChange = currentRate - (first ? first.rate : currentRate);
  const totalChangePct = first && first.rate ? (totalChange / first.rate) * 100 : 0;

  // 52-Week High and Low (last 365 days of fullData)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const pastYearData = fullData.filter(
    (d) => new Date(d.date).getTime() >= oneYearAgo.getTime()
  );

  let week52High = -Infinity;
  let week52HighDate = '';
  let week52Low = Infinity;
  let week52LowDate = '';

  const pool52 = pastYearData.length > 0 ? pastYearData : fullData;
  pool52.forEach((d) => {
    if (d.rate > week52High) {
      week52High = d.rate;
      week52HighDate = d.date;
    }
    if (d.rate < week52Low) {
      week52Low = d.rate;
      week52LowDate = d.date;
    }
  });

  if (week52High === -Infinity) week52High = high;
  if (week52Low === Infinity) week52Low = low;

  // Volatility (Standard Deviation / Mean in %)
  const variance =
    filteredData.reduce((acc, curr) => acc + Math.pow(curr.rate - average, 2), 0) /
    (filteredData.length || 1);
  const stdDev = Math.sqrt(variance);
  const volatility = average > 0 ? (stdDev / average) * 100 : 0;

  // Current position within 52w range (0% at low, 100% at high)
  const rangeSpan = week52High - week52Low;
  const rangePositionPct =
    rangeSpan > 0 ? Math.min(100, Math.max(0, ((currentRate - week52Low) / rangeSpan) * 100)) : 50;

  return {
    currentRate,
    inverseRate,
    change24h,
    change24hPct,
    high,
    highDate,
    low,
    lowDate,
    average,
    totalChange,
    totalChangePct,
    week52High,
    week52HighDate,
    week52Low,
    week52LowDate,
    volatility,
    rangePositionPct,
  };
}

/**
 * Calculates net recipient payout in any target currency after provider fees and FX margin
 */
export function calculateUniversalProviderPayout(
  sendAmount: number,
  provider: MarketProvider,
  crossRate: number,
  baseRateToMYR = 1.0
) {
  // Transfer fee in base currency
  const feeInBase = provider.fixedFeeMYR * (1 / (baseRateToMYR || 1));
  const percentageFee = sendAmount * (provider.variableFeePct / 100);
  const totalFee = feeInBase + percentageFee;

  // Provider effective rate relative to current cross rate
  // Preserve provider's real spread margin (e.g. Wise ~0.4%, Xe ~0.9%, Banks ~1.8%)
  const spreadMarginPct = provider.spreadMarginPct || 0.6;
  const effectiveProviderRate = crossRate * (1 - spreadMarginPct / 100);

  // Amount converted after upfront fee
  const netConverted = Math.max(0, sendAmount - totalFee);
  const payout = netConverted * effectiveProviderRate;

  // Benchmark perfect mid-market payout
  const benchmarkPayout = sendAmount * crossRate;
  const diff = payout - benchmarkPayout;
  const totalCostBase = (benchmarkPayout - payout) / (crossRate || 1);

  return {
    sendAmount,
    totalFee,
    netConverted,
    effectiveProviderRate,
    payout,
    benchmarkPayout,
    diff,
    spreadMarginPct: Math.max(0, spreadMarginPct),
    totalCostBase: Math.max(0, totalCostBase),
  };
}

/**
 * Calculates net recipient VND payout after provider fees and FX margin (legacy MYR->VND wrapper)
 */
export function calculateProviderPayout(
  sendAmountMYR: number,
  provider: MarketProvider,
  midMarketRate: number
) {
  const res = calculateUniversalProviderPayout(sendAmountMYR, provider, midMarketRate, 1.0);
  return {
    sendAmountMYR,
    totalFeeMYR: res.totalFee,
    netConvertedMYR: res.netConverted,
    payoutVND: Math.round(res.payout),
    benchmarkPayoutVND: Math.round(res.benchmarkPayout),
    diffVND: Math.round(res.diff),
    spreadMarginPct: res.spreadMarginPct,
    totalCostMYR: res.totalCostBase,
  };
}

/**
 * Transforms historical range series for any base/quote currency pair
 */
export function transformHistoricalForPair(
  rawRangeData: Record<TimeRange, RateDataPoint[]> | undefined,
  baseUSD: number,
  quoteUSD: number,
  liveCrossRate: number,
  isDefaultMYRVND: boolean = false
): Record<TimeRange, RateDataPoint[]> {
  const result: Record<TimeRange, RateDataPoint[]> = {
    '1D': [],
    '1W': [],
    '1M': [],
    '1Y': [],
    '5Y': [],
    '10Y': [],
    'MAX': [],
  };

  if (!rawRangeData) return result;

  const ranges: TimeRange[] = ['1D', '1W', '1M', '1Y', '5Y', '10Y', 'MAX'];

  // If default MYR -> VND is requested, do not scale; use raw historical data points directly
  if (isDefaultMYRVND) {
    ranges.forEach((rng) => {
      const rawPoints = rawRangeData[rng] || [];
      result[rng] = enrichWithMovingAverages(rawPoints);
    });
    return result;
  }

  // Determine latest raw endpoint rate from 1Y or MAX data
  const raw1Y = rawRangeData['1Y'] || [];
  const latestRawPoint = raw1Y.length > 0 ? raw1Y[raw1Y.length - 1].rate : (rawRangeData['MAX']?.[rawRangeData['MAX'].length - 1]?.rate || 6436.9);
  const scalingFactor = latestRawPoint > 0 ? liveCrossRate / latestRawPoint : 1;

  ranges.forEach((rng) => {
    const rawPoints = rawRangeData[rng] || [];
    const transformed = rawPoints.map((pt) => {
      const decimals = liveCrossRate > 100 ? 2 : liveCrossRate > 1 ? 4 : 7;
      const scaledRate = parseFloat((pt.rate * scalingFactor).toFixed(decimals));
      const scaledInverse = scaledRate > 0 ? 1 / scaledRate : 0;
      return {
        ...pt,
        rate: scaledRate,
        inverseRate: scaledInverse,
      };
    });

    result[rng] = enrichWithMovingAverages(transformed);
  });

  return result;
}
