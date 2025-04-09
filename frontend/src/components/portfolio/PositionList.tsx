// src/components/portfolio/PositionList.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Position } from '../../types/portfolio';

interface PositionListProps {
  positions: Position[];
  onClosePosition?: (positionId: number) => void;
}

const PositionList: React.FC<PositionListProps> = ({ 
  positions,
  onClosePosition
}) => {
  const [sortField, setSortField] = useState<string>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Sort positions
  const sortedPositions = [...positions].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'symbol':
        return direction * a.symbol.localeCompare(b.symbol);
      case 'quantity':
        return direction * (a.quantity - b.quantity);
      case 'value':
        return direction * ((a.current_value || 0) - (b.current_value || 0));
      case 'pnl':
        return direction * ((a.unrealized_pnl || 0) - (b.unrealized_pnl || 0));
      case 'pnl_pct':
        return direction * ((a.unrealized_pnl_pct || 0) - (b.unrealized_pnl_pct || 0));
      default:
        return 0;
    }
  });
  
  // Calculate totals
  const totalValue = positions.reduce((sum, position) => sum + (position.current_value || 0), 0);
  const totalPnl = positions.reduce((sum, position) => sum + (position.unrealized_pnl || 0), 0);
  
  // Header cell component with sort indicator
  const HeaderCell: React.FC<{
    label: string;
    field: string;
    className?: string;
  }> = ({ label, field, className = '' }) => (
    <th 
      className={`p-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        {sortField === field && (
          <span className="ml-1">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
  
  if (positions.length === 0) {
    return (
      <div className="bg-neutral-50 rounded-md p-6 text-center">
        <p className="text-neutral-600 mb-2">No positions in this portfolio</p>
        <p className="text-sm text-neutral-500">
          Add positions to start tracking your investments
        </p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <HeaderCell label="Symbol" field="symbol" />
            <HeaderCell label="Quantity" field="quantity" className="text-right" />
            <HeaderCell label="Current Price" field="price" className="text-right" />
            <HeaderCell label="Value" field="value" className="text-right" />
            <HeaderCell label="Profit/Loss" field="pnl" className="text-right" />
            <HeaderCell label="P/L %" field="pnl_pct" className="text-right" />
            {onClosePosition && <th className="p-3"></th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {sortedPositions.map((position) => (
            <tr key={position.id} className="hover:bg-neutral-50">
              <td className="p-3 whitespace-nowrap">
                <div className="font-medium text-neutral-900">{position.symbol}</div>
                <div className="text-xs text-neutral-500">
                  Opened: {format(new Date(position.opened_at), 'MMM d, yyyy')}
                </div>
              </td>
              <td className="p-3 whitespace-nowrap text-right">
                {position.quantity.toLocaleString()}
              </td>
              <td className="p-3 whitespace-nowrap text-right">
                ${position.current_price?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}
              </td>
              <td className="p-3 whitespace-nowrap text-right font-medium">
                ${position.current_value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}
              </td>
              <td className="p-3 whitespace-nowrap text-right">
                <span className={position.unrealized_pnl && position.unrealized_pnl >= 0 ? 'text-success-600' : 'text-danger-600'}>
                  {position.unrealized_pnl && position.unrealized_pnl >= 0 ? '+' : ''}
                  ${position.unrealized_pnl?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}
                </span>
              </td>
              <td className="p-3 whitespace-nowrap text-right">
                <span className={position.unrealized_pnl_pct && position.unrealized_pnl_pct >= 0 ? 'text-success-600' : 'text-danger-600'}>
                  {position.unrealized_pnl_pct && position.unrealized_pnl_pct >= 0 ? '+' : ''}
                  {(position.unrealized_pnl_pct * 100)?.toFixed(2) || '0.00'}%
                </span>
              </td>
              {onClosePosition && (
                <td className="p-3 whitespace-nowrap text-right">
                  <button
                    onClick={() => onClosePosition(position.id)}
                    className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs rounded-md"
                  >
                    Close
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-neutral-50">
          <tr>
            <td className="p-3 font-medium">Total</td>
            <td className="p-3"></td>
            <td className="p-3"></td>
            <td className="p-3 text-right font-medium">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            <td className="p-3 text-right font-medium">
              <span className={totalPnl >= 0 ? 'text-success-600' : 'text-danger-600'}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </td>
            <td className="p-3"></td>
            {onClosePosition && <td className="p-3"></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default PositionList;