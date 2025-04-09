// src/components/backtest/BacktestForm.tsx
import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import api from '../../services/api';
import { Strategy } from '../../types/strategy';

// Types
interface BacktestFormProps {
  strategy: Strategy;
  onBacktestCreated?: (backtestId: number) => void;
}

interface BacktestFormValues {
  strategy_id: number;
  start_date: string;
  end_date: string;
  symbols: string[];
  initial_capital: number;
}

// Validation Schema
const backtestSchema = Yup.object().shape({
  strategy_id: Yup.number().required('Strategy is required'),
  start_date: Yup.date().required('Start date is required'),
  end_date: Yup.date()
    .required('End date is required')
    .min(Yup.ref('start_date'), 'End date must be after start date'),
  symbols: Yup.array()
    .of(Yup.string().required('Symbol is required'))
    .min(1, 'At least one symbol is required'),
  initial_capital: Yup.number()
    .required('Initial capital is required')
    .min(100, 'Initial capital must be at least $100')
});

const BacktestForm: React.FC<BacktestFormProps> = ({ strategy, onBacktestCreated }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get default dates for backtest
  const getDefaultDates = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1); // Default to 1 year of data
    
    return {
      startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      endDate: endDate.toISOString().split('T')[0], // YYYY-MM-DD
    };
  };
  
  const { startDate, endDate } = getDefaultDates();
  
  // Initial form values
  const initialValues: BacktestFormValues = {
    strategy_id: strategy.id,
    start_date: startDate,
    end_date: endDate,
    symbols: ['SPY'], // Default symbol
    initial_capital: 10000, // Default capital
  };
  
  // Handle form submission
  const handleSubmit = async (values: BacktestFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await api.post('/backtesting', values);
      
      toast.success('Backtest created successfully');
      
      if (onBacktestCreated) {
        onBacktestCreated(response.id);
      } else {
        router.push(`/backtesting/${response.id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create backtest');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      <h2 className="text-xl font-semibold mb-4">Backtest Strategy</h2>
      
      <Formik
        initialValues={initialValues}
        validationSchema={backtestSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, setFieldValue }) => (
          <Form>
            <div className="space-y-6">
              {/* Symbols */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Symbols (Tickers)
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-grow">
                    {values.symbols.map((symbol, index) => (
                      <div key={index} className="flex items-center mb-2">
                        <Field
                          type="text"
                          name={`symbols.${index}`}
                          className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200 uppercase"
                        />
                        
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newSymbols = [...values.symbols];
                              newSymbols.splice(index, 1);
                              setFieldValue('symbols', newSymbols);
                            }}
                            className="ml-2 p-1 text-neutral-500 hover:text-danger-500"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setFieldValue('symbols', [...values.symbols, '']);
                    }}
                    className="p-1 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                {errors.symbols && touched.symbols ? (
                  <div className="mt-1 text-xs text-danger-600">{errors.symbols}</div>
                ) : null}
                
                <p className="mt-1 text-xs text-neutral-500">
                  Enter the ticker symbols you want to backtest (e.g., AAPL, MSFT, SPY).
                </p>
              </div>
              
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-neutral-700 mb-1">
                    Start Date
                  </label>
                  <Field
                    type="date"
                    id="start_date"
                    name="start_date"
                    className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                  />
                  <ErrorMessage name="start_date" component="div" className="mt-1 text-xs text-danger-600" />
                </div>
                
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-neutral-700 mb-1">
                    End Date
                  </label>
                  <Field
                    type="date"
                    id="end_date"
                    name="end_date"
                    className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                  />
                  <ErrorMessage name="end_date" component="div" className="mt-1 text-xs text-danger-600" />
                </div>
              </div>
              
              {/* Initial Capital */}
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
                <ErrorMessage name="initial_capital" component="div" className="mt-1 text-xs text-danger-600" />
              </div>
              
              {/* Submit Button */}
              <div className="pt-4 border-t border-neutral-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {isSubmitting ? 'Running Backtest...' : 'Run Backtest'}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default BacktestForm;