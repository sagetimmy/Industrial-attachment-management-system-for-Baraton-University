import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = await AsyncStorage.getItem('iams_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          await AsyncStorage.removeItem('iams_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('iams_token', data.token);

    try {
      const me = await api.get('/auth/me');
      setUser(me.data);
      return me.data;
    } catch (err) {
      const fallbackUser = {
        email,
        role: data.role,
      };
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
    await AsyncStorage.setItem('iams_token', data.token);
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
    await AsyncStorage.removeItem('iams_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyEmail,
        resendVerificationCode,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
