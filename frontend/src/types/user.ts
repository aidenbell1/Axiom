// src/types/user.ts

/**
 * User interface representing authenticated user information
 */
export interface User {
    id: string;
    email: string;
    username: string;
    full_name: string;
    is_active: boolean;
    is_verified: boolean;
    subscription_tier: SubscriptionTier;
    subscription_expires?: string; // ISO date string
    created_at: string; // ISO date string
  }
  
  /**
   * Available subscription tiers in the platform
   */
  export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'professional';
  
  /**
   * Interface for login request payload
   */
  export interface LoginRequest {
    username: string;
    password: string;
  }
  
  /**
   * Interface for login response from API
   */
  export interface LoginResponse {
    access_token: string;
    token_type: string;
  }
  
  /**
   * Interface for registration request payload
   */
  export interface RegisterRequest {
    email: string;
    username: string;
    full_name: string;
    password: string;
  }
  
  /**
   * Interface for user update request payload
   */
  export interface UserUpdateRequest {
    email?: string;
    full_name?: string;
    password?: string;
  }