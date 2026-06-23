console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// ─── Storage helper ────────────────────────────────────────────────
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
console.log('🔵 API Base URL:', activeBaseUrl);
console.log('🔵 EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('🔵 normalizedBaseUrls:', normalizedBaseUrls);

const api = axios.create({
  baseURL: activeBaseUrl,
  timeout: 30000,
});

export const getApiBaseUrl = () => activeBaseUrl;

// ─── Request interceptor: attach Supabase session token ───────────
const PUBLIC_ROUTES = ['/auth/register', '/auth/register-profile', '/auth/login'];

api.interceptors.request.use(async (config) => {
  console.log('🟢 Making request to:', config.baseURL + config.url);

  const isPublic = PUBLIC_ROUTES.some(route => config.url?.includes(route));

  if (!isPublic) {
    try {
      let session = null;
      const { data } = await supabase.auth.getSession();
      session = data?.session;

      // Retry once after a short delay if session not ready yet
      if (!session) {
        await new Promise(r => setTimeout(r, 1000));
        const { data: retryData } = await supabase.auth.getSession();
        session = retryData?.session;
      }

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        console.log('🔑 Token attached');
      } else {
        console.warn('⚠️ No session available for request:', config.url);
      }
    } catch {
      // If getSession fails, proceed without a token — the backend will 401
    }
  }

  return config;
});

// ─── Response interceptor ─────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isNetworkError = !!err.request && !err.response;
    const requestConfig = err.config;

    if (isNetworkError && requestConfig) {
      console.error('🔴 API network error:', {
        message: err.message,
        url: requestConfig.url,
        baseURL: requestConfig.baseURL,
        timeout: requestConfig.timeout,
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

    if (err.response?.status === 401 && !requestConfig?._isRetry) {
      requestConfig._isRetry = true;
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) throw error || new Error('No session after refresh');
        requestConfig.headers.Authorization = `Bearer ${data.session.access_token}`;
        return api.request(requestConfig);
      } catch {
        return Promise.reject(err);
      }
    }

    return Promise.reject(err);
  }
);

// ─── Retry helper for transient errors ────────────────────────────
const isRetryableError = (err) => {
  if (!err) return false;
  if (err.code === 'ECONNABORTED') return true;
  if (!err.response) return true;
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