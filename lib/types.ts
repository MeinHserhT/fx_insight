export type TimeRange = '1D' | '1W' | '1M' | '1Y' | '5Y' | '10Y' | 'MAX';

export type ChartType = 'area' | 'line';

export interface RateDataPoint {
  date: string; // YYYY-MM-DD or HH:mm for 1D
  timestamp: number;
  rate: number; // 1 MYR in VND (e.g. 5642.85)
  inverseRate: number; // 1 VND in MYR (e.g. 0.0001772)
  change24h?: number;
  change24hPct?: number;
  sma7?: number;
  sma30?: number;
  eventNote?: string; // e.g. "Asian Financial Post-Recovery", "2008 GFC", "VND Devaluation Peak"
}

export interface PeriodStats {
  currentRate: number;
  inverseRate: number;
  change24h: number;
  change24hPct: number;
  high: number;
  highDate: string;
  low: number;
  lowDate: string;
  average: number;
  totalChange: number;
  totalChangePct: number;
  week52High: number;
  week52HighDate: string;
  week52Low: number;
  week52LowDate: string;
  volatility: number; // standard deviation / mean %
  rangePositionPct: number; // 0 - 100% within 52w range
}

export interface MarketProvider {
  id: string;
  name: string;
  category: 'Fintech App' | 'Cash Pickup / Remittance' | 'Commercial Bank' | 'Money Changer' | 'Mobile eWallet' | 'Global Remittance';
  type: 'app' | 'cash' | 'bank' | 'booth' | 'wallet';
  logoText: string;
  badgeColor: string;
  effectiveRate: number; // MYR to VND offered
  fixedFeeMYR: number; // Fixed fee in MYR
  variableFeePct: number; // Transfer fee %
  spreadMarginPct?: number; // FX spread margin %
  transferSpeed: string;
  receiveMethods: string[];
  payMethods: string[];
  reliabilityScore: number; // e.g. 4.9 / 5.0
  featuredTag?: string; // e.g. "Best Net Payout", "Fastest Instant", "Zero Wire Fee"
  note: string;
}

export interface PopularCurrency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rateToUSD: number; // USD per 1 unit of this currency
  rateToMYR: number; // 1 unit in MYR
  rateToVND: number; // 1 unit in VND
  change24hPct: number;
  category: 'Major' | 'Regional ASEAN' | 'East Asia';
}

export interface HistoricalMilestone {
  year: string;
  title: string;
  rate: number;
  description: string;
  impact: string;
}

export interface RatesApiResponse {
  success: boolean;
  base: 'MYR';
  target: 'VND';
  currentRate: number;
  inverseRate: number;
  lastUpdated: string;
  source: string;
  change24h: number;
  change24hPct: number;
  historicalByRange: Record<TimeRange, RateDataPoint[]>;
  historical: RateDataPoint[];
  providers: MarketProvider[];
  popularCurrencies: PopularCurrency[];
  milestones: HistoricalMilestone[];
}
