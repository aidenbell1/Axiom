import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatting';

interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: string;
  strategy: string;
}

interface TradeHistoryProps {
  trades: Trade[];
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ trades }) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="w-full table-auto">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Symbol</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-right">Quantity</th>
            <th className="px-4 py-2 text-right">Price</th>
            <th className="px-4 py-2 text-left">Strategy</th>
            <th className="px-4 py-2 text-left">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr 
              key={trade.id} 
              className="border-b hover:bg-gray-50 transition-colors"
            >
              <td className="px-4 py-2">{trade.symbol}</td>
              <td className="px-4 py-2">
                <span 
                  className={`
                    px-2 py-1 rounded text-xs font-bold
                    ${trade.type === 'BUY' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                    }
                  `}
                >
                  {trade.type}
                </span>
              </td>
              <td className="px-4 py-2 text-right">{trade.quantity}</td>
              <td className="px-4 py-2 text-right">
                {formatCurrency(trade.price)}
              </td>
              <td className="px-4 py-2">{trade.strategy}</td>
              <td className="px-4 py-2">
                {formatDate(trade.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {trades.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No trades found
        </div>
      )}
    </div>
  );
};

export default TradeHistory;