import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IndicatorChartProps {
  data: Array<{
    timestamp: string;
    value: number;
    indicator: string;
  }>;
  primaryIndicator?: string;
  secondaryIndicators?: string[];
}

const IndicatorChart: React.FC<IndicatorChartProps> = ({ 
  data, 
  primaryIndicator = 'value', 
  secondaryIndicators = [] 
}) => {
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'
  ];

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          
          <Line 
            type="monotone" 
            dataKey={primaryIndicator} 
            stroke={colors[0]} 
            activeDot={{ r: 8 }} 
          />
          
          {secondaryIndicators.map((indicator, index) => (
            <Line 
              key={indicator}
              type="monotone"
              dataKey={indicator}
              stroke={colors[(index + 1) % colors.length]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IndicatorChart;