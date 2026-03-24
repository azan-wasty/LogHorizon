import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { me as meApi, auth as authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('lh_token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await meApi.get();
      setUser(data.user);
    } catch {
      localStorage.removeItem('lh_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('lh_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (username, email, password) => {
    const data = await authApi.register({ username, email, password });
    // After register, auto-login
    const loginData = await authApi.login({ email, password });
    localStorage.setItem('lh_token', loginData.token);
    setUser(loginData.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('lh_token');
    setUser(null);
  };

  const isAdmin = user?.role === 'Admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, isAdmin, login, register, logout, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
