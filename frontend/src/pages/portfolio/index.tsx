// src/pages/portfolio/index.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Layout from '../../components/layout/Layout';
import PerformanceChart from '../../components/charts/PerformanceChart';
import PositionList from '../../components/portfolio/PositionList';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Portfolio, Position, Trade } from '../../types/portfolio';

const PortfolioPage: React.FC = () => {
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'performance' | 'trades'>('positions');
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Fetch active portfolio data
  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login?redirect=/portfolio');
        return;
      }

      if (isAuthenticated) {
        try {
          setLoading(true);
          
          // Try to fetch active portfolio
          try {
            const portfolioResponse = await api.get<Portfolio>('/portfolio/active');
            setActivePortfolio(portfolioResponse);
            
            // Fetch positions for active portfolio
            const positionsResponse = await api.get<Position[]>(`/portfolio/${portfolioResponse.id}/positions`);
            setPositions(positionsResponse);
            
            // Fetch recent trades
            const tradesResponse = await api.get<Trade[]>(`/portfolio/${portfolioResponse.id}/trades?limit=10`);
            setRecentTrades(tradesResponse);
            
            setError(null);
          } catch (err: any) {
            // If no active portfolio exists, that's ok
            if (err.response?.status === 404) {
              setActivePortfolio(null);
              setPositions([]);
              setRecentTrades([]);
              setError(null);
            } else {
              throw err;
            }
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load portfolio data');
          toast.error('Failed to load portfolio data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPortfolio();
  }, [isAuthenticated, isLoading, router]);

  // Handle position closing
  const handleClosePosition = async (positionId: number) => {
    if (!activePortfolio) return;
    
    try {
      // In a real implementation, you would prompt for a price
      const currentPosition = positions.find(p => p.id === positionId);
      if (!currentPosition) return;
      
      const closePrice = currentPosition.current_price || currentPosition.average_entry_price;
      
      await api.post(`/portfolio/${activePortfolio.id}/positions/${positionId}/close`, {
        price: closePrice
      });
      
      // Update positions list
      const updatedPositions = positions.map(p => 
        p.id === positionId ? { ...p, is_open: false, closed_at: new Date().toISOString() } : p
      );
      setPositions(updatedPositions);
      
      // Refresh portfolio data
      const portfolioResponse = await api.get<Portfolio>('/portfolio/active');
      setActivePortfolio(portfolioResponse);
      
      toast.success('Position closed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to close position');
    }
  };

  // Create new portfolio
  const handleCreatePortfolio = () => {
    router.push('/portfolio/create');
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

  // No active portfolio
  if (!activePortfolio) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-8">Portfolio</h1>
          
          <div className="bg-neutral-50 rounded-lg p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h2 className="text-xl font-medium text-neutral-800 mb-2">No Active Portfolio</h2>
            <p className="text-neutral-600 mb-6">
              Create a portfolio to start tracking your investments and deploying your strategies.
            </p>
            <button
              onClick={handleCreatePortfolio}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Create Portfolio
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
            <h1 className="text-3xl font-bold text-neutral-900">{activePortfolio.name}</h1>
            <p className="text-neutral-600 mt-1">
              {activePortfolio.description || `${activePortfolio.portfolio_type.toUpperCase()} Trading Portfolio`}
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <button
              onClick={() => router.push('/portfolio/create-position')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Position
            </button>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm text-neutral-500 mb-1">Current Value</h3>
            <p className="text-2xl font-bold">${activePortfolio.current_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-neutral-500 mt-1">
              Since {format(new Date(activePortfolio.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm text-neutral-500 mb-1">Cash Balance</h3>
            <p className="text-2xl font-bold">${activePortfolio.cash_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {((activePortfolio.cash_balance / activePortfolio.current_value) * 100).toFixed(1)}% of portfolio
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm text-neutral-500 mb-1">Invested</h3>
            <p className="text-2xl font-bold">
              ${(activePortfolio.current_value - activePortfolio.cash_balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {(((activePortfolio.current_value - activePortfolio.cash_balance) / activePortfolio.current_value) * 100).toFixed(1)}% of portfolio
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-sm text-neutral-500 mb-1">Total Return</h3>
            <p className={`text-2xl font-bold ${activePortfolio.current_value >= activePortfolio.initial_capital ? 'text-success-600' : 'text-danger-600'}`}>
              {activePortfolio.current_value >= activePortfolio.initial_capital ? '+' : ''}
              ${(activePortfolio.current_value - activePortfolio.initial_capital).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${activePortfolio.current_value >= activePortfolio.initial_capital ? 'text-success-600' : 'text-danger-600'} mt-1`}>
              {activePortfolio.current_value >= activePortfolio.initial_capital ? '+' : ''}
              {(((activePortfolio.current_value / activePortfolio.initial_capital) - 1) * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-neutral-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('positions')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'positions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text