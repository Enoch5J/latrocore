import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';
import latrocoreLogo from '../assets/Latrocore Medical Monogram Logo.png';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  ArrowRight,
  UserCheck,
  Lock,
  Stethoscope,
  Pill,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function WaitingApproval() {
  const navigate = useNavigate();
  const { user, logout, setAuthUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [approvalGranted, setApprovalGranted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const pollTimerRef = useRef(null);

  // Derive role metadata
  const role = user?.role || statusData?.role || 'user';
  const isDoctor = role === 'doctor';
  const isPharmacist = role === 'pharmacist' || role === 'care_team';
  const isPatient = role === 'patient';

  const roleTitle = isDoctor
    ? 'Doctor Clinical Station'
    : isPharmacist
    ? 'Pharmacist Workstation'
    : 'Patient Health Portal';

  const roleBadge = isDoctor
    ? 'Physician Credential Verification'
    : isPharmacist
    ? 'Pharmacy Practice License Verification'
    : 'Patient Identity & Enrollment Verification';

  const RoleIcon = isDoctor ? Stethoscope : isPharmacist ? Pill : User;

  const displayId = user?.displayId || statusData?.displayId || 'PENDING-ID';

  const checkStatus = async (showLoading = false) => {
    if (showLoading) setChecking(true);
    try {
      const data = await api.getAuthStatus();
      setStatusData(data);

      if (data.status === 'active' || data.approvalStatus === 'approved') {
        setApprovalGranted(true);
        // Update user in memory & localStorage
        if (user) {
          const updatedUser = {
            ...user,
            status: 'active',
            approvalStatus: 'approved'
          };
          setAuthUser(updatedUser);
        }
      }
    } catch (err) {
      console.warn('Status poll check notice:', err.message);
    } finally {
      if (showLoading) {
        setTimeout(() => setChecking(false), 350);
      }
    }
  };

  // Automated background polling every 5 seconds
  useEffect(() => {
    checkStatus(false);

    pollTimerRef.current = setInterval(() => {
      checkStatus(false);
    }, 5000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Handle countdown and redirect when approval granted
  useEffect(() => {
    if (!approvalGranted) return;

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to appropriate portal
          if (isDoctor) navigate('/doctor/dashboard', { replace: true });
          else if (isPharmacist) navigate('/pharmacist/dashboard', { replace: true });
          else navigate('/patient/dashboard', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [approvalGranted, isDoctor, isPharmacist, navigate]);

  const copyId = () => {
    if (!displayId) return;
    navigator.clipboard?.writeText(displayId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isRejected = statusData?.approvalStatus === 'rejected' || statusData?.status === 'suspended';

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#112228] flex flex-col font-sans selection:bg-[#046A38] selection:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-[#E8DCC8] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#E8DCC8] flex items-center justify-center p-1 shadow-xs">
            <img src={latrocoreLogo} alt="Latrocore" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#112228] text-base tracking-tight">LATROCORE</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#046A38] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Governance Suite
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
              Clinical Identity & Access Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl text-xs">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="font-medium text-stone-600">Verification Engine:</span>
            <span className="font-bold text-amber-700">Awaiting Admin Action</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 hover:text-red-700 hover:bg-red-50 rounded-xl border border-stone-200 transition-all cursor-pointer"
            title="Sign out of current account"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        {/* Approved State Banner */}
        {approvalGranted ? (
          <div className="w-full bg-white rounded-3xl border-2 border-[#046A38] shadow-2xl p-8 sm:p-12 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-[#046A38] border-2 border-emerald-200 flex items-center justify-center mx-auto mb-6 shadow-md animate-bounce">
              <CheckCircle2 size={44} />
            </div>

            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-[#046A38] border border-emerald-300 mb-4">
              Approval Granted By Medical Administrator
            </span>

            <h1 className="text-2xl sm:text-4xl font-black text-[#112228] tracking-tight mb-3">
              Welcome to {roleTitle}!
            </h1>

            <p className="text-stone-600 max-w-md mx-auto text-sm sm:text-base leading-relaxed mb-6 font-medium">
              Your credentials have been successfully verified and validated. Your clinical workstation is now active.
            </p>

            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0F2D25] text-white font-bold text-sm shadow-lg mb-6">
              <RefreshCw size={18} className="animate-spin text-emerald-400" />
              <span>Redirecting to your workstation in {countdown} seconds...</span>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  if (isDoctor) navigate('/doctor/dashboard');
                  else if (isPharmacist) navigate('/pharmacist/dashboard');
                  else navigate('/patient/dashboard');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white font-extrabold text-sm transition-all shadow-md cursor-pointer"
              >
                <span>Enter Workstation Now</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : isRejected ? (
          /* Rejected State Card */
          <div className="w-full bg-white rounded-3xl border border-red-200 shadow-xl p-8 sm:p-12 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <AlertCircle size={36} />
            </div>

            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 mb-3">
              Application Not Approved
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-3">
              Credential Verification Declined
            </h1>

            <p className="text-stone-600 text-sm max-w-lg mx-auto mb-6">
              The Medical Board Administrator reviewed your submitted credentials and was unable to approve authorization.
            </p>

            {statusData?.rejectionReason && (
              <div className="text-left bg-red-50/70 border border-red-200 rounded-2xl p-4 sm:p-5 max-w-lg mx-auto mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-red-900 block mb-1">
                  Reason for Decision:
                </span>
                <p className="text-sm font-semibold text-red-800 leading-relaxed">
                  "{statusData.rejectionReason}"
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 text-sm cursor-pointer"
              >
                Sign Out & Try Again
              </button>
              <a
                href="mailto:admin@latrocore.com"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-white bg-[#046A38] hover:bg-[#03542C] text-sm text-center cursor-pointer"
              >
                Contact Administration
              </a>
            </div>
          </div>
        ) : (
          /* Main Pending Waiting Card */
          <div className="w-full space-y-6">
            {/* Primary Status Card */}
            <div className="bg-white rounded-3xl border border-[#E8DCC8] shadow-xl shadow-stone-900/5 p-6 sm:p-10 animate-fade-in relative overflow-hidden">
              {/* Decorative top border accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-[#046A38] to-emerald-500" />

              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8DCC8]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                    <Clock size={28} className="animate-spin text-amber-600" style={{ animationDuration: '8s' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100/90 text-amber-900 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                        Pending Admin Approval
                      </span>
                      <span className="text-xs font-bold text-stone-500">
                        {roleBadge}
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-[#112228] tracking-tight mt-1">
                      Registration Received & In Review
                    </h1>
                  </div>
                </div>

                {/* Status Refresh Action */}
                <button
                  type="button"
                  onClick={() => checkStatus(true)}
                  disabled={checking}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-[#046A38] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0 shadow-xs"
                >
                  <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                  <span>{checking ? 'Checking...' : 'Check Status Now'}</span>
                </button>
              </div>

              {/* Identity & Account ID Showcase */}
              <div className="my-6 p-5 sm:p-6 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-stone-500">
                      Assigned {isDoctor ? 'Doctor ID' : isPharmacist ? 'Pharmacist ID' : 'Patient Health ID'}
                    </span>
                    <button
                      type="button"
                      onClick={copyId}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#046A38] hover:text-[#03542C] cursor-pointer"
                    >
                      {copiedId ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedId ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-[#046A38] tracking-wider">
                    {displayId}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Your unique credential token recorded in the database.
                  </p>
                </div>

                <div className="flex flex-col justify-center space-y-2 border-t md:border-t-0 md:border-l border-[#E8DCC8] pt-4 md:pt-0 md:pl-6 text-xs text-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-500">Registered Name:</span>
                    <span className="font-extrabold text-[#112228]">{user?.name || 'Authorized Member'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-500">Registered Email:</span>
                    <span className="font-mono text-stone-800">{user?.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-500">Requested Workstation:</span>
                    <span className="font-bold text-[#046A38]">{roleTitle}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Verification Timeline */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">
                  Clinical Access Authorization Protocol
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                      <Check size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-emerald-950">1. Registration Submitted</p>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Identity credentials & contact verification completed.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 relative shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs animate-pulse">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-950">2. Administrator Review</p>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        Medical board administrator verifying credentials.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-500 flex items-center justify-center shrink-0 font-bold text-xs">
                      <Lock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-700">3. Workstation Access</p>
                      <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                        Automatic unlock of your role portal once approved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical Governance Notice */}
              <div className="mt-6 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 leading-relaxed flex items-start gap-3">
                <ShieldCheck size={20} className="text-[#046A38] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-stone-800">Healthcare Governance Mandate:</span> Under hospital governance and clinical privacy standards, all patient, physician, and pharmacy accounts must be vetted by authorized administration before accessing confidential longitudinal telemetry or clinical titration records.
                </div>
              </div>
            </div>

            {/* Admin Fast-Track Testing Card */}
            <div className="bg-white rounded-2xl border border-[#E8DCC8] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div>
                <p className="font-extrabold text-stone-900">
                  Testing or Evaluating the Platform?
                </p>
                <p className="text-stone-500 mt-0.5">
                  Sign in with an Administrator account (e.g. <span className="font-mono font-bold text-stone-700">admin@latrocore.com / admin123</span>) in another tab or window to approve this account right away.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-all cursor-pointer shrink-0"
              >
                <span>Switch to Admin Account</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E8DCC8] bg-white/50 py-4 px-6 text-center text-xs text-stone-500">
        LATROCORE Clinical Intelligence Platform • Secured with Argon2id & Cryptographic Silent Refresh
      </footer>
    </div>
  );
}

