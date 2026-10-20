// ── Auth Context (Cookie-based JWT with /api/auth) ─────────────
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/auth/me')
      .then((res) => {
        if (isMounted) {
          setUser(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);


  // Login
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data);
    return res.data;
  };

  // Register
  const register = async ({ name, email, phone, password }) => {
    const payload = {
      name,
      email,
      password,
    };
    if (phone && phone.trim()) {
      payload.phone = phone.trim();
    }
    const res = await api.post('/auth/register', payload);
    setUser(res.data);
    return res.data;
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}

    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
