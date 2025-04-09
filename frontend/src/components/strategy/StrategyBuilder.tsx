// src/components/strategy/StrategyBuilder.tsx
import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import api from '../../services/api';
import { Strategy } from '../../types/strategy';

// Algorithm-specific parameter configs
const algorithmConfigs = {
  mean_reversion: {
    name: 'Mean Reversion',
    description: 'Buys when price is below lower Bollinger Band and RSI is oversold, sells when price is above upper Bollinger Band and RSI is overbought.',
    parameters: [
      { name: 'bollinger_window', label: 'Bollinger Window', type: 'number', default: 20, min: 5, max: 100 },
      { name: 'bollinger_std', label: 'Bollinger Standard Deviation', type: 'number', default: 2.0, min: 0.5, max: 4, step: 0.1 },
      { name: 'rsi_window', label: 'RSI Window', type: 'number', default: 14, min: 5, max: 50 },
      { name: 'rsi_oversold', label: 'RSI Oversold Threshold', type: 'number', default: 30, min: 10, max: 40 },
      { name: 'rsi_overbought', label: 'RSI Overbought Threshold', type: 'number', default: 70, min: 60, max: 90 },
      { name: 'position_size_pct', label: 'Position Size %', type: 'number', default: 0.1, min: 0.01, max: 1, step: 0.01 }
    ]
  },
  trend_following: {
    name: 'Trend Following',
    description: 'Follows market trends using moving averages. Buys when fast MA crosses above slow MA, sells when fast MA crosses below slow MA.',
    parameters: [
      { name: 'fast_ma_window', label: 'Fast Moving Average Window', type: 'number', default: 10, min: 2, max: 50 },
      { name: 'slow_ma_window', label: 'Slow Moving Average Window', type: 'number', default: 30, min: 5, max: 200 },
      { name: 'ma_type', label: 'Moving Average Type', type: 'select', default: 'ema', options: [
        { value: 'sma', label: 'Simple Moving Average (SMA)' },
        { value: 'ema', label: 'Exponential Moving Average (EMA)' }
      ]},
      { name: 'atr_window', label: 'ATR Window', type: 'number', default: 14, min: 5, max: 50 },
      { name: 'risk_pct', label: 'Risk Per Trade %', type: 'number', default: 0.01, min: 0.001, max: 0.1, step: 0.001 },
      { name: 'position_size_pct', label: 'Max Position Size %', type: 'number', default: 0.2, min: 0.01, max: 1, step: 0.01 }
    ]
  },
  ml_lstm: {
    name: 'Machine Learning (LSTM)',
    description: 'Uses Long Short-Term Memory neural networks to predict price movements based on historical patterns.',
    parameters: [
      { name: 'sequence_length', label: 'Sequence Length', type: 'number', default: 20, min: 5, max: 100 },
      { name: 'prediction_horizon', label: 'Prediction Horizon (days)', type: 'number', default: 5, min: 1, max: 30 },
      { name: 'features', label: 'Features to Include', type: 'multiselect', default: ['close', 'volume', 'rsi', 'macd'], options: [
        { value: 'open', label: 'Open Price' },
        { value: 'high', label: 'High Price' },
        { value: 'low', label: 'Low Price' },
        { value: 'close', label: 'Close Price' },
        { value: 'volume', label: 'Volume' },
        { value: 'rsi', label: 'RSI' },
        { value: 'macd', label: 'MACD' },
        { value: 'bollinger', label: 'Bollinger Bands' }
      ]},
      { name: 'epochs', label: 'Training Epochs', type: 'number', default: 50, min: 10, max: 200 },
      { name: 'threshold', label: 'Signal Threshold', type: 'number', default: 0.6, min: 0.5, max: 0.95, step: 0.01 },
      { name: 'position_size_pct', label: 'Position Size %', type: 'number', default: 0.1, min: 0.01, max: 1, step: 0.01 }
    ]
  }
};

// Types
interface StrategyBuilderProps {
  existingStrategy?: Strategy;
}

// Validation schema
const strategySchema = Yup.object().shape({
  name: Yup.string().required('Required').min(3, 'Too short').max(50, 'Too long'),
  description: Yup.string().max(200, 'Description is too long'),
  algorithm_type: Yup.string().required('Required'),
  is_public: Yup.boolean(),
  parameters: Yup.object()
});

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({ existingStrategy }) => {
  const router = useRouter();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>(existingStrategy?.algorithm_type || 'mean_reversion');
  
  // Generate initial values for the form
  const generateInitialValues = () => {
    if (existingStrategy) {
      return {
        name: existingStrategy.name,
        description: existingStrategy.description || '',
        algorithm_type: existingStrategy.algorithm_type,
        is_public: existingStrategy.is_public,
        parameters: existingStrategy.parameters
      };
    }
    
    // Default values for new strategy
    const algorithmConfig = algorithmConfigs[selectedAlgorithm as keyof typeof algorithmConfigs];
    const defaultParameters = {};
    
    algorithmConfig.parameters.forEach(param => {
      defaultParameters[param.name] = param.default;
    });
    
    return {
      name: '',
      description: '',
      algorithm_type: selectedAlgorithm,
      is_public: false,
      parameters: defaultParameters
    };
  };
  
  // Handle algorithm type change
  const handleAlgorithmChange = (e: React.ChangeEvent<HTMLSelectElement>, setFieldValue: any) => {
    const newAlgorithmType = e.target.value;
    setSelectedAlgorithm(newAlgorithmType);
    
    // Update form values with default parameters for the new algorithm
    const algorithmConfig = algorithmConfigs[newAlgorithmType as keyof typeof algorithmConfigs];
    const defaultParameters = {};
    
    algorithmConfig.parameters.forEach(param => {
      defaultParameters[param.name] = param.default;
    });
    
    setFieldValue('algorithm_type', newAlgorithmType);
    setFieldValue('parameters', defaultParameters);
  };
  
  // Handle form submission
  const handleSubmit = async (values: any, { setSubmitting }: FormikHelpers<any>) => {
    try {
      if (existingStrategy) {
        // Update existing strategy
        await api.put<Strategy>(`/strategies/${existingStrategy.id}`, values);
        toast.success('Strategy updated successfully');
      } else {
        // Create new strategy
        const newStrategy = await api.post<Strategy>('/strategies', values);
        toast.success('Strategy created successfully');
        router.push(`/strategies/${newStrategy.id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save strategy');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Render parameter inputs based on algorithm type
  const renderParameterInputs = (parameters: any, setFieldValue: any) => {
    const algorithmConfig = algorithmConfigs[selectedAlgorithm as keyof typeof algorithmConfigs];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {algorithmConfig.parameters.map(param => (
          <div key={param.name} className="form-control">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {param.label}
            </label>
            
            {param.type === 'select' ? (
              <Field
                as="select"
                name={`parameters.${param.name}`}
                className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
              >
                {param.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Field>
            ) : param.type === 'multiselect' ? (
              <div className="grid grid-cols-2 gap-2">
                {param.options.map(option => (
                  <div key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`${param.name}-${option.value}`}
                      checked={parameters[param.name]?.includes(option.value)}
                      onChange={(e) => {
                        const currentValues = parameters[param.name] || [];
                        const newValues = e.target.checked
                          ? [...currentValues, option.value]
                          : currentValues.filter(v => v !== option.value);
                        setFieldValue(`parameters.${param.name}`, newValues);
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                    />
                    <label htmlFor={`${param.name}-${option.value}`} className="ml-2 text-sm text-neutral-700">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <Field
                type="number"
                name={`parameters.${param.name}`}
                min={param.min}
                max={param.max}
                step={param.step || 1}
                className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
              />
            )}
            <ErrorMessage name={`parameters.${param.name}`} component="div" className="mt-1 text-xs text-danger-600" />
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      <Formik
        initialValues={generateInitialValues()}
        validationSchema={strategySchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <div className="space-y-6">
              {/* Strategy Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Strategy Information</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="form-control">
                    <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                      Strategy Name
                    </label>
                    <Field
                      type="text"
                      name="name"
                      id="name"
                      className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                      placeholder="My Trading Strategy"
                    />
                    <ErrorMessage name="name" component="div" className="mt-1 text-xs text-danger-600" />
                  </div>
                  
                  <div className="form-control">
                    <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">
                      Description
                    </label>
                    <Field
                      as="textarea"
                      name="description"
                      id="description"
                      rows={3}
                      className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                      placeholder="A brief description of your strategy..."
                    />
                    <ErrorMessage name="description" component="div" className="mt-1 text-xs text-danger-600" />
                  </div>
                  
                  <div className="form-control">
                    <label htmlFor="algorithm_type" className="block text-sm font-medium text-neutral-700 mb-1">
                      Algorithm Type
                    </label>
                    <Field
                      as="select"
                      name="algorithm_type"
                      id="algorithm_type"
                      className="w-full border-neutral-300 rounded-md shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
                      onChange={(e) => handleAlgorithmChange(e, setFieldValue)}
                    >
                      {Object.entries(algorithmConfigs).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.name}
                        </option>
                      ))}
                    </Field>
                    <p className="mt-2 text-sm text-neutral-500">
                      {algorithmConfigs[selectedAlgorithm as keyof typeof algorithmConfigs].description}
                    </p>
                  </div>
                  
                  <div className="form-control">
                    <div className="flex items-center">
                      <Field
                        type="checkbox"
                        name="is_public"
                        id="is_public"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                      />
                      <label htmlFor="is_public" className="ml-2 text-sm text-neutral-700">
                        Make this strategy public in the marketplace
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      Public strategies can be viewed and copied by other users. You may earn commissions when others use your strategy.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Algorithm Parameters */}
              <div>
                <h3 className="text-lg font-medium text-neutral-900 mb-4">Algorithm Parameters</h3>
                {renderParameterInputs(values.parameters, setFieldValue)}
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 bg-white hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {isSubmitting ? 'Saving...' : existingStrategy ? 'Update Strategy' : 'Create Strategy'}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default StrategyBuilder;