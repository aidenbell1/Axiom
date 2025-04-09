import axios from 'axios';

export interface BacktestConfiguration {
  strategyId: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  assets: string[];
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  trades: BacktestTrade[];
  createdAt: string;
}

export interface BacktestTrade {
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: string;
}

class BacktestService {
  private baseUrl = '/api/backtests';

  async runBacktest(config: BacktestConfiguration): Promise<BacktestResult> {
    try {
      const response = await axios.post(this.baseUrl, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getBacktests(): Promise<BacktestResult[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getBacktestById(id: string): Promise<BacktestResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteBacktest(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/${id}`);
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

export const backtestService = new BacktestService();