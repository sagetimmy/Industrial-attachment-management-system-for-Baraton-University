import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const defaultBaseUrl = 'http://192.168.100.123:5000';
const envBaseUrl = process.env.EXPO_PUBLIC_API_URL || defaultBaseUrl;
const rawBaseUrl = Platform.OS !== 'web' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(envBaseUrl)
  ? defaultBaseUrl
  : envBaseUrl;
const normalizedBaseUrl = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: 15000,
});

export const API_BASE_URL = normalizedBaseUrl;

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

