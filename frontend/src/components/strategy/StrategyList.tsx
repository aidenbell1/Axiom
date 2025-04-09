// src/components/strategy/StrategyList.tsx
import React from 'react';
import { format } from 'date-fns';
import { Strategy } from '../../types/strategy';

interface StrategyListProps {
  strategies: Strategy[];
  onSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
}

const StrategyList: React.FC<StrategyListProps> = ({
  strategies,
  onSelect,
  onDelete,
  showActions = true,
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

  // Get performance label and color
  const getPerformanceLabel = (performance: number | undefined): JSX.Element => {
    if (performance === undefined || performance === null) {
      return <span className="text-neutral-500">N/A</span>;
    }

    const formattedValue = (performance * 100).toFixed(2);
    const isPositive = performance >= 0;

    return (
      <span className={isPositive ? 'text-success-600' : 'text-danger-600'}>
        {isPositive ? '+' : ''}{formattedValue}%
      </span>
    );
  };

  if (strategies.length === 0) {
    return (
      <div className="text-center py-6 bg-neutral-50 rounded-md">
        <p className="text-neutral-600">No strategies found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Performance
            </th>
            {showActions && (
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {strategies.map((strategy) => (
            <tr 
              key={strategy.id}
              className={onSelect ? 'cursor-pointer hover:bg-neutral-50' : ''}
              onClick={onSelect ? () => onSelect(strategy.id) : undefined}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-neutral-900">{strategy.name}</div>
                <div className="text-xs text-neutral-500">
                  Created: {format(new Date(strategy.created_at), 'MMM d, yyyy')}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {getAlgorithmName(strategy.algorithm_type)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                {getPerformanceLabel(strategy.performance?.annualized_return)}
              </td>
              {showActions && (
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelect) onSelect(strategy.id);
                    }}
                    className="text-primary-600 hover:text-primary-900 mr-3"
                  >
                    View
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(strategy.id);
                      }}
                      className="text-danger-600 hover:text-danger-900"
                    >
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StrategyList;