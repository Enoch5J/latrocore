/**
 * Frontend Axios Interceptor & Silent Refresh Queueing Test Suite
 *
 * Covers:
 * 1. In-memory token storage only; only hasSession="true" permitted in localStorage.
 * 2. Own-API Bearer attachment guard (external requests never get Authorization or refresh).
 * 3. Five simultaneous 401 requests -> exactly ONE /auth/refresh, five concurrent replays,
 *    preserved method/body/params, and at most one replay per original request.
 * 4. 403 Forbidden never triggers refresh.
 * 5. Second 401 on a retried request propagates directly and cannot start a loop.
 * 6. Late 401 in the same session replays once without starting another refresh.
 * 7. Late 401 from an old user's session NEVER replays under a newer login.
 * 8. Refresh 401 rejection rejects all waiting requests, clears token + hasSession, dispatches ONE logout event.
 * 9. Network / 5xx refresh failure rejects waiters, preserves hasSession, releases lock, and allows later retry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiClient,
  authClient,
  beginSession,
  endSession,
  getAccessToken,
  getIsRefreshing,
  registerRefreshNetworkErrorHandler,
  registerSessionExpiredHandler,
  setAccessToken,
  setLoggingOutFlag,
} from '../lib/axios';

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

if (!globalThis.localStorage) {
  globalThis.localStorage = createStorageMock();
}
if (!globalThis.sessionStorage) {
  globalThis.sessionStorage = createStorageMock();
}

describe('Axios Silent Refresh & Concurrency Interceptor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    endSession('test_reset');
    setLoggingOutFlag(false);
    registerSessionExpiredHandler(null);
    registerRefreshNetworkErrorHandler(null);
    localStorage.clear();
    sessionStorage.clear();
    apiClient.defaults.baseURL = 'https://localhost:5173';
    authClient.defaults.baseURL = 'https://localhost:5173';
    apiClient.defaults.adapter = null;
    authClient.defaults.adapter = null;
  });

  it('stores access tokens strictly in memory, never in localStorage or sessionStorage', () => {
    beginSession('in-memory-token-secret-123');
    expect(getAccessToken()).toBe('in-memory-token-secret-123');
    expect(localStorage.getItem('latrocore_token')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
  });

  it('attaches Bearer token only to own-API requests and never refreshes 401 from external origins', async () => {
    beginSession('own-api-secret-jwt');
    let refreshCount = 0;

    authClient.defaults.adapter = async (config) => {
      refreshCount++;
      return { data: { access_token: 'should-not-happen' }, status: 200, headers: {}, config };
    };

    const capturedHeaders = [];
    apiClient.defaults.adapter = async (config) => {
      capturedHeaders.push({ url: config.url, auth: config.headers?.Authorization });
      if (config.url?.startsWith('https://external-service.example.com')) {
        const err = new Error('External 401');
        err.config = config;
        err.response = { status: 401, data: { detail: 'External unauthorized' }, headers: {}, config };
        throw err;
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await apiClient.get('/api/v1/auth/me');
    await expect(apiClient.get('https://external-service.example.com/resource')).rejects.toThrow('External 401');

    expect(capturedHeaders[0].auth).toBe('Bearer own-api-secret-jwt');
    expect(capturedHeaders[1].auth).toBeUndefined();
    expect(refreshCount).toBe(0);
  });

  it('queues five concurrent 401 requests into ONE refresh and replays each original request once concurrently', async () => {
    let refreshCallCount = 0;
    const expiredToken = 'expired-token-111';
    const renewedToken = 'fresh-renewed-token-222';
    beginSession(expiredToken);
    localStorage.setItem('hasSession', 'true');

    authClient.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCallCount++;
        await new Promise((r) => setTimeout(r, 25));
        return {
          data: { access_token: renewedToken, expires_in: 900 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      return Promise.reject(new Error('Unexpected auth endpoint'));
    };

    const replayCounts = new Map();
    const seenRetries = [];

    apiClient.defaults.adapter = async (config) => {
      const authHeader = config.headers?.Authorization;
      if (authHeader === `Bearer ${expiredToken}`) {
        const error = new Error('Request failed with status code 401');
        error.config = config;
        error.response = {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Invalid or expired access token' },
          headers: {},
          config,
        };
        throw error;
      }

      if (authHeader === `Bearer ${renewedToken}`) {
        const requestKey = `${config.method}:${config.url}`;
        replayCounts.set(requestKey, (replayCounts.get(requestKey) || 0) + 1);
        seenRetries.push({
          url: config.url,
          method: config.method.toUpperCase(),
          params: config.params,
          data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
          retryFlag: config._retry,
        });
        // Small async delay to ensure concurrent replay execution
        await new Promise((r) => setTimeout(r, 5));
        return {
          data: { ok: true, url: config.url, params: config.params },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      throw new Error(`Unexpected token: ${authHeader}`);
    };

    const results = await Promise.all([
      apiClient.get('/api/v1/patient/metrics', { params: { window: '7d' } }),
      apiClient.post('/api/v1/patient/glucose', { reading: 118, unit: 'mg/dL' }),
      apiClient.get('/api/v1/auth/me'),
      apiClient.put('/api/v1/patient/preferences', { unit: 'mmol' }, { params: { sync: true } }),
      apiClient.get('/api/v1/dashboard'),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(getAccessToken()).toBe(renewedToken);
    expect(getIsRefreshing()).toBe(false);
    expect(results).toHaveLength(5);
    results.forEach((res) => expect(res.data.ok).toBe(true));

    // At most and exact 1 replay per original request (5 total)
    expect(seenRetries).toHaveLength(5);
    expect([...replayCounts.values()]).toEqual([1, 1, 1, 1, 1]);
    expect(seenRetries.every((r) => r.retryFlag === true)).toBe(true);

    // Original methods, params, and request bodies preserved on replay
    const postRetry = seenRetries.find((r) => r.url === '/api/v1/patient/glucose');
    expect(postRetry.method).toBe('POST');
    expect(postRetry.data).toEqual({ reading: 118, unit: 'mg/dL' });

    const putRetry = seenRetries.find((r) => r.url === '/api/v1/patient/preferences');
    expect(putRetry.method).toBe('PUT');
    expect(putRetry.params).toEqual({ sync: true });
    expect(putRetry.data).toEqual({ unit: 'mmol' });
  });

  it('never triggers refresh on 403 Forbidden responses', async () => {
    beginSession('valid-patient-token');
    const refreshSpy = vi.fn();
    authClient.defaults.adapter = async (config) => {
      refreshSpy();
      return { data: { access_token: 'unused' }, status: 200, headers: {}, config };
    };

    apiClient.defaults.adapter = async (config) => {
      const error = new Error('Forbidden');
      error.config = config;
      error.response = { status: 403, data: { detail: 'Insufficient permissions' }, headers: {}, config };
      throw error;
    };

    await expect(apiClient.get('/api/v1/admin/approvals/summary')).rejects.toThrow('Forbidden');
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('rejects all waiting requests, clears session/hasSession, and dispatches ONE logout event on 401 refresh rejection', async () => {
    beginSession('stale-token');
    localStorage.setItem('hasSession', 'true');

    const expiredHandler = vi.fn();
    const networkHandler = vi.fn();
    registerSessionExpiredHandler(expiredHandler);
    registerRefreshNetworkErrorHandler(networkHandler);

    authClient.defaults.adapter = async (config) => {
      await new Promise((r) => setTimeout(r, 15));
      const error = new Error('Refresh token invalid');
      error.response = { status: 401, data: { detail: 'Session expired' }, headers: {}, config };
      throw error;
    };

    apiClient.defaults.adapter = async (config) => {
      const error = new Error('Request failed with status code 401');
      error.config = config;
      error.response = { status: 401, data: { detail: 'Expired' }, headers: {}, config };
      throw error;
    };

    const p1 = apiClient.get('/api/v1/data-1');
    const p2 = apiClient.get('/api/v1/data-2');
    const p3 = apiClient.get('/api/v1/data-3');

    await expect(p1).rejects.toThrow('Refresh token invalid');
    await expect(p2).rejects.toThrow('Refresh token invalid');
    await expect(p3).rejects.toThrow('Refresh token invalid');

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('hasSession')).toBeNull();
    expect(getIsRefreshing()).toBe(false);
    expect(expiredHandler).toHaveBeenCalledTimes(1);
    expect(networkHandler).not.toHaveBeenCalled();
  });

  it('releases lock, preserves hasSession, and allows later retry when refresh fails due to network error', async () => {
    beginSession('token-before-offline');
    localStorage.setItem('hasSession', 'true');

    const expiredHandler = vi.fn();
    const networkHandler = vi.fn();
    registerSessionExpiredHandler(expiredHandler);
    registerRefreshNetworkErrorHandler(networkHandler);

    let failRefreshNetwork = true;
    authClient.defaults.adapter = async (config) => {
      await new Promise((r) => setTimeout(r, 15));
      if (failRefreshNetwork) {
        const netErr = new Error('Network Error');
        netErr.code = 'ERR_NETWORK';
        throw netErr;
      }
      return {
        data: { access_token: 'recovered-after-network-token', expires_in: 900 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    apiClient.defaults.adapter = async (config) => {
      if (config.headers?.Authorization === 'Bearer recovered-after-network-token') {
        return { data: { recovered: true }, status: 200, statusText: 'OK', headers: {}, config };
      }
      const err = new Error('Expired');
      err.config = config;
      err.response = { status: 401, data: { detail: 'Expired' }, headers: {}, config };
      throw err;
    };

    // First wave fails due to offline refresh
    const p1 = apiClient.get('/api/v1/sync-1');
    const p2 = apiClient.get('/api/v1/sync-2');
    await expect(p1).rejects.toThrow('Network Error');
    await expect(p2).rejects.toThrow('Network Error');

    // Session was NOT logged out and lock is released
    expect(expiredHandler).not.toHaveBeenCalled();
    expect(networkHandler).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('hasSession')).toBe('true');
    expect(getIsRefreshing()).toBe(false);

    // Network recovers -> subsequent request succeeds via refresh
    failRefreshNetwork = false;
    const recoveredRes = await apiClient.get('/api/v1/sync-3');
    expect(recoveredRes.data.recovered).toBe(true);
    expect(getAccessToken()).toBe('recovered-after-network-token');
  });

  it('prevents retry loops when a replayed request returns 401 again without triggering logout banner', async () => {
    beginSession('token-attempt-1');
    localStorage.setItem('hasSession', 'true');
    const expiredHandler = vi.fn();
    registerSessionExpiredHandler(expiredHandler);

    let refreshCount = 0;
    authClient.defaults.adapter = async (config) => {
      refreshCount++;
      return {
        data: { access_token: 'token-attempt-2', expires_in: 900 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    let apiHits = 0;
    apiClient.defaults.adapter = async (config) => {
      apiHits++;
      const error = new Error('Request failed with status code 401');
      error.config = config;
      error.response = { status: 401, data: { detail: 'Unauthorized' }, headers: {}, config };
      throw error;
    };

    await expect(apiClient.get('/api/v1/restricted-path')).rejects.toThrow('Request failed with status code 401');
    expect(refreshCount).toBe(1);
    expect(apiHits).toBe(2); // Initial attempt + exactly 1 replay
    expect(getIsRefreshing()).toBe(false);
    expect(expiredHandler).not.toHaveBeenCalled();
  });

  it('replays a late 401 from the same session with the newer token without starting another refresh', async () => {
    let refreshCalls = 0;
    const oldToken = 'old-token';
    const renewedToken = 'already-renewed-token';

    beginSession(renewedToken);

    authClient.defaults.adapter = async (config) => {
      refreshCalls++;
      return { data: { access_token: 'unnecessary-token' }, status: 200, headers: {}, config };
    };

    apiClient.defaults.adapter = async (config) => {
      if (config._tokenUsed === oldToken && !config._retry) {
        const error = new Error('Late 401');
        error.config = config;
        error.response = { status: 401, data: { detail: 'Late 401' }, headers: {}, config };
        throw error;
      }
      if (config.headers?.Authorization === `Bearer ${renewedToken}`) {
        return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
      }
      throw new Error('Unexpected request');
    };

    const res = await apiClient.get('/api/v1/some-delayed-resource', {
      headers: { Authorization: `Bearer ${oldToken}` },
      _tokenUsed: oldToken,
    });

    expect(res.data.success).toBe(true);
    expect(refreshCalls).toBe(0);
  });

  it('never replays an old user session late 401 under a newer login', async () => {
    const refreshSpy = vi.fn();
    const replayedWithUserB = vi.fn();

    beginSession('user-a-token');
    let rejectDelayedUserARequest;
    let markUserAInFlight;
    const userAInFlightPromise = new Promise((resolve) => {
      markUserAInFlight = resolve;
    });

    apiClient.defaults.adapter = async (config) => {
      if (config.headers?.Authorization === 'Bearer user-a-token') {
        markUserAInFlight();
        return new Promise((_, reject) => {
          rejectDelayedUserARequest = () => {
            const err = new Error('Delayed User A 401');
            err.config = config;
            err.response = { status: 401, data: { detail: 'Expired User A token' }, headers: {}, config };
            reject(err);
          };
        });
      }
      replayedWithUserB(config.headers?.Authorization);
      return { data: { user: 'B' }, status: 200, statusText: 'OK', headers: {}, config };
    };

    authClient.defaults.adapter = async (config) => {
      refreshSpy();
      return { data: { access_token: 'should-not-refresh' }, status: 200, headers: {}, config };
    };

    const userARequestPromise = apiClient.get('/api/v1/patient/old-user-data');
    await userAInFlightPromise;

    // Before User A's request returns 401, user logs out and logs in as User B
    endSession('User A logged out');
    beginSession('user-b-token');

    rejectDelayedUserARequest();
    await expect(userARequestPromise).rejects.toThrow('Delayed User A 401');

    expect(replayedWithUserB).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe('user-b-token');
  });

  it('aborts refresh and cancels queued requests when logout occurs while refresh is in flight', async () => {
    beginSession('expired-token');
    localStorage.setItem('hasSession', 'true');

    let resolveInFlightRefresh;
    authClient.defaults.adapter = async (config) =>
      new Promise((resolve) => {
        resolveInFlightRefresh = () =>
          resolve({
            data: { access_token: 'delayed-should-ignore' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          });
      });

    apiClient.defaults.adapter = async (config) => {
      const error = new Error('Initial 401');
      error.config = config;
      error.response = { status: 401, data: { detail: 'Expired' }, headers: {}, config };
      throw error;
    };

    const p1 = apiClient.get('/api/v1/protected-1');
    const p2 = apiClient.get('/api/v1/protected-2');

    // Allow microtasks to kick off refresh and enqueue p2
    await new Promise((r) => setTimeout(r, 10));

    // User clicks logout while refresh is in flight
    setLoggingOutFlag(true);
    endSession('User clicked logout');
    localStorage.removeItem('hasSession');

    resolveInFlightRefresh();

    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow('User clicked logout');
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('hasSession')).toBeNull();
  });
});
