import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  authClient,
  setAccessToken,
  setLoggingOutFlag,
  registerSessionExpiredHandler
} from '../lib/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [logoutError, setLogoutError] = useState(null);

  // Prevent duplicate execution under React StrictMode during initial bootstrap
  const initRanRef = useRef(false);

  useEffect(() => {
    // Register callback for when background refresh fails inside axios interceptor
    registerSessionExpiredHandler(() => {
      setUser(null);
      setSessionExpired(true);
    });

    const restoreSession = async () => {
      const hasSession = localStorage.getItem('hasSession') === 'true';
      if (!hasSession) {
        setLoading(false);
        return;
      }

      try {
        // Silently refresh token on application bootstrap
        const response = await authClient.post('/auth/refresh');
        const { accessToken, user: userData } = response.data;

        setAccessToken(accessToken);
        setUser(userData);
        localStorage.setItem('hasSession', 'true');
      } catch (err) {
        // Cookie missing, revoked, or expired: clear local session flag
        setAccessToken(null);
        localStorage.removeItem('hasSession');
        setUser(null);
        // Only set sessionExpired if user had a previous session
        if (hasSession) {
          setSessionExpired(true);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!initRanRef.current) {
      initRanRef.current = true;
      restoreSession();
    }
  }, []);

  const login = async (email, password) => {
    setSessionExpired(false);
    setLogoutError(null);
    setLoggingOutFlag(false);

    const response = await authClient.post('/auth/login', { email, password });
    const { accessToken, user: userData } = response.data;

    // Secure token storage: strictly in memory
    setAccessToken(accessToken);
    setUser(userData);

    // Non-sensitive flag only
    localStorage.setItem('hasSession', 'true');

    return userData;
  };

  const logout = async () => {
    setLoggingOutFlag(true);
    setLogoutError(null);

    try {
      // Attempt server-side session revocation
      await authClient.post('/auth/logout');
    } catch (err) {
      setLoggingOutFlag(false);
      const errorMsg = err?.response?.data?.detail || 'Failed to revoke server session. Please retry.';
      setLogoutError(errorMsg);
      // Re-throw so caller can display a retryable error message
      throw new Error(errorMsg);
    }

    // On successful revocation: clear memory and session flag
    setAccessToken(null);
    localStorage.removeItem('hasSession');
    setUser(null);
    setLoggingOutFlag(false);
  };

  const setAuthUser = (userData, accessToken) => {
    setAccessToken(accessToken);
    setUser(userData);
    localStorage.setItem('hasSession', 'true');
  };

  const clearSessionExpired = () => {
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionExpired,
        clearSessionExpired,
        logoutError,
        setLogoutError,
        login,
        logout,
        setAuthUser,
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
