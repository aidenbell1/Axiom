// src/types/market.ts

/**
 * Interface for market data quote
 */
export interface MarketQuote {
    symbol: string;
    price?: number;
    change?: number;
    change_percent?: number;
    volume?: number;
    market_cap?: number;
    high?: number;
    low?: number;
    open?: number;
    prev_close?: number;
    bid?: number;
    ask?: number;
    bid_size?: number;
    ask_size?: number;
    spread?: number;
    timestamp: string; // ISO date string
    error?: string;
  }
  
  /**
   * Interface for historical price data point
   */
  export interface PriceDataPoint {
    date: string; // ISO date string
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjusted_close?: number;
    returns?: number;
  }
  
  /**
   * Interface for historical data request
   */
  export interface HistoricalDataRequest {
    symbol: string;
    start_date?: string; // ISO date string
    end_date?: string; // ISO date string
    period?: string; // e.g., "1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max"
    interval?: string; // e.g., "1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"
  }
  
  /**
   * Interface for historical data response
   */
  export interface HistoricalDataResponse {
    symbol: string;
    data: PriceDataPoint[];
  }
  
  /**
   * Interface for market overview (indices)
   */
  export interface MarketOverview {
    'S&P 500'?: MarketQuote;
    'Nasdaq'?: MarketQuote;
    'Dow Jones'?: MarketQuote;
    'Russell 2000'?: MarketQuote;
    'VIX'?: MarketQuote;
    [key: string]: MarketQuote | undefined;
  }
  
  /**
   * Interface for asset information
   */
  export interface Asset {
    id: string;
    symbol: string;
    name: string;
    asset_class: AssetClass;
    exchange: string;
    status: 'active' | 'inactive';
    tradable: boolean;
    marginable: boolean;
    shortable: boolean;
    easy_to_borrow: boolean;
    fractionable: boolean;
  }
  
  /**
   * Asset class types
   */
  export type AssetClass = 'us_equity' | 'crypto' | 'forex' | 'option' | 'future';
  
  /**
   * Interface for market clock
   */
  export interface MarketClock {
    timestamp: string; // ISO date string
    is_open: boolean;
    next_open: string; // ISO date string
    next_close: string; // ISO date string
  }
  
  /**
   * Interface for trading day
   */
  export interface TradingDay {
    date: string; // ISO date string
    open: string; // ISO date string
    close: string; // ISO date string
    session_open: string; // ISO date string
    session_close: string; // ISO date string
  }
  
  /**
   * Interface for symbol search result
   */
  export interface SymbolSearchResult {
    symbol: string;
    name: string;
    exchange?: string;
    type?: string;
  }
  
  /**
   * Interface for technical indicator calculation request
   */
  export interface IndicatorRequest {
    symbol: string;
    indicator: IndicatorType;
    period?: number;
    fast_period?: number;
    slow_period?: number;
    signal_period?: number;
    standard_deviations?: number;
    start_date?: string; // ISO date string
    end_date?: string; // ISO date string
  }
  
  /**
   * Technical indicator types
   */
  export type IndicatorType = 
    | 'sma' 
    | 'ema' 
    | 'rsi' 
    | 'macd' 
    | 'bollinger_bands' 
    | 'atr'
    | 'stochastic'
    | 'adx'
    | 'obv';
  
  /**
   * Interface for indicator data response
   */
  export interface IndicatorResponse {
    symbol: string;
    indicator: IndicatorType;
    data: any[]; // Varies based on indicator type
  }