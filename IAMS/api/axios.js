import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage helper: localStorage on web, AsyncStorage on mobile ───
const Storage = {
  getItem: (key) => {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
    return AsyncStorage.getItem(key);
  },
  removeItem: (key) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

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
  timeout: 30000,
});

export const getApiBaseUrl = () => activeBaseUrl;

// ─── Request interceptor: attach token ────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await Storage.getItem('iams_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor: retry on network error, clear on 401 ───
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isNetworkError = !!err.request && !err.response;
    const requestConfig = err.config;

    if (isNetworkError && requestConfig) {
      console.error('API network error:', {
        message: err.message,
        url: requestConfig.url,
        baseURL: requestConfig.baseURL,
        timeout: requestConfig.timeout,
        baseUrlIndex: requestConfig.__baseUrlIndex,
      });
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
      await Storage.removeItem('iams_token');
    }

    return Promise.reject(err);
  }
);

const isRetryableError = (err) => {
  if (!err) return false;
  if (err.code === 'ECONNABORTED') return true;
  if (!err.response) return true; // network error
  const status = err.response.status;
  return status >= 500 || status === 408 || status === 429;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const requestWithRetry = async (makeRequest, options = {}) => {
  const retries = Number.isInteger(options.retries) ? options.retries : 3;
  const baseDelay = Number.isFinite(options.baseDelay) ? options.baseDelay : 500;

  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await makeRequest(attempt);
    } catch (err) {
      if (attempt >= retries || !isRetryableError(err)) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delay);
      attempt += 1;
    }
  }
};

export default api;