import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Clock,
  Activity,
  UserCheck,
  Stethoscope,
  Pill,
  User,
  Check
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'doctor',
    label: 'Doctor',
    icon: Stethoscope,
    email: 'doctor@latrocore.com',
    password: 'doctor123',
    desc: 'Endocrinology'
  },
  {
    role: 'patient',
    label: 'Patient',
    icon: User,
    email: 'patient@latrocore.com',
    password: 'patient123',
    desc: 'Anand K.'
  },
  {
    role: 'pharmacist',
    label: 'Pharmacist',
    icon: Pill,
    email: 'pharmacist@latrocore.com',
    password: 'care123',
    desc: 'PharmD'
  },
  {
    role: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    email: 'admin@latrocore.com',
    password: 'admin123',
    desc: 'System'
  }
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpired, clearSessionExpired } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeDemoFilled, setActiveDemoFilled] = useState('');

  const fromPath = location.state?.from?.pathname;

  const handleFillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemoFilled(account.role);
    setErrorMessage('');
    setTimeout(() => setActiveDemoFilled(''), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage('');
    if (sessionExpired) {
      clearSessionExpired();
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const userData = await login(email.trim(), password);
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
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white/80 hover:bg-white border border-[#E8DCC8] shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="text-xs text-stone-500">
          Need an account?{' '}
          <Link
            to="/signup"
            className="font-bold text-[#046A38] hover:text-[#03542C] transition-colors ml-1"
          >
            Sign up here
          </Link>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-5xl mx-auto my-auto bg-white rounded-3xl shadow-xl shadow-stone-900/5 border border-[#E8DCC8] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* ── Left Branding Panel ── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#063321] via-[#044828] to-[#022816] text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative radial lights */}
          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

          {/* Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-sm">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white block">LATROCORE</span>
                <span className="text-[11px] font-medium text-emerald-200/80 tracking-wide uppercase">Diabetes Intelligence</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3 leading-snug">
              Clinical Diabetes Care & Telemetry
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm leading-relaxed max-w-sm font-normal">
              Unified healthcare workstation integrating real-time continuous glucose monitoring, verified clinical regimens, and multidisciplinary coordination.
            </p>
          </div>

          {/* Clean Medical Value Props */}
          <div className="relative z-10 my-8 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Physician Intelligence</h4>
                <p className="text-[11px] text-emerald-100/70 leading-relaxed mt-0.5">
                  Longitudinal CGM metrics, automated TIR analytics, and protocol titration.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Patient Sovereignty</h4>
                <p className="text-[11px] text-emerald-100/70 leading-relaxed mt-0.5">
                  Full data control, personalized targets, and direct clinical messaging.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">Zero-Trust Security</h4>
                <p className="text-[11px] text-emerald-100/70 leading-relaxed mt-0.5">
                  Argon2id derivation, cryptographic tokens, and encrypted audit trails.
                </p>
              </div>
            </div>
          </div>

          {/* Trust Footer */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-200/70 font-medium">
            <span>HIPAA & GDPR Safeguards</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>TLS 1.3 Verified</span>
            </span>
          </div>
        </div>

        {/* ── Right Panel: Login Form ── */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#112228]">
                Welcome back
              </h2>
              <p className="text-stone-500 text-xs sm:text-sm mt-1">
                Enter your authorized clinical credentials to access your portal.
              </p>
            </div>

            {/* Session Expired Banner */}
            {sessionExpired && (
              <div
                role="status"
                aria-live="polite"
                className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs animate-fade-in"
              >
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Session Expired</p>
                  <p className="text-amber-800/90 mt-0.5">
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
                className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-900 text-xs animate-shake"
              >
                <AlertCircle className="w-4 h-4 text-[#E34222] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-950">Authentication Notice</p>
                  <p className="text-red-800 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email-input"
                  className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
                >
                  Work or Personal Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 text-stone-900 text-sm placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all duration-150 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password-input"
                    className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-[#046A38] hover:text-[#03542C] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
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
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-stone-200 bg-stone-50/40 text-stone-900 text-sm placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all duration-150 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white font-semibold text-sm shadow-md shadow-[#046A38]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#046A38] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* ── Refined & Professional Demo Quick-Fill Bar ── */}
            <div className="mt-6 pt-5 border-t border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Quick Access • Demo Roles
                </span>
                {activeDemoFilled && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#046A38] animate-fade-in">
                    <Check className="w-3 h-3" /> Credentials Filled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  const isSelected = activeDemoFilled === acc.role;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleFillDemo(acc)}
                      title={`${acc.desc} (${acc.email})`}
                      className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E8F5EE] border-[#046A38] text-[#046A38] shadow-xs'
                          : 'bg-[#FAF6EF]/60 hover:bg-[#FAF6EF] border-[#E8DCC8] text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mb-0.5 shrink-0" />
                      <span className="text-[11px] font-bold tracking-tight truncate w-full">{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="mt-6 pt-4 text-center">
              <p className="text-xs text-stone-500">
                Don't have an account yet?{' '}
                <Link
                  to="/signup"
                  className="font-bold text-[#046A38] hover:text-[#03542C] hover:underline"
                >
                  Create Patient or Doctor Account
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Subtle Copyright / Legal Footer */}
      <div className="w-full max-w-5xl mx-auto text-center py-2 text-[11px] text-stone-400">
        © {new Date().getFullYear()} LATROCORE Systems Inc. Clinical precision & data privacy reserved.
      </div>
    </div>
  );
}
