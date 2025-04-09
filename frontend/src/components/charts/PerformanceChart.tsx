// src/components/charts/PerformanceChart.tsx
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';

import api from '../../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

interface PerformanceChartProps {
  portfolioId?: number;
  backtestId?: number;
  strategyId?: number;
  height?: number;
  showBenchmark?: boolean;
  benchmarkSymbol?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  portfolioId,
  backtestId,
  strategyId,
  height = 300,
  showBenchmark = true,
  benchmarkSymbol = 'SPY',
}) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1M');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let performanceData;
        let startValue = 10000; // Default starting value

        // Fetch performance data based on provided ID
        if (portfolioId) {
          const response = await api.get(`/portfolio/${portfolioId}/performance?timeframe=${selectedTimeframe}`);
          performanceData = response.performance_data;
          startValue = response.initial_value;
        } else if (backtestId) {
          const response = await api.get(`/backtesting/${backtestId}`);
          performanceData = response.results?.equity_curve;
          startValue = response.initial_capital;
        } else if (strategyId) {
          const response = await api.get(`/strategies/${strategyId}/performance?timeframe=${selectedTimeframe}`);
          performanceData = response.performance_data;
          startValue = response.initial_value;
        } else {
          // No ID provided, generate demo data
          performanceData = generateDemoData(selectedTimeframe);
        }

        // If no performance data, generate demo data
        if (!performanceData || performanceData.length === 0) {
          performanceData = generateDemoData(selectedTimeframe);
        }

        // Fetch benchmark data if requested
        let benchmarkData = [];
        if (showBenchmark && benchmarkSymbol) {
          // Extract date range from performance data
          const startDate = new Date(performanceData[0].date);
          const endDate = new Date(performanceData[performanceData.length - 1].date);

          // Fetch historical price data for benchmark
          const response = await api.post('/market-data/historical-data', {
            symbol: benchmarkSymbol,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            interval: '1d'
          });

          // Normalize benchmark data to match portfolio performance
          if (response.data && response.data.length > 0) {
            const benchmarkStartPrice = response.data[0].close;
            benchmarkData = response.data.map((item: any) => ({
              date: item.date,
              value: (item.close / benchmarkStartPrice) * startValue
            }));
          }
        }

        // Prepare chart data
        const data = {
          labels: performanceData.map((item: any) => new Date(item.date)),
          datasets: [
            {
              label: 'Performance',
              data: performanceData.map((item: any) => item.value),
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.1,
              pointRadius: 0,
              pointHoverRadius: 3,
              pointHitRadius: 10,
            },
          ],
        };

        // Add benchmark dataset if available
        if (benchmarkData.length > 0) {
          data.datasets.push({
            label: benchmarkSymbol,
            data: benchmarkData.map((item: any) => item.value),
            borderColor: 'rgb(99, 102, 241)',
            borderDash: [5, 5],
            backgroundColor: 'transparent',
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHitRadius: 10,
          });
        }

        setChartData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [portfolioId, backtestId, strategyId, selectedTimeframe, showBenchmark, benchmarkSymbol]);

  // Generate demo data for preview
  const generateDemoData = (timeframe: string) => {
    const data = [];
    const end = new Date();
    let start = new Date();
    let points = 30;

    switch (timeframe) {
      case '1D':
        start.setDate(end.getDate() - 1);
        points = 24;
        break;
      case '1W':
        start.setDate(end.getDate() - 7);
        points = 7;
        break;
      case '1M':
        start.setMonth(end.getMonth() - 1);
        points = 30;
        break;
      case '3M':
        start.setMonth(end.getMonth() - 3);
        points = 90;
        break;
      case '1Y':
        start.setFullYear(end.getFullYear() - 1);
        points = 365;
        break;
      default:
        start.setMonth(end.getMonth() - 1);
    }

    // Create random performance data with an upward trend
    let value = 10000;
    const step = (end.getTime() - start.getTime()) / points;

    for (let i = 0; i < points; i++) {
      const date = new Date(start.getTime() + step * i);
      // Random daily change between -1% and +1.5% with a slight upward bias
      const change = (Math.random() * 2.5 - 1) / 100;
      value *= (1 + change);
      data.push({
        date: date.toISOString(),
        value: value
      });
    }

    return data;
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: selectedTimeframe === '1D' ? 'hour' : selectedTimeframe === '1W' ? 'day' : 'day',
        },
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value) {
            return '

     + value.toLocaleString();
          }
        }
      },
    },
    plugins: {
      legend: {
        display: showBenchmark,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: function(tooltipItems: any) {
            const date = new Date(tooltipItems[0].parsed.x);
            return format(date, 'MMM d, yyyy');
          },
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += '

     + context.parsed.y.toFixed(2);
            return label;
          }
        }
      }
    },
  };

  // Timeframe selectors
  const timeframes = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ height }}>
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-neutral-50 rounded-md" style={{ height }}>
        <div className="text-center">
          <p className="text-neutral-600 mb-2">{error}</p>
          <button
            onClick={() => setSelectedTimeframe(selectedTimeframe)} // Retry with same timeframe
            className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-2 py-1 text-xs rounded-md ${
                selectedTimeframe === tf
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: `${height}px` }}>
        {chartData && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
};

export default PerformanceChart;