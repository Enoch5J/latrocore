import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import latrocoreLogo from '../assets/Latrocore Medical Monogram Logo.png';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  KeyRound,
  Check,
  Clipboard
} from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { addToast } = useApp();

  // Step: 'request' | 'verify' | 'reset' | 'success'
  const [step, setStep] = useState('request');

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const otpInputRefs = useRef([]);

  // Cooldown countdown
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const isValidEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
  };

  // ── Step 1: Request Reset Code ─────────────────────────────────────
  const handleRequestReset = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your account email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const res = await api.forgotPassword(email.trim());
      setCooldown(res?.cooldownSeconds || 60);
      setStatusMessage(res?.message || 'If an account exists, a 6-digit password reset code has been sent.');
      setStep('verify');
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to process reset request. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2: Handle OTP Digits & Paste ──────────────────────────────
  const handleOtpDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    const newOtp = [...otpCode];
    newOtp[index] = cleaned.slice(-1);
    setOtpCode(newOtp);

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otpCode];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtpCode(newOtp);
      const nextFocus = Math.min(pasted.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.replace(/\D/g, '').slice(0, 6);
      if (cleaned) {
        const next = ['', '', '', '', '', ''];
        for (let i = 0; i < cleaned.length; i++) {
          next[i] = cleaned[i];
        }
        setOtpCode(next);
        const focusIdx = Math.min(cleaned.length, 5);
        otpInputRefs.current[focusIdx]?.focus();
      }
    } catch {
      // clipboard access declined
    }
  };

  // ── Step 2: Verify Reset OTP ───────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit reset code.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await api.verifyOtp(email.trim(), fullCode, 'reset_password');
      setVerificationToken(res.verificationToken);
      setStep('reset');
      if (addToast) {
        addToast('Reset authorization confirmed. You may now enter your new password.', 'success');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired reset code. Please request a new one.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 3: Reset Password ─────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 12 || password.length > 128) {
      setErrorMessage('Password must be between 12 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await api.resetPassword({
        email: email.trim(),
        verificationToken,
        password,
        confirmPassword
      });
      setStep('success');
      if (addToast) {
        addToast('Your password has been reset. Please sign in with your new credentials.', 'success');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#112228] flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#046A38] selection:text-white">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-3 py-2 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold text-black hover:text-[#046A38] bg-white hover:bg-stone-50 border border-[#E8DCC8] shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>

        <div className="text-xs font-semibold text-black/80 text-right">
          <span className="hidden sm:inline">Remember password? </span>
          <Link
            to="/login"
            className="font-extrabold text-[#046A38] hover:text-[#03542C] hover:underline transition-colors ml-1"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* ── Center Content Wrapper ── */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center py-4 sm:py-6">
        {/* ── Centered LATROCORE Brand Header ── */}
        <div className="flex flex-col items-center justify-center text-center mb-3 sm:mb-4">
          <Link
            to="/"
            className="inline-flex flex-col items-center justify-center group focus:outline-none"
          >
            <img
              src={latrocoreLogo}
              alt="LATROCORE Medical Monogram Logo"
              className="h-16 sm:h-22 md:h-24 w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform drop-shadow-xs"
            />
          </Link>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-stone-900/5 border border-[#E8DCC8] p-5 sm:p-8 md:p-10 transition-all">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] border border-[#A8D7BD] text-[#046A38] flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <KeyRound className="w-6 h-6 text-[#046A38]" />
          </div>
          <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#112228]">
            {step === 'request' && 'Password Reset'}
            {step === 'verify' && 'Verify Security Code'}
            {step === 'reset' && 'Create New Password'}
            {step === 'success' && 'Reset Complete'}
          </h1>
          <p className="text-stone-500 text-sm font-medium mt-1.5 max-w-sm mx-auto">
            {step === 'request' && 'Enter your registered email address to receive a secure recovery code.'}
            {step === 'verify' && `Enter the 6-digit code dispatched to ${email}`}
            {step === 'reset' && 'Choose a strong, unique password to secure your account.'}
            {step === 'success' && 'Your account security credentials have been updated.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-5 p-4 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3 text-black text-xs animate-shake"
          >
            <AlertCircle className="w-4.5 h-4.5 text-[#E34222] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-black">Security Notice</p>
              <p className="text-black/90 mt-0.5 font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Status Alert */}
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 p-4 rounded-xl bg-[#E8F5EE] border border-[#A8D7BD] flex items-start gap-3 text-[#046A38] text-xs animate-fade-in"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-[#046A38] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-[#03542C]">Verification Code Dispatched</p>
              <p className="text-stone-700 mt-0.5 font-medium">{statusMessage}</p>
            </div>
          </div>
        )}

        {/* ── STEP 1: Enter Email ── */}
        {step === 'request' && (
          <form onSubmit={handleRequestReset} noValidate className="space-y-4 sm:space-y-5">
            <div>
              <label
                htmlFor="email-input"
                className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2"
              >
                Account Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
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
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-[#046A38] focus:border-[#046A38] transition-all disabled:opacity-60 shadow-2xs hover:border-stone-300"
                />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-stone-500 font-medium mt-2.5">
                <ShieldCheck className="w-4 h-4 text-[#046A38] shrink-0" />
                <span>A secure 6-digit verification code will be sent to this email address.</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || cooldown > 0}
              className="w-full py-3.5 px-4 rounded-xl bg-[#046A38] hover:bg-[#03542C] active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md shadow-[#046A38]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#046A38] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Resend Code ({cooldown}s)</span>
              ) : (
                <>
                  <span>Send Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: Verify Reset OTP ── */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} noValidate className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                6-Digit Security Code
              </span>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                title="Paste 6-digit code from clipboard"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-[#046A38] hover:text-[#03542C] bg-[#E8F5EE] hover:bg-[#d8eedf] border border-emerald-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste Code</span>
              </button>
            </div>

            <div className="flex justify-center gap-1.5 sm:gap-2.5" onPaste={handleOtpPaste}>
              {otpCode.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpInputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-9 h-11 sm:w-11 sm:h-12 md:w-12 md:h-13 text-center text-lg sm:text-xl font-mono font-bold rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#046A38] focus:border-[#046A38] shadow-2xs transition-all"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-stone-400" /> Expires in 5 minutes
              </span>
              <button
                type="button"
                disabled={cooldown > 0 || submitting}
                onClick={handleRequestReset}
                className="text-[#046A38] font-bold hover:underline disabled:text-stone-400 cursor-pointer transition-colors"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || otpCode.join('').length !== 6}
              className="w-full py-3.5 px-4 rounded-xl bg-[#046A38] hover:bg-[#03542C] active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md shadow-[#046A38]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#046A38] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 3: Enter New Password ── */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} noValidate className="space-y-4 sm:space-y-5 animate-fade-in">
            <div>
              <label
                htmlFor="new-password"
                className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-[#046A38] focus:border-[#046A38] transition-all disabled:opacity-60 shadow-2xs hover:border-stone-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-[#046A38] focus:border-[#046A38] transition-all disabled:opacity-60 shadow-2xs hover:border-stone-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={0}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700 transition-colors focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Live Password Rules */}
            <div className="space-y-1.5 text-xs text-stone-600 pt-1">
              <div className="flex items-center gap-2">
                {password.length >= 12 ? (
                  <Check className="w-4 h-4 text-[#046A38]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-stone-300 inline-block ml-1" />
                )}
                <span className={password.length >= 12 ? 'text-[#046A38] font-bold' : 'font-medium'}>
                  Between 12 and 128 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                {password && confirmPassword && password === confirmPassword ? (
                  <Check className="w-4 h-4 text-[#046A38]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-stone-300 inline-block ml-1" />
                )}
                <span className={password && confirmPassword && password === confirmPassword ? 'text-[#046A38] font-bold' : 'font-medium'}>
                  Passwords match exactly
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || password.length < 12 || password !== confirmPassword}
              className="w-full py-3.5 px-4 rounded-xl bg-[#046A38] hover:bg-[#03542C] active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md shadow-[#046A38]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#046A38] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-3"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 4: Success ── */}
        {step === 'success' && (
          <div className="text-center py-3 space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F5EE] border border-[#A8D7BD] text-[#046A38] flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-7 h-7 text-[#046A38]" />
            </div>

            <h2 className="text-xl font-extrabold text-[#112228]">Password Successfully Reset</h2>

            <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed max-w-sm mx-auto">
              Your password has been securely updated and all previous sessions revoked. You may now log in with your new credentials.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3.5 px-4 rounded-xl bg-[#046A38] hover:bg-[#03542C] active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md shadow-[#046A38]/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto text-center py-4">
        <p className="text-[11px] text-stone-500 font-medium tracking-tight">
          © 2026 LATROCORE Systems Inc. Clinical precision & data privacy reserved.
        </p>
      </footer>
    </div>
  );
}
