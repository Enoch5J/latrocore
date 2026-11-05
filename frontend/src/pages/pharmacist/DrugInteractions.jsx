import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge, LoadingSpinner } from '../../components/ui';
import {
  ShieldAlert, AlertTriangle, CheckCircle, ShieldCheck, Pill,
  Users, Search, RefreshCw, Send, Plus, X, AlertCircle, Sparkles, FileText
} from 'lucide-react';

const COMMON_DRUGS = [
  { id: 'd-met', name: 'Metformin HCl', category: 'Biguanide', class: 'Antidiabetic' },
  { id: 'd-gli', name: 'Glimepiride', category: 'Sulfonylurea', class: 'Antidiabetic', sulfaGroup: true },
  { id: 'd-ato', name: 'Atorvastatin', category: 'HMG-CoA Reductase Inhibitor', class: 'Lipid-Lowering' },
  { id: 'd-tel', name: 'Telmisartan', category: 'Angiotensin Receptor Blocker (ARB)', class: 'Antihypertensive' },
  { id: 'd-ins-gla', name: 'Insulin Glargine', category: 'Basal Insulin Analog', class: 'Antidiabetic' },
  { id: 'd-ins-asp', name: 'Insulin Aspart', category: 'Rapid-Acting Insulin Analog', class: 'Antidiabetic' },
  { id: 'd-asp', name: 'Aspirin 75mg', category: 'Antiplatelet / NSAID', class: 'Cardiovascular' },
  { id: 'd-cip', name: 'Ciprofloxacin', category: 'Fluoroquinolone', class: 'Antibiotic' },
  { id: 'd-cla', name: 'Clarithromycin', category: 'Macrolide Antibiotic', class: 'Antibiotic' },
  { id: 'd-spi', name: 'Spironolactone', category: 'Potassium-Sparing Diuretic', class: 'Antihypertensive' },
  { id: 'd-glip', name: 'Glipizide', category: 'Sulfonylurea', class: 'Antidiabetic', sulfaGroup: true },
];

// Clinical Knowledge Base of Interactions
const INTERACTION_RULES = [
  {
    drugs: ['Metformin HCl', 'Iodinated Radiocontrast'],
    severity: 'Major',
    title: 'Metformin + Radiocontrast: Lactic Acidosis Risk',
    mechanism: 'Intravascular iodinated radiocontrast agents can cause acute renal impairment leading to severe metformin accumulation and fatal lactic acidosis.',
    action: 'Withhold Metformin 48 hours prior to and 48 hours after contrast imaging. Recheck renal function before restarting.',
  },
  {
    drugs: ['Glimepiride', 'Ciprofloxacin'],
    severity: 'Major',
    title: 'Glimepiride + Ciprofloxacin: Severe Hypoglycemia Risk',
    mechanism: 'Ciprofloxacin inhibits CYP2C9 and blocks pancreatic beta-cell potassium channels, markedly potentiating sulfonylurea insulin secretion.',
    action: 'Avoid co-administration or reduce Glimepiride dosage by 50%. Enforce frequent blood glucose monitoring for hypoglycemia.',
  },
  {
    drugs: ['Atorvastatin', 'Clarithromycin'],
    severity: 'Major',
    title: 'Atorvastatin + Clarithromycin: Severe Rhabdomyolysis Risk',
    mechanism: 'Clarithromycin is a potent CYP3A4 inhibitor, causing up to a 10-fold increase in systemic atorvastatin exposure and severe myopathy risk.',
    action: 'Temporarily suspend Atorvastatin during the clarithromycin treatment course, or substitute antibiotic with azithromycin.',
  },
  {
    drugs: ['Telmisartan', 'Spironolactone'],
    severity: 'Moderate',
    title: 'Telmisartan + Spironolactone: Hyperkalemia Risk',
    mechanism: 'Dual suppression of renin-angiotensin-aldosterone axis impairs renal potassium excretion, risking life-threatening cardiac arrhythmias.',
    action: 'Monitor serum potassium and creatinine within 1 week of initiation. Discontinue potassium supplements.',
  },
  {
    drugs: ['Glimepiride', 'Aspirin 75mg'],
    severity: 'Minor',
    title: 'Glimepiride + High-Dose Salicylates: Mild Hypoglycemia Potentiation',
    mechanism: 'Salicylates displace sulfonylureas from plasma protein-binding sites and exhibit modest intrinsic hypoglycemic effects.',
    action: 'Usually safe with cardioprotective low-dose aspirin (75-100mg); advise patient on hypoglycemia awareness.',
  },
  {
    drugs: ['Metformin HCl', 'Glimepiride'],
    severity: 'Beneficial Synergistic',
    title: 'Metformin + Glimepiride: Established Guideline Dual Therapy',
    mechanism: 'Complementary mechanisms: Metformin reduces hepatic gluconeogenesis while Glimepiride stimulates beta-cell insulin secretion.',
    action: 'Standard clinical combination. Ensure meal-tied timing to prevent hypoglycemia.',
  },
];

export default function DrugInteractions() {
  const { currentUser, data, addToast } = useApp();
  const navigate = useNavigate();

  const [selectedDrugs, setSelectedDrugs] = useState(['Metformin HCl', 'Glimepiride', 'Atorvastatin', 'Telmisartan']);
  const [selectedPatientId, setSelectedPatientId] = useState('pat-001');
  const [activeAllergyWarning, setActiveAllergyWarning] = useState(null);

  const patients = useMemo(() => {
    return Object.values(data?.users || {}).filter(u => u.role === 'patient');
  }, [data?.users]);

  // Handle Loading Patient Regimen
  const handleLoadPatientRegimen = (patientId) => {
    setSelectedPatientId(patientId);
    const patient = (data?.users || {})[patientId] || { name: 'Priya Sharma', allergies: ['Sulfa Drugs', 'Penicillin'] };
    const rxs = (data?.prescriptions || []).filter(r => r.patientId === patientId && r.status === 'active');

    let meds = [];
    if (rxs.length > 0) {
      meds = rxs.flatMap(r => (r.medicines || []).map(m => m.name.split(' ')[0]));
    } else {
      meds = ['Metformin HCl', 'Glimepiride', 'Atorvastatin', 'Telmisartan'];
    }

    // Standardize to common drug names
    const standardized = meds.map(m => {
      const match = COMMON_DRUGS.find(d => d.name.toLowerCase().includes(m.toLowerCase()));
      return match ? match.name : m;
    });

    setSelectedDrugs([...new Set(standardized)]);
    addToast({
      type: 'info',
      message: `Loaded active pharmacotherapy regimen for ${patient.name || 'Patient'}.`,
    });
  };

  const handleToggleDrug = (drugName) => {
    if (selectedDrugs.includes(drugName)) {
      setSelectedDrugs(selectedDrugs.filter(d => d !== drugName));
    } else {
      setSelectedDrugs([...selectedDrugs, drugName]);
    }
  };

  // 1. Analyze Drug-Drug Interactions
  const detectedInteractions = useMemo(() => {
    const list = [];
    for (const rule of INTERACTION_RULES) {
      const matches = rule.drugs.filter(d => selectedDrugs.some(sd => sd.toLowerCase().includes(d.toLowerCase())));
      if (matches.length === rule.drugs.length) {
        list.push(rule);
      }
    }
    return list;
  }, [selectedDrugs]);

  // 2. Analyze Duplicate Therapy
  const duplicateTherapy = useMemo(() => {
    const dupes = [];
    const sulfonylureas = selectedDrugs.filter(d => d.toLowerCase().includes('glimepiride') || d.toLowerCase().includes('glipizide'));
    if (sulfonylureas.length > 1) {
      dupes.push({
        class: 'Sulfonylurea Duplicate',
        drugs: sulfonylureas,
        warning: 'Duplicate secretagogue therapy detected. Severe risk of prolonged refractory hypoglycemia.',
      });
    }
    return dupes;
  }, [selectedDrugs]);

  // 3. Analyze Allergies & Contraindications
  const allergyAlerts = useMemo(() => {
    const alerts = [];
    const patient = (data?.users || {})[selectedPatientId] || { allergies: ['Sulfa Drugs', 'Penicillin'] };
    const patientAllergies = Array.isArray(patient.allergies) ? patient.allergies : [patient.allergies || ''];

    for (const alg of patientAllergies) {
      if (alg.toLowerCase().includes('sulfa')) {
        const sulfaMeds = selectedDrugs.filter(d => d.toLowerCase().includes('glimepiride') || d.toLowerCase().includes('glipizide'));
        if (sulfaMeds.length > 0) {
          alerts.push({
            allergy: alg,
            triggeredBy: sulfaMeds.join(', '),
            severity: 'High Clinical Alert',
            note: 'Glimepiride contains a sulfonamide moiety. While arylsulfonylurea cross-reactivity with antimicrobial sulfonamides is low, monitor closely for rash or allergic dermatosis.',
          });
        }
      }
      if (alg.toLowerCase().includes('contrast') && selectedDrugs.some(d => d.toLowerCase().includes('metformin'))) {
        alerts.push({
          allergy: alg,
          triggeredBy: 'Metformin HCl',
          severity: 'Critical Contraindication',
          note: 'History of radiocontrast sensitivity. Withhold Metformin 48 hours prior to contrast imaging to prevent lactic acidosis.',
        });
      }
    }
    return alerts;
  }, [selectedDrugs, selectedPatientId, data?.users]);

  const handleEscalateToDoctor = () => {
    addToast({
      type: 'success',
      message: '🚨 Clinical Interaction Note dispatched to Dr. Arun Krishnamurthy for immediate regimen review.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#A8D7BD]">
              Clinical Decision Support (CDS)
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-600">
              Multi-Drug Interaction &amp; Allergy Guard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="text-[#046A38] shrink-0" size={28} />
            <span>Drug Interactions &amp; Safety Audit Station</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Screen multi-drug combinations against pharmacological interaction databases, identify duplicate therapies, and cross-reference patient allergy registries.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => handleLoadPatientRegimen('pat-001')}
            className="btn-outline btn-sm font-bold flex items-center gap-1.5"
          >
            <Users size={14} /> Load Priya Sharma's Regimen
          </button>
        </div>
      </div>

      {/* ── Drug Selection & Active Multi-Drug Tray ─────────────────── */}
      <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-950">Active Medication Audit Tray</h3>
            <p className="text-xs font-semibold text-slate-600">Select medications to check for drug–drug interactions and duplicate therapy</p>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-xl bg-slate-100 text-slate-900 border border-slate-200">
            {selectedDrugs.length} Medicines in Active Screen
          </span>
        </div>

        {/* Selected Drugs Tags */}
        <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] min-h-[48px] items-center">
          {selectedDrugs.length === 0 ? (
            <span className="text-xs text-slate-500 font-semibold italic">No medicines in tray. Click any drug below to add.</span>
          ) : (
            selectedDrugs.map((drug, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#046A38] text-slate-950 text-xs font-black shadow-2xs"
              >
                <Pill size={13} className="text-[#046A38]" />
                {drug}
                <button
                  onClick={() => handleToggleDrug(drug)}
                  className="hover:text-rose-700 text-slate-400 cursor-pointer ml-1"
                >
                  <X size={13} />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Quick Add Common Drugs */}
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
            Available Medicines (Click to toggle in/out of safety tray):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_DRUGS.map((d) => {
              const inTray = selectedDrugs.includes(d.name);
              return (
                <button
                  key={d.id}
                  onClick={() => handleToggleDrug(d.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    inTray
                      ? 'bg-[#046A38] text-white border-[#03542C] shadow-xs'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {inTray ? '✓ ' : '+ '} {d.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Analysis Results Section ────────────────────────────────── */}
      <div className="space-y-4">
        {/* Allergy Alerts Banner */}
        {allergyAlerts.length > 0 && (
          <div className="card p-5 rounded-3xl bg-rose-50 border-2 border-rose-300 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-rose-950 font-black text-sm">
              <ShieldAlert size={20} className="text-rose-700 shrink-0" />
              <span>Documented Allergy &amp; Cross-Reactivity Warning</span>
            </div>
            {allergyAlerts.map((alg, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-white border border-rose-200 text-xs font-semibold text-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-rose-900">Documented Allergy: {alg.allergy}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                    {alg.severity}
                  </span>
                </div>
                <p className="text-slate-700">Trigger Drug: <span className="font-bold text-slate-950">{alg.triggeredBy}</span></p>
                <p className="text-[11px] font-medium text-slate-600 mt-1">{alg.note}</p>
              </div>
            ))}
          </div>
        )}

        {/* Duplicate Therapy Warnings */}
        {duplicateTherapy.length > 0 && (
          <div className="card p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-xs space-y-2">
            <div className="flex items-center gap-2.5 text-amber-950 font-black text-sm">
              <AlertTriangle size={20} className="text-amber-700 shrink-0" />
              <span>Duplicate Pharmacological Therapy Detected</span>
            </div>
            {duplicateTherapy.map((dup, i) => (
              <div key={i} className="p-3 rounded-2xl bg-white border border-amber-200 text-xs">
                <p className="font-bold text-amber-950">{dup.class}: {dup.drugs.join(' + ')}</p>
                <p className="text-slate-700 mt-1">{dup.warning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Drug-Drug Interactions */}
        <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">Drug–Drug Interaction Evaluation</h3>
              <p className="text-xs font-semibold text-slate-600">Screening against {INTERACTION_RULES.length} clinical interaction pathways</p>
            </div>
            {detectedInteractions.length > 0 && (
              <button
                onClick={handleEscalateToDoctor}
                className="btn-primary btn-sm bg-rose-700 hover:bg-rose-800 text-xs font-bold flex items-center gap-1.5"
              >
                <Send size={13} /> Escalate to Prescribing Doctor
              </button>
            )}
          </div>

          {detectedInteractions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-emerald-50 border border-emerald-200">
              <ShieldCheck size={36} className="text-emerald-700 mx-auto mb-2" />
              <h4 className="font-black text-emerald-950 text-sm">No Hazardous Drug Interactions Detected</h4>
              <p className="text-xs font-semibold text-emerald-800 mt-1">
                The current medication combination shows no major clinical incompatibilities or severe warnings in the database.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {detectedInteractions.map((rule, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border-2 space-y-2 ${
                    rule.severity === 'Major'
                      ? 'bg-rose-50/50 border-rose-300'
                      : rule.severity === 'Moderate'
                      ? 'bg-amber-50/50 border-amber-300'
                      : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-slate-950 flex items-center gap-1.5">
                      <AlertTriangle size={15} className={rule.severity === 'Major' ? 'text-rose-700' : 'text-amber-700'} />
                      {rule.title}
                    </h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      rule.severity === 'Major'
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : rule.severity === 'Moderate'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      {rule.severity} Severity
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    <span className="font-bold text-slate-950">Mechanism: </span>{rule.mechanism}
                  </p>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#046A38]">
                    <span className="font-extrabold text-slate-950 uppercase text-[10px] block">Pharm D Action Recommendation:</span>
                    {rule.action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

