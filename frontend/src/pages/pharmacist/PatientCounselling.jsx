import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge, LoadingSpinner, Tabs } from '../../components/ui';
import {
  Stethoscope, Heart, Clock, Play, Pause, CheckCircle,
  AlertTriangle, BookOpen, ThermometerSnowflake, Salad, Sparkles,
  Pill, FileText, Check, ShieldCheck, ArrowRight, MessageSquare
} from 'lucide-react';
import { formatDate } from '../../data/demoDate';
import { updateCounsellingRequest, addAuditEntry } from '../../services/dataService';

export default function PatientCounselling() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const navigate = useNavigate();

  const [activeGuideTab, setActiveGuideTab] = useState('meds'); // 'meds', 'insulin', 'storage', 'lifestyle'
  const [activeSession, setActiveSession] = useState(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [soapNotes, setSoapNotes] = useState({
    subjective: 'Patient reports occasional post-meal bloating and requested guidance on insulin injection angle.',
    objective: 'Fasting glucose 132 mg/dL. HbA1c 7.2%. No signs of lipohypertrophy on abdominal inspection.',
    assessment: 'Mild GI intolerance to Metformin; minor injection technique friction with needle withdrawal speed.',
    plan: 'Reinforced taking Metformin with substantial meals. Demonstrated 10-second needle hold protocol. Scheduled 2-week check.',
  });

  // Timer interval
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const counsellingRequests = useMemo(() => {
    return data?.counsellingRequests || [
      { id: 'cr-001', patientId: 'pat-001', type: 'patient_request', topic: 'Medication Use & Side Effects', status: 'requested', priority: 'normal', requestedAt: new Date(Date.now() - 86400000).toISOString(), notes: 'Wants guidance on Metformin timing and potential GI side effects.' },
      { id: 'cr-002', patientId: 'pat-002', type: 'doctor_referral', topic: 'Insulin Technique & Adherence', status: 'assigned', priority: 'high', requestedAt: new Date(Date.now() - 2 * 86400000).toISOString(), notes: 'Referred by Dr. Arun Krishnamurthy for comprehensive insulin injection technique review.' },
      { id: 'cr-003', patientId: 'pat-003', type: 'pharmacist_initiated', topic: 'Hypoglycemia & Storage', status: 'requested', priority: 'normal', requestedAt: new Date().toISOString(), notes: 'Annual review of cold-chain insulin storage and travel safety.' },
    ];
  }, [data?.counsellingRequests]);

  const handleStartSession = (req) => {
    setActiveSession(req);
    setTimerSeconds(0);
    setTimerRunning(true);
    addToast({
      type: 'info',
      message: `⏱️ Pharm D Counselling Session active for ${getPatientName(req.patientId)}.`,
    });
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;
    setTimerRunning(false);

    try {
      await updateCounsellingRequest(activeSession.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        outcome: `Pharm D consultation completed (${Math.round(timerSeconds / 60)} mins). Notes: ${soapNotes.plan}`,
      });
      await addAuditEntry({
        actor: currentUser?.id || 'pharm-001',
        actorRole: 'pharmacist',
        action: 'counselling_completed',
        patientId: activeSession.patientId,
        details: `Pharm D Clinical Counselling completed: ${activeSession.topic}`,
      });
      refreshData();
      addToast({
        type: 'success',
        message: `✅ Counselling session completed and saved to ${getPatientName(activeSession.patientId)}'s longitudinal medical record.`,
      });
      setActiveSession(null);
      setTimerSeconds(0);
    } catch (err) {
      addToast({ type: 'error', message: 'Could not complete session.' });
    }
  };

  const getPatientName = (patientId) => {
    const p = (data?.users || {})[patientId];
    if (p) return p.name;
    if (patientId === 'pat-001') return 'Priya Sharma';
    if (patientId === 'pat-002') return 'Rajesh Kumar';
    if (patientId === 'pat-003') return 'Ananya Patel';
    return 'Patient ' + patientId;
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#A8D7BD]">
              Pharm D Clinical Specialization
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-600">
              Doctor of Pharmacy Patient Education
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
            <Stethoscope className="text-[#046A38] shrink-0" size={28} />
            <span>Pharm D Clinical Patient Counselling Hub</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Standardized diabetes clinical counselling protocols: medicine administration instructions, sub-Q insulin technique, cold-chain storage safety, and Rule-of-15 hypoglycemia recovery.
          </p>
        </div>

        {activeSession && (
          <div className="flex items-center gap-3 bg-[#046A38] text-white px-4 py-2.5 rounded-2xl shadow-sm self-start md:self-auto shrink-0 animate-pulse">
            <Clock size={18} />
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-200">Session Timer</p>
              <p className="text-base font-black tracking-widest">{formatTimer(timerSeconds)}</p>
            </div>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer ml-2"
            >
              {timerRunning ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* ── Active Session Console (If Session in Progress) ─────────── */}
      {activeSession && (
        <div className="card bg-white rounded-3xl border-2 border-[#046A38] p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                <Heart size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">
                  Active Consultation: {getPatientName(activeSession.patientId)}
                </h3>
                <p className="text-xs font-bold text-[#046A38]">
                  Topic: {activeSession.topic} • Elapsed: {formatTimer(timerSeconds)}
                </p>
              </div>
            </div>

            <button
              onClick={handleCompleteSession}
              className="btn-primary btn-sm font-bold flex items-center gap-1.5 self-start sm:self-auto"
            >
              <CheckCircle size={15} /> Finalize &amp; Sign SOAP Note
            </button>
          </div>

          {/* SOAP Notes Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">Subjective (Patient Reported):</label>
              <textarea
                value={soapNotes.subjective}
                onChange={e => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#FAF6EF] font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">Objective (Vitals &amp; Lab Data):</label>
              <textarea
                value={soapNotes.objective}
                onChange={e => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#FAF6EF] font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">Assessment (Pharm D Evaluation):</label>
              <textarea
                value={soapNotes.assessment}
                onChange={e => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#FAF6EF] font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-800 block mb-1">Plan &amp; Education Provided:</label>
              <textarea
                value={soapNotes.plan}
                onChange={e => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-[#FAF6EF] font-medium text-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Active Counselling Requests Queue ───────────────────────── */}
      <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-950">Patient Counselling Requests Queue</h3>
            <p className="text-xs font-semibold text-slate-600">Pending physician referrals and patient-initiated consultations</p>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-800">
            {counsellingRequests.filter(r => r.status !== 'completed').length} Pending
          </span>
        </div>

        <div className="space-y-2.5">
          {counsellingRequests.filter(r => r.status !== 'completed').map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-300 transition-all"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm text-slate-950">{getPatientName(req.patientId)}</p>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    req.priority === 'high' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {req.priority} Priority
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {req.type === 'doctor_referral' ? '👨‍⚕️ Doctor Referral' : '🙋 Patient Request'}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#046A38] mt-0.5">Topic: {req.topic}</p>
                <p className="text-[11px] font-semibold text-slate-600 mt-1">{req.notes}</p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={() => handleStartSession(req)}
                  disabled={activeSession?.id === req.id}
                  className="btn-primary btn-sm text-xs font-bold flex items-center gap-1.5"
                >
                  <Play size={13} /> {activeSession?.id === req.id ? 'Session In Progress' : 'Begin Consultation'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4 Clinical Counselling Reference Modules ───────────────── */}
      <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-950">Standardized Pharm D Clinical Guidance Curriculum</h3>
          <p className="text-xs font-semibold text-slate-600">Select clinical guide module to review with patient or reference during consultation:</p>
        </div>

        {/* Module Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'meds', label: '1. Oral Antidiabetic Medicines', icon: Pill },
            { id: 'insulin', label: '2. Insulin Pen Injection Technique', icon: Stethoscope },
            { id: 'storage', label: '3. Cold-Chain Storage & Stability', icon: ThermometerSnowflake },
            { id: 'lifestyle', label: '4. Rule of 15 & Lifestyle Care', icon: Salad },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveGuideTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                activeGuideTab === tab.id
                  ? 'bg-[#046A38] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Module 1: Oral Diabetes Medicines ── */}
        {activeGuideTab === 'meds' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] space-y-4 text-xs">
            <h4 className="font-black text-sm text-slate-950 flex items-center gap-2">
              <Pill size={16} className="text-[#046A38]" /> Oral Hypoglycemic Agent Administration Protocols
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-semibold text-slate-800">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="font-black text-slate-950 text-xs mb-1">Metformin HCl (Biguanide)</p>
                <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-700">
                  <li><span className="font-bold">Administration:</span> Take with or immediately after meals with a full glass of water.</li>
                  <li><span className="font-bold">GI Tolerance:</span> Gradual titration over 2–4 weeks reduces nausea, cramping, and loose stools.</li>
                  <li><span className="font-bold">Safety Note:</span> Do not crush sustained-release (SR) formulations. Withhold if fasting before contrast CT.</li>
                </ul>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <p className="font-black text-slate-950 text-xs mb-1">Glimepiride (Sulfonylurea)</p>
                <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-700">
                  <li><span className="font-bold">Administration:</span> Take 15 to 30 minutes before the first substantial meal of the day (Breakfast).</li>
                  <li><span className="font-bold">Hypoglycemia Guard:</span> Never skip meals after taking Glimepiride. Always carry 15g fast glucose.</li>
                  <li><span className="font-bold">Exercise Rule:</span> Monitor glucose before and after strenuous physical exertion.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Module 2: Insulin Injection Technique ── */}
        {activeGuideTab === 'insulin' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] space-y-4 text-xs">
            <h4 className="font-black text-sm text-slate-950 flex items-center gap-2">
              <Stethoscope size={16} className="text-[#046A38]" /> Subcutaneous Insulin Pen Technique &amp; Lipohypertrophy Prevention
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              {[
                { step: '1. Prime Pen', desc: 'Attach new 4mm needle, dial 2 units, push button upright until a droplet appears to eliminate air pockets.' },
                { step: '2. Dial Dose', desc: 'Turn selector ring to exact prescribed unit count (e.g. 16U Glargine). Confirm dose in window.' },
                { step: '3. 90° Injection', desc: 'Insert 4mm needle straight at 90° into subcutaneous fat (abdomen or thighs). No skin pinch needed for 4mm.' },
                { step: '4. 10-Sec Hold', desc: 'Depress thumb button fully. Keep needle embedded for a FULL 10 SECONDS before withdrawal to prevent backflow.' },
              ].map((s, i) => (
                <div key={i} className="p-3 bg-white rounded-xl border border-slate-200">
                  <p className="font-black text-[#046A38] text-xs mb-1">{s.step}</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-semibold">
              <p className="font-black text-xs text-emerald-900 mb-0.5">Anatomical Site Rotation Rule:</p>
              Rotate injection sites weekly across the 4 quadrants of the abdomen (staying 2 inches away from navel) and anterolateral thighs to prevent fibrous lipohypertrophy nodules.
            </div>
          </div>
        )}

        {/* ── Module 3: Storage & Cold Chain ── */}
        {activeGuideTab === 'storage' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] space-y-4 text-xs">
            <h4 className="font-black text-sm text-slate-950 flex items-center gap-2">
              <ThermometerSnowflake size={16} className="text-[#046A38]" /> Cold-Chain Storage &amp; 28-Day In-Use Stability
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 font-semibold text-slate-800">
                <p className="font-black text-blue-900 text-xs">❄️ Unopened Reserve Pens (Vault Storage)</p>
                <p>Store in refrigerator between <span className="font-bold text-slate-950">2°C and 8°C (36°F - 46°F)</span>.</p>
                <p className="text-rose-700 font-bold">⚠️ NEVER FREEZE: Freezing irreversibly denatures insulin peptide proteins.</p>
                <p className="text-slate-600 text-[11px]">Keep in original carton box to shield from ambient ultraviolet light.</p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 font-semibold text-slate-800">
                <p className="font-black text-amber-900 text-xs">🌡️ In-Use Pen (Daily Administration)</p>
                <p>Store at controlled room temperature <span className="font-bold text-slate-950">below 30°C (86°F)</span>.</p>
                <p className="text-slate-900 font-bold">Expires 28 days after first needle penetration, even if insulin remains.</p>
                <p className="text-slate-600 text-[11px]">Do not store in-use pen with needle attached to prevent air entry and evaporation.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Module 4: Rule of 15 & Lifestyle ── */}
        {activeGuideTab === 'lifestyle' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] space-y-4 text-xs">
            <h4 className="font-black text-sm text-slate-950 flex items-center gap-2">
              <Salad size={16} className="text-[#046A38]" /> Hypoglycemia Emergency Protocol — ADA "Rule of 15"
            </h4>

            <div className="p-4 bg-white rounded-2xl border-2 border-amber-300 space-y-2">
              <p className="font-black text-amber-950 text-xs">If Blood Glucose Drops Below 70 mg/dL:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-semibold">
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-black text-slate-950 block">Step 1: 15g Fast Carbs</span>
                  Ingest 3–4 glucose chewables, 1/2 cup orange juice, or 1 tablespoon honey/sugar.
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-black text-slate-950 block">Step 2: Wait 15 Minutes</span>
                  Rest quietly. Avoid over-eating large snacks which trigger severe rebound hyperglycemia.
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-black text-slate-950 block">Step 3: Recheck Glucose</span>
                  If still &lt; 70 mg/dL, repeat 15g carbs. Once &ge; 70 mg/dL, consume standard meal or snack.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

