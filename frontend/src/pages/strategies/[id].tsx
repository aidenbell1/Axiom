// src/pages/strategies/[id].tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import Layout from '../../components/layout/Layout';
import PerformanceChart from '../../components/charts/PerformanceChart';
import BacktestForm from '../../components/backtest/BacktestForm';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Strategy, ALGORITHM_DESCRIPTIONS } from '../../types/strategy';

// Helper function to get parameter description
const getParameterDescription = (algorithmType: string, paramName: string): string => {
  const descriptions: Record<string, Record<string, string>> = {
    mean_reversion: {
      bollinger_window: "Number of periods used for Bollinger Bands calculation",
      bollinger_std: "Number of standard deviations for Bollinger Bands",
      rsi_window: "Number of periods used for RSI calculation",
      rsi_oversold: "Threshold below which RSI indicates oversold conditions",
      rsi_overbought: "Threshold above which RSI indicates overbought conditions",
      position_size_pct: "Percentage of portfolio to allocate per position"
    },
    trend_following: {
      fast_ma_window: "Number of periods used for fast moving average",
      slow_ma_window: "Number of periods used for slow moving average",
      ma_type: "Type of moving average (SMA or EMA)",
      atr_window: "Number of periods used for ATR calculation",
      risk_pct: "Percentage of portfolio to risk per trade",
      position_size_pct: "Maximum percentage of portfolio to allocate per position"
    },
    ml_lstm: {
      sequence_length: "Number of historical data points used for prediction",
      prediction_horizon: "Number of periods ahead to predict",
      features: "Market data features used for prediction",
      epochs: "Number of training iterations",
      threshold: "Probability threshold for signal generation",
      position_size_pct: "Percentage of portfolio to allocate per position"
    },
    random_forest: {
      n_estimators: "Number of trees in the forest",
      max_depth: "Maximum depth of each tree",
      min_samples_split: "Minimum samples required to split a node",
      min_samples_leaf: "Minimum samples required at a leaf node",
      features: "Market data features used for prediction",
      lookback_periods: "Historical periods to look back for feature creation",
      prediction_horizon: "Number of periods ahead to predict",
      threshold: "Probability threshold for signal generation",
      position_size_pct: "Percentage of portfolio to allocate per position"
    }
  };

  return descriptions[algorithmType]?.[paramName] || "No description available";
};

const StrategyDetailPage: React.FC = () => {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'parameters' | 'backtest' | 'performance'>('overview');
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  // Fetch strategy data
  useEffect(() => {
    const fetchStrategy = async () => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/strategies');
        return;
      }

      if (isAuthenticated && id) {
        try {
          setLoading(true);
          const response = await api.get<Strategy>(`/strategies/${id}`);
          setStrategy(response);
          setError(null);
        } catch (err: any) {
          setError(err.message || 'Failed to load strategy');
          toast.error('Failed to load strategy details');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStrategy();
  }, [isAuthenticated, isLoading, router, id]);

  // Handle strategy deletion
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this strategy? This action cannot be undone.')) {
      try {
        await api.delete(`/strategies/${id}`);
        toast.success('Strategy deleted successfully');
        router.push('/strategies');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete strategy');
      }
    }
  };

  // Handle strategy editing
  const handleEdit = () => {
    router.push(`/strategies/edit/${id}`);
  };

  // Run backtest
  const handleBacktest = (backtestId: number) => {
    router.push(`/backtesting/${backtestId}`);
  };

  // Get algorithm display name
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

  if (isLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (error || !strategy) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-danger-50 text-danger-700 p-6 rounded-lg">
            <h2 className="text-xl font-medium mb-2">Error Loading Strategy</h2>
            <p>{error || 'Strategy not found'}</p>
            <button
              onClick={() => router.push('/strategies')}
              className="mt-4 text-primary-600 hover:text-primary-800"
            >
              ← Back to Strategies
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/strategies')}
                className="text-neutral-600 hover:text-primary-600 mr-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{strategy.name}</h1>
            </div>
            <div className="flex flex-wrap items-center mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mr-2">
                {getAlgorithmName(strategy.algorithm_type)}
              </span>
              {strategy.is_public && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Public
                </span>
              )}
              <span className="text-sm text-neutral-500 ml-2">
                Created: {format(new Date(strategy.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="flex space-x-3 mt-4 md:mt-0">
            <button
              onClick={handleEdit}
              className="flex items-center px-3 py-2 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center px-3 py-2 border border-danger-300 rounded-md text-danger-700 bg-white hover:bg-danger-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
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
              onClick={() => setActiveTab('parameters')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'parameters'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Parameters
            </button>
            <button
              onClick={() => setActiveTab('backtest')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'backtest'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Run Backtest
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Performance
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6 h-full">
                  <h2 className="text-xl font-semibold mb-4">Strategy Description</h2>
                  <p className="text-neutral-700 mb-6">
                    {strategy.description || ALGORITHM_DESCRIPTIONS[strategy.algorithm_type] || 'No description provided.'}
                  </p>

                  <h3 className="text-lg font-medium mb-3">Algorithm Details</h3>
                  <p className="text-neutral-700 mb-4">
                    This strategy uses a <strong>{getAlgorithmName(strategy.algorithm_type)}</strong> algorithm 
                    to generate trading signals.
                  </p>

                  {strategy.performance && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Performance Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <div className="text-sm text-neutral-500">Return</div>
                          <div className={`text-lg font-medium ${strategy.performance.annualized_return >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {(strategy.performance.annualized_return * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <div className="text-sm text-neutral-500">Sharpe</div>
                          <div className={`text-lg font-medium ${strategy.performance.sharpe_ratio >= 1 ? 'text-success-600' : 'text-warning-600'}`}>
                            {strategy.performance.sharpe_ratio.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <div className="text-sm text-neutral-500">Drawdown</div>
                          <div className="text-lg font-medium text-danger-600">
                            {(strategy.performance.max_drawdown * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <div className="text-sm text-neutral-500">Win Rate</div>
                          <div className={`text-lg font-medium ${strategy.performance.win_rate >= 0.5 ? 'text-success-600' : 'text-warning-600'}`}>
                            {(strategy.performance.win_rate * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setActiveTab('backtest')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100"
                    >
                      <span className="font-medium">Run Backtest</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={handleEdit}
                      className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 text-neutral-700 rounded-md hover:bg-neutral-100"
                    >
                      <span className="font-medium">Edit Strategy</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => router.push('/portfolio/create')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 text-neutral-700 rounded-md hover:bg-neutral-100"
                    >
                      <span className="font-medium">Deploy to Portfolio</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Parameters Tab */}
          {activeTab === 'parameters' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Strategy Parameters</h2>
              <p className="text-neutral-600 mb-6">
                These parameters define how the {getAlgorithmName(strategy.algorithm_type)} algorithm behaves.
              </p>

              <div className="border border-neutral-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Parameter
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {Object.entries(strategy.parameters).map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                          {Array.isArray(value) ? 
                            value.join(', ') : 
                            typeof value === 'object' ? 
                              JSON.stringify(value) : 
                              String(value)
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {getParameterDescription(strategy.algorithm_type, key)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleEdit}
                  className="flex items-center px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Parameters
                </button>
              </div>
            </div>
          )}

          {/* Backtest Tab */}
          {activeTab === 'backtest' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Run Backtest</h2>
              <p className="text-neutral-600 mb-6">
                Test your strategy against historical market data to see how it would have performed.
              </p>

              <BacktestForm strategy={strategy} onBacktestCreated={handleBacktest} />
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Performance Analysis</h2>
              
              {strategy.performance ? (
                <div>
                  <div className="h-64 mb-6">
                    <PerformanceChart strategyId={strategy.id} height={250} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Performance Metrics</h3>
                      <div className="bg-neutral-50 p-4 rounded-md">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-600">Annualized Return</span>
                            <span className={`text-sm font-medium ${strategy.performance.annualized_return >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {(strategy.performance.annualized_return * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-600">Sharpe Ratio</span>
                            <span className={`text-sm font-medium ${strategy.performance.sharpe_ratio >= 1 ? 'text-success-600' : 'text-warning-600'}`}>
                              {strategy.performance.sharpe_ratio.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-600">Maximum Drawdown</span>
                            <span className="text-sm font-medium text-danger-600">
                              {(strategy.performance.max_drawdown * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-600">Win Rate</span>
                            <span className={`text-sm font-medium ${strategy.performance.win_rate >= 0.5 ? 'text-success-600' : 'text-warning-600'}`}>
                              {(strategy.performance.win_rate * 100).toFixed(2)}%
                            </span>
                          </div>
                          {strategy.performance.sortino_ratio && (
                            <div className="flex justify-between">
                              <span className="text-sm text-neutral-600">Sortino Ratio</span>
                              <span className={`text-sm font-medium ${strategy.performance.sortino_ratio >= 1 ? 'text-success-600' : 'text-warning-600'}`}>
                                {strategy.performance.sortino_ratio.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-3">Backtest History</h3>
                      <div className="bg-neutral-50 p-4 rounded-md">
                        <p className="text-sm text-neutral-600 mb-4">
                          View detailed results from previous backtests:
                        </p>
                        <button
                          onClick={() => router.push(`/backtesting?strategy=${strategy.id}`)}
                          className="w-full text-center py-2 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
                        >
                          View Backtest History
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-neutral-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-neutral-700">No performance data available</h3>
                  <p className="text-neutral-600 mt-2 mb-6">
                    Run a backtest to see how this strategy performs.
                  </p>
                  <button
                    onClick={() => setActiveTab('backtest')}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Run Backtest
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default StrategyDetailPage;
        </div>
      </Layout>
    );
  }

  if (error || !strategy) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-danger-50 text-danger-700 p-6 rounded-lg">
            <h2 className="text-xl font-medium mb-2">Error Loading Strategy</h2>
            <p>{error || 'Strategy not found'}</p>
            <button
              onClick={() => router.push('/strategies')}
              className="mt-4 text-primary-600 hover:text-primary-800"
            >
              ← Back to Strategies
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/strategies')}
                className="text-neutral-600 hover:text-primary-600 mr-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{strategy.name}</h1>
            </div>
            <div className="flex flex-wrap items-center mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mr-2">
                {getAlgorithmName(strategy.algorithm_type)}
              </span>
              {strategy.is_public && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Public
                </span>
              )}
              <span className="text-sm text-neutral-500 ml-2">
                Created: {format(new Date(strategy.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="flex space-x-3 mt-4 md:mt-0">
            <button
              onClick={handleEdit}
              className="flex items-center px-3 py-2 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center px-3 py-2 border border-danger-300 rounded-md text-danger-700 bg-white hover:bg-danger-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
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
              onClick={() => setActiveTab('parameters')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'parameters'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Parameters
            </button>
            <button
              onClick={() => setActiveTab('backtest')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'backtest'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Run Backtest
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              Performance
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6 h-full">
                  <h2 className="text-xl font-semibold mb-4">Strategy Description</h2>
                  <p className="text-neutral-700 mb-6">
                    {strategy.description || ALGORITHM_DESCRIPTIONS[strategy.algorithm_type] || 'No description provided.'}
                  </p>

                  <h3 className="text-lg font-medium mb-3">Algorithm Details</h3>
                  <p className="text-neutral-700 mb-4">
                    This strategy uses a <strong>{getAlgorithmName(strategy.algorithm_type)}</strong> algorithm 
                    to generate trading signals.
                  </p>

                  {strategy.performance && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Performance Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <div className="text-sm text-neutral-500">Return</div>
                          <div className={`text-lg font-medium ${strategy.performance.annualized_return >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {(strategy.performance.annualized_return * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <div className="text-sm text-neutral-500">Sharpe</div>
                          <div className={`text-lg font-medium ${strategy.performance.sharpe_ratio >= 1 ? 'text-success-600' : 'text-warning-600'}`}>
                            {strategy.performance.sharpe_ratio.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <div className="text-sm text-neutral-500">Drawdown</div>
                          <div className="text-lg font-medium text-danger-600">
                            {(strategy.performance.max_drawdown * 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-neutral-50 p-3 rounded-md">
                          <div className="text-sm text-neutral-500">Win Rate</div>
                          <div className={`text-lg font-medium ${strategy.performance.win_rate >= 0.5 ? 'text-success-600' : 'text-warning-600'}`}>
                            {(strategy.performance.win_rate * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setActiveTab('backtest')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100"
                    >
                      <span className="font-medium">Run Backtest</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={handleEdit}
                      className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 text-neutral-700 rounded-md hover:bg-neutral-100"
                    >
                      <span className="font-medium">Edit Strategy</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => router.push('/portfolio/create')}
                      className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 text-neutral-700 rounded-md hover:bg-neutral-100"
                    >
                      <span className="font-medium">Deploy to Portfolio</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Parameters Tab */}
          {activeTab === 'parameters' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Strategy Parameters</h2>
              <p className="text-neutral-600 mb-6">
                These parameters define how the {getAlgorithmName(strategy.algorithm_type)} algorithm behaves.
              </p>

              <div className="border border-neutral-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Parameter
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {Object.entries(strategy.parameters).map(([key, value]) => (
                      <tr key={key}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                          {Array.isArray(value) ? 
                            value.join(', ') : 
                            typeof value === 'object' ? 
                              JSON.stringify(value) : 
                              String(value)
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {getParameterDescription(strategy.algorithm_type, key)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleEdit}
                  className="flex items-center px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Parameters
                </button>
              </div>
            </div>
          )}

          {/* Backtest Tab */}
          {activeTab === 'backtest' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Run Backtest</h2>
              <p className="text-neutral-600 mb-6">
                Test your strategy against historical market data to see how it would have performed.
              </p>

              <BacktestForm strategy={strategy} onBacktestCreated={handleBacktest} />
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Performance Analysis</h2>
              
              {strategy.performance ? (
                <div>
                  <div className="h-64 mb-6">
                    <PerformanceChart strategyId={strategy.id} height={250} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Performance Metrics</h3>
                      <div className="bg-neutral-50 p-4 rounded-md">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-600">Annualized Return</span>
                            <span className={`text-sm font-medium ${strategy.performance.annualized_return >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                              {(strategy.performance.annualized_return * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-600