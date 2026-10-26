import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../lib/axios';
import {
  ShieldCheck,
  LogOut,
  User,
  Activity,
  Key,
  Clock,
  Layers,
  Server,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  HardDrive
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, logoutError } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [localLogoutError, setLocalLogoutError] = useState(null);

  const fetchDashboardMetrics = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await apiClient.get('/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      setFetchError(
        err?.response?.data?.detail || 'Failed to retrieve dashboard telemetry from protected backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLocalLogoutError(null);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      // Keep user informed with retryable error if server session revocation fails
      setLocalLogoutError(err.message || 'Logout failed. Server session could not be revoked.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900">
      {/* ── Top Navigation Bar ── */}
      <header className="bg-white border-b border-stone-200/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2D25] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-stone-900 tracking-tight text-lg">LATROCORE</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                Authenticated
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 pr-4 border-r border-stone-200">
              <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-stone-900 leading-tight">
                  {user?.name || 'Authorized User'}
                </p>
                <p className="text-[11px] text-stone-500 leading-tight">
                  {user?.email || ''}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200/80 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] disabled:opacity-60 cursor-pointer"
            >
              {loggingOut ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5 text-stone-600" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Logout Failure Alert (Retryable) */}
        {(localLogoutError || logoutError) && (
          <div
            role="alert"
            className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between text-red-950 text-sm shadow-sm"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="font-semibold">Logout Failed</p>
                <p className="text-xs text-red-800 mt-0.5">
                  {localLogoutError || logoutError} Your server session could not be revoked.
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
            >
              Retry Logout
            </button>
          </div>
        )}

        {/* Welcome Hero Banner */}
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-[#0F2D25] text-white shadow-xl shadow-stone-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-medium mb-3">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Session Authenticated & Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome, {user?.name || 'Administrator'}
            </h2>
            <p className="text-stone-300 text-sm mt-1 max-w-xl">
              You are signed in securely under account <span className="font-mono text-emerald-300">{user?.email}</span> with clinical role <span className="capitalize font-semibold text-white">{user?.role || 'authorized'}</span>.
            </p>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-2xl p-4 text-xs space-y-1.5 shrink-0 sm:text-right">
            <p className="text-stone-400">Security Level</p>
            <p className="font-semibold text-emerald-300 flex items-center gap-1.5 sm:justify-end">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Zero-Trust Token Rotation
            </p>
            <p className="text-[11px] font-mono text-stone-400 pt-1">
              Token Expiry: 15 Minutes
            </p>
          </div>
        </div>

        {/* ── Dashboard Content States ── */}
        {loading ? (
          /* Loading State */
          <div className="p-16 rounded-3xl bg-white border border-stone-200/80 shadow-sm flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-[#1B4D3E] animate-spin mb-4" />
            <p className="text-stone-800 font-medium text-sm">
              Fetching protected telemetry data...
            </p>
            <p className="text-stone-400 text-xs mt-1 font-mono">
              GET /dashboard [Bearer Authorization Header Attached]
            </p>
          </div>
        ) : fetchError ? (
          /* Error State */
          <div className="p-12 rounded-3xl bg-white border border-red-200 shadow-sm text-center max-w-lg mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-900">
              Telemetry Request Error
            </h3>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              {fetchError}
            </p>
            <button
              onClick={fetchDashboardMetrics}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B4D3E] hover:bg-[#13382D] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Fetch</span>
            </button>
          </div>
        ) : !dashboardData ? (
          /* Empty State */
          <div className="p-16 rounded-3xl bg-white border border-stone-200/80 shadow-sm text-center">
            <HardDrive className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-stone-800">No Telemetry Recorded</h3>
            <p className="text-xs text-stone-500 mt-1">There are no metrics returned for this session.</p>
          </div>
        ) : (
          /* Success Data Cards */
          <div className="space-y-8">
            {/* KPI Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Sessions</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-stone-900">
                  {dashboardData.stats?.activeSessions ?? 1}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Database-backed family</p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Session Lifespan</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-stone-900">
                  7 Days
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Fixed expiry (No indefinite sliding)</p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">Access Token</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-stone-900">
                  15 Mins
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Silent Refresh in memory only</p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-stone-200/80 shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider">System State</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-700 capitalize">
                  {dashboardData.status || 'Active'}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Server health check verified</p>
              </div>

            </div>

            {/* Architectural Security Overview Details */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-[#1B4D3E]" />
                  <h3 className="font-semibold text-stone-900 text-base">
                    Active Security Controls & Session Context
                  </h3>
                </div>
                <button
                  onClick={fetchDashboardMetrics}
                  className="inline-flex items-center gap-1.5 text-xs text-[#1B4D3E] hover:text-[#123E2F] font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Telemetry</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2">
                  <p className="font-semibold text-stone-800">Password Hashing Algorithm</p>
                  <p className="text-stone-600">
                    Argon2id with memory-hard parameters (m=65536, t=3, p=4) protecting against GPU/ASIC attacks.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2">
                  <p className="font-semibold text-stone-800">Refresh Token Protection</p>
                  <p className="text-stone-600">
                    Delivered exclusively via <code className="bg-stone-200/80 px-1 py-0.5 rounded font-mono">__Host-refresh</code> cookie with HttpOnly=True, Secure=True, and SameSite=Strict.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2">
                  <p className="font-semibold text-stone-800">CSRF Defense</p>
                  <p className="text-stone-600">
                    Mandatory <code className="bg-stone-200/80 px-1 py-0.5 rounded font-mono">X-Requested-With</code> custom header verification alongside strict Origin header matching.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2">
                  <p className="font-semibold text-stone-800">Concurrency & Multi-Tab Sync</p>
                  <p className="text-stone-600">
                    Web Locks API synchronizes cookie rotation across tabs. Axios queue deduplicates concurrent 401 requests.
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-stone-400 font-mono text-right">
                Telemetry Timestamp: {dashboardData.systemTime || new Date().toISOString()}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
