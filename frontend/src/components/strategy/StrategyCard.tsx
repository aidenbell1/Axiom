// src/components/strategy/StrategyCard.tsx
import React from 'react';
import { Strategy } from '../../types/strategy';

interface StrategyCardProps {
  strategy: Strategy;
  onClick?: () => void;
  showPerformance?: boolean;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  onClick,
  showPerformance = true,
}) => {
  // Get algorithm type display name
  const getAlgorithmName = (algorithmType: string): string => {
    switch (algorithmType) {
      case 'mean_reversion':
        return 'Mean Reversion';
      case 'trend_following':
        return 'Trend Following';
      case 'ml_lstm':
        return 'LSTM Neural Network';
      case 'random_forest':
        return 'Random Forest';
      default:
        return algorithmType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Get algorithm description
  const getAlgorithmDescription = (algorithmType: string): string => {
    switch (algorithmType) {
      case 'mean_reversion':
        return 'Capitalizes on price deviations from historical averages, assuming prices will revert to the mean.';
      case 'trend_following':
        return 'Follows market trends using moving averages to identify and capitalize on momentum.';
      case 'ml_lstm':
        return 'Uses Long Short-Term Memory neural networks to predict future price movements based on historical patterns.';
      case 'random_forest':
        return 'Employs ensemble learning with multiple decision trees to classify market conditions and predict movements.';
      default:
        return 'Custom trading algorithm strategy.';
    }
  };

  // Get performance metrics
  const getPerformanceMetrics = () => {
    if (!strategy.performance) {
      return (
        <div className="text-center py-2 text-sm text-neutral-500">
          No performance data available
        </div>
      );
    }

    const metrics = [
      {
        label: 'Return',
        value: `${(strategy.performance?.annualized_return * 100).toFixed(2)}%`,
        positive: strategy.performance?.annualized_return >= 0,
      },
      {
        label: 'Sharpe',
        value: strategy.performance?.sharpe_ratio?.toFixed(2) || 'N/A',
        positive: (strategy.performance?.sharpe_ratio || 0) >= 1,
      },
      {
        label: 'Drawdown',
        value: `${(strategy.performance?.max_drawdown * 100).toFixed(2)}%`,
        positive: false, // Drawdown is always negative
      },
      {
        label: 'Win Rate',
        value: `${(strategy.performance?.win_rate * 100).toFixed(2)}%`,
        positive: (strategy.performance?.win_rate || 0) >= 0.5,
      },
    ];

    return (
      <div className="grid grid-cols-2 gap-2 mt-3">
        {metrics.map((metric, index) => (
          <div key={index} className="text-center p-2 bg-neutral-50 rounded-md">
            <div className="text-xs text-neutral-500">{metric.label}</div>
            <div className={`text-sm font-medium ${metric.positive ? 'text-success-600' : 'text-danger-600'}`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-card overflow-hidden hover:shadow-card-hover transition-shadow duration-300"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-neutral-900">{strategy.name}</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-1">
              {getAlgorithmName(strategy.algorithm_type)}
            </span>
          </div>
          {strategy.is_public && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Public
            </span>
          )}
        </div>
        
        <p className="mt-2 text-sm text-neutral-600">
          {strategy.description || getAlgorithmDescription(strategy.algorithm_type)}
        </p>
        
        {showPerformance && getPerformanceMetrics()}
      </div>
      
      <div className="bg-neutral-50 px-4 py-3 border-t border-neutral-200">
        <div className="flex justify-between items-center">
          <div className="text-xs text-neutral-500">
            Created: {new Date(strategy.created_at).toLocaleDateString()}
          </div>
          <button className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            View Details →
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategyCard;