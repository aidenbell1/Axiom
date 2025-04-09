// src/pages/dashboard/index.tsx
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// Components
import Layout from '../../components/layout/Layout';
import PortfolioOverview from '../../components/portfolio/PortfolioOverview';
import StrategyList from '../../components/strategy/StrategyList';
import PriceChart from '../../components/charts/PriceChart';
import PerformanceChart from '../../components/charts/PerformanceChart';

// Types
import { Strategy } from '../../types/strategy';
import { Portfolio } from '../../types/portfolio';

const Dashboard: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  
  useEffect(() => {
    // Redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);
  
  useEffect(() => {
    // Load data when authenticated
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);
  
  const loadDashboardData = async () => {
    setIsDataLoading(true);
    
    try {
      // Load strategies
      const strategiesRes = await api.get<Strategy[]>('/strategies');
      setStrategies(strategiesRes);
      
      // Load active portfolio
      try {
        const portfolioRes = await api.get<Portfolio>('/portfolio/active');
        setPortfolio(portfolioRes);
      } catch (error) {
        // It's ok if user doesn't have a portfolio yet
        console.log('No active portfolio found');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };
  
  // If loading or not authenticated, show loading state
  if (isLoading || !isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Loading dashboard...</h2>
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Head>
        <title>Dashboard | Axiom</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-primary-600 rounded-lg shadow-md p-6 mb-8 text-white">
          <h1 className="text-3xl font-bold">Welcome back, {user?.full_name.split(' ')[0]}</h1>
          <p className="mt-2 text-primary-100">
            Your quantitative investment journey continues with Axiom. 
            {portfolio ? 'Let\'s check how your investments are performing.' : 'Get started by creating your first strategy.'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2/3 width on large screens */}
          <div className="lg:col-span-2 space-y-8">
            {/* Portfolio Performance Chart */}
            <div className="bg-white rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold mb-4">Portfolio Performance</h2>
              {portfolio ? (
                <PerformanceChart portfolioId={portfolio.id} />
              ) : (
                <div className="text-center py-12 bg-neutral-50 rounded-lg">
                  <h3 className="text-lg font-medium text-neutral-600">No active portfolio</h3>
                  <p className="mt-2 text-sm text-neutral-500">
                    Create a portfolio to track your investment performance
                  </p>
                  <button
                    onClick={() => router.push('/portfolio/create')}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
                  >
                    Create Portfolio
                  </button>
                </div>
              )}
            </div>
            
            {/* Market Data */}
            <div className="bg-white rounded-lg shadow-card p-6">
            <h2 className="text-xl font-semibold mb-4">Market Overview</h2>
              <PriceChart symbol="SPY" timeframe="1D" />
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-neutral-50 p-3 rounded-md">
                  <h4 className="text-xs text-neutral-500">S&P 500</h4>
                  <div className="flex items-end mt-1">
                    <span className="text-lg font-semibold">4,521.35</span>
                    <span className="ml-2 text-sm text-success-500">+1.23%</span>
                  </div>
                </div>
                <div className="bg-neutral-50 p-3 rounded-md">
                  <h4 className="text-xs text-neutral-500">Nasdaq</h4>
                  <div className="flex items-end mt-1">
                    <span className="text-lg font-semibold">14,239.88</span>
                    <span className="ml-2 text-sm text-success-500">+1.64%</span>
                  </div>
                </div>
                <div className="bg-neutral-50 p-3 rounded-md">
                  <h4 className="text-xs text-neutral-500">Dow Jones</h4>
                  <div className="flex items-end mt-1">
                    <span className="text-lg font-semibold">35,950.89</span>
                    <span className="ml-2 text-sm text-danger-500">-0.17%</span>
                  </div>
                </div>
                <div className="bg-neutral-50 p-3 rounded-md">
                  <h4 className="text-xs text-neutral-500">VIX</h4>
                  <div className="flex items-end mt-1">
                    <span className="text-lg font-semibold">16.58</span>
                    <span className="ml-2 text-sm text-danger-500">-4.22%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar - 1/3 width on large screens */}
          <div className="space-y-8">
            {/* Portfolio Summary */}
            <div className="bg-white rounded-lg shadow-card p-6">
              <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
              {portfolio ? (
                <PortfolioOverview portfolio={portfolio} />
              ) : (
                <div className="text-center py-8 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">No active portfolio</p>
                </div>
              )}
            </div>
            
            {/* Strategies */}
            <div className="bg-white rounded-lg shadow-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Your Strategies</h2>
                <button
                  onClick={() => router.push('/strategies/create')}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  + New Strategy
                </button>
              </div>
              {isDataLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : strategies.length > 0 ? (
                <StrategyList strategies={strategies} onSelect={(id) => router.push(`/strategies/${id}`)} />
              ) : (
                <div className="text-center py-8 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">No strategies yet</p>
                  <button
                    onClick={() => router.push('/strategies/create')}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
                  >
                    Create First Strategy
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;