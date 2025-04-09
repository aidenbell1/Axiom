// src/types/portfolio.ts

/**
 * Portfolio interface representing a user's investment portfolio
 */
export interface Portfolio {
    id: number;
    name: string;
    description?: string;
    portfolio_type: PortfolioType;
    initial_capital: number;
    current_value: number;
    cash_balance: number;
    is_active: boolean;
    broker?: string;
    broker_account_id?: string;
    created_at: string; // ISO date string
    updated_at?: string; // ISO date string
    user_id: number;
    positions?: Position[];
  }
  
  /**
   * Possible portfolio types
   */
  export type PortfolioType = 'paper' | 'live';
  
  /**
   * Position interface representing a holding in a portfolio
   */
  export interface Position {
    id: number;
    symbol: string;
    quantity: number;
    average_entry_price: number;
    current_price?: number;
    current_value?: number;
    unrealized_pnl?: number;
    unrealized_pnl_pct?: number;
    is_open: boolean;
    opened_at: string; // ISO date string
    closed_at?: string; // ISO date string
    strategy_id?: number;
    portfolio_id: number;
    created_at: string; // ISO date string
    updated_at?: string; // ISO date string
  }
  
  /**
   * Trade interface representing an executed trade in a portfolio
   */
  export interface Trade {
    id: number;
    symbol: string;
    trade_type: TradeType;
    quantity: number;
    price: number;
    total_amount: number;
    commission: number;
    status: TradeStatus;
    executed_at?: string; // ISO date string
    realized_pnl?: number;
    realized_pnl_pct?: number;
    notes?: string;
    order_id?: string;
    user_id: number;
    portfolio_id: number;
    strategy_id?: number;
    created_at: string; // ISO date string
    updated_at?: string; // ISO date string
  }
  
  /**
   * Trade types
   */
  export type TradeType = 'buy' | 'sell' | 'short' | 'cover';
  
  /**
   * Trade status types
   */
  export type TradeStatus = 'pending' | 'filled' | 'canceled' | 'rejected' | 'partial';
  
  /**
   * Interface for portfolio creation request
   */
  export interface PortfolioCreateRequest {
    name: string;
    description?: string;
    portfolio_type: PortfolioType;
    initial_capital: number;
    broker?: string;
    broker_account_id?: string;
  }
  
  /**
   * Interface for portfolio update request
   */
  export interface PortfolioUpdateRequest {
    name?: string;
    description?: string;
    is_active?: boolean;
    broker?: string;
    broker_account_id?: string;
  }
  
  /**
   * Interface for position creation request
   */
  export interface PositionCreateRequest {
    symbol: string;
    quantity: number;
    average_entry_price: number;
    strategy_id?: number;
  }
  
  /**
   * Interface for trade creation request
   */
  export interface TradeCreateRequest {
    symbol: string;
    trade_type: TradeType;
    quantity: number;
    price: number;
    commission?: number;
    notes?: string;
    strategy_id?: number;
  }
  
  /**
   * Interface for portfolio performance data
   */
  export interface PortfolioPerformance {
    portfolio_id: number;
    initial_value: number;
    current_value: number;
    total_return: number;
    total_return_pct: number;
    performance_data: PerformancePoint[];
  }
  
  /**
   * Interface for a point in the performance data
   */
  export interface PerformancePoint {
    date: string; // ISO date string
    value: number;
  }