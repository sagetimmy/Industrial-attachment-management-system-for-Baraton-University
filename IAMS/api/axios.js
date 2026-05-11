import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_PORT = '5000';
const explicitBaseUrl = process.env.EXPO_PUBLIC_API_URL;

const getExpoDevBaseUrl = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  const match = scriptURL?.match(/^[a-z]+:\/\/([^/:]+)(?::\d+)?\//i);
  return match ? `http://${match[1]}:${API_PORT}` : null;
};

const getWebBaseUrl = () => {
  if (typeof window === 'undefined') return null;
  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
};

const defaultBaseUrl = Platform.OS === 'web'
  ? getWebBaseUrl()
  : getExpoDevBaseUrl();

const ensureProtocol = (url) => {
  const trimmedUrl = String(url || '').trim();
  if (!trimmedUrl) return '';
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `http://${trimmedUrl}`;
};

const rawBaseUrl = ensureProtocol(explicitBaseUrl || defaultBaseUrl || `localhost:${API_PORT}`);
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
