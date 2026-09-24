import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Stethoscope, Users, Heart, Pill, Shield, Activity, Brain, ArrowRight,
  CheckCircle, FileText, Database, Sparkles, AlertTriangle, Layers
} from 'lucide-react';

export default function ProjectOverview() {
  const navigate = useNavigate();
  const { currentUser, data, setUser } = useApp();
  const [activeTab, setActiveTab] = useState('vision');

  const tabs = [
    { id: 'vision', label: 'Clinical Vision' },
    { id: 'workflow', label: 'End-to-End Workflow' },
    { id: 'roles', label: 'Interdisciplinary Roles' },
    { id: 'governance', label: 'Governance & Safety' },
    { id: 'research', label: 'Research Roadmap' },
  ];

  const handleLaunchRole = (roleKey, route) => {
    const userMap = {
      patient: 'pat-001',
      doctor: 'doc-001',
      pharmacist: 'pharm-001',
      admin: 'admin-001',
    };
    const user = data?.users?.[userMap[roleKey]];
    if (user) {
      setUser(user);
      navigate(route);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-950 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-teal-700/60 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold text-teal-200 mb-4 border border-teal-500/30">
            <Sparkles size={14} />
            <span>Healthcare Transformation Platform</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            LATROCORE — Comprehensive Diabetes Care Architecture
          </h1>
          <p className="text-teal-100 text-sm sm:text-base leading-relaxed">
            Bridging fragmented healthcare silos by linking patients, endocrinologists, clinical pharmacists (Pharm D), and educational AI agents into one synchronized, closed-loop diabetes management ecosystem.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => handleLaunchRole('patient', '/patient/dashboard')}
              className="bg-white text-teal-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-50 shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Explore Patient Journey</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => handleLaunchRole('doctor', '/doctor/dashboard')}
              className="bg-teal-700/50 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer border border-teal-500/40"
            >
              Doctor Workspace
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-24 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Vision */}
      {activeTab === 'vision' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-6 border-t-4 border-t-primary">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-primary flex items-center justify-center mb-4">
                <Activity size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">The Fragmentation Dilemma</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Diabetes care today suffers from severe episodic gaps. Patients spend fewer than 2 hours a year with their physician, leaving over 8,700 hours of unguided daily decisions regarding nutrition, medication adherence, and symptom navigation.
              </p>
            </div>

            <div className="card p-6 border-t-4 border-t-secondary">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-secondary flex items-center justify-center mb-4">
                <Heart size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Collaborative Care Matrix</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                By integrating Doctor supervision with dedicated Clinical Pharmacist (Pharm D) medication review and lifestyle support, LATROCORE prevents preventable adverse drug interactions, therapeutic inertia, and hypoglycemia.
              </p>
            </div>

            <div className="card p-6 border-t-4 border-t-purple-600">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Brain size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Intelligent Handoffs</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                AI provides on-demand multilingual education (English, Hindi, Tamil) for everyday adherence and food advice, with strict safety rails that automatically escalate clinical uncertainties directly to the Pharm D care team.
              </p>
            </div>
          </div>

          <div className="card p-8 bg-white border border-border">
            <h2 className="text-xl font-bold text-text-primary mb-4">Key Value Pillars</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: 'Continuous Glucose & Vital Telemetry', desc: 'Syncs daily fingerstick or CGM readings, correlating glucose spikes with meal composition and exercise.' },
                { title: 'Prescription Synchronization', desc: 'Doctor-authorized digital prescriptions instantly generate daily dose checklists with duplicate dose prevention.' },
                { title: 'Pharm D Escalation & Counselling', desc: 'Dedicated queue for reviewing polypharmacy risks, side effects, refill verifications, and structured patient sessions.' },
                { title: 'Comprehensive Care Summary', desc: 'Unified single-source record downloadable in PDF or printable for inter-hospital referrals and clinical visits.' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-border/70">
                  <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{item.title}</h4>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Workflow */}
      {activeTab === 'workflow' && (
        <div className="card p-8 space-y-8 bg-white">
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-2">The Closed-Loop Clinical Workflow</h2>
            <p className="text-sm text-text-secondary">
              Every action in LATROCORE flows bidirectionally between patient self-care and professional clinician oversight.
            </p>
          </div>

          <div className="relative border-l-2 border-primary/30 pl-6 space-y-8 ml-3">
            {[
              {
                step: '1. Physician Consultation & Prescription Authorization',
                desc: 'The Doctor assesses clinical investigations (HbA1c, renal profile) and issues or amends prescriptions. Validated orders are officially authorized with a digital audit stamp.',
                badge: 'Doctor Action',
                badgeColor: 'badge-primary',
              },
              {
                step: '2. Real-Time Patient Dose Schedule & Logging',
                desc: 'Authorized medications automatically populate the patient daily schedule. The patient records doses, food timings, and glucose readings. Adherence is calculated from elapsed intervals.',
                badge: 'Patient Action',
                badgeColor: 'badge-secondary',
              },
              {
                step: '3. Clinical Pharmacist (Pharm D) Oversight',
                desc: 'Pharmacists review flags for potential interactions, missed adherence thresholds, or refill requests. They conduct live structured counselling sessions and record clinical notes.',
                badge: 'Pharmacist Action',
                badgeColor: 'bg-purple-100 text-purple-800',
              },
              {
                step: '4. AI Education with Supervised Triage',
                desc: 'Patients receive immediate assistance for meal planning, injection site hygiene, and storage guidance. If a high-risk symptom (severe hypoglycemia, ketosis) is detected, urgent protocols activate.',
                badge: 'AI + Safety Gateway',
                badgeColor: 'bg-amber-100 text-amber-800',
              },
              {
                step: '5. Follow-Up Reviews & Continuous Prevention',
                desc: 'Doctors receive escalations and review updated 30-day glycemic trajectories, scheduling appointments or specialist referrals (ophthalmology, podiatry, cardiology) before complications emerge.',
                badge: 'Closing the Loop',
                badgeColor: 'badge-success',
              },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-primary ring-4 ring-white" />
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${step.badgeColor}`}>
                    {step.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary">{step.step}</h3>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Roles */}
      {activeTab === 'roles' && (
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              role: 'Patient (Self-Care & Empowerment)',
              persona: 'Priya Sharma (Age 48, Type 2 DM)',
              items: [
                'Log blood glucose with contextual tags (fasting, post-meal, exercise).',
                'Mark daily doses as taken or missed with adherence telemetry.',
                'Access multilingual AI assistant for diet, exercise, and medicine timing.',
                'Upload and track laboratory reports (HbA1c, renal, lipid profiles).',
                'Receive proactive reminders for retinal, foot, and dental screenings.',
              ],
              color: 'border-l-primary',
              btn: 'Open Patient View',
              action: () => handleLaunchRole('patient', '/patient/dashboard'),
            },
            {
              role: 'Doctor (Clinical Governance & Treatment)',
              persona: 'Dr. Arun Krishnamurthy (MD, Diabetologist)',
              items: [
                'Review patient directories and longitudinal glycemic trends.',
                'Create, amend, and officially authorize pharmaceutical prescriptions.',
                'Set personalized demographic target ranges for glucose and HbA1c.',
                'Review high-priority escalations flagged by clinical pharmacists.',
                'Generate interdisciplinary referrals and schedule clinical follow-ups.',
              ],
              color: 'border-l-secondary',
              btn: 'Open Doctor View',
              action: () => handleLaunchRole('doctor', '/doctor/dashboard'),
            },
            {
              role: 'Clinical Pharmacist (Pharm D Specialist)',
              persona: 'Kavitha Rajan (Pharm D, Clinical Pharmacist)',
              items: [
                'Audit prescriptions for drug-drug interactions and dosage appropriateness.',
                'Conduct interactive simulated counselling sessions with timer & notes.',
                'Review and approve or reject patient prescription refill requests.',
                'Escalate complex medication anomalies directly to attending physicians.',
                'Empower patients with insulin injection technique and storage guidance.',
              ],
              color: 'border-l-purple-600',
              btn: 'Open Pharmacist View',
              action: () => handleLaunchRole('pharmacist', '/pharmacist/dashboard'),
            },
            {
              role: 'Demo Administrator & Compliance Auditor',
              persona: 'System Compliance & Admin',
              items: [
                'Manage patient, doctor, and pharmacist accounts and assignments.',
                'Inspect immutable clinical audit log for tracking all system events.',
                'Configure demo parameters and test data scenarios.',
                'One-click factory reset to restore original realistic seed dataset.',
              ],
              color: 'border-l-gray-600',
              btn: 'Open Admin View',
              action: () => handleLaunchRole('admin', '/admin/dashboard'),
            },
          ].map((r, idx) => (
            <div key={idx} className={`card p-6 border-l-4 ${r.color} flex flex-col justify-between`}>
              <div>
                <h3 className="text-lg font-bold text-text-primary">{r.role}</h3>
                <p className="text-xs font-semibold text-text-secondary mt-0.5 mb-4">{r.persona}</p>
                <ul className="space-y-2 text-sm text-text-secondary mb-6">
                  {r.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={r.action}
                className="btn-outline w-full text-sm font-semibold justify-center cursor-pointer"
              >
                {r.btn}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Governance */}
      {activeTab === 'governance' && (
        <div className="card p-8 bg-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Clinical Governance & Medical Safety</h2>
              <p className="text-sm text-text-secondary">Strict protocols ensuring software aids clinicians without overstepping regulatory boundaries.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-gray-50/70">
              <h3 className="font-bold text-sm text-text-primary mb-1">Prescription Authorization Safeguards</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Only authenticated Doctor accounts have cryptographic authorization privileges. Pharmacists and patients can request refills or raise concerns, but cannot alter medication dosages without physician validation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-gray-50/70">
              <h3 className="font-bold text-sm text-text-primary mb-1">AI Boundary Enforcement</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                The conversational assistant is restricted to educational, dietary, and scheduling guidance. Any mention of dangerous symptoms (chest pain, blood glucose &lt; 54 mg/dL) triggers emergency guidance and advises immediate hospital triage.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-gray-50/70">
              <h3 className="font-bold text-sm text-text-primary mb-1">Comprehensive Audit Trail</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Every clinical record creation, dose logging, prescription modification, and review resolution records a permanent audit entry containing the user ID, timestamp, and clinical rationale.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-gray-50/70">
              <h3 className="font-bold text-sm text-text-primary mb-1">Simulated Clinical Environment</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                All records, lab investigations, and pharmacological data within this prototype are fictional demonstrations prepared for clinical workflow evaluation and educational modeling.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Research Roadmap */}
      {activeTab === 'research' && (
        <div className="card p-8 bg-white space-y-6">
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Aspirational Research Roadmap</h2>
            <p className="text-sm text-text-secondary">
              Future clinical and algorithmic investigations (strictly experimental modeling without unwarranted curative claims).
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                title: 'Continuous Pharmacogenomic Risk Stratification',
                detail: 'Investigating potential predictive models linking CYP2C9 and SLCO1B1 genetic variants with individual metformin tolerability and sulfonylurea hypoglycemia propensity.',
              },
              {
                title: 'Predictive Glycemic Volatility Alerting',
                detail: 'Training local time-series transformers on CGM telemetry to predict nighttime hypoglycemic episodes 45 minutes prior to physiological onset.',
              },
              {
                title: 'Microvascular Complication Early Detection',
                detail: 'Machine vision screening algorithms for mobile fundus photography and automated podiatric thermal camera integrations for diabetic foot ulcers.',
              },
              {
                title: 'Cross-Disciplinary Tele-Pharmacy Reimbursement Models',
                detail: 'Health economics studies quantifying cost offsets of Pharm D interventions against preventable emergency department admissions for diabetes decompensation.',
              },
            ].map((res, i) => (
              <div key={i} className="p-4 rounded-xl border border-teal-100 bg-teal-50/30">
                <h3 className="text-sm font-bold text-primary">{res.title}</h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{res.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
