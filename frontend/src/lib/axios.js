/**
 * Axios client with Silent Refresh, Concurrency Queueing, and Web Locks Tab Coordination.
 *
 * Security & Concurrency Rules Enforced:
 * 1. Access Tokens are kept EXCLUSIVELY in memory. Never in localStorage or sessionStorage.
 * 2. Only the non-sensitive flag `hasSession=true` is stored in localStorage.
 * 3. Bearer token is attached ONLY to requests targeting our own API.
 * 4. Separate raw `authClient` for login, refresh, and logout to prevent recursive loops.
 * 5. Concurrent 401 handling: first eligible 401 triggers single /auth/refresh; others join `failedQueue`.
 * 6. `originalRequest._retry = true` is set BEFORE queueing or replaying.
 * 7. Late 401s within the same session replay once with the newer token; old-session requests never replay under a new login.
 * 8. Only 401 on refresh establishes session expiration; network/5xx errors reject waiters, release the lock, and surface a recoverable error.
 */

import axios from 'axios';

export const AUTH_LOGOUT_EVENT = 'latrocore:auth-logout';
export const AUTH_NETWORK_ERROR_EVENT = 'latrocore:auth-network-error';

// In-Memory Token & Session State (never persisted)
let inMemoryAccessToken = null;
let currentSessionEpoch = 0;
let isLoggingOut = false;
let logoutDispatchedForEpoch = -1;

let onSessionExpiredHandler = null;
let onRefreshNetworkErrorHandler = null;

// Concurrency Queue & Refresh Coordinator State
let isRefreshing = false;
let inFlightRefreshPromise = null;
let failedQueue = [];

export const setAccessToken = (token) => {
  inMemoryAccessToken = token || null;
};

export const getAccessToken = () => inMemoryAccessToken;

export const getSessionEpoch = () => currentSessionEpoch;

export const getIsLoggingOut = () => isLoggingOut;

export const getIsRefreshing = () => isRefreshing;

export const setLoggingOutFlag = (status) => {
  isLoggingOut = Boolean(status);
};

export const beginSession = (token) => {
  currentSessionEpoch += 1;
  isLoggingOut = false;
  logoutDispatchedForEpoch = -1;
  setAccessToken(token);
};

export const cancelPendingRetries = (reason = 'Request cancelled due to logout') => {
  const err = reason instanceof Error ? reason : new Error(reason);
  const queued = failedQueue;
  failedQueue = [];
  queued.forEach((prom) => {
    try {
      prom.reject(err);
    } catch {
      // ignore waiter rejection failure
    }
  });
  isRefreshing = false;
  inFlightRefreshPromise = null;
};

export const endSession = (reason = 'Session ended') => {
  currentSessionEpoch += 1;
  setAccessToken(null);
  cancelPendingRetries(reason);
};

export const registerSessionExpiredHandler = (handler) => {
  onSessionExpiredHandler = handler;
};

export const registerRefreshNetworkErrorHandler = (handler) => {
  onRefreshNetworkErrorHandler = handler;
};

const processQueue = (error, token = null) => {
  const queued = failedQueue;
  failedQueue = [];
  queued.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
};

// Base URL configuration (relative when proxied by Vite, or explicit env var)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || '';

/**
 * Determine whether an Axios request targets our own API origin.
 */
export function isOwnApiRequest(config = {}) {
  const rawUrl = String(config.url || '');
  if (!rawUrl) return true;

  // Relative paths like '/api/v1/...' or '/auth/...' are always same-origin
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
    return true;
  }

  try {
    const baseForResolution =
      config.baseURL ||
      BASE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:5173');
    const resolvedTarget = new URL(rawUrl, baseForResolution);
    const allowedOrigin = new URL(baseForResolution).origin;
    if (resolvedTarget.origin === allowedOrigin) {
      return true;
    }
    if (typeof window !== 'undefined' && resolvedTarget.origin === window.location.origin) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isAuthLifecycleUrl(url = '') {
  const lower = String(url).toLowerCase();
  return (
    lower.includes('/auth/login') ||
    lower.includes('/auth/refresh') ||
    lower.includes('/auth/logout') ||
    lower.includes('/auth/register') ||
    lower.includes('/auth/send-otp') ||
    lower.includes('/auth/verify-otp') ||
    lower.includes('/auth/forgot-password') ||
    lower.includes('/auth/reset-password')
  );
}

export function isAuthRejectionError(err) {
  return err?.response?.status === 401;
}

function dispatchLogoutOnce(epoch, detail = { reason: 'session_expired' }) {
  if (logoutDispatchedForEpoch === epoch) return;
  logoutDispatchedForEpoch = epoch;
  if (onSessionExpiredHandler) {
    onSessionExpiredHandler(detail);
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT, { detail }));
  }
}

function dispatchNetworkRefreshError(err) {
  const message =
    err?.response?.status >= 500
      ? 'Authentication service is temporarily unavailable. Please retry.'
      : 'Network connection interrupted while renewing your session. Please retry.';
  if (onRefreshNetworkErrorHandler) {
    onRefreshNetworkErrorHandler(message, err);
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent(AUTH_NETWORK_ERROR_EVENT, { detail: { message } }));
  }
}

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

// Request Interceptor: Attach in-memory access token ONLY to own-API requests
apiClient.interceptors.request.use(
  (config) => {
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData && config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    if (inMemoryAccessToken && isOwnApiRequest(config)) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
      // Tag request with token version and session epoch for race detection
      config._tokenUsed = inMemoryAccessToken;
      if (config._sessionEpoch === undefined) {
        config._sessionEpoch = currentSessionEpoch;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Shared silent-refresh coordinator used by both AuthContext bootstrap and Axios 401 retries.
 * Shares one in-flight request across StrictMode double-mounts and concurrent callers,
 * and coordinates cross-tab cookie rotation via Web Locks when available.
 */
export async function performSilentRefresh() {
  if (isLoggingOut) {
    throw new Error('Refresh aborted: Logout in progress');
  }

  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  const epochAtStart = currentSessionEpoch;

  const executeRefresh = async () => {
    if (isLoggingOut || currentSessionEpoch !== epochAtStart) {
      throw new Error('Refresh aborted: Session changed');
    }
    const response = await authClient.post('/auth/refresh');
    if (isLoggingOut || currentSessionEpoch !== epochAtStart) {
      throw new Error('Refresh aborted: Session ended while refresh was in flight');
    }
    return response.data;
  };

  const runWithLock = async () => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'locks' in navigator) {
      return navigator.locks.request('latrocore-auth-refresh-lock', executeRefresh);
    }
    return executeRefresh();
  };

  inFlightRefreshPromise = runWithLock().finally(() => {
    inFlightRefreshPromise = null;
  });

  return inFlightRefreshPromise;
}

function applyAuthorizationHeader(config, token) {
  if (!config) return;
  if (typeof config.headers?.set === 'function') {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
}

// Response Interceptor: Queue 401s and execute single silent refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    // Only handle 401 Unauthorized responses; never refresh on 403 or network/5xx errors
    if (!error?.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Only handle requests targeting our own API
    if (!isOwnApiRequest(originalRequest)) {
      return Promise.reject(error);
    }

    // Do NOT intercept auth endpoints to prevent recursive loops
    if (isAuthLifecycleUrl(originalRequest.url || '')) {
      return Promise.reject(error);
    }

    // Ensure a second 401 on a replay propagates directly and cannot start a loop
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Handle 401 only when request belongs to the current signed-in session
    if (isLoggingOut || !originalRequest._tokenUsed) {
      return Promise.reject(error);
    }
    if (
      originalRequest._sessionEpoch !== undefined &&
      originalRequest._sessionEpoch !== currentSessionEpoch
    ) {
      return Promise.reject(error);
    }

    // RACE CONDITION 1: Late 401 from an old token in the SAME session after token already renewed
    if (
      inMemoryAccessToken &&
      originalRequest._tokenUsed !== inMemoryAccessToken &&
      (originalRequest._sessionEpoch === undefined || originalRequest._sessionEpoch === currentSessionEpoch)
    ) {
      originalRequest._retry = true;
      applyAuthorizationHeader(originalRequest, inMemoryAccessToken);
      return apiClient(originalRequest);
    }

    // Mark retry flag BEFORE queueing or initiating refresh
    originalRequest._retry = true;

    // If another request is already refreshing, enqueue this request's resolver/rejecter
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken) => {
            if (isLoggingOut || originalRequest._sessionEpoch !== currentSessionEpoch) {
              reject(new Error('Session ended before queued request could replay'));
              return;
            }
            applyAuthorizationHeader(originalRequest, newToken);
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    // First eligible 401 initiates the single refresh
    isRefreshing = true;
    const refreshEpoch = currentSessionEpoch;
    let newAccessToken = null;

    try {
      const data = await performSilentRefresh();
      newAccessToken = data?.accessToken || data?.access_token;

      if (!newAccessToken || isLoggingOut || currentSessionEpoch !== refreshEpoch) {
        const abortErr = new Error('Refresh aborted due to session change');
        isRefreshing = false;
        processQueue(abortErr, null);
        return Promise.reject(abortErr);
      }

      // Update in-memory token BEFORE resolving queued requests
      setAccessToken(newAccessToken);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('hasSession', 'true');
      }
    } catch (refreshError) {
      isRefreshing = false;
      processQueue(refreshError, null);

      if (isAuthRejectionError(refreshError)) {
        // Refresh rejected (401): clear session and dispatch single logout event
        currentSessionEpoch += 1;
        setAccessToken(null);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('hasSession');
        }
        if (!isLoggingOut) {
          dispatchLogoutOnce(refreshEpoch, { reason: 'session_expired' });
        }
      } else if (!isLoggingOut) {
        // Timeout, network outage, or 5xx: preserve hasSession, release lock, surface recoverable error
        dispatchNetworkRefreshError(refreshError);
      }

      return Promise.reject(refreshError);
    }

    // Release refresh lock before starting concurrent replays so replay errors propagate directly
    isRefreshing = false;
    applyAuthorizationHeader(originalRequest, newAccessToken);
    const originalReplay = apiClient(originalRequest);
    processQueue(null, newAccessToken);
    return originalReplay;
  }
);
