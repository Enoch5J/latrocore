import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
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
  Check
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
    e.preventDefault();
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
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to process reset request. Please try again.');
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

  // ── Step 2: Verify Reset OTP ───────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit reset code.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await api.verifyOtp(email.trim(), fullCode, 'reset_password');
      setVerificationToken(res.verificationToken);
      setStep('reset');
      addToast({
        type: 'success',
        title: 'Code Verified',
        message: 'Reset authorization confirmed. You may now enter your new password.'
      });
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
      addToast({
        type: 'success',
        title: 'Password Updated',
        message: 'Your password has been reset. Please sign in with your new password.'
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-stone-900 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-[#E8DCC8] shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-stone-200/50 border border-[#E8DCC8] p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0F2D25] text-white flex items-center justify-center shadow-sm">
            <KeyRound className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#03542C] tracking-tight">Password Reset</h1>
            <p className="text-xs text-stone-500 font-medium">LATROCORE Account Security</p>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-[#E34222] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Status message */}
        {statusMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#046A38] text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* ── STEP 1: Enter Email ── */}
        {step === 'request' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">Account Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] text-sm transition-all"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1.5">
                We will dispatch a secure 6-digit verification code to this address if an account exists.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !isValidEmail(email) || cooldown > 0}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#046A38] hover:bg-[#03542C] disabled:bg-stone-300 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>{submitting ? 'Sending Code...' : cooldown > 0 ? `Resend (${cooldown}s)` : 'Send Reset Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── STEP 2: Verify Reset OTP ── */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
            <div className="text-xs text-stone-600">
              Enter the 6-digit code sent to <strong className="text-stone-900">{email}</strong>.
            </div>

            <div className="flex items-center gap-2 justify-center" onPaste={handleOtpPaste}>
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
                  className="w-10 h-12 text-center text-lg font-mono font-bold rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] shadow-2xs"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 5-minute expiry
              </span>
              <button
                type="button"
                disabled={cooldown > 0}
                onClick={handleRequestReset}
                className="text-[#046A38] font-bold hover:underline disabled:text-stone-400 cursor-pointer"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || otpCode.join('').length !== 6}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#046A38] hover:bg-[#03542C] disabled:bg-stone-300 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>{submitting ? 'Verifying Code...' : 'Verify Reset Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── STEP 3: Enter New Password ── */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Live Password Rules */}
            <div className="space-y-1 text-[11px] text-stone-600 pt-1">
              <div className="flex items-center gap-1.5">
                {password.length >= 12 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block" />
                )}
                <span className={password.length >= 12 ? 'text-emerald-700 font-semibold' : ''}>
                  Between 12 and 128 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {password && confirmPassword && password === confirmPassword ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block" />
                )}
                <span className={password && confirmPassword && password === confirmPassword ? 'text-emerald-700 font-semibold' : ''}>
                  Passwords match exactly
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || password.length < 12 || password !== confirmPassword}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#046A38] hover:bg-[#03542C] disabled:bg-stone-300 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm mt-4"
            >
              <span>{submitting ? 'Updating Password...' : 'Save New Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── STEP 4: Success ── */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F5EE] border-2 border-[#046A38] text-[#046A38] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-[#03542C]">Password Successfully Reset</h2>

            <p className="text-xs text-stone-600 leading-relaxed">
              Your password has been securely updated and all previous active sessions have been terminated. You can now sign in using your new credentials.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#046A38] hover:bg-[#03542C] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
