import axios from 'axios';

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

export interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  cash: number;
  positions: PortfolioPosition[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioDto {
  name: string;
  initialCapital: number;
}

class PortfolioService {
  private baseUrl = '/api/portfolios';

  async createPortfolio(portfolio: CreatePortfolioDto): Promise<Portfolio> {
    try {
      const response = await axios.post(this.baseUrl, portfolio);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPortfolios(): Promise<Portfolio[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getPortfolioById(id: string): Promise<Portfolio> {
    try {
      const response = await axios.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updatePortfolio(id: string, data: Partial<CreatePortfolioDto>): Promise<Portfolio> {
    try {
      const response = await axios.put(`${this.baseUrl}/${id}`, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deletePortfolio(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      this.handleError(error);
    }
  }

  async addPosition(portfolioId: string, symbol: string, quantity: number): Promise<Portfolio> {
    try {
      const response = await axios.post(`${this.baseUrl}/${portfolioId}/positions`, {
        symbol,
        quantity
      });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async removePosition(portfolioId: string, symbol: string): Promise<Portfolio> {
    try {
      const response = await axios.delete(`${this.baseUrl}/${portfolioId}/positions/${symbol}`);
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

export const portfolioService = new PortfolioService();