// src/services/api.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Base URL - can be overridden by environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (unauthorized)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear local auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Redirect to login page if in browser
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Generic API request function
const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await axiosInstance(config);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // Server responded with a status code other than 2xx
      throw new Error(error.response.data.detail || 'An error occurred with the request');
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('No response received from server');
    } else {
      // Other errors
      throw new Error('Error setting up request');
    }
  }
};

// Export pre-configured request methods for different HTTP methods
export const api = {
  get: <T>(url: string, params?: any): Promise<T> => {
    return apiRequest<T>({ url, method: 'GET', params });
  },
  post: <T>(url: string, data?: any): Promise<T> => {
    return apiRequest<T>({ url, method: 'POST', data });
  },
  put: <T>(url: string, data?: any): Promise<T> => {
    return apiRequest<T>({ url, method: 'PUT', data });
  },
  patch: <T>(url: string, data?: any): Promise<T> => {
    return apiRequest<T>({ url, method: 'PATCH', data });
  },
  delete: <T>(url: string): Promise<T> => {
    return apiRequest<T>({ url, method: 'DELETE' });
  },
};

export default api;