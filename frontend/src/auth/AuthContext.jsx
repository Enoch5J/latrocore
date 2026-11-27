import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AUTH_LOGOUT_EVENT,
  AUTH_NETWORK_ERROR_EVENT,
  authClient,
  beginSession,
  cancelPendingRetries,
  endSession,
  getAccessToken,
  getIsLoggingOut,
  getSessionEpoch,
  isAuthRejectionError,
  performSilentRefresh,
  registerRefreshNetworkErrorHandler,
  registerSessionExpiredHandler,
  setAccessToken,
  setLoggingOutFlag,
} from '../lib/axios';

const AuthContext = createContext(null);

export function clearLegacyTokenArtifacts() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('latrocore_token');
  localStorage.removeItem('latrocore_user');
}

export function getInitialAuthLoading() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('hasSession') === 'true';
}

export async function restoreAuthSessionFlow({
  setLoading,
  setUser,
  setSessionExpired,
  setRefreshError,
}) {
  clearLegacyTokenArtifacts();
  const hasSession = getInitialAuthLoading();

  if (!hasSession) {
    setAccessToken(null);
    setUser?.(null);
    setRefreshError?.(null);
    setLoading?.(false);
    return false;
  }

  setLoading?.(true);
  setRefreshError?.(null);
  const epochAtStart = getSessionEpoch();

  try {
    const data = await performSilentRefresh();
    const token = data?.accessToken || data?.access_token;
    const userData = data?.user;

    if (!token || getIsLoggingOut() || getSessionEpoch() !== epochAtStart) {
      return false;
    }

    setAccessToken(token);
    setUser?.(userData);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hasSession', 'true');
    }
    setRefreshError?.(null);
    return true;
  } catch (err) {
    if (getIsLoggingOut() || getSessionEpoch() !== epochAtStart) {
      return false;
    }

    if (isAuthRejectionError(err)) {
      endSession('Startup refresh unauthorized');
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('hasSession');
      }
      setUser?.(null);
      setSessionExpired?.(true);
      setRefreshError?.(null);
    } else {
      // Network outage / timeout / 5xx: preserve hasSession and expose recoverable retry state
      setRefreshError?.(
        err?.response?.status >= 500
          ? 'Authentication server is temporarily unavailable. Please retry.'
          : 'Unable to reach the server to restore your session. Please retry.'
      );
    }
    return false;
  } finally {
    setLoading?.(false);
  }
}

export async function performServerLogoutFlow({ setLogoutError }) {
  setLogoutError?.(null);
  try {
    await authClient.post('/auth/logout');
    return true;
  } catch (err) {
    const errorMsg =
      err?.response?.data?.detail ||
      'Could not confirm server sign-out. Please retry to revoke your server session.';
    setLogoutError?.(errorMsg);
    return false;
  }
}

export async function loginAuthSessionFlow(
  identifier,
  password,
  { setUser, setSessionExpired, setRefreshError, setLogoutError }
) {
  setSessionExpired?.(false);
  setRefreshError?.(null);
  setLogoutError?.(null);
  clearLegacyTokenArtifacts();

  const cleanId = (identifier || '').trim();
  const response = await authClient.post('/auth/login', {
    identifier: cleanId,
    email: cleanId,
    password,
  });
  const accessToken = response.data?.accessToken || response.data?.access_token;
  const userData = response.data?.user;

  // Secure token storage: strictly in memory under a fresh session epoch
  beginSession(accessToken);
  setUser?.(userData);

  // Non-sensitive flag only
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('hasSession', 'true');
  }

  return userData;
}

export async function logoutAuthSessionFlow({ setUser, setRefreshError, setLogoutError }) {
  // Immediately block protected UI, cancel pending retries, and prevent delayed refresh from restoring user
  setLoggingOutFlag(true);
  cancelPendingRetries('Logged out');
  endSession('User logged out');
  setUser?.(null);
  setRefreshError?.(null);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('hasSession');
  }
  clearLegacyTokenArtifacts();

  try {
    return await performServerLogoutFlow({ setLogoutError });
  } finally {
    setLoggingOutFlag(false);
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(getInitialAuthLoading);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [logoutError, setLogoutError] = useState(null);

  const restoreSession = useCallback(async () => {
    return restoreAuthSessionFlow({
      setLoading,
      setUser,
      setSessionExpired,
      setRefreshError,
    });
  }, []);

  useEffect(() => {
    let active = true;

    const handleSessionExpired = () => {
      if (!active) return;
      clearLegacyTokenArtifacts();
      setUser(null);
      setRefreshError(null);
      setSessionExpired(true);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        navigateRef.current('/login', { replace: true });
      }
    };

    const handleNetworkRefreshError = (message) => {
      if (!active) return;
      setRefreshError(
        message || 'Network interruption while renewing your session. Please retry.'
      );
    };

    registerSessionExpiredHandler(handleSessionExpired);
    registerRefreshNetworkErrorHandler(handleNetworkRefreshError);

    const onWindowLogout = () => handleSessionExpired();
    const onWindowNetworkError = (evt) => handleNetworkRefreshError(evt?.detail?.message);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener(AUTH_LOGOUT_EVENT, onWindowLogout);
      window.addEventListener(AUTH_NETWORK_ERROR_EVENT, onWindowNetworkError);
    }

    restoreSession();

    return () => {
      active = false;
      registerSessionExpiredHandler(null);
      registerRefreshNetworkErrorHandler(null);
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener(AUTH_LOGOUT_EVENT, onWindowLogout);
        window.removeEventListener(AUTH_NETWORK_ERROR_EVENT, onWindowNetworkError);
      }
    };
  }, [restoreSession]);

  const login = async (identifier, password) =>
    loginAuthSessionFlow(identifier, password, {
      setUser,
      setSessionExpired,
      setRefreshError,
      setLogoutError,
    });

  const logout = async () => {
    await logoutAuthSessionFlow({
      setUser,
      setRefreshError,
      setLogoutError,
    });
  };

  const retryLogout = async () => performServerLogoutFlow({ setLogoutError });

  const setAuthUser = (userData, accessToken) => {
    if (accessToken) {
      beginSession(accessToken);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('hasSession', 'true');
      }
    }
    setUser(userData);
    setSessionExpired(false);
    setRefreshError(null);
  };

  const clearSessionExpired = () => {
    setSessionExpired(false);
  };

  const clearRefreshError = () => {
    setRefreshError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionExpired,
        clearSessionExpired,
        refreshError,
        clearRefreshError,
        retrySessionRefresh: restoreSession,
        logoutError,
        setLogoutError,
        retryLogout,
        login,
        logout,
        setAuthUser,
        getAccessToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
