import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Card from '../../components/common/Card';
import { marketDataService } from '../../services/marketDataService';

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const MarketplacePage: NextPage = () => {
  const [marketAssets, setMarketAssets] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const assets = await marketDataService.getTopAssets();
        setMarketAssets(assets);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch market data');
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  if (loading) {
    return <div>Loading market data...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Market Marketplace</h1>
      
      <div className="grid md:grid-cols-3 gap-4">
        {marketAssets.map((asset) => (
          <Card 
            key={asset.symbol}
            title={asset.name}
            subtitle={asset.symbol}
            className="hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold">
                ${asset.price.toFixed(2)}
              </span>
              <span 
                className={`
                  font-medium 
                  ${asset.changePercent >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                  }
                `}
              >
                {asset.changePercent.toFixed(2)}%
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MarketplacePage;