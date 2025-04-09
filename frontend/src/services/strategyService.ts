import axios from 'axios';

export interface StrategyParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  value: string | number | boolean;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'rule-based' | 'ml-based';
  parameters: StrategyParameter[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyDto {
  name: string;
  description: string;
  type: 'rule-based' | 'ml-based';
  parameters: StrategyParameter[];
}

class StrategyService {
  private baseUrl = '/api/strategies';

  async createStrategy(strategy: CreateStrategyDto): Promise<Strategy> {
    try {
      const response = await axios.post(this.baseUrl, strategy);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getStrategies(): Promise<Strategy[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getStrategyById(id: string): Promise<Strategy> {
    try {
      const response = await axios.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateStrategy(id: string, strategy: Partial<CreateStrategyDto>): Promise<Strategy> {
    try {
      const response = await axios.put(`${this.baseUrl}/${id}`, strategy);
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteStrategy(id: string): Promise<void> {
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

export const strategyService = new StrategyService();