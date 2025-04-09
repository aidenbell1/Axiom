// src/pages/strategies/index.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Layout from '../../components/layout/Layout';
import StrategyList from '../../components/strategy/StrategyList';
import StrategyCard from '../../components/strategy/StrategyCard';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Strategy } from '../../types/strategy';

const StrategiesPage: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Fetch strategies on component mount
  useEffect(() => {
    const fetchStrategies = async () => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/strategies');
        return;
      }

      if (isAuthenticated) {
        try {
          setLoading(true);
          const response = await api.get<Strategy[]>('/strategies');
          setStrategies(response);
          setError(null);
        } catch (err: any) {
          setError(err.message || 'Failed to load strategies');
          toast.error('Failed to load strategies');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStrategies();
  }, [isAuthenticated, isLoading, router]);

  // Handle strategy selection
  const handleStrategySelect = (id: number) => {
    router.push(`/strategies/${id}`);
  };

  // Handle strategy deletion
  const handleStrategyDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      try {
        await api.delete(`/strategies/${id}`);
        setStrategies(strategies.filter(strategy => strategy.id !== id));
        toast.success('Strategy deleted successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete strategy');
      }
    }
  };

  // Create new strategy
  const handleCreateStrategy = () => {
    router.push('/strategies/create');
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(viewMode === 'list' ? 'grid' : 'list');
  };

  if (isLoading) {
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
            <h1 className="text-3xl font-bold text-neutral-900">Your Strategies</h1>
            <p className="text-neutral-600 mt-1">
              Create, manage, and backtest your trading strategies
            </p>
          </div>

          <div className="flex items-center mt-4 md:mt-0 space-x-4">
            <button
              onClick={toggleViewMode}
              className="p-2 text-neutral-600 hover:text-primary-600 transition-colors"
              aria-label={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
            >
              {viewMode === 'list' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
            </button>

            <button
              onClick={handleCreateStrategy}
              className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Strategy
            </button>
          </div>
        </div>

        {/* Strategy Display */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-danger-50 text-danger-700 p-4 rounded-md">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm underline"
            >
              Try again
            </button>
          </div>
        ) : strategies.length === 0 ? (
          <div className="bg-neutral-50 rounded-lg p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-xl font-medium text-neutral-800 mb-2">No strategies yet</h2>
            <p className="text-neutral-600 mb-6">
              Create your first trading strategy to get started with algorithmic trading.
            </p>
            <button
              onClick={handleCreateStrategy}
              className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
            >
              Create your first strategy
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <StrategyList 
              strategies={strategies} 
              onSelect={handleStrategySelect} 
              onDelete={handleStrategyDelete}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                onClick={() => handleStrategySelect(strategy.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StrategiesPage;