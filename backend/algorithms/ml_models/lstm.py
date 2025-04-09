# backend/algorithms/ml_models/lstm.py
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
import logging
from datetime import datetime

# TensorFlow for deep learning
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.preprocessing import MinMaxScaler

from backend.algorithms.base import BaseAlgorithm
from backend.utils.logging import get_logger

logger = get_logger(__name__)

class LSTMPricePredictor(BaseAlgorithm):
    """
    Long Short-Term Memory (LSTM) model for price prediction and trading signals.
    
    This model uses LSTM neural networks to predict future price movements
    and generate trading signals based on those predictions.
    """
    
    DEFAULT_PARAMETERS = {
        "sequence_length": 20,
        "prediction_horizon": 5,
        "features": ["close", "volume", "rsi", "macd"],
        "epochs": 50,
        "threshold": 0.6,
        "position_size_pct": 0.1  # 10% of portfolio per position
    }
    
    def __init__(self, parameters: Dict[str, Any] = None):
        """Initialize with default parameters and override with provided ones."""
        merged_params = {**self.DEFAULT_PARAMETERS, **(parameters or {})}
        super().__init__(merged_params)
        
        # Initialize model-specific attributes
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.feature_columns = None
    
    def validate_parameters(self):
        """Validate strategy parameters."""
        required_params = [
            "sequence_length", "prediction_horizon", "features",
            "epochs", "threshold", "position_size_pct"
        ]
        
        for param in required_params:
            if param not in self.parameters:
                raise ValueError(f"Missing required parameter: {param}")
        
        # Type and value validation
        if not isinstance(self.parameters["sequence_length"], int) or self.parameters["sequence_length"] <= 0:
            raise ValueError("sequence_length must be a positive integer")
        
        if not isinstance(self.parameters["prediction_horizon"], int) or self.parameters["prediction_horizon"] <= 0:
            raise ValueError("prediction_horizon must be a positive integer")
        
        if not isinstance(self.parameters["features"], list) or len(self.parameters["features"]) == 0:
            raise ValueError("features must be a non-empty list")
        
        if not isinstance(self.parameters["epochs"], int) or self.parameters["epochs"] <= 0:
            raise ValueError("epochs must be a positive integer")
        
        if not isinstance(self.parameters["threshold"], (int, float)) or not 0.5 <= self.parameters["threshold"] <= 1:
            raise ValueError("threshold must be between 0.5 and 1")
        
        if not isinstance(self.parameters["position_size_pct"], (int, float)) or not 0 < self.parameters["position_size_pct"] <= 1:
            raise ValueError("position_size_pct must be between 0 and 1")
    
    def preprocess_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Preprocess data for LSTM model.
        
        Args:
            data: DataFrame with market data
            
        Returns:
            Tuple of (X, y) arrays for training/prediction
        """
        # Ensure all required features are present
        required_features = ["close"]
        optional_features = ["open", "high", "low", "volume", "rsi", "macd", "macd_signal", "macd_histogram"]
        
        for feature in required_features:
            if feature not in data.columns:
                raise ValueError(f"Required feature '{feature}' not found in data")
        
        # Get list of features to use
        self.feature_columns = []
        for feature in self.parameters["features"]:
            if feature in data.columns:
                self.feature_columns.append(feature)
            elif feature in optional_features and feature not in data.columns:
                logger.warning(f"Feature '{feature}' not found in data and will be skipped")
        
        if not self.feature_columns:
            raise ValueError("No valid features found in data")
        
        # Get data subset with selected features
        dataset = data[self.feature_columns].values
        
        # Scale the data
        scaled_data = self.scaler.fit_transform(dataset)
        
        # Create sequences for LSTM
        X, y = [], []
        seq_length = self.parameters["sequence_length"]
        pred_horizon = self.parameters["prediction_horizon"]
        
        for i in range(len(scaled_data) - seq_length - pred_horizon):
            X.append(scaled_data[i:(i + seq_length)])
            
            # Target is the close price 'pred_horizon' steps ahead
            future_close = scaled_data[i + seq_length + pred_horizon, self.feature_columns.index("close")]
            current_close = scaled_data[i + seq_length - 1, self.feature_columns.index("close")]
            
            # Convert to binary target: 1 if price goes up, 0 if it goes down
            y.append(1 if future_close > current_close else 0)
        
        return np.array(X), np.array(y)
    
    def build_model(self, input_shape: Tuple[int, int]):
        """
        Build LSTM model.
        
        Args:
            input_shape: Shape of input data (sequence_length, n_features)
        """
        model = Sequential()
        
        # LSTM layers
        model.add(LSTM(units=50, return_sequences=True, input_shape=input_shape))
        model.add(Dropout(0.2))
        
        model.add(LSTM(units=50, return_sequences=False))
        model.add(Dropout(0.2))
        
        # Output layer (binary classification)
        model.add(Dense(units=1, activation='sigmoid'))
        
        # Compile the model
        model.compile(optimizer=Adam(learning_rate=0.001), loss='binary_crossentropy', metrics=['accuracy'])
        
        self.model = model
    
    def train_model(self, X: np.ndarray, y: np.ndarray):
        """
        Train LSTM model.
        
        Args:
            X: Input sequences
            y: Target values
        """
        if self.model is None:
            self.build_model((X.shape[1], X.shape[2]))
        
        # Train the model
        self.model.fit(
            X, y,
            epochs=self.parameters["epochs"],
            batch_size=32,
            verbose=0,
            validation_split=0.2
        )
    
    def predict(self, sequence: np.ndarray) -> float:
        """
        Make a prediction using the trained model.
        
        Args:
            sequence: Input sequence
            
        Returns:
            Prediction probability (0-1)
        """
        if self.model is None:
            raise ValueError("Model has not been trained")
        
        # Reshape for prediction
        sequence = sequence.reshape(1, sequence.shape[0], sequence.shape[1])
        
        # Make prediction
        prediction = self.model.predict(sequence, verbose=0)[0][0]
        
        return prediction
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals based on LSTM predictions.
        
        Args:
            data: DataFrame with market data
            
        Returns:
            DataFrame with added signal column
        """
        # Make a copy to avoid modifying original data
        df = data.copy()
        
        # Initialize signal column
        df['signal'] = 0
        
        # Preprocess data and train model
        try:
            X, y = self.preprocess_data(df)
            
            if len(X) == 0 or len(y) == 0:
                logger.warning("Not enough data for LSTM model, returning no signals")
                return df
            
            # Train model
            self.train_model(X, y)
            
            # Generate predictions for each sequence
            seq_length = self.parameters["sequence_length"]
            threshold = self.parameters["threshold"]
            
            for i in range(seq_length, len(df) - self.parameters["prediction_horizon"]):
                # Get sequence
                current_seq = df.iloc[i-seq_length:i][self.feature_columns].values
                scaled_seq = self.scaler.transform(current_seq)
                
                # Make prediction
                prediction = self.predict(scaled_seq)
                
                # Generate signal based on prediction and threshold
                if prediction >= threshold:
                    df.loc[df.index[i], 'signal'] = 1  # Buy signal
                elif prediction <= (1 - threshold):
                    df.loc[df.index[i], 'signal'] = -1  # Sell signal
            
        except Exception as e:
            logger.error(f"Error in LSTM signal generation: {str(e)}")
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