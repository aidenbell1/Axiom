// src/pages/backtesting/index.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Backtest, BacktestStatus } from '../../types/backtest';
import { Strategy } from '../../types/strategy';

const BacktestingPage: React.FC = () => {
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [strategies, setStrategies] = useState<{[key: number]: Strategy}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Get strategy ID from query parameters
  useEffect(() => {
    if (router.query.strategy) {
      const strategyId = parseInt(router.query.strategy as string);
      if (!isNaN(strategyId)) {
        setSelectedStrategy(strategyId);
      }
    }
  }, [router.query]);

  // Fetch backtests
  useEffect(() => {
    const fetchBacktests = async () => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/backtesting');
        return;
      }

      if (isAuthenticated) {
        try {
          setLoading(true);
          
          let url = '/backtesting';
          if (selectedStrategy) {
            url += `?strategy_id=${selectedStrategy}`;
          }
          
          const response = await api.get<Backtest[]>(url);
          setBacktests(response);
          
          // Fetch strategy details for each unique strategy_id
          const uniqueStrategyIds = [...new Set(response.map(b => b.strategy_id))];
          const strategiesData: {[key: number]: Strategy} = {};
          
          for (const strategyId of uniqueStrategyIds) {
            try {
              const strategyData = await api.get<Strategy>(`/strategies/${strategyId}`);
              strategiesData[strategyId] = strategyData;
            } catch (err) {
              console.error(`Failed to load strategy ${strategyId}`, err);
            }
          }
          
          setStrategies(strategiesData);
          setError(null);
        } catch (err: any) {
          setError(err.message || 'Failed to load backtests');
          toast.error('Failed to load backtest history');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchBacktests();
  }, [isAuthenticated, isLoading, router, selectedStrategy]);

  // Handle backtest selection
  const handleBacktestSelect = (id: number) => {
    router.push(`/backtesting/${id}`);
  };

  // Delete backtest
  const handleDeleteBacktest = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this backtest?')) {
      try {
        await api.delete(`/backtesting/${id}`);
        setBacktests(backtests.filter(b => b.id !== id));
        toast.success('Backtest deleted successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete backtest');
      }
    }
  };

  // Get strategy name
  const getStrategyName = (strategyId: number): string => {
    return strategies[strategyId]?.name || `Strategy ${strategyId}`;
  };

  // Get status badge
  const getStatusBadge = (status: BacktestStatus): JSX.Element => {
    const statusConfig = {
      pending: { bgColor: 'bg-neutral-100', textColor: 'text-neutral-700' },
      running: { bgColor: 'bg-primary-100', textColor: 'text-primary-700' },
      completed: { bgColor: 'bg-success-100', textColor: 'text-success-700' },
      failed: { bgColor: 'bg-danger-100', textColor: 'text-danger-700' },
    };
    
    const config = statusConfig[status];
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Backtest History</h1>
            <p className="text-neutral-600 mt-1">
              View the results of your previous strategy backtests
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <button
              onClick={() => router.push('/strategies')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Run New Backtest
            </button>
          </div>
        </div>

        {/* Filter by strategy */}
        {Object.keys(strategies).length > 0 && (
          <div className="mb-6">
            <label htmlFor="strategy-filter" className="block text-sm font-medium text-neutral-700 mb-1">
              Filter by Strategy:
            </label>
            <select
              id="strategy-filter"
              value={selectedStrategy || ''}
              onChange={(e) => {
                const value = e.target.value;
                const id = value ? parseInt(value) : null;
                setSelectedStrategy(id);
                
                // Update URL query parameter
                const query = id ? { strategy: id.toString() } : {};
                router.push({
                  pathname: router.pathname,
                  query
                });
              }}
              className="w-full md:w-auto px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Strategies</option>
              {Object.entries(strategies).map(([id, strategy]) => (
                <option key={id} value={id}>{strategy.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Backtest List */}
        {error ? (
          <div className="bg-danger-50 text-danger-700 p-4 rounded-md">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm underline"
            >
              Try again
            </button>
          </div>
        ) : backtests.length === 0 ? (
          <div className="bg-neutral-50 rounded-lg p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-medium text-neutral-800 mb-2">No backtests found</h2>
            <p className="text-neutral-600 mb-6">
              {selectedStrategy
                ? "No backtests found for the selected strategy."
                : "You haven't run any backtests yet. Run a backtest to see how your strategies would perform."}
            </p>
            <button
              onClick={() => router.push('/strategies')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Go to Strategies
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Strategy
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Symbols
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Return
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {backtests.map((backtest) => (
                    <tr key={backtest.id} 
                      className="hover:bg-neutral-50 cursor-pointer"
                      onClick={() => handleBacktestSelect(backtest.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">
                          {getStrategyName(backtest.strategy_id)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {format(new Date(backtest.created_at), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-700">
                          {backtest.symbols.join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-700">
                          {format(new Date(backtest.start_date), 'MMM d, yyyy')} - {format(new Date(backtest.end_date), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(backtest.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {backtest.annualized_return !== undefined ? (
                          <span className={`text-sm font-medium ${backtest.annualized_return >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {(backtest.annualized_return * 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-sm text-neutral-500">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => handleDeleteBacktest(backtest.id, e)}
                          className="text-danger-600 hover:text-danger-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BacktestingPage;