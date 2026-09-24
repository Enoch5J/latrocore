import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Stethoscope, User, Pill, Shield, ArrowRight, Play, Heart, Brain,
  Activity, CheckCircle2, ChevronRight, BookOpen, Layers, Lock,
  FileText, AlertTriangle, Sparkles, Menu, X, Database, Clock,
  Droplets, BarChart3, RefreshCw, Check, ArrowUpRight, Zap
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

const DEMO_ACCOUNTS = [
  {
    id: 'pat-001',
    role: 'patient',
    badge: 'Patient Portal',
    title: 'Patient Companion',
    name: 'Priya Sharma',
    subtitle: 'Type 2 Diabetes • 8 Yrs History',
    desc: 'Empowers patients to track real-time CGM curves, log meals & activity, and receive culturally tailored multilingual lifestyle coaching.',
    icon: User,
    theme: {
      border: 'border-teal-300 hover:border-teal-700',
      badge: 'bg-teal-100 text-teal-950 border-teal-300',
      iconBg: 'bg-teal-800 text-white',
      button: 'bg-teal-800 hover:bg-teal-900 text-white',
      accentText: 'text-teal-850',
    },
    route: '/patient/dashboard',
    highlights: ['Continuous CGM & self-log tracker', 'Multilingual AI health assistant', 'Real-time adherence reminders']
  },
  {
    id: 'doc-001',
    role: 'doctor',
    badge: 'Physician Workstation',
    title: 'Consultant Endocrinologist',
    name: 'Dr. Arun Krishnamurthy',
    subtitle: 'Senior Diabetes Specialist',
    desc: 'Provides longitudinal glycemic oversight, automated HbA1c trajectory tracking, smart prescription authoring, and clinical escalation triage.',
    icon: Stethoscope,
    theme: {
      border: 'border-blue-300 hover:border-blue-700',
      badge: 'bg-blue-100 text-blue-950 border-blue-300',
      iconBg: 'bg-blue-800 text-white',
      button: 'bg-blue-800 hover:bg-blue-900 text-white',
      accentText: 'text-blue-850',
    },
    route: '/doctor/dashboard',
    highlights: ['Cohort glycemic trajectory charts', 'Smart digital prescription suite', 'Pharm D escalation review panel']
  },
  {
    id: 'pharm-001',
    role: 'pharmacist',
    badge: 'Pharm D Clinical Station',
    title: 'Clinical Pharmacist',
    name: 'Kavitha Rajan (Pharm D)',
    subtitle: 'Medication Therapy Specialist',
    desc: 'Executes comprehensive medication reconciliation, screens for drug-drug interactions, evaluates renal dosing, and records patient counselling.',
    icon: Pill,
    theme: {
      border: 'border-purple-300 hover:border-purple-700',
      badge: 'bg-purple-100 text-purple-950 border-purple-300',
      iconBg: 'bg-purple-800 text-white',
      button: 'bg-purple-800 hover:bg-purple-900 text-white',
      accentText: 'text-purple-850',
    },
    route: '/pharmacist/dashboard',
    highlights: ['Automated DDI interaction scanner', 'Therapeutic adherence surveillance', 'Structured counselling records']
  },
  {
    id: 'admin-001',
    role: 'admin',
    badge: 'System Governance',
    title: 'Clinical Compliance & Audit',
    name: 'Platform Governance',
    subtitle: 'HIPAA & CDSCO Oversight',
    desc: 'Maintains immutable cryptographically timestamped clinical audit trails, configures role access parameters, and monitors platform health.',
    icon: Shield,
    theme: {
      border: 'border-slate-300 hover:border-slate-800',
      badge: 'bg-slate-200 text-slate-950 border-slate-400',
      iconBg: 'bg-slate-900 text-white',
      button: 'bg-slate-950 hover:bg-black text-white',
      accentText: 'text-slate-950',
    },
    route: '/admin/dashboard',
    highlights: ['Immutable audit trail inspection', 'Role-based access security', 'One-click demo state reset']
  },
];

const SAMPLE_CGM_DATA = [
  { time: '06:00', value: 92 },
  { time: '07:30', value: 128 },
  { time: '09:00', value: 154 },
  { time: '11:00', value: 110 },
  { time: '13:00', value: 135 },
  { time: '15:00', value: 118 },
  { time: '18:00', value: 104 },
  { time: '20:30', value: 142 },
  { time: '22:00', value: 114 },
];

export default function Welcome() {
  const { data, setUser } = useApp();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState('cgm');

  const handleLogin = async (account) => {
    const user = data?.users?.[account.id];
    if (user) {
      setUser(user);
      try {
        const emailMap = {
          'pat-001': 'patient@latrocore.com',
          'doc-001': 'doctor@latrocore.com',
          'pharm-001': 'pharmacist@latrocore.com',
          'admin-001': 'admin@latrocore.com',
        };
        const passMap = {
          'pat-001': 'patient123',
          'doc-001': 'doctor123',
          'pharm-001': 'care123',
          'admin-001': 'admin123',
        };
        const email = emailMap[account.id] || `${account.role}@latrocore.com`;
        const pass = passMap[account.id] || 'admin123';
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass }),
        });
        if (res.ok) {
          const authData = await res.json();
          if (authData.access_token) {
            localStorage.setItem('latrocore_token', authData.access_token);
          }
        }
      } catch (err) {
        console.warn('Backend login sync error:', err);
      }
      navigate(account.route);
    }
  };

  const handleGuidedDemo = () => {
    const user = data?.users?.['pat-001'];
    if (user) {
      setUser(user);
      navigate('/patient/dashboard?demo=1');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col font-sans antialiased overflow-x-clip w-full selection:bg-teal-100 selection:text-teal-900">
      
      {/* ── Top Announcement Bar ──────────────────────────────────────── */}
      <div className="bg-slate-950 text-white text-xs font-semibold py-2 px-3 sm:px-4 border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-extrabold text-white">LATROCORE Clinical Ecosystem:</span>
            <span className="text-slate-300 hidden md:inline">Continuous Closed-Loop Diabetes Care & Medication Safety Architecture</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-slate-300 font-bold">
            <span className="bg-slate-800 px-2 py-0.5 rounded text-teal-300 border border-slate-700">v2.4 Production Spec</span>
            <span className="text-slate-400">Synthetic PHI Sandbox</span>
          </div>
        </div>
      </div>

      {/* ── Main Sticky Navigation Header ────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 transition-all shadow-xs w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4 w-full">
          
          {/* Brand Identity */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-800 to-teal-950 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-950/20 group-hover:scale-105 transition-transform shrink-0">
              <Stethoscope size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-slate-950 tracking-tight text-lg sm:text-xl leading-tight">LATROCORE</span>
                <span className="hidden sm:inline-block bg-teal-50 text-teal-950 border border-teal-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md whitespace-nowrap">
                  Clinical
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-wider block whitespace-nowrap">
                Closed-Loop System
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links - Single line and 1 word each */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-bold text-slate-800 shrink-0">
            <a href="#workstations" className="px-3 py-1.5 rounded-xl hover:text-teal-950 hover:bg-slate-100 transition-colors whitespace-nowrap">
              Workstations
            </a>
            <a href="#console-preview" className="px-3 py-1.5 rounded-xl hover:text-teal-950 hover:bg-slate-100 transition-colors whitespace-nowrap">
              Console
            </a>
            <a href="#workflow" className="px-3 py-1.5 rounded-xl hover:text-teal-950 hover:bg-slate-100 transition-colors whitespace-nowrap">
              Continuum
            </a>
            <a href="#safety" className="px-3 py-1.5 rounded-xl hover:text-teal-950 hover:bg-slate-100 transition-colors whitespace-nowrap">
              Safety
            </a>
            <NavLink to="/overview" className="px-3 py-1.5 rounded-xl hover:text-teal-950 hover:bg-slate-100 transition-colors whitespace-nowrap">
              Blueprint
            </NavLink>
            <NavLink to="/care-summary" className="px-3 py-1.5 rounded-xl hover:text-teal-950 hover:bg-slate-100 transition-colors whitespace-nowrap">
              Summary
            </NavLink>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleGuidedDemo}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black text-slate-950 bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
            >
              <Play size={13} className="text-teal-800 fill-teal-800 shrink-0" />
              <span>Tour</span>
            </button>

            <a
              href="#workstations"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white bg-teal-800 hover:bg-teal-900 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span>Explore</span>
              <ArrowRight size={13} className="shrink-0" />
            </a>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold border border-slate-300 cursor-pointer shadow-xs transition-colors shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              <span className="text-xs font-black uppercase tracking-wider">Menu</span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Slide-Out */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t-2 border-slate-200 bg-white px-3 sm:px-4 py-4 sm:py-5 space-y-3 animate-fade-in shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">Quick Navigation</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-900">
              <a
                href="#workstations"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center truncate"
              >
                Workstations
              </a>
              <a
                href="#console-preview"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center truncate"
              >
                Console
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center truncate"
              >
                Continuum
              </a>
              <a
                href="#safety"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center truncate"
              >
                Safety
              </a>
              <NavLink
                to="/overview"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center truncate"
              >
                Blueprint
              </NavLink>
              <NavLink
                to="/care-summary"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center truncate"
              >
                Summary
              </NavLink>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <button
                onClick={() => { setMobileMenuOpen(false); handleGuidedDemo(); }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-black text-white bg-teal-800 rounded-xl shadow-xs"
              >
                <Play size={14} className="fill-white" />
                <span>Launch Interactive Tour</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-8 sm:pt-20 pb-12 sm:pb-24 border-b-2 border-slate-200 bg-gradient-to-b from-white via-slate-50/70 to-teal-50/20">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            
            {/* Clinical Pill Badge */}
            <div className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-teal-50 border-2 border-teal-200 shadow-xs mb-5 max-w-full">
              <Sparkles size={14} className="text-teal-800 shrink-0" />
              <span className="text-[10px] sm:text-xs font-extrabold text-teal-950 uppercase tracking-wider text-center">
                <span className="sm:hidden">ADA 2024 Guidelines • Care Architecture</span>
                <span className="hidden sm:inline">Synchronized Healthcare Architecture • ADA 2024 Guidelines</span>
              </span>
            </div>

            {/* Grand Headline */}
            <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.2] mb-5">
              Precision Diabetes Care.{' '}
              <span className="bg-gradient-to-r from-teal-800 via-teal-950 to-slate-950 bg-clip-text text-transparent block sm:inline">
                Closed-Loop Collaboration.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-slate-800 font-semibold leading-relaxed mb-6 sm:mb-8 max-w-3xl mx-auto">
              Bridging the critical 8,700-hour gap between clinic appointments by linking Type 2 Diabetes patients, endocrinologists, Pharm D clinical pharmacists, and supervised AI into one synchronized continuum.
            </p>

            {/* Main Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-8 sm:mb-10 max-w-md sm:max-w-none mx-auto w-full">
              <button
                onClick={handleGuidedDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-xl transition-all cursor-pointer active:scale-95"
              >
                <Play size={16} className="fill-white shrink-0" />
                <span>Launch Interactive Guided Tour</span>
              </button>

              <NavLink
                to="/overview"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 border-2 border-slate-300 font-black text-xs sm:text-sm transition-all shadow-xs active:scale-95 text-center"
              >
                <BookOpen size={16} className="text-slate-800 shrink-0" />
                <span>Clinical Architecture Blueprint</span>
              </NavLink>
            </div>

            {/* Quick Station Switcher Bar */}
            <div className="p-3 bg-white/90 backdrop-blur-md rounded-2xl border-2 border-slate-200 shadow-sm max-w-3xl mx-auto mb-14">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-800 mb-2">
                Instant Workstation Jump
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => handleLogin(acc)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-teal-700 bg-slate-50 hover:bg-teal-50/50 transition-all text-left cursor-pointer group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${acc.theme.iconBg}`}>
                      <acc.icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-slate-950 truncate group-hover:text-teal-900">
                        {acc.role.toUpperCase()}
                      </span>
                      <span className="block text-[10px] font-semibold text-slate-700 truncate">
                        {acc.name.split(' ')[0]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Interactive Live Clinical Console Preview ───────────────── */}
          <div id="console-preview" className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl overflow-hidden">
              
              {/* Console Window Header */}
              <div className="bg-slate-950 px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 ml-2 hidden sm:inline">
                    LATROCORE // Clinical Telemetry Station // Patient #PAT-001
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-time Telemetry: Active</span>
                </div>
              </div>

              {/* Console Interactive Tabs */}
              <div className="bg-slate-100 px-4 pt-3 border-b-2 border-slate-200 flex items-center gap-2 overflow-x-auto">
                {[
                  { id: 'cgm', label: 'CGM Glycemic Stream', icon: Activity },
                  { id: 'pharmd', label: 'Pharm D Safety Radar', icon: Pill },
                  { id: 'matrix', label: 'Care Continuum Matrix', icon: Layers },
                  { id: 'safety', label: 'Clinical Rails', icon: Shield },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveConsoleTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-t-2 border-x-2 -mb-0.5 ${
                      activeConsoleTab === tab.id
                        ? 'bg-white border-slate-300 text-teal-900 shadow-xs'
                        : 'border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
                    }`}
                  >
                    <tab.icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Console Content Area */}
              <div className="p-4 sm:p-6 bg-white min-h-[340px]">
                {activeConsoleTab === 'cgm' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-teal-50/50">
                        <span className="text-[11px] font-bold uppercase text-slate-700 block">Current Glucose</span>
                        <span className="text-2xl font-black text-teal-900 block mt-0.5">114 mg/dL</span>
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 mt-1">
                          <Check size={14} /> Normal Fasting Window
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                        <span className="text-[11px] font-bold uppercase text-slate-700 block">Time in Range (TIR)</span>
                        <span className="text-2xl font-black text-slate-950 block mt-0.5">82.4%</span>
                        <span className="text-xs font-bold text-teal-800 block mt-1">Target &ge; 70% (ADA Benchmark)</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                        <span className="text-[11px] font-bold uppercase text-slate-700 block">Latest HbA1c</span>
                        <span className="text-2xl font-black text-slate-950 block mt-0.5">7.2%</span>
                        <span className="text-xs font-bold text-amber-800 block mt-1">Target &le; 7.0%</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-slate-900">Today&apos;s Continuous Glucose Curve (mg/dL)</span>
                        <span className="text-xs font-bold text-slate-600">Target Band: 70 - 180 mg/dL</span>
                      </div>
                      <div className="w-full min-w-0 overflow-hidden" style={{ minHeight: 180 }}>
                        <ResponsiveContainer width="100%" height={180} minWidth={0}>
                          <LineChart data={SAMPLE_CGM_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#090D16', fontWeight: 600 }} />
                            <YAxis domain={[60, 200]} tick={{ fontSize: 10, fill: '#090D16', fontWeight: 600 }} />
                            <ReferenceLine y={180} stroke="#D97706" strokeDasharray="4 4" strokeWidth={1.5} />
                            <ReferenceLine y={70} stroke="#D97706" strokeDasharray="4 4" strokeWidth={1.5} />
                            <Line type="monotone" dataKey="value" stroke="#0D7A71" strokeWidth={3} dot={{ r: 3, fill: '#0D7A71' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {activeConsoleTab === 'pharmd' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-xl bg-purple-50/70 border-2 border-purple-200 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-800 text-white shrink-0 mt-0.5">
                        <Pill size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-purple-950">Pharm D Medication Reconciliation & Interaction Check</h4>
                        <p className="text-xs text-purple-900 font-medium mt-1 leading-relaxed">
                          Patient currently prescribed Metformin 500mg BID + Glimepiride 1mg OD + Telmisartan 40mg OD. Screened for renal contraindications, drug-drug interactions, and hypoglycemia risk.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                        <span className="font-black text-slate-950 block uppercase tracking-wider text-[11px]">Active Clinical Checks</span>
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>eGFR Renal Function:</span>
                          <span className="text-emerald-700">84 mL/min (Normal)</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>Lactic Acidosis Risk:</span>
                          <span className="text-emerald-700">Low (eGFR &gt; 45)</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>Glimepiride Hypo Alert:</span>
                          <span className="text-amber-800">Counselling Documented</span>
                        </div>
                      </div>

                      <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                        <span className="font-black text-slate-950 block uppercase tracking-wider text-[11px]">Pharmacist Actions Taken</span>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <CheckCircle2 size={14} className="text-teal-800" />
                          <span>Patient counselled on timing with breakfast</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <CheckCircle2 size={14} className="text-teal-800" />
                          <span>Emergency glucose tabs supplied</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <CheckCircle2 size={14} className="text-teal-800" />
                          <span>Refill authorized by Dr. Krishnamurthy</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeConsoleTab === 'matrix' && (
                  <div className="space-y-4 animate-fade-in text-slate-950">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl border-2 border-teal-200 bg-teal-50/50">
                        <span className="text-xs font-black uppercase text-teal-900 block mb-1">1. Patient Telemetry</span>
                        <p className="text-xs font-medium text-slate-800 leading-relaxed">
                          Daily continuous logging of blood glucose, medication intake, carbohydrate logs, and symptom reporting.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50">
                        <span className="text-xs font-black uppercase text-purple-900 block mb-1">2. Pharm D Safety Review</span>
                        <p className="text-xs font-medium text-slate-800 leading-relaxed">
                          Detects adherence gaps, drug-drug contraindications, and titrates patient lifestyle education.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50">
                        <span className="text-xs font-black uppercase text-blue-900 block mb-1">3. Doctor Oversight</span>
                        <p className="text-xs font-medium text-slate-800 leading-relaxed">
                          Evaluates longitudinal HbA1c trajectory, adjusts pharmacotherapy, and approves clinical referrals.
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-100 rounded-xl text-center text-xs font-black text-slate-900">
                      Closed-loop handoffs ensure no patient decision goes unguided between clinic visits.
                    </div>
                  </div>
                )}

                {activeConsoleTab === 'safety' && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-xl text-xs text-rose-950 font-bold flex items-center gap-2">
                      <AlertTriangle size={18} className="text-rose-700 shrink-0" />
                      <span>Strict Clinician Governance Rail: AI decision engine NEVER modifies prescriptions autonomously.</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-900">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-teal-800" />
                        <span>Hypoglycemia trigger: &lt; 70 mg/dL immediate escalation</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-teal-800" />
                        <span>Hyperglycemia trigger: &gt; 250 mg/dL clinical notification</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-teal-800" />
                        <span>Prescription changes require digital physician sign-off</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-teal-800" />
                        <span>Full cryptographic audit logging of all modifications</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Impact Metrics ────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 text-center shadow-xs">
              <span className="block text-3xl sm:text-4xl font-black text-teal-800 tracking-tight">100%</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mt-1">Closed-Loop Care</span>
              <span className="text-[11px] font-semibold text-slate-600 mt-1 block">Replacing episodic care gaps</span>
            </div>
            <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 text-center shadow-xs">
              <span className="block text-3xl sm:text-4xl font-black text-blue-800 tracking-tight">3-Way</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mt-1">Clinical Handoffs</span>
              <span className="text-[11px] font-semibold text-slate-600 mt-1 block">Patient, Doctor & Pharm D</span>
            </div>
            <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 text-center shadow-xs">
              <span className="block text-3xl sm:text-4xl font-black text-purple-800 tracking-tight">Pharm D</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mt-1">Medication Safety</span>
              <span className="text-[11px] font-semibold text-slate-600 mt-1 block">Preventing adverse interactions</span>
            </div>
            <div className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/70 text-center shadow-xs">
              <span className="block text-3xl sm:text-4xl font-black text-rose-700 tracking-tight">Zero</span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider block mt-1">Autonomous Meds</span>
              <span className="text-[11px] font-semibold text-slate-600 mt-1 block">Licensed provider sign-off</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Workstations Section ──────────────────────────── */}
      <section id="workstations" className="py-16 sm:py-24 bg-slate-50 border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-black text-teal-800 uppercase tracking-widest bg-teal-100/70 px-3.5 py-1.5 rounded-full border border-teal-300 inline-block mb-3">
              Explore The Care Team
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight">
              Select Your Clinical Workstation
            </h2>
            <p className="text-sm sm:text-base font-bold text-slate-700 mt-3">
              Enter specialized environments tailored to patients, physicians, clinical pharmacists, and governance administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DEMO_ACCOUNTS.map(account => (
              <div
                key={account.id}
                className={`bg-white rounded-2xl border-2 ${account.theme.border} p-6 flex flex-col justify-between shadow-xs hover:shadow-2xl transition-all duration-300 group`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${account.theme.iconBg} shadow-sm`}>
                      <account.icon size={22} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${account.theme.badge}`}>
                      {account.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-950 tracking-tight mb-0.5">
                    {account.name}
                  </h3>
                  <p className={`text-xs font-bold ${account.theme.accentText} mb-3`}>
                    {account.subtitle}
                  </p>
                  <p className="text-xs font-medium text-slate-700 leading-relaxed mb-5">
                    {account.desc}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-100 mb-6">
                    {account.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleLogin(account)}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer ${account.theme.button}`}
                >
                  <span>Launch Workstation</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real-World Clinical Scenario Walkthrough ───────────────────── */}
      <section id="workflow" className="py-16 sm:py-24 bg-white border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-black text-teal-800 uppercase tracking-widest bg-teal-100/70 px-3.5 py-1.5 rounded-full border border-teal-300 inline-block mb-3">
              End-to-End Care Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
              A Synchronized Clinical Journey in Action
            </h2>
            <p className="text-sm sm:text-base font-bold text-slate-700 mt-2">
              How LATROCORE responds when Mrs. Priya Sharma records an unexpected post-meal glucose spike.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Patient Telemetry Log',
                role: 'Priya Sharma (Patient)',
                desc: 'Patient enters 198 mg/dL post-dinner reading with a meal tag of "Paneer Butter Masala + Naan".',
                badge: 'Patient Portal',
                color: 'bg-teal-50 border-teal-200 text-teal-900'
              },
              {
                step: '02',
                title: 'Pharm D Alert & Screening',
                role: 'Kavitha Rajan (Pharm D)',
                desc: 'Platform flags consecutive post-prandial excursions. Pharmacist reviews adherence history and identifies a missed dose.',
                badge: 'Pharm D Console',
                color: 'bg-purple-50 border-purple-200 text-purple-900'
              },
              {
                step: '03',
                title: 'Structured Counselling',
                role: 'Clinical AI + Pharm D',
                desc: 'Patient receives culturally attuned dietary advice (Hindi/English) and pharmacist follows up to reinforce medication timing.',
                badge: 'Educational AI',
                color: 'bg-amber-50 border-amber-200 text-amber-900'
              },
              {
                step: '04',
                title: 'Physician Review & Titration',
                role: 'Dr. Arun Krishnamurthy',
                desc: 'Endocrinologist reviews 30-day glycemic trend, approves dose titration with verified e-prescription.',
                badge: 'Doctor Workstation',
                color: 'bg-blue-50 border-blue-200 text-blue-900'
              },
            ].map((st, i) => (
              <div key={i} className={`p-5 rounded-2xl border-2 ${st.color} flex flex-col justify-between shadow-xs`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-black opacity-60">#{st.step}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/80 border">
                      {st.badge}
                    </span>
                  </div>
                  <h4 className="text-base font-black mb-1">{st.title}</h4>
                  <p className="text-xs font-bold opacity-80 mb-2">{st.role}</p>
                  <p className="text-xs font-medium leading-relaxed">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Strict Safety Guardrails Section ──────────────────────────── */}
      <section id="safety" className="py-16 sm:py-24 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3.5 py-1 rounded-full text-xs font-black uppercase mb-4">
              <AlertTriangle size={15} />
              <span>Zero Autonomous Prescription Protocols</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-6">
              Clinical Guardrails That Protect Every Patient.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed mb-8">
              Medical algorithms should support care teams, not replace them. LATROCORE operates under strict regulatory guidelines where every medication modification, referral, and titration requires verified licensed clinician sign-off.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="font-black text-white text-sm block mb-1">Hard Escalation Rails</span>
                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  Glucose values below 70 mg/dL or above 250 mg/dL trigger immediate urgent alerts to the care team.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="font-black text-white text-sm block mb-1">Drug Interaction Check</span>
                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  Prescriptions automatically cross-checked against active drugs for severe DDIs and renal dose adjustments.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="font-black text-white text-sm block mb-1">Cryptographic Audit</span>
                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  Every dosage change, counselling note, and log entry is immutably timestamped with provider credentials.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleGuidedDemo}
                className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all flex items-center gap-2"
              >
                <Play size={14} className="fill-white" />
                <span>Test Guided Safety Demo</span>
              </button>
              <NavLink
                to="/overview"
                className="text-slate-300 hover:text-white text-xs font-bold underline underline-offset-4 cursor-pointer"
              >
                Inspect Clinical Governance Framework &rarr;
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── Professional Comprehensive Footer ─────────────────────────── */}
      <footer className="bg-slate-900 text-white pt-16 pb-12 border-t-2 border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            {/* Col 1: Platform Brand */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center text-white shadow-xs">
                  <Stethoscope size={22} />
                </div>
                <div>
                  <span className="font-black text-white tracking-tight text-xl block leading-none">LATROCORE</span>
                  <span className="text-[10px] font-bold text-teal-400 tracking-wider uppercase block mt-1">Clinical Care System</span>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-300 max-w-sm leading-relaxed">
                An advanced multi-disciplinary healthcare platform linking Type 2 Diabetes patients, endocrinologists, and Pharm D medication specialists into one closed-loop care continuum.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-300">All 4 Workstations Operational &amp; Synced</span>
              </div>
            </div>

            {/* Col 2: Care Stations */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-200">Workstations</p>
              <ul className="space-y-2 text-xs font-semibold text-slate-400">
                <li>
                  <button onClick={() => handleLogin(DEMO_ACCOUNTS[0])} className="hover:text-white transition-colors cursor-pointer text-left">
                    Patient Care Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => handleLogin(DEMO_ACCOUNTS[1])} className="hover:text-white transition-colors cursor-pointer text-left">
                    Physician Workstation
                  </button>
                </li>
                <li>
                  <button onClick={() => handleLogin(DEMO_ACCOUNTS[2])} className="hover:text-white transition-colors cursor-pointer text-left">
                    Pharm D Clinical Station
                  </button>
                </li>
                <li>
                  <button onClick={() => handleLogin(DEMO_ACCOUNTS[3])} className="hover:text-white transition-colors cursor-pointer text-left">
                    Platform Governance
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Framework */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-200">Clinical Framework</p>
              <ul className="space-y-2 text-xs font-semibold text-slate-400">
                <li><NavLink to="/overview" className="hover:text-white transition-colors">Clinical Blueprint</NavLink></li>
                <li><NavLink to="/care-summary" className="hover:text-white transition-colors">Care Summary Dashboard</NavLink></li>
                <li><a href="#workflow" className="hover:text-white transition-colors">Continuum Protocols</a></li>
                <li><a href="#safety" className="hover:text-white transition-colors">Safety Guardrails</a></li>
              </ul>
            </div>

            {/* Col 4: Standards & Compliance */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-slate-200">Compliance &amp; Standards</p>
              <ul className="space-y-2.5 text-xs font-semibold text-slate-400">
                <li className="flex items-center gap-2"><Lock size={13} className="text-teal-400 shrink-0" /> <span>HL7 FHIR Interoperable</span></li>
                <li className="flex items-center gap-2"><Shield size={13} className="text-teal-400 shrink-0" /> <span>HIPAA Audit Compliant</span></li>
                <li className="flex items-center gap-2"><Database size={13} className="text-teal-400 shrink-0" /> <span>Synthetic PHI Environment</span></li>
                <li className="flex items-center gap-2"><FileText size={13} className="text-teal-400 shrink-0" /> <span>CDSCO Guidelines Aligned</span></li>
              </ul>
            </div>
          </div>

          {/* Legal Notice */}
          <div className="pt-8 space-y-4 text-[11px] font-medium text-slate-400 leading-relaxed">
            <p>
              <strong>Clinical Demonstration Notice:</strong> LATROCORE is an educational and technological platform designed for clinical scenario simulation. All patient identities, diagnostic readings, and medication records are synthetic and contain zero real Protected Health Information (PHI).
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 text-slate-500 font-bold">
              <span>&copy; 2026 LATROCORE Healthcare Systems. All rights reserved.</span>
              <div className="flex items-center gap-4">
                <span className="hover:text-slate-400 transition-colors">Confidentiality Protocol</span>
                <span>&bull;</span>
                <span className="hover:text-slate-400 transition-colors">Security Architecture</span>
                <span>&bull;</span>
                <span className="hover:text-slate-400 transition-colors">Terms of Demonstration</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
