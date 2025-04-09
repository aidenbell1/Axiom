# backend/algorithms/utils/indicators.py
import pandas as pd
import numpy as np
from typing import Literal

def calculate_moving_average(
    df: pd.DataFrame,
    window: int,
    ma_type: Literal['sma', 'ema'] = 'sma',
    column: str = 'close',
    new_column: str = None
) -> pd.DataFrame:
    """
    Calculate Simple Moving Average (SMA) or Exponential Moving Average (EMA).
    
    Args:
        df: DataFrame with price data
        window: Window size for moving average
        ma_type: Type of moving average - 'sma' or 'ema'
        column: Column to calculate MA for
        new_column: Name of the new column with MA values
        
    Returns:
        DataFrame with added moving average column
    """
    # Make a copy to avoid modifying original DataFrame
    result_df = df.copy()
    
    # Validate inputs
    if column not in result_df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame")
    
    # Set new column name if not provided
    if new_column is None:
        new_column = f"{ma_type}_{window}"
    
    # Calculate moving average
    if ma_type.lower() == 'sma':
        result_df[new_column] = result_df[column].rolling(window=window).mean()
    elif ma_type.lower() == 'ema':
        result_df[new_column] = result_df[column].ewm(span=window, adjust=False).mean()
    else:
        raise ValueError("ma_type must be either 'sma' or 'ema'")
    
    return result_df

def calculate_bollinger_bands(
    df: pd.DataFrame,
    window: int = 20,
    num_std: float = 2.0,
    column: str = 'close'
) -> pd.DataFrame:
    """
    Calculate Bollinger Bands.
    
    Args:
        df: DataFrame with price data
        window: Window size for moving average
        num_std: Number of standard deviations for bands
        column: Column to calculate Bollinger Bands for
        
    Returns:
        DataFrame with added middle_band, upper_band, and lower_band columns
    """
    # Make a copy to avoid modifying original DataFrame
    result_df = df.copy()
    
    # Validate inputs
    if column not in result_df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame")
    
    # Calculate middle band (SMA)
    result_df = calculate_moving_average(
        result_df,
        window=window,
        ma_type='sma',
        column=column,
        new_column='middle_band'
    )
    
    # Calculate standard deviation
    rolling_std = result_df[column].rolling(window=window).std()
    
    # Calculate upper and lower bands
    result_df['upper_band'] = result_df['middle_band'] + (rolling_std * num_std)
    result_df['lower_band'] = result_df['middle_band'] - (rolling_std * num_std)
    
    return result_df

def calculate_rsi(
    df: pd.DataFrame,
    window: int = 14,
    column: str = 'close'
) -> pd.DataFrame:
    """
    Calculate Relative Strength Index (RSI).
    
    Args:
        df: DataFrame with price data
        window: Window size for RSI calculation
        column: Column to calculate RSI for
        
    Returns:
        DataFrame with added RSI column
    """
    # Make a copy to avoid modifying original DataFrame
    result_df = df.copy()
    
    # Validate inputs
    if column not in result_df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame")
    
    # Calculate price changes
    delta = result_df[column].diff()
    
    # Separate gains and losses
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    # Calculate average gain and loss
    avg_gain = gain.rolling(window=window).mean()
    avg_loss = loss.rolling(window=window).mean()
    
    # Calculate RS (Relative Strength)
    rs = avg_gain / avg_loss.where(avg_loss > 0, 1)  # Avoid division by zero
    
    # Calculate RSI
    result_df['rsi'] = 100 - (100 / (1 + rs))
    
    return result_df

def calculate_macd(
    df: pd.DataFrame,
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
    column: str = 'close'
) -> pd.DataFrame:
    """
    Calculate Moving Average Convergence Divergence (MACD).
    
    Args:
        df: DataFrame with price data
        fast_period: Fast EMA period
        slow_period: Slow EMA period
        signal_period: Signal line EMA period
        column: Column to calculate MACD for
        
    Returns:
        DataFrame with added macd, macd_signal, and macd_histogram columns
    """
    # Make a copy to avoid modifying original DataFrame
    result_df = df.copy()
    
    # Validate inputs
    if column not in result_df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame")
    
    # Calculate fast and slow EMAs
    result_df = calculate_moving_average(
        result_df,
        window=fast_period,
        ma_type='ema',
        column=column,
        new_column='ema_fast'
    )
    
    result_df = calculate_moving_average(
        result_df,
        window=slow_period,
        ma_type='ema',
        column=column,
        new_column='ema_slow'
    )
    
    # Calculate MACD line
    result_df['macd'] = result_df['ema_fast'] - result_df['ema_slow']
    
    # Calculate signal line
    result_df = calculate_moving_average(
        result_df,
        window=signal_period,
        ma_type='ema',
        column='macd',
        new_column='macd_signal'
    )
    
    # Calculate MACD histogram
    result_df['macd_histogram'] = result_df['macd'] - result_df['macd_signal']
    
    # Clean up intermediate columns
    result_df = result_df.drop(['ema_fast', 'ema_slow'], axis=1)
    
    return result_df

def calculate_atr(
    df: pd.DataFrame,
    window: int = 14
) -> pd.DataFrame:
    """
    Calculate Average True Range (ATR).
    
    Args:
        df: DataFrame with price data (must have 'high', 'low', 'close' columns)
        window: Window size for ATR calculation
        
    Returns:
        DataFrame with added 'atr' column
    """
    # Make a copy to avoid modifying original DataFrame
    result_df = df.copy()
    
    # Validate inputs
    required_columns = ['high', 'low', 'close']
    for col in required_columns:
        if col not in result_df.columns:
            raise ValueError(f"Column '{col}' not found in DataFrame")
    
    # Calculate True Range
    result_df['tr1'] = result_df['high'] - result_df['low']  # Current high - current low
    result_df['tr2'] = abs(result_df['high'] - result_df['close'].shift(1))  # Current high - previous close
    result_df['tr3'] = abs(result_df['low'] - result_df['close'].shift(1))  # Current low - previous close
    
    result_df['true_range'] = result_df[['tr1', 'tr2', 'tr3']].max(axis=1)
    
    # Calculate ATR
    result_df['atr'] = result_df['true_range'].rolling(window=window).mean()
    
    # Clean up intermediate columns
    result_df = result_df.drop(['tr1', 'tr2', 'tr3', 'true_range'], axis=1)
    
    return result_df

def calculate_stochastic_oscillator(
    df: pd.DataFrame,
    k_period: int = 14,
    d_period: int = 3,
    slowing: int = 3
) -> pd.DataFrame:
    """
    Calculate Stochastic Oscillator.
    
    Args:
        df: DataFrame with price data (must have 'high', 'low', 'close' columns)
        k_period: %K period
        d_period: %D period
        slowing: Slowing period
        
    Returns:
        DataFrame with added 'stoch_k' and 'stoch_d' columns
    """
    # Make a copy to avoid modifying original DataFrame
    result_df = df.copy()
    
    # Validate inputs
    required_columns = ['high', 'low', 'close']
    for col in required_columns:
        if col not in result_df.columns:
            raise ValueError(f"Column '{col}' not found in DataFrame")
    
    # Calculate %K
    lowest_low = result_df['low'].rolling(window=k_period).min()
    highest_high = result_df['high'].rolling(window=k_period).max()
    
    result_df['stoch_k_raw'] = 100 * ((result_df['close'] - lowest_low) / 
                                    (highest_high - lowest_low).where(highest_high > lowest_low, 1))
    
    # Apply slowing to %K
    result_df['stoch_k'] = result_df['stoch_k_raw'].rolling(window=slowing).mean()
    
    # Calculate %D (SMA of %K)
    result_df['stoch_d'] = result_df['stoch_k'].rolling(window=d_period).mean()
    
    # Clean up intermediate columns
    result_df = result_df.drop(['stoch_k_raw'], axis=1)
    
    return result_df