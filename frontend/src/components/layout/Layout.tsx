// src/components/layout/Layout.tsx
import React, { ReactNode } from 'react';
import Head from 'next/head';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  showSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'Axiom - Quantitative Investment Platform',
  description = 'Algorithmic trading strategies for individual investors',
  showSidebar = true,
}) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <div className="flex flex-1 pt-16">
        {isAuthenticated && showSidebar && <Sidebar />}

        <main className={`flex-1 ${isAuthenticated && showSidebar ? 'ml-64' : ''}`}>
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Layout;