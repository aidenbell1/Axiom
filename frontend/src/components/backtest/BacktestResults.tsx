// src/components/backtest/BacktestResults.tsx
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format } from 'date-fns';

import api from '../../services/api';
import { Backtest, BacktestTrade } from '../../types/backtest';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types
interface BacktestResultsProps {
  backtestId: number;
}

const BacktestResults: React.FC<BacktestResultsProps> = ({ backtestId }) => {
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'metrics'>('overview');
  
  useEffect(() => {
    const fetchBacktest = async () => {
      try {
        const data = await api.get<Backtest>(`/backtesting/${backtestId}`);
        setBacktest(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load backtest results');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBacktest();
    
    // Poll for updates if the backtest is still running
    const interval = setInterval(async () => {
      if (backtest && (backtest.status === 'pending' || backtest.status === 'running')) {
        const data = await api.get<Backtest>(`/backtesting/${backtestId}`);
        setBacktest(data);
        
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
        }
      } else {
        clearInterval(interval);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [backtestId, backtest?.status]);
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-medium text-neutral-800">Loading backtest results...</h3>
          <p className="text-sm text-neutral-500 mt-2">This may take a few minutes for complex strategies.</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="bg-danger-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-danger-800">Error Loading Results</h3>
          <p className="text-danger-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!backtest) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="bg-neutral-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-neutral-800">Backtest Not Found</h3>
          <p className="text-neutral-700 mt-1">The requested backtest could not be found.</p>
        </div>
      </div>
    );
  }
  
  if (backtest.status === 'pending' || backtest.status === 'running') {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-medium text-neutral-800">
            Backtest {backtest.status === 'pending' ? 'Pending' : 'Running'}...
          </h3>
          <p className="text-sm text-neutral-500 mt-2">
            {backtest.status === 'pending' 
              ? 'Your backtest is in the queue and will start soon.' 
              : 'Your backtest is running. Results will appear automatically when complete.'}
          </p>
        </div>
      </div>
    );
  }
  
  if (backtest.status === 'failed') {
    return (
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="bg-danger-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-danger-800">Backtest Failed</h3>
          <p className="text-danger-700 mt-1">{backtest.error_message || 'An unknown error occurred during the backtest.'}</p>
        </div>
      </div>
    );
  }
  
  // Prepare chart data for equity curve
  const equityCurveData = {
    labels: backtest.results?.equity_curve.map(point => 
      format(new Date(point.timestamp), 'MMM d, yyyy')
    ) || [],
    datasets: [
      {
        label: 'Portfolio Value',
        data: backtest.results?.equity_curve.map(point => point.portfolio_value) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHitRadius: 10,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `$${context.raw.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 10,
        }
      },
      y: {
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-neutral-900">Backtest Results</h2>
        <div className="flex flex-wrap items-center text-sm text-neutral-500 mt-2">
          <span className="mr-4">
            <span className="font-medium text-neutral-700">Strategy:</span> {backtest.strategy?.name || '-'}
          </span>
          <span className="mr-4">
            <span className="font-medium text-neutral-700">Symbols:</span> {backtest.symbols.join(', ')}
          </span>
          <span className="mr-4">
            <span className="font-medium text-neutral-700">Period:</span> {format(new Date(backtest.start_date), 'MMM d, yyyy')} - {format(new Date(backtest.end_date), 'MMM d, yyyy')}
          </span>
          <span>
            <span className="font-medium text-neutral-700">Initial Capital:</span> ${backtest.initial_capital.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-neutral-50 p-4 rounded-md">
          <h4 className="text-xs text-neutral-500">Return</h4>
          <div className="mt-1">
            <span className={`text-xl font-semibold ${backtest.annualized_return >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
              {(backtest.annualized_return * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-neutral-500 ml-1">annualized</span>
          </div>
        </div>
        
        <div className="bg-neutral-50 p-4 rounded-md">
          <h4 className="text-xs text-neutral-500">Sharpe Ratio</h4>
          <div className="mt-1">
            <span className={`text-xl font-semibold ${backtest.sharpe_ratio >= 1 ? 'text-success-700' : backtest.sharpe_ratio >= 0 ? 'text-warning-700' : 'text-danger-700'}`}>
              {backtest.sharpe_ratio.toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="bg-neutral-50 p-4 rounded-md">
          <h4 className="text-xs text-neutral-500">Max Drawdown</h4>
          <div className="mt-1">
            <span className="text-xl font-semibold text-danger-700">
              {(backtest.max_drawdown * 100).toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="bg-neutral-50 p-4 rounded-md">
          <h4 className="text-xs text-neutral-500">Win Rate</h4>
          <div className="mt-1">
            <span className={`text-xl font-semibold ${backtest.win_rate >= 0.5 ? 'text-success-700' : 'text-warning-700'}`}>
              {(backtest.win_rate * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-neutral-500 ml-1">({backtest.total_trades} trades)</span>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trades'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Trades
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'metrics'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Detailed Metrics
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-900 mb-4">Equity Curve</h3>
              <div className="h-80">
                <Line data={equityCurveData} options={chartOptions} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Strategy Performance</h3>
                <div className="bg-neutral-50 rounded-md p-4">
                  <p className="mb-4 text-sm text-neutral-700">
                    Starting with ${backtest.initial_capital.toLocaleString()}, this strategy would have
                    {backtest.annualized_return >= 0 ? ' grown ' : ' decreased '}
                    to ${backtest.final_equity.toLocaleString()} over the test period.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Starting Capital</span>
                      <span className="text-sm font-medium">${backtest.initial_capital.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Ending Capital</span>
                      <span className="text-sm font-medium">${backtest.final_equity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Total Return</span>
                      <span className={`text-sm font-medium ${(backtest.final_equity - backtest.initial_capital) >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                        {(((backtest.final_equity / backtest.initial_capital) - 1) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Annualized Return</span>
                      <span className={`text-sm font-medium ${backtest.annualized_return >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                        {(backtest.annualized_return * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Risk Metrics</h3>
                <div className="bg-neutral-50 rounded-md p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Sharpe Ratio</span>
                      <span className={`text-sm font-medium ${backtest.sharpe_ratio >= 1 ? 'text-success-700' : backtest.sharpe_ratio >= 0 ? 'text-warning-700' : 'text-danger-700'}`}>
                        {backtest.sharpe_ratio.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Max Drawdown</span>
                      <span className="text-sm font-medium text-danger-700">
                        {(backtest.max_drawdown * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Win Rate</span>
                      <span className={`text-sm font-medium ${backtest.win_rate >= 0.5 ? 'text-success-700' : 'text-warning-700'}`}>
                        {(backtest.win_rate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600">Total Trades</span>
                      <span className="text-sm font-medium">{backtest.total_trades}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div>
            <h3 className="text-lg font-medium text-neutral-900 mb-4">Trade History</h3>
            
            {backtest.results?.trades && backtest.results.trades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Symbol</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Quantity</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Value</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {backtest.results.trades.map((trade: BacktestTrade, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          {format(new Date(trade.timestamp), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          {trade.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          ${trade.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          {trade.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                          ${(trade.price * trade.quantity).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {trade.profit !== undefined ? (
                            <span className={`${trade.profit >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                              ${trade.profit.toFixed(2)} ({(trade.profit_pct * 100).toFixed(2)}%)
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-neutral-50 p-6 rounded-md text-center">
                <p className="text-neutral-700">No trades were executed during this backtest period.</p>
              </div>
            )}
          </div>
        )}
        
        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-neutral-900 mb-4">Performance Metrics</h3>
              <div className="bg-neutral-50 rounded-md p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Total Return</span>
                    <span className={`text-sm font-medium ${(backtest.final_equity - backtest.initial_capital) >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                      {(((backtest.final_equity / backtest.initial_capital) - 1) * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Annualized Return</span>
                    <span className={`text-sm font-medium ${backtest.annualized_return >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                      {(backtest.annualized_return * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Sharpe Ratio</span>
                    <span className={`text-sm font-medium ${backtest.sharpe_ratio >= 1 ? 'text-success-700' : backtest.sharpe_ratio >= 0 ? 'text-warning-700' : 'text-danger-700'}`}>
                      {backtest.sharpe_ratio.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Sortino Ratio</span>
                    <span className={`text-sm font-medium ${backtest.results?.metrics?.sortino_ratio >= 1 ? 'text-success-700' : backtest.results?.metrics?.sortino_ratio >= 0 ? 'text-warning-700' : 'text-danger-700'}`}>
                      {backtest.results?.metrics?.sortino_ratio?.toFixed(2) || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Max Drawdown</span>
                    <span className="text-sm font-medium text-danger-700">
                      {(backtest.max_drawdown * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Volatility (Annualized)</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {(backtest.results?.metrics?.volatility * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Beta (vs Market)</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {backtest.results?.metrics?.beta?.toFixed(2) || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Alpha (Annualized)</span>
                    <span className={`text-sm font-medium ${(backtest.results?.metrics?.alpha || 0) >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                      {backtest.results?.metrics?.alpha ? (backtest.results.metrics.alpha * 100).toFixed(2) + '%' : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-neutral-900 mb-4">Trading Statistics</h3>
              <div className="bg-neutral-50 rounded-md p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Total Trades</span>
                    <span className="text-sm font-medium text-neutral-900">{backtest.total_trades}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Win Rate</span>
                    <span className={`text-sm font-medium ${backtest.win_rate >= 0.5 ? 'text-success-700' : 'text-warning-700'}`}>
                      {(backtest.win_rate * 100).toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Profit Factor</span>
                    <span className={`text-sm font-medium ${(backtest.results?.metrics?.profit_factor || 0) >= 1.5 ? 'text-success-700' : (backtest.results?.metrics?.profit_factor || 0) >= 1 ? 'text-warning-700' : 'text-danger-700'}`}>
                      {backtest.results?.metrics?.profit_factor?.toFixed(2) || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Average Trade</span>
                    <span className={`text-sm font-medium ${(backtest.results?.metrics?.average_trade || 0) >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                      ${backtest.results?.metrics?.average_trade?.toFixed(2) || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Average Win</span>
                    <span className="text-sm font-medium text-success-700">
                      ${backtest.results?.metrics?.average_win?.toFixed(2) || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Average Loss</span>
                    <span className="text-sm font-medium text-danger-700">
                      ${backtest.results?.metrics?.average_loss?.toFixed(2) || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Largest Win</span>
                    <span className="text-sm font-medium text-success-700">
                      ${backtest.results?.metrics?.largest_win?.toFixed(2) || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-neutral-600">Largest Loss</span>
                    <span className="text-sm font-medium text-danger-700">
                      ${backtest.results?.metrics?.largest_loss?.toFixed(2) || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestResults;