# backend/algorithms/ml_models/random_forest.py
import pandas as pd
import numpy as np
from typing import Dict, List, Any
import logging

from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

from backend.algorithms.base import BaseAlgorithm
from backend.utils.logging import get_logger

logger = get_logger(__name__)

class RandomForestStrategy(BaseAlgorithm):
    """
    Random Forest strategy for trading signal generation.
    
    This model uses Random Forest classifier to predict market movements
    and generate trading signals based on those predictions.
    """
    
    DEFAULT_PARAMETERS = {
        "n_estimators": 100,
        "max_depth": 10,
        "min_samples_split": 2,
        "min_samples_leaf": 1,
        "features": ["open", "high", "low", "close", "volume", "rsi", "macd"],
        "lookback_periods": [1, 3, 5, 10, 20],  # Days to look back for features
        "prediction_horizon": 5,  # Days ahead to predict
        "threshold": 0.6,  # Probability threshold for signals
        "position_size_pct": 0.1  # 10% of portfolio per position
    }
    
    def __init__(self, parameters: Dict[str, Any] = None):
        """Initialize with default parameters and override with provided ones."""
        merged_params = {**self.DEFAULT_PARAMETERS, **(parameters or {})}
        super().__init__(merged_params)
        
        # Initialize model-specific attributes
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = []
    
    def validate_parameters(self):
        """Validate strategy parameters."""
        required_params = [
            "n_estimators", "max_depth", "min_samples_split", "min_samples_leaf",
            "features", "lookback_periods", "prediction_horizon", 
            "threshold", "position_size_pct"
        ]
        
        for param in required_params:
            if param not in self.parameters:
                raise ValueError(f"Missing required parameter: {param}")
        
        # Type and value validation
        if not isinstance(self.parameters["n_estimators"], int) or self.parameters["n_estimators"] <= 0:
            raise ValueError("n_estimators must be a positive integer")
        
        if not isinstance(self.parameters["max_depth"], int) or self.parameters["max_depth"] <= 0:
            raise ValueError("max_depth must be a positive integer")
        
        if not isinstance(self.parameters["min_samples_split"], int) or self.parameters["min_samples_split"] < 2:
            raise ValueError("min_samples_split must be at least 2")
        
        if not isinstance(self.parameters["min_samples_leaf"], int) or self.parameters["min_samples_leaf"] <= 0:
            raise ValueError("min_samples_leaf must be a positive integer")
        
        if not isinstance(self.parameters["features"], list) or len(self.parameters["features"]) == 0:
            raise ValueError("features must be a non-empty list")
        
        if not isinstance(self.parameters["lookback_periods"], list) or len(self.parameters["lookback_periods"]) == 0:
            raise ValueError("lookback_periods must be a non-empty list")
        
        if not isinstance(self.parameters["prediction_horizon"], int) or self.parameters["prediction_horizon"] <= 0:
            raise ValueError("prediction_horizon must be a positive integer")
        
        if not isinstance(self.parameters["threshold"], (int, float)) or not 0.5 <= self.parameters["threshold"] <= 1:
            raise ValueError("threshold must be between 0.5 and 1")
        
        if not isinstance(self.parameters["position_size_pct"], (int, float)) or not 0 < self.parameters["position_size_pct"] <= 1:
            raise ValueError("position_size_pct must be between 0 and 1")
    
    def create_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Create features for the Random Forest model.
        
        Args:
            data: DataFrame with market data
            
        Returns:
            DataFrame with additional features
        """
        # Make a copy to avoid modifying original data
        df = data.copy()
        
        # Ensure all required base features are present
        required_base_features = ["close"]
        for feature in required_base_features:
            if feature not in df.columns:
                raise ValueError(f"Required feature '{feature}' not found in data")
        
        # Get list of base features to use
        base_features = []
        for feature in self.parameters["features"]:
            if feature in df.columns:
                base_features.append(feature)
            else:
                logger.warning(f"Feature '{feature}' not found in data and will be skipped")
        
        if not base_features:
            raise ValueError("No valid features found in data")
        
        self.feature_columns = []
        
        # Add lagged features
        for feature in base_features:
            for period in self.parameters["lookback_periods"]:
                lagged_feature_name = f"{feature}_lag_{period}"
                df[lagged_feature_name] = df[feature].shift(period)
                self.feature_columns.append(lagged_feature_name)
        
        # Add price change features
        for period in self.parameters["lookback_periods"]:
            price_change_name = f"price_change_{period}"
            df[price_change_name] = (df["close"] / df["close"].shift(period)) - 1
            self.feature_columns.append(price_change_name)
        
        # Add moving averages
        for period in [5, 10, 20, 50, 200]:
            ma_name = f"ma_{period}"
            df[ma_name] = df["close"].rolling(window=period).mean()
            self.feature_columns.append(ma_name)
        
        # Add relative strength features
        for period in [5, 10, 20]:
            rsi_name = f"rsi_{period}"
            delta = df["close"].diff()
            gain = delta.where(delta > 0, 0).rolling(window=period).mean()
            loss = -delta.where(delta < 0, 0).rolling(window=period).mean()
            rs = gain / loss.where(loss > 0, 1)
            df[rsi_name] = 100 - (100 / (1 + rs))
            self.feature_columns.append(rsi_name)
        
        # Add target column (future price direction)
        pred_horizon = self.parameters["prediction_horizon"]
        df["target"] = (df["close"].shift(-pred_horizon) > df["close"]).astype(int)
        
        # Drop rows with NaN values
        df = df.dropna()
        
        return df
    
    def prepare_data(self, df: pd.DataFrame):
        """
        Prepare data for model training and prediction.
        
        Args:
            df: DataFrame with features
            
        Returns:
            Tuple of (X, y) for training
        """
        # Select features and target
        X = df[self.feature_columns].values
        y = df["target"].values
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        return X_scaled, y
    
    def train_model(self, X, y):
        """
        Train the Random Forest model.
        
        Args:
            X: Feature matrix
            y: Target vector
        """
        # Initialize model
        self.model = RandomForestClassifier(
            n_estimators=self.parameters["n_estimators"],
            max_depth=self.parameters["max_depth"],
            min_samples_split=self.parameters["min_samples_split"],
            min_samples_leaf=self.parameters["min_samples_leaf"],
            random_state=42,
            n_jobs=-1  # Use all available cores
        )
        
        # Train model
        self.model.fit(X, y)
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on Random Forest predictions.
        
        Args:
            data: DataFrame with market data
            
        Returns:
            DataFrame with added signal column
        """
        # Make a copy to avoid modifying original data
        df = data.copy()
        
        # Initialize signal column
        df['signal'] = 0
        
        try:
            # Create features
            df_with_features = self.create_features(df)
            
            if len(df_with_features) < 50:  # Need enough data for meaningful training
                logger.warning("Not enough data for Random Forest model, returning no signals")
                return df
            
            # Prepare data
            X, y = self.prepare_data(df_with_features)
            
            # Train model
            self.train_model(X, y)
            
            # Generate predictions
            probabilities = self.model.predict_proba(X)
            
            # Extract probability of price increase (class 1)
            prob_increase = probabilities[:, 1]
            
            # Generate signals based on probabilities and threshold
            threshold = self.parameters["threshold"]
            signals = np.zeros(len(prob_increase))
            signals[prob_increase >= threshold] = 1  # Buy signal
            signals[prob_increase <= (1 - threshold)] = -1  # Sell signal
            
            # Map signals back to original DataFrame
            signal_dates = df_with_features.index
            for i, date in enumerate(signal_dates):
                if date in df.index:
                    df.loc[date, 'signal'] = signals[i]
            
        except Exception as e:
            logger.error(f"Error in Random Forest signal generation: {str(e)}")
            # Return dataframe with no signals
            return df
        
        return df
    
    def calculate_position_sizes(self, data: pd.DataFrame, portfolio_value: float) -> pd.DataFrame:
        """
        Calculate position sizes based on signals and risk management rules.
        
        Args:
            data: DataFrame with market data and signals
            portfolio_value: Current portfolio value
            
        Returns:
            DataFrame with added position_size column
        """
        # Make a copy to avoid modifying original data
        df = data.copy()
        
        # Calculate position size
        position_value = portfolio_value * self.parameters["position_size_pct"]
        
        # Initialize position_size column
        df['position_size'] = 0
        
        # Calculate position sizes based on signals
        for i in range(1, len(df)):
            current_signal = df.iloc[i]['signal']
            prev_signal = df.iloc[i-1]['signal']
            
            # Only take action on new signals (when signal changes)
            if current_signal != prev_signal and current_signal != 0:
                # Calculate number of shares based on latest close price
                shares = position_value / df.iloc[i]['close'] if df.iloc[i]['close'] > 0 else 0
                
                # Set position size (positive for buy, negative for sell)
                df.loc[df.index[i], 'position_size'] = shares if current_signal > 0 else -shares
        
        return df