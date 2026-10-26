/**
 * Frontend Axios Interceptor & Silent Refresh Queueing Test Suite
 * 
 * Tests:
 * 1. Storage compliance: Access Tokens kept strictly in memory.
 * 2. Deduplicates concurrent 401 requests to trigger exactly ONE /auth/refresh call.
 * 3. Queue settlement: all queued requests resolve with the new token.
 * 4. Queue rejection: all queued requests reject when refresh fails.
 * 5. Infinite loop prevention: originalRequest._retry prevents second 401 retry.
 * 6. Late 401 race condition: request retries immediately with already renewed token without extra refresh.
 * 7. Logout race condition: in-flight refresh does not restore session after logout.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  apiClient,
  authClient,
  setAccessToken,
  getAccessToken,
  setLoggingOutFlag,
  registerSessionExpiredHandler,
} from '../lib/axios';

// Node environment storage mock
const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
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
    setAccessToken(null);
    setLoggingOutFlag(false);
    localStorage.clear();
    sessionStorage.clear();
    apiClient.defaults.baseURL = 'https://localhost:5173';
    authClient.defaults.baseURL = 'https://localhost:5173';
  });

  it('stores access tokens strictly in memory, never in localStorage or sessionStorage', () => {
    setAccessToken('in-memory-token-secret-123');
    expect(getAccessToken()).toBe('in-memory-token-secret-123');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBeNull();
  });

  it('deduplicates concurrent 401 requests to trigger exactly ONE /auth/refresh call', async () => {
    let refreshCallCount = 0;
    const initialToken = 'expired-token-111';
    const renewedToken = 'fresh-renewed-token-222';
    setAccessToken(initialToken);

    // Mock authClient.post('/auth/refresh')
    authClient.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCallCount++;
        await new Promise((r) => setTimeout(r, 20));
        return {
          data: { accessToken: renewedToken, expiresIn: 900 },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      return Promise.reject(new Error('Unknown auth endpoint'));
    };

    let endpointHits = 0;
    // Mock apiClient adapter
    apiClient.defaults.adapter = async (config) => {
      // First attempt with initialToken fails with 401
      if (!config._retry && config.headers?.Authorization === `Bearer ${initialToken}`) {
        const error = new Error('Request failed with status code 401');
        error.config = config;
        error.response = {
          status: 401,
          statusText: 'Unauthorized',
          data: { detail: 'Token expired' },
          headers: {},
          config,
        };
        throw error;
      }

      // Retry with renewedToken succeeds
      if (config.headers?.Authorization === `Bearer ${renewedToken}`) {
        endpointHits++;
        return {
          data: { success: true, url: config.url },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      throw new Error(`Unexpected request with headers: ${JSON.stringify(config.headers)}`);
    };

    // Fire 3 simultaneous requests that encounter 401
    const [res1, res2, res3] = await Promise.all([
      apiClient.get('/dashboard/telemetry-1'),
      apiClient.get('/dashboard/telemetry-2'),
      apiClient.get('/dashboard/telemetry-3'),
    ]);

    // EXACTLY ONE refresh call was made
    expect(refreshCallCount).toBe(1);

    // All 3 requests resolved with the renewed token
    expect(res1.data.success).toBe(true);
    expect(res2.data.success).toBe(true);
    expect(res3.data.success).toBe(true);
    expect(endpointHits).toBe(3);
    expect(getAccessToken()).toBe(renewedToken);
  });

  it('rejects all queued requests and clears state when refresh fails', async () => {
    setAccessToken('stale-token');
    const onSessionExpired = vi.fn();
    registerSessionExpiredHandler(onSessionExpired);

    // Mock refresh failure
    authClient.defaults.adapter = async (config) => {
      const error = new Error('Refresh token invalid');
      error.response = { status: 401, data: { detail: 'Session expired' } };
      throw error;
    };

    apiClient.defaults.adapter = async (config) => {
      const error = new Error('Request failed with status code 401');
      error.config = config;
      error.response = { status: 401, data: { detail: 'Expired' } };
      throw error;
    };

    const promise1 = apiClient.get('/data-1');
    const promise2 = apiClient.get('/data-2');

    await expect(promise1).rejects.toThrow('Refresh token invalid');
    await expect(promise2).rejects.toThrow('Refresh token invalid');

    // Token wiped from memory
    expect(getAccessToken()).toBeNull();
    // Session expired callback invoked
    expect(onSessionExpired).toHaveBeenCalled();
  });

  it('prevents retry loops when a retried request still returns 401', async () => {
    setAccessToken('token-attempt-1');

    authClient.defaults.adapter = async (config) => ({
      data: { accessToken: 'token-attempt-2', expiresIn: 900 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    apiClient.defaults.adapter = async (config) => {
      const error = new Error('Request failed with status code 401');
      error.config = config;
      error.response = { status: 401, data: { detail: 'Unauthorized' } };
      throw error;
    };

    // First attempt will retry; second attempt has _retry=true and will reject directly
    await expect(apiClient.get('/restricted-path')).rejects.toThrow('Request failed with status code 401');
  });

  it('handles late 401 race condition by retrying with already-renewed token without extra refresh', async () => {
    let refreshCalls = 0;
    const oldToken = 'old-token';
    const alreadyRenewedToken = 'already-renewed-token';

    // Simulate that another request already updated inMemoryAccessToken
    setAccessToken(alreadyRenewedToken);

    authClient.defaults.adapter = async (config) => {
      refreshCalls++;
      return {
        data: { accessToken: 'unnecessary-token' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    apiClient.defaults.adapter = async (config) => {
      // If request has old token and not retried yet, fail with 401
      if (config._tokenUsed === oldToken && !config._retry) {
        const error = new Error('Request failed with status code 401');
        error.config = config;
        error.response = { status: 401, data: { detail: 'Late 401' } };
        throw error;
      }

      // If request has alreadyRenewedToken, succeed
      if (config.headers?.Authorization === `Bearer ${alreadyRenewedToken}`) {
        return {
          data: { success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      throw new Error('Unknown error');
    };

    const res = await apiClient.get('/some-delayed-resource', {
      headers: { Authorization: `Bearer ${oldToken}` },
      _tokenUsed: oldToken,
    });

    expect(res.data.success).toBe(true);
    // Refresh was skipped because token was already renewed!
    expect(refreshCalls).toBe(0);
  });

  it('aborts refresh and rejects request when logout is in progress', async () => {
    setAccessToken('token');
    setLoggingOutFlag(true);

    const refreshSpy = vi.fn();
    authClient.defaults.adapter = async (config) => {
      refreshSpy();
      return { data: {} };
    };

    apiClient.defaults.adapter = async (config) => {
      const error = new Error('Request failed with status code 401');
      error.config = config;
      error.response = { status: 401, data: { detail: 'Unauthorized' } };
      throw error;
    };

    await expect(apiClient.get('/dashboard')).rejects.toThrow();
    // /auth/refresh should not even be attempted while logging out
    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
