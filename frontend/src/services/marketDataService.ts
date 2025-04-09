import axios from 'axios';

export interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataQuery {
  symbol: string;
  startDate?: string;
  endDate?: string;
  interval?: '1d' | '1h' | '1m';
}

class MarketDataService {
  private baseUrl = '/api/market-data';

  async getTopAssets(limit: number = 10): Promise<MarketAsset[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/top-assets`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getHistoricalPrices(query: MarketDataQuery): Promise<HistoricalPrice[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/historical`, {
        params: query
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/price/${symbol}`);
      return response.data.price;
    } catch (error) {
      this.handleError(error);
    }
  }

  async searchAssets(query: string): Promise<MarketAsset[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { query }
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'An unexpected error occurred'
      );
    }
    throw error;
  }
}

export const marketDataService = new MarketDataService();