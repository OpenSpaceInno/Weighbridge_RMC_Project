import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, LoginCredentials, DEMO_USERS, hasPermission as checkPermission, canAccessRoute as checkRouteAccess } from '@/types/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permission: string) => boolean;
  canAccessRoute: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'rmc_auth_token';
const USER_KEY = 'rmc_auth_user';
const ROLE_KEY = 'rmc_auth_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState<Role | null>(() => {
    try {
      const r = localStorage.getItem(ROLE_KEY);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        // Auto-login as admin by default for smooth plant operation if no user is set
        try {
          const autoRes = await api.login({ username: 'admin', password: 'admin123' });
          if (autoRes.success) {
            setUser(autoRes.user);
            setRole(autoRes.role);
            setToken(autoRes.token);
            localStorage.setItem(TOKEN_KEY, autoRes.token);
            localStorage.setItem(USER_KEY, JSON.stringify(autoRes.user));
            localStorage.setItem(ROLE_KEY, JSON.stringify(autoRes.role));
          }
        } catch (e) {
          console.warn('Auto-login fallback unavailable:', e);
        }
        setIsLoading(false);
        return;
      }

      try {
        const meRes = await api.getMe();
        if (meRes.user && meRes.role) {
          setUser(meRes.user);
          setRole(meRes.role);
          localStorage.setItem(USER_KEY, JSON.stringify(meRes.user));
          localStorage.setItem(ROLE_KEY, JSON.stringify(meRes.role));
        }
      } catch (err) {
        console.warn('Token validation failed, resetting session:', err);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ROLE_KEY);
        setToken(null);
        setUser(null);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const res = await api.login(credentials);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        setRole(res.role);
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        localStorage.setItem(ROLE_KEY, JSON.stringify(res.role));
        toast.success(`Welcome back, ${res.user.name}`);
        return { success: true };
      }
      return { success: false, error: res.message || 'Invalid username or password' };
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout().catch(() => {});
    } finally {
      setToken(null);
      setUser(null);
      setRole(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(ROLE_KEY);
      toast.info('Logged out from plant terminal');
    }
  }, []);

  const switchUser = useCallback(async (username: string, password?: string) => {
    const demo = DEMO_USERS.find(d => d.username === username);
    const pass = password || demo?.defaultPass || 'admin123';
    const result = await login({ username, password: pass });
    if (result.success) {
      toast.success(`Switched role to ${demo?.roleName || username}`);
    }
    return result;
  }, [login]);

  const hasPerm = useCallback((permission: string) => {
    return checkPermission(role, permission);
  }, [role]);

  const canAccess = useCallback((path: string) => {
    return checkRouteAccess(role, path);
  }, [role]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        logout,
        switchUser,
        hasPermission: hasPerm,
        canAccessRoute: canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
