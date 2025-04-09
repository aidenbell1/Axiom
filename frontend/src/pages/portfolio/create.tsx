// src/pages/portfolio/create.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';

import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { PortfolioType } from '../../types/portfolio';

// Portfolio creation schema
const portfolioSchema = Yup.object().shape({
  name: Yup.string()
    .required('Portfolio name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(30, 'Name cannot exceed 30 characters'),
  description: Yup.string()
    .max(200, 'Description cannot exceed 200 characters'),
  portfolio_type: Yup.string()
    .required('Portfolio type is required'),
  initial_capital: Yup.number()
    .required('Initial capital is required')
    .min(100, 'Initial capital must be at least $100')
    .max(100000000, 'Initial capital cannot exceed $100,000,000'),
});

const CreatePortfolioPage: React.FC = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle form submission
  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    
    try {
      // Create portfolio
      const response = await api.post('/portfolio', values);
      
      toast.success('Portfolio created successfully!');
      
      // Redirect to portfolio page
      router.push(`/portfolio/${response.id}`);
    } catch (error) {
      console.error('Error creating portfolio:', error);
      toast.error(error.message || 'Failed to create portfolio');
      setIsSubmitting(false);
    }
  };
  
  // Initial form values
  const initialValues = {
    name: '',
    description: '',
    portfolio_type: PortfolioType.PAPER,
    initial_capital: 10000,
  };
  
  // If not authenticated, redirect to login
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);
  
  if (isLoading || !isAuthenticated) {
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
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-neutral-900 mb-8">Create New Portfolio</h1>
        
        <div className="bg-white rounded-lg shadow-card p-6">
          <Formik
            initialValues={initialValues}
            validationSchema={portfolioSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched }) => (
              <Form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                    Portfolio Name
                  </label>
                  <Field
                    type="text"
                    id="name"
                    name="name"
                    className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                    placeholder="My Investment Portfolio"
                  />
                  <ErrorMessage name="name" component="div" className="mt-1 text-xs text-danger-600" />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
                    Description (Optional)
                  </label>
                  <Field
                    as="textarea"
                    id="description"
                    name="description"
                    rows={3}
                    className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                    placeholder="A brief description of your portfolio strategy or goals..."
                  />
                  <ErrorMessage name="description" component="div" className="mt-1 text-xs text-danger-600" />
                </div>
                
                <div>
                  <label htmlFor="portfolio_type" className="block text-sm font-medium text-neutral-700 mb-1">
                    Portfolio Type
                  </label>
                  <Field
                    as="select"
                    id="portfolio_type"
                    name="portfolio_type"
                    className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                  >
                    <option value={PortfolioType.PAPER}>Paper Trading (Simulated)</option>
                    <option value={PortfolioType.LIVE} disabled>Live Trading (Coming Soon)</option>
                  </Field>
                  <div className="mt-1 text-xs text-neutral-500">
                    Paper trading lets you practice with simulated money. No real trades will be executed.
                  </div>
                  <ErrorMessage name="portfolio_type" component="div" className="mt-1 text-xs text-danger-600" />
                </div>
                
                <div>
                  <label htmlFor="initial_capital" className="block text-sm font-medium text-neutral-700 mb-1">
                    Initial Capital ($)
                  </label>
                  <Field
                    type="number"
                    id="initial_capital"
                    name="initial_capital"
                    min="100"
                    step="100"
                    className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                  />
                  <div className="mt-1 text-xs text-neutral-500">
                    The amount of money you'd like to start with in your portfolio.
                  </div>
                  <ErrorMessage name="initial_capital" component="div" className="mt-1 text-xs text-danger-600" />
                </div>
                
                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creating...' : 'Create Portfolio'}
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
        
        <div className="mt-8 bg-neutral-50 rounded-lg p-6">
          <h2 className="text-lg font-medium text-neutral-900 mb-3">About Portfolio Types</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium text-neutral-800">Paper Trading</h3>
              <p className="text-sm text-neutral-600 mt-1">
                Paper trading is a simulated trading environment where you can practice trading strategies without
                risking real money. It's a great way to test your strategies and learn about investing.
              </p>
            </div>
            
            <div>
              <h3 className="text-md font-medium text-neutral-800">Live Trading (Coming Soon)</h3>
              <p className="text-sm text-neutral-600 mt-1">
                Live trading connects to your brokerage account and executes real trades with real money. This feature
                is currently in development and will be available soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreatePortfolioPage;