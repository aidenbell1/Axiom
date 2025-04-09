// src/components/charts/PriceChart.tsx
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

interface PriceChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
  showVolume?: boolean;
}

const PriceChart: React.FC<PriceChartProps> = ({
  symbol,
  timeframe = '1D',
  height = 400,
  showVolume = true,
}) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(timeframe);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Calculate date range based on timeframe
        const end = new Date();
        let start = new Date();
        let interval = '1d';

        switch (selectedTimeframe) {
          case '1D':
            start.setDate(end.getDate() - 1);
            interval = '5m';
            break;
          case '1W':
            start.setDate(end.getDate() - 7);
            interval = '15m';
            break;
          case '1M':
            start.setMonth(end.getMonth() - 1);
            interval = '1h';
            break;
          case '3M':
            start.setMonth(end.getMonth() - 3);
            interval = '1d';
            break;
          case '1Y':
            start.setFullYear(end.getFullYear() - 1);
            interval = '1d';
            break;
          case 'ALL':
            start.setFullYear(end.getFullYear() - 5);
            interval = '1wk';
            break;
          default:
            start.setMonth(end.getMonth() - 1);
            interval = '1d';
        }

        // Fetch historical data
        const response = await api.post('/market-data/historical-data', {
          symbol,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          interval
        });

        // Prepare chart data
        const data = response.data;

        if (data && data.length > 0) {
          // Create datasets
          const priceData = {
            labels: data.map((item: any) => new Date(item.date)),
            datasets: [
              {
                label: symbol,
                data: data.map((item: any) => item.close),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 3,
                pointHitRadius: 10,
                yAxisID: 'y',
              },
            ],
          };

          // Add volume dataset if requested
          if (showVolume && data[0].volume) {
            priceData.datasets.push({
              label: 'Volume',
              data: data.map((item: any) => item.volume),
              borderColor: 'rgba(75, 85, 99, 0.5)',
              backgroundColor: 'rgba(75, 85, 99, 0.2)',
              borderWidth: 1,
              type: 'bar' as const,
              yAxisID: 'y1',
              order: 1,
            });
          }

          setChartData(priceData);
        } else {
          setError('No data available for the selected period');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, selectedTimeframe, showVolume]);

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
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: showVolume,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: function(tooltipItems: any) {
            const date = new Date(tooltipItems[0].parsed.x);
            return selectedTimeframe === '1D' 
              ? format(date, 'h:mm a') 
              : format(date, 'MMM d, yyyy');
          },
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.datasetIndex === 0) {
              // Price data
              label += '$' + context.parsed.y.toFixed(2);
            } else {
              // Volume data
              label += context.parsed.y.toLocaleString();
            }
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
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
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
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{symbol}</h3>
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

export default PriceChart;