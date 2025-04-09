// src/types/strategy.ts

/**
 * Strategy interface representing a trading strategy in the system
 */
export interface Strategy {
    id: number;
    name: string;
    description?: string;
    algorithm_type: AlgorithmType;
    parameters: Record<string, any>;
    is_public: boolean;
    is_featured?: boolean;
    price?: number;
    rating?: number;
    performance?: StrategyPerformance;
    created_at: string; // ISO date string
    updated_at?: string; // ISO date string
    user_id: number;
  }
  
  /**
   * Available algorithm types for strategies
   */
  export type AlgorithmType = 
    | 'mean_reversion'
    | 'trend_following'
    | 'ml_lstm'
    | 'random_forest';
  
  /**
   * Strategy performance metrics
   */
  export interface StrategyPerformance {
    annualized_return: number;
    max_drawdown: number;
    sharpe_ratio: number;
    sortino_ratio?: number;
    win_rate: number;
  }
  
  /**
   * Interface for creating a new strategy
   */
  export interface StrategyCreateRequest {
    name: string;
    description?: string;
    algorithm_type: AlgorithmType;
    parameters: Record<string, any>;
    is_public?: boolean;
  }
  
  /**
   * Interface for updating an existing strategy
   */
  export interface StrategyUpdateRequest {
    name?: string;
    description?: string;
    algorithm_type?: AlgorithmType;
    parameters?: Record<string, any>;
    is_public?: boolean;
  }
  
  /**
   * Default parameters for different algorithm types
   */
  export const DEFAULT_ALGORITHM_PARAMETERS: Record<AlgorithmType, Record<string, any>> = {
    mean_reversion: {
      bollinger_window: 20,
      bollinger_std: 2.0,
      rsi_window: 14,
      rsi_oversold: 30,
      rsi_overbought: 70,
      position_size_pct: 0.1
    },
    trend_following: {
      fast_ma_window: 10,
      slow_ma_window: 30,
      ma_type: 'ema',
      atr_window: 14,
      risk_pct: 0.01,
      position_size_pct: 0.2
    },
    ml_lstm: {
      sequence_length: 20,
      prediction_horizon: 5,
      features: ['close', 'volume', 'rsi', 'macd'],
      epochs: 50,
      threshold: 0.6,
      position_size_pct: 0.1
    },
    random_forest: {
      n_estimators: 100,
      max_depth: 10,
      min_samples_split: 2,
      min_samples_leaf: 1,
      features: ['open', 'high', 'low', 'close', 'volume', 'rsi', 'macd'],
      lookback_periods: [1, 3, 5, 10, 20],
      prediction_horizon: 5,
      threshold: 0.6,
      position_size_pct: 0.1
    }
  };
  
  /**
   * Descriptions for different algorithm types
   */
  export const ALGORITHM_DESCRIPTIONS: Record<AlgorithmType, string> = {
    mean_reversion: 'Capitalizes on price deviations from historical averages, assuming prices will revert to the mean.',
    trend_following: 'Follows market trends using moving averages to identify and capitalize on momentum.',
    ml_lstm: 'Uses Long Short-Term Memory neural networks to predict future price movements based on historical patterns.',
    random_forest: 'Employs ensemble learning with multiple decision trees to classify market conditions and predict movements.'
  };