/**
 * Axios client with Silent Refresh, Concurrency Queueing, and Web Locks Tab Coordination.
 * 
 * Strict Security Rules Enforced:
 * 1. Access Tokens are kept EXCLUSIVELY in memory. Never in localStorage or sessionStorage.
 * 2. Only the non-sensitive flag `hasSession=true` is stored in localStorage.
 * 3. CSRF defense: `X-Requested-With: XMLHttpRequest` attached to every request.
 * 4. Separate raw `authClient` for login/refresh/logout to prevent recursive loops.
 * 5. Concurrent 401 handling: first 401 triggers single /auth/refresh; subsequent 401s queue up.
 * 6. Web Locks API coordinates cookie rotation across browser tabs (with safe fallback).
 * 7. Race conditions (e.g. late 401 when token already renewed, in-flight refresh after logout) handled.
 */

import axios from 'axios';

// In-Memory Token Storage (never persisted)
let inMemoryAccessToken = null;
let isLoggingOut = false;
let onSessionExpiredHandler = null;

// Concurrency Queue Management
let isRefreshing = false;
let failedQueue = [];

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

export const setLoggingOutFlag = (status) => {
  isLoggingOut = status;
};

export const registerSessionExpiredHandler = (handler) => {
  onSessionExpiredHandler = handler;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Base URL configuration (relative when proxied by Vite, or explicit env var)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ── Raw Auth Client (without automatic 401 refresh interceptor) ──────
export const authClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ── Protected API Client (with token injection and retry interceptor) ──
export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Request Interceptor: Attach in-memory access token & record token used
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
      // Tag request with token version to detect late 401 race conditions
      config._tokenUsed = inMemoryAccessToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Execute refresh call inside a Web Lock to synchronize cookie rotation across tabs.
 * Fallback gracefully when Web Locks API is unsupported.
 */
async function performSilentRefresh() {
  const callRefreshEndpoint = async () => {
    if (isLoggingOut) {
      throw new Error('Refresh aborted: Logout in progress');
    }
    const response = await authClient.post('/auth/refresh');
    return response.data;
  };

  if (typeof window !== 'undefined' && 'locks' in navigator) {
    // Web Locks API coordinates tabs to ensure only one tab rotates the refresh cookie
    return navigator.locks.request('latrocore-auth-refresh-lock', async () => {
      return callRefreshEndpoint();
    });
  }

  // Fallback for browsers without Web Locks API
  return callRefreshEndpoint();
}

// Response Interceptor: Queue 401s and execute single silent refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If there is no response or not a 401, reject immediately
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Do NOT intercept auth endpoints to avoid infinite loops
    const requestUrl = originalRequest.url || '';
    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    // Do not retry more than once
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // RACE CONDITION 1: Late 401 from an old request, but the token was already refreshed
    if (
      inMemoryAccessToken &&
      originalRequest._tokenUsed &&
      originalRequest._tokenUsed !== inMemoryAccessToken
    ) {
      originalRequest._retry = true;
      originalRequest.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
      return apiClient(originalRequest);
    }

    // RACE CONDITION 2: Logout was triggered while request was in-flight
    if (isLoggingOut) {
      return Promise.reject(error);
    }

    // If another request is currently refreshing the token, join queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // First 401 initiates refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const data = await performSilentRefresh();
      const newAccessToken = data.accessToken;

      // Update in-memory state & session flag
      setAccessToken(newAccessToken);
      localStorage.setItem('hasSession', 'true');

      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Resolve queued requests with new token
      processQueue(null, newAccessToken);

      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed or revoked: Clear memory and notify AuthContext
      setAccessToken(null);
      localStorage.removeItem('hasSession');

      processQueue(refreshError, null);

      if (onSessionExpiredHandler && !isLoggingOut) {
        onSessionExpiredHandler();
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
