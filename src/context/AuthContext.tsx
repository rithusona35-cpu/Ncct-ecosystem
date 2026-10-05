'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, TokenResponse, UserRole, ROLE_DASHBOARDS } from '../lib/types';
import { cookieStorage } from '../lib/cookies';
import { authApi } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: TokenResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  redirectToRoleDashboard: (role?: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load session from cookie / storage on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = cookieStorage.getAccessToken();
      const storedUser = cookieStorage.getUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        try {
          // Verify against backend /me
          const freshUser = await authApi.getMe();
          setUser(freshUser);
          cookieStorage.setUser(freshUser);
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          cookieStorage.clearAuth();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const redirectToRoleDashboard = (targetRole?: UserRole) => {
    const role = targetRole || user?.role;
    if (role && ROLE_DASHBOARDS[role]) {
      router.push(ROLE_DASHBOARDS[role]);
    } else {
      router.push('/login');
    }
  };

  const login = (data: TokenResponse) => {
    cookieStorage.setAccessToken(data.access_token);
    cookieStorage.setRefreshToken(data.refresh_token);
    cookieStorage.setUser(data.user);
    setToken(data.access_token);
    setUser(data.user);

    // Redirect to the role-specific dashboard
    redirectToRoleDashboard(data.user.role);
  };

  const logout = () => {
    cookieStorage.clearAuth();
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const fresh = await authApi.getMe();
      setUser(fresh);
      cookieStorage.setUser(fresh);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        redirectToRoleDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
