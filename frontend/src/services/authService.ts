import axios from 'axios';
import { setCookie, destroyCookie } from 'nookies';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupCredentials {
  name: string;
  email: string;
  password: string;
}

interface UpdateProfileParams {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

class AuthService {
  private baseUrl = '/api/auth';

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await axios.post(`${this.baseUrl}/login`, credentials);
      
      // Store the token in a cookie
      setCookie(null, 'token', response.data.token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      return response.data.user;
    } catch (error) {
      this.handleError(error);
    }
  }

  async signup(credentials: SignupCredentials): Promise<User> {
    try {
      const response = await axios.post(`${this.baseUrl}/signup`, credentials);
      
      // Store the token in a cookie
      setCookie(null, 'token', response.data.token, {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      return response.data.user;
    } catch (error) {
      this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/logout`);
    } finally {
      // Remove the token cookie
      destroyCookie(null, 'token');
    }
  }

  async updateProfile(params: UpdateProfileParams): Promise<User> {
    try {
      const response = await axios.put(`${this.baseUrl}/profile`, params);
      return response.data.user;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/me`);
      return response.data.user;
    } catch (error) {
      return null;
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

export const authService = new AuthService();