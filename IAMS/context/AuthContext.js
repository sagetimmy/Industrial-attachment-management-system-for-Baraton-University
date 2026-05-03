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
        } catch {
          await AsyncStorage.removeItem('iams_token');
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('iams_token', data.token);
    const me = await api.get('/auth/me');
    setUser(me.data);
    return me.data;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    await AsyncStorage.setItem('iams_token', data.token);
    const me = await api.get('/auth/me');
    setUser(me.data);
    return me.data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('iams_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);