// src/types/backtest.ts

/**
 * Backtest interface representing a strategy backtest
 */
export interface Backtest {
    id: number;
    user_id: number;
    strategy_id: number;
    start_date: string; // ISO date string
    end_date: string; // ISO date string
    symbols: string[];
    initial_capital: number;
    status: BacktestStatus;
    error_message?: string;
    created_at: string; // ISO date string
    started_at?: string; // ISO date string
    completed_at?: string; // ISO date string
    annualized_return?: number;
    sharpe_ratio?: number;
    sortino_ratio?: number;
    max_drawdown?: number;
    win_rate?: number;
    total_trades?: number;
    profit_factor?: number;
    final_equity?: number;
    results?: BacktestResults;
    strategy?: any; // Strategy object, can be typed with Strategy from strategy.ts
  }
  
  /**
   * Possible statuses for a backtest
   */
  export type BacktestStatus = 'pending' | 'running' | 'completed' | 'failed';
  
  /**
   * Interface for backtest creation request
   */
  export interface BacktestCreateRequest {
    strategy_id: number;
    start_date: string; // ISO date string
    end_date: string; // ISO date string
    symbols: string[];
    initial_capital?: number;
  }
  
  /**
   * Interface for complete backtest results
   */
  export interface BacktestResults {
    equity_curve: EquityCurvePoint[];
    trades: BacktestTrade[];
    metrics: BacktestMetrics;
  }
  
  /**
   * Interface for a point in the equity curve
   */
  export interface EquityCurvePoint {
    timestamp: string; // ISO date string
    portfolio_value: number;
  }
  
  /**
   * Interface for a trade executed during backtest
   */
  export interface BacktestTrade {
    timestamp: string; // ISO date string
    symbol: string;
    type: 'buy' | 'sell' | 'short' | 'cover';
    price: number;
    quantity: number;
    commission?: number;
    slippage?: number;
    total?: number;
    profit?: number;
    profit_pct?: number;
    signal?: string;
  }
  
  /**
   * Interface for backtest performance metrics
   */
  export interface BacktestMetrics {
    annualized_return: number;
    sharpe_ratio: number;
    sortino_ratio?: number;
    max_drawdown: number;
    win_rate: number;
    total_trades: number;
    profit_factor?: number;
    average_trade?: number;
    average_win?: number;
    average_loss?: number;
    largest_win?: number;
    largest_loss?: number;
    total_fees?: number;
    recovery_factor?: number;
    expectancy?: number;
    final_portfolio_value: number;
    alpha?: number;
    beta?: number;
    volatility?: number;
  }
  
  /**
   * Interface for backtest comparison
   */
  export interface BacktestComparison {
    id: number;
    name: string;
    annualized_return: number;
    sharpe_ratio: number;
    max_drawdown: number;
    win_rate: number;
    total_trades: number;
    final_equity: number;
    symbols: string[];
    start_date: string;
    end_date: string;
  }