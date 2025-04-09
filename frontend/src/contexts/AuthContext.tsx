import React, { 
  createContext, 
  useState, 
  useContext, 
  useEffect 
} from 'react';
import { useRouter } from 'next/router';
import { authService } from '../services/authService';

// User interface matching the backend user model
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// Authentication context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login method
  const login = async (email: string, password: string) => {
    try {
      const loggedInUser = await authService.login({ email, password });
      setUser(loggedInUser);
      router.push('/dashboard');
    } catch (error) {
      // Clear user state in case of login failure
      setUser(null);
      throw error;
    }
  };

  // Signup method
  const signup = async (name: string, email: string, password: string) => {
    try {
      const newUser = await authService.signup({ name, email, password });
      setUser(newUser);
      router.push('/dashboard');
    } catch (error) {
      // Clear user state in case of signup failure
      setUser(null);
      throw error;
    }
  };

  // Logout method
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // Update profile method
  const updateProfile = async (data: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    try {
      const updatedUser = await authService.updateProfile(data);
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};