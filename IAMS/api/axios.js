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

const getWebFallbackBaseUrls = () => {
  if (typeof window === 'undefined') return [];
  const { protocol, hostname } = window.location;
  const primary = `${protocol}//${hostname}:${API_PORT}`;
  const fallbacks = [`http://localhost:${API_PORT}`, `http://127.0.0.1:${API_PORT}`];
  return [primary, ...fallbacks];
};

const ensureProtocol = (url) => {
  const trimmedUrl = String(url || '').trim();
  if (!trimmedUrl) return '';
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `http://${trimmedUrl}`;
};

const defaultBaseUrls = Platform.OS === 'web'
  ? getWebFallbackBaseUrls()
  : [getExpoDevBaseUrl(), `http://localhost:${API_PORT}`, `http://127.0.0.1:${API_PORT}`];

const dedupe = (items) => [...new Set(items.filter(Boolean))];

const rawBaseUrls = dedupe(
  explicitBaseUrl
    ? [ensureProtocol(explicitBaseUrl)]
    : defaultBaseUrls.map(ensureProtocol)
);

const normalizedBaseUrls = dedupe(
  rawBaseUrls.map((baseUrl) => (
    baseUrl.endsWith('/api')
      ? baseUrl
      : `${baseUrl.replace(/\/$/, '')}/api`
  ))
);

let activeBaseUrl = normalizedBaseUrls[0] || `http://localhost:${API_PORT}/api`;

const api = axios.create({
  baseURL: activeBaseUrl,
  timeout: 15000,
});

export const getApiBaseUrl = () => activeBaseUrl;

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('iams_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isNetworkError = !!err.request && !err.response;
    const requestConfig = err.config;

    if (isNetworkError && requestConfig) {
      const currentIndex = Number.isInteger(requestConfig.__baseUrlIndex)
        ? requestConfig.__baseUrlIndex
        : normalizedBaseUrls.indexOf(activeBaseUrl);
      const nextIndex = currentIndex + 1;

      if (nextIndex < normalizedBaseUrls.length) {
        const nextBaseUrl = normalizedBaseUrls[nextIndex];
        activeBaseUrl = nextBaseUrl;
        api.defaults.baseURL = nextBaseUrl;
        requestConfig.__baseUrlIndex = nextIndex;
        requestConfig.baseURL = nextBaseUrl;
        return api.request(requestConfig);
      }
    }

    if (err.response?.status === 401) {
      await AsyncStorage.removeItem('iams_token');
    }
    return Promise.reject(err);
  }
);

export default api;
