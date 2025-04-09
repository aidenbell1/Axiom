// src/components/portfolio/PortfolioOverview.tsx
import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

import { Portfolio } from '../../types/portfolio';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PortfolioOverviewProps {
  portfolio: Portfolio;
}

const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ portfolio }) => {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  
  // Calculate performance metrics
  const initialValue = portfolio.initial_capital;
  const currentValue = portfolio.current_value || initialValue;
  const totalReturn = currentValue - initialValue;
  const totalReturnPct = ((totalReturn / initialValue) * 100).toFixed(2);
  
  // Calculate daily change (placeholder - would come from API in real implementation)
  const dailyChange = (Math.random() * 2 - 1) * 0.5; // Random value between -0.5% and 0.5%
  const dailyChangePct = dailyChange.toFixed(2);
  
  // Generate sample chart data (normally would come from API)
  const generatePerformanceData = () => {
    // Create demo data based on timeframe
    let days = 30;
    switch (timeframe) {
      case '1D': days = 1; break;
      case '1W': days = 7; break;
      case '1M': days = 30; break;
      case '3M': days = 90; break;
      case '1Y': days = 365; break;
      case 'ALL': days = 365; break; // Placeholder
    }
    
    const data = [];
    let value = initialValue;
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Add some randomness to the value for demo
      const change = (Math.random() * 2 - 1) * (value * 0.01); // Random daily change up to ±1%
      value += change;
      
      data.push({
        date: date,
        value: value
      });
    }
    
    // Make sure the last value matches current_value
    data[data.length - 1].value = currentValue;
    
    return data;
  };
  
  const performanceData = generatePerformanceData();
  
  // Prepare chart data
  const chartData = {
    labels: performanceData.map(d => format(new Date(d.date), 'MMM d')),
    datasets: [
      {
        label: 'Portfolio Value',
        data: performanceData.map(d => d.value),
        borderColor: totalReturn >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: totalReturn >= 0 
          ? 'rgba(34, 197, 94, 0.1)' 
          : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        pointHitRadius: 10,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `$${context.raw.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: timeframe === '1D' ? 24 : 7,
          font: {
            size: 10
          }
        }
      },
      y: {
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          },
          font: {
            size: 10
          }
        }
      }
    }
  };
  
  return (
    <div>
      {/* Portfolio Header */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-semibold text-neutral-800">
            ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </h3>
          <span className={`text-sm font-medium ${totalReturn >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({totalReturnPct}%)
          </span>
        </div>
        <div className="text-xs text-neutral-500 flex items-center mt-1">
          <span className={`mr-2 ${dailyChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {dailyChange >= 0 ? '+' : ''}{dailyChangePct}% today
          </span>
          <span>Since {format(new Date(portfolio.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>
      
      {/* Performance Chart */}
      <div className="mb-4 h-32">
        <Line data={chartData} options={chartOptions} />
      </div>
      
      {/* Timeframe Selector */}
      <div className="flex justify-between mb-4">
        {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`text-xs py-1 px-2 rounded-md ${
              timeframe === tf
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
      
      {/* Cash & Allocation */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-neutral-50 rounded-md p-3">
          <h4 className="text-xs text-neutral-500">Cash</h4>
          <p className="text-lg font-medium">
            ${portfolio.cash_balance?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}
          </p>
          <p className="text-xs text-neutral-500">
            {((portfolio.cash_balance / currentValue) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
        <div className="bg-neutral-50 rounded-md p-3">
          <h4 className="text-xs text-neutral-500">Invested</h4>
          <p className="text-lg font-medium">
            ${((currentValue - portfolio.cash_balance) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-neutral-500">
            {(((currentValue - portfolio.cash_balance) / currentValue) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioOverview;