// src/pages/backtesting/[id].tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Layout from '../../components/layout/Layout';
import BacktestResults from '../../components/backtest/BacktestResults';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Backtest } from '../../types/backtest';

const BacktestDetailPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/backtesting');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

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
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/backtesting')}
            className="text-neutral-600 hover:text-primary-600 mr-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-neutral-900">Backtest Results</h1>
        </div>

        {id && <BacktestResults backtestId={Number(id)} />}
      </div>
    </Layout>
  );
};

export default BacktestDetailPage;