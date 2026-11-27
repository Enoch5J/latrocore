/**
 * Frontend AuthContext Lifecycle & Reload Race Tests
 *
 * Verifies:
 * 1. Page reload with `hasSession="true"` starts in loading state and shares one /auth/refresh under React StrictMode double-mount.
 * 2. Page reload without `hasSession` immediately signs out without calling /auth/refresh.
 * 3. Logout while startup refresh is in flight blocks restoration even when delayed refresh succeeds.
 * 4. Network error during startup refresh preserves `hasSession` and recovers on retry.
 * 5. Server logout failure keeps user signed out locally and exposes retryable `logoutError`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  authClient,
  endSession,
  getAccessToken,
  setLoggingOutFlag,
} from '../lib/axios';
import {
  getInitialAuthLoading,
  loginAuthSessionFlow,
  logoutAuthSessionFlow,
  performServerLogoutFlow,
  restoreAuthSessionFlow,
} from '../auth/AuthContext';

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

describe('AuthContext silent refresh, reload & logout coordination', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    endSession('test_reset');
    setLoggingOutFlag(false);
    localStorage.clear();
    authClient.defaults.baseURL = 'https://localhost:5173';
    authClient.defaults.adapter = null;
  });

  it('treats missing hasSession flag as immediately signed out without calling /auth/refresh', async () => {
    const refreshSpy = vi.fn();
    authClient.defaults.adapter = async (config) => {
      refreshSpy();
      return { data: {}, status: 200, headers: {}, config };
    };

    expect(getInitialAuthLoading()).toBe(false);

    let loading = true;
    let user = { id: 'stale' };
    const ok = await restoreAuthSessionFlow({
      setLoading: (val) => { loading = val; },
      setUser: (val) => { user = val; },
      setSessionExpired: vi.fn(),
      setRefreshError: vi.fn(),
    });

    expect(ok).toBe(false);
    expect(loading).toBe(false);
    expect(user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('deduplicates StrictMode double-mount reload with hasSession="true" into a single /auth/refresh', async () => {
    localStorage.setItem('hasSession', 'true');
    expect(getInitialAuthLoading()).toBe(true);

    let refreshCount = 0;
    authClient.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/refresh')) {
        refreshCount++;
        await new Promise((r) => setTimeout(r, 20));
        return {
          data: {
            access_token: 'reloaded-jwt-token',
            expires_in: 900,
            user: { id: 'pat-1', email: 'patient@latrocore.com', role: 'patient' },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      throw new Error('Unexpected endpoint');
    };

    let loading = true;
    let user = null;
    let refreshError = null;
    const setters = {
      setLoading: (val) => { loading = val; },
      setUser: (val) => { user = val; },
      setSessionExpired: vi.fn(),
      setRefreshError: (val) => { refreshError = val; },
    };

    // Simulate React StrictMode mount -> cleanup -> remount firing restoreSession twice concurrently
    const [ok1, ok2] = await Promise.all([
      restoreAuthSessionFlow(setters),
      restoreAuthSessionFlow(setters),
    ]);

    expect(ok1).toBe(true);
    expect(ok2).toBe(true);
    expect(refreshCount).toBe(1);
    expect(loading).toBe(false);
    expect(refreshError).toBeNull();
    expect(user).toEqual({ id: 'pat-1', email: 'patient@latrocore.com', role: 'patient' });
    expect(getAccessToken()).toBe('reloaded-jwt-token');
    expect(localStorage.getItem('hasSession')).toBe('true');
  });

  it('prevents a delayed refresh response from restoring a user who logged out while refresh was in flight', async () => {
    localStorage.setItem('hasSession', 'true');

    let resolveRefresh;
    authClient.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/refresh')) {
        return new Promise((resolve) => {
          resolveRefresh = () =>
            resolve({
              data: {
                access_token: 'late-restored-token',
                expires_in: 900,
                user: { id: 'pat-1', email: 'patient@latrocore.com', role: 'patient' },
              },
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
            });
        });
      }
      if (config.url?.includes('/auth/logout')) {
        return { data: '', status: 204, statusText: 'No Content', headers: {}, config };
      }
      throw new Error('Unexpected request');
    };

    let user = { id: 'pat-1', email: 'patient@latrocore.com', role: 'patient' };
    let loading = true;
    let refreshError = null;
    let logoutError = null;

    const restorePromise = restoreAuthSessionFlow({
      setLoading: (val) => { loading = val; },
      setUser: (val) => { user = val; },
      setSessionExpired: vi.fn(),
      setRefreshError: (val) => { refreshError = val; },
    });

    await new Promise((r) => setTimeout(r, 10));

    // User clicks logout while /auth/refresh is still pending
    const logoutOk = await logoutAuthSessionFlow({
      setUser: (val) => { user = val; },
      setRefreshError: (val) => { refreshError = val; },
      setLogoutError: (val) => { logoutError = val; },
    });

    expect(logoutOk).toBe(true);
    expect(logoutError).toBeNull();
    expect(user).toBeNull();
    expect(localStorage.getItem('hasSession')).toBeNull();

    // Delayed /auth/refresh resolves afterwards
    resolveRefresh();
    const restoreOk = await restorePromise;

    expect(restoreOk).toBe(false);
    expect(loading).toBe(false);
    expect(refreshError).toBeNull();
    expect(user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('hasSession')).toBeNull();
  });

  it('preserves hasSession on network failure during startup reload and allows recovery retry', async () => {
    localStorage.setItem('hasSession', 'true');
    let failOffline = true;

    authClient.defaults.adapter = async (config) => {
      if (failOffline) {
        const netErr = new Error('Network Error');
        netErr.code = 'ERR_NETWORK';
        throw netErr;
      }
      return {
        data: {
          access_token: 'retried-token',
          expires_in: 900,
          user: { id: 'doc-1', email: 'doctor@latrocore.com', role: 'doctor' },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    let loading = true;
    let user = null;
    let refreshError = null;
    let sessionExpired = false;

    const firstTry = await restoreAuthSessionFlow({
      setLoading: (val) => { loading = val; },
      setUser: (val) => { user = val; },
      setSessionExpired: (val) => { sessionExpired = val; },
      setRefreshError: (val) => { refreshError = val; },
    });

    expect(firstTry).toBe(false);
    expect(loading).toBe(false);
    expect(sessionExpired).toBe(false);
    expect(refreshError).toContain('Unable to reach the server');
    expect(localStorage.getItem('hasSession')).toBe('true');

    // Retry succeeds after connectivity returns
    failOffline = false;
    const secondTry = await restoreAuthSessionFlow({
      setLoading: (val) => { loading = val; },
      setUser: (val) => { user = val; },
      setSessionExpired: (val) => { sessionExpired = val; },
      setRefreshError: (val) => { refreshError = val; },
    });

    expect(secondTry).toBe(true);
    expect(refreshError).toBeNull();
    expect(getAccessToken()).toBe('retried-token');
    expect(user?.role).toBe('doctor');
  });

  it('blocks protected UI immediately when server logout fails and exposes retryLogout error', async () => {
    let failServerLogout = true;
    authClient.defaults.adapter = async (config) => {
      if (config.url?.includes('/auth/login')) {
        return {
          data: {
            access_token: 'login-jwt',
            user: { id: 'u1', email: 'user@latrocore.com', role: 'patient' },
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }
      if (config.url?.includes('/auth/logout')) {
        if (failServerLogout) {
          const err = new Error('Gateway Timeout');
          err.response = { status: 504, data: { detail: 'Logout timeout' }, headers: {}, config };
          throw err;
        }
        return { data: '', status: 204, statusText: 'No Content', headers: {}, config };
      }
      throw new Error('Unexpected request');
    };

    let user = null;
    let logoutError = null;
    await loginAuthSessionFlow('user@latrocore.com', 'Pass123!', {
      setUser: (val) => { user = val; },
      setSessionExpired: vi.fn(),
      setRefreshError: vi.fn(),
      setLogoutError: (val) => { logoutError = val; },
    });
    expect(getAccessToken()).toBe('login-jwt');
    expect(localStorage.getItem('hasSession')).toBe('true');

    const firstLogout = await logoutAuthSessionFlow({
      setUser: (val) => { user = val; },
      setRefreshError: vi.fn(),
      setLogoutError: (val) => { logoutError = val; },
    });

    // Local session is immediately cleared even though server failed
    expect(firstLogout).toBe(false);
    expect(user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('hasSession')).toBeNull();
    expect(logoutError).toBe('Logout timeout');

    // Retrying server logout clears logoutError
    failServerLogout = false;
    const retryOk = await performServerLogoutFlow({
      setLogoutError: (val) => { logoutError = val; },
    });
    expect(retryOk).toBe(true);
    expect(logoutError).toBeNull();
  });
});
