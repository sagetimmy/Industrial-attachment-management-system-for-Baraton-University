import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const normalizedBaseUrl = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('iams_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem('iams_token');
    }
    return Promise.reject(err);
  }
);

export default api;
