import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';
import latrocoreLogo from '../assets/Latrocore Medical Monogram Logo.png';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const { setUser } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fromPath = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage('');
    if (sessionExpired) {
      clearSessionExpired();
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const userData = await login(email.trim(), password);
      if (setUser && userData) setUser(userData);
      if (fromPath && fromPath !== '/login' && fromPath !== '/dashboard') {
        navigate(fromPath, { replace: true });
      } else if (userData?.role === 'patient') {
        navigate('/patient/dashboard', { replace: true });
      } else if (userData?.role === 'doctor') {
        navigate('/doctor/dashboard', { replace: true });
      } else if (userData?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userData?.role === 'pharmacist' || userData?.role === 'care_team') {
        navigate('/pharmacist/dashboard', { replace: true });
      } else {
        navigate('/patient/dashboard', { replace: true });
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 429) {
        setErrorMessage(detail || 'Too many attempts. Please wait before retrying.');
      } else if (err?.response?.status === 401) {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else if (err?.response?.status === 403) {
        setErrorMessage(detail || 'Account suspended or access restricted.');
      } else {
        setErrorMessage('Unable to connect to the authentication service. Please check your network.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#112228] flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#046A38] selection:text-white">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-black hover:text-[#046A38] bg-white hover:bg-stone-50 border border-[#E8DCC8] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="text-xs font-semibold text-black/80">
          Need an account?{' '}
          <Link
            to="/signup"
            className="font-extrabold text-[#046A38] hover:text-[#03542C] hover:underline transition-colors ml-1"
          >
            Sign up here
          </Link>
        </div>
      </div>

      {/* ── Centered LATROCORE Brand Header ── */}
      <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center my-3">
        <Link
          to="/"
          className="inline-flex flex-col items-center justify-center group focus:outline-none"
        >
          <img
            src={latrocoreLogo}
            alt="LATROCORE Medical Monogram Logo"
            className="h-22 sm:h-26 w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform drop-shadow-xs"
          />
        </Link>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-lg mx-auto my-auto bg-white rounded-xl shadow-lg shadow-stone-900/5 border border-[#E8DCC8] p-7 sm:p-10 transition-all">
        {/* Card Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-black">
            Welcome back
          </h1>
          <p className="text-stone-700 text-sm sm:text-[15px] font-medium mt-1.5">
            Enter your credentials to access your portal.
          </p>
        </div>

        {/* Session Expired Banner */}
        {sessionExpired && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-black text-xs animate-fade-in"
          >
            <Clock className="w-4.5 h-4.5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-black">Session Expired</p>
              <p className="text-black/90 mt-0.5 font-medium">
                Your previous session timed out. Please sign in again to resume work securely.
              </p>
            </div>
          </div>
        )}

        {/* Error Announcement */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-5 p-4 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3 text-black text-xs animate-shake"
          >
            <AlertCircle className="w-4.5 h-4.5 text-[#E34222] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-black">Authentication Notice</p>
              <p className="text-black/90 mt-0.5 font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-extrabold text-black uppercase tracking-wider mb-2"
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                id="email-input"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                placeholder="doctor@latrocore.com"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-stone-300 bg-white text-black font-semibold text-base placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#046A38] focus:border-[#046A38] transition-all disabled:opacity-60 shadow-2xs"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password-input"
              className="block text-xs font-extrabold text-black uppercase tracking-wider mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-12 py-3 rounded-lg border border-stone-300 bg-white text-black font-semibold text-base placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#046A38] focus:border-[#046A38] transition-all disabled:opacity-60 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={0}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-500 hover:text-black focus:outline-none cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Action Row: Forgot Password (Left) & Sign In Button (Right Corner) */}
          <div className="flex items-center justify-between pt-1">
            <Link
              to="/forgot-password"
              className="text-xs sm:text-sm font-bold text-black hover:text-[#046A38] underline decoration-stone-300 underline-offset-2 transition-colors"
            >
              Forgot password?
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#046A38] hover:bg-[#03542C] active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-[#046A38]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#046A38] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sign Up Link */}
        <div className="mt-6 pt-5 border-t border-stone-100 text-center">
          <p className="text-xs sm:text-sm text-black font-medium">
            Don't have an account yet?{' '}
            <Link
              to="/signup"
              className="font-extrabold text-[#046A38] hover:text-[#03542C] hover:underline ml-1"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* Subtle Copyright / Legal Footer */}
      <div className="w-full max-w-lg mx-auto text-center py-3 text-xs font-medium text-black/60">
        © {new Date().getFullYear()} LATROCORE Systems Inc. Clinical precision & data privacy reserved.
      </div>
    </div>
  );
}
