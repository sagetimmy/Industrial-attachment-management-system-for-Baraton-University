import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import api from '../api/axios';

// ─── Storage helper: localStorage on web, AsyncStorage on mobile ───
const Storage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (Platform.OS === 'web') return localStorage.setItem(key, value);
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (Platform.OS === 'web') return localStorage.removeItem(key);
    return AsyncStorage.removeItem(key);
  },
};

const storeAccessToken = async (data) => {
  const token = data?.accessToken || data?.token;
  if (!token) {
    throw new Error('Authentication token missing from server response');
  }
  await Storage.setItem('iams_token', token);
  return token;
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = await Storage.getItem('iams_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch {
          await Storage.removeItem('iams_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const newToken = await storeAccessToken(data);
    setToken(newToken);
    try {
      const me = await api.get('/auth/me');
      setUser(me.data);
      return me.data;
    } catch {
      const fallbackUser = { email, role: data.role };
      setUser(fallbackUser);
      return fallbackUser;
    }
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    return data;
  };

  const verifyEmail = async (email, code) => {
    const { data } = await api.post('/auth/verify', { email, code });
    const newToken = await storeAccessToken(data);
    setToken(newToken);
    const me = await api.get('/auth/me');
    setUser(me.data);
    return { ...data, user: me.data };
  };

  const resendVerificationCode = async (email) => {
    const { data } = await api.post('/auth/resend-code', { email });
    return data;
  };

  const forgotPassword = async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  };

  const resetPassword = async (email, code, password) => {
    const { data } = await api.post('/auth/reset-password', { email, code, password });
    return data;
  };

  const logout = async () => {
    await Storage.removeItem('iams_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, token, login, register, verifyEmail,
      resendVerificationCode, forgotPassword, resetPassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};