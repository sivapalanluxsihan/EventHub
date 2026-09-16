import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/auth';
import { api } from '../services/api';
import { storage } from '../services/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial session restoration from AsyncStorage
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedToken = await storage.getToken();
        if (storedToken) {
          // Verify with backend
          const res = await api.getProfile(storedToken);
          if (isMounted && res.user) {
            setUser(res.user);
            setToken(storedToken);
            await storage.setUser(res.user);
          }
        }
      } catch (err) {
        // Token was invalid, expired, or backend unreachable
        console.warn('Session restoration failed; clearing local storage', err);
        await storage.clear();
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.login(email, password);
      if (res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        await storage.setToken(res.token);
        await storage.setUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid email or password' };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.register(name, email, password);
      if (res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        await storage.setToken(res.token);
        await storage.setUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await api.logout(token);
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      await storage.clear();
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (
    name: string,
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: 'No active authentication session' };
    }

    try {
      const res = await api.updateProfile(token, { name, email });
      if (res.user) {
        setUser(res.user);
        await storage.setUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Failed to update profile' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!token) return;
    try {
      const res = await api.getProfile(token);
      if (res.user) {
        setUser(res.user);
        await storage.setUser(res.user);
      }
    } catch {
      // Silent fail on background refresh
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
