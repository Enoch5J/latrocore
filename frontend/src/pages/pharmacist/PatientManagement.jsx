import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge, LoadingSpinner, SearchBar } from '../../components/ui';
import {
  Users, Search, Filter, AlertTriangle, Pill, ShieldCheck, Heart,
  Activity, ArrowRight, Eye, Calendar, Clock, CheckCircle, AlertCircle,
  FileText, ShieldAlert, Sparkles, Stethoscope, ChevronRight, X
} from 'lucide-react';
import { formatDate } from '../../data/demoDate';

export default function PatientManagement() {
  const { currentUser, data } = useApp();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Collect patients from data.users
  const allPatients = useMemo(() => {
    const users = Object.values(data?.users || {}).filter(u => u.role === 'patient');
    // Ensure default demo patients exist if not yet seeded
    if (users.length === 0) {
      return [
        {
          id: 'pat-001',
          name: 'Priya Sharma',
          age: 48,
          gender: 'Female',
          diabetesType: 'Type 2 Diabetes',
          diagnosedYear: 2021,
          email: 'priya.sharma@example.com',
          phone: '+91 98765 43210',
          allergies: ['Penicillin', 'Sulfa Drugs'],
          emergencyContact: 'Ramesh Sharma (Spouse) - +91 98765 43211',
          assignedDoctor: 'Dr. Arun Krishnamurthy',
          assignedPharmacist: 'Kavitha Rajan, Pharm D',
        },
        {
          id: 'pat-002',
          name: 'Rajesh Kumar',
          age: 56,
          gender: 'Male',
          diabetesType: 'Type 2 Diabetes (Insulin Dependent)',
          diagnosedYear: 2016,
          email: 'rajesh.kumar@example.com',
          phone: '+91 98123 45678',
          allergies: ['Aspirin (Mild Gastritis)'],
          emergencyContact: 'Meena Kumar (Wife) - +91 98123 45679',
          assignedDoctor: 'Dr. Arun Krishnamurthy',
          assignedPharmacist: 'Kavitha Rajan, Pharm D',
        },
        {
          id: 'pat-003',
          name: 'Ananya Patel',
          age: 32,
          gender: 'Female',
          diabetesType: 'Type 1 Diabetes',
          diagnosedYear: 2012,
          email: 'ananya.patel@example.com',
          phone: '+91 97654 32109',
          allergies: ['None Reported'],
          emergencyContact: 'Dev Patel (Father) - +91 97654 32108',
          assignedDoctor: 'Dr. Arun Krishnamurthy',
          assignedPharmacist: 'Kavitha Rajan, Pharm D',
        },
        {
          id: 'pat-004',
          name: 'Vikram Malhotra',
          age: 62,
          gender: 'Male',
          diabetesType: 'Type 2 Diabetes & Hypertension',
          diagnosedYear: 2014,
          email: 'vikram.m@example.com',
          phone: '+91 99887 76655',
          allergies: ['Iodinated Radiocontrast'],
          emergencyContact: 'Sunita Malhotra - +91 99887 76654',
          assignedDoctor: 'Dr. S. Sundaram',
          assignedPharmacist: 'Kavitha Rajan, Pharm D',
        },
      ];
    }
    return users;
  }, [data?.users]);

  // Aggregate clinical telemetry per patient
  const patientProfiles = useMemo(() => {
    const prescriptions = data?.prescriptions || [];
    const glucoseReadings = data?.glucoseReadings || [];
    const investigations = data?.investigations || [];
    const doseEvents = data?.doseEvents || [];
    const reviews = data?.medicationReviews || [];

    return allPatients.map(p => {
      const patientRxs = prescriptions.filter(r => r.patientId === p.id && r.status === 'active');
      const latestGlucose = (glucoseReadings.filter(g => g.patientId === p.id).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)))[0];
      const latestHbA1c = (investigations.filter(i => i.patientId === p.id && i.type === 'HbA1c').sort((a, b) => new Date(b.date) - new Date(a.date)))[0];
      const patientDoses = doseEvents.filter(d => d.patientId === p.id);
      const takenDoses = patientDoses.filter(d => d.status === 'taken').length;
      const adherencePct = patientDoses.length > 0 ? Math.round((takenDoses / patientDoses.length) * 100) : 85;
      const openReview = reviews.find(r => r.patientId === p.id && r.status !== 'resolved');

      const isHighRisk = adherencePct < 75 || (latestHbA1c && parseFloat(latestHbA1c.value) > 8.0) || !!openReview;

      return {
        ...p,
        activeRxs: patientRxs,
        latestGlucose,
        latestHbA1c,
        adherencePct,
        openReview,
        isHighRisk,
        allergiesList: Array.isArray(p.allergies) ? p.allergies : (p.allergies ? [p.allergies] : ['None Reported']),
      };
    });
  }, [allPatients, data]);

  // Filtered list
  const filteredPatients = useMemo(() => {
    return patientProfiles.filter(p => {
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.diabetesType || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' ||
        (typeFilter === 't1' && (p.diabetesType || '').includes('Type 1')) ||
        (typeFilter === 't2' && (p.diabetesType || '').includes('Type 2'));

      const matchesRisk = riskFilter === 'all' ||
        (riskFilter === 'high' && p.isHighRisk) ||
        (riskFilter === 'adherence' && p.adherencePct < 80);

      return matchesSearch && matchesType && matchesRisk;
    });
  }, [patientProfiles, searchQuery, typeFilter, riskFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#A8D7BD]">
              Pharm D Clinical Station
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-600">
              Longitudinal Patient Registry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
            <Users className="text-[#046A38] shrink-0" size={28} />
            <span>Patient Management &amp; Pharmacotherapy Registry</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Monitor assigned diabetes patients, allergy profiles, longitudinal medication histories, glycemic control telemetry, and adherence status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Active Roster</p>
            <p className="text-base font-black text-slate-950">{patientProfiles.length} Enrolled Patients</p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ───────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border-2 border-[#E8DCC8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by patient name, ID, or condition..."
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-[#FAF6EF] text-slate-800 cursor-pointer"
          >
            <option value="all">All Diabetes Types</option>
            <option value="t2">Type 2 Diabetes</option>
            <option value="t1">Type 1 Diabetes</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-[#FAF6EF] text-slate-800 cursor-pointer"
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk / Review Needed</option>
            <option value="adherence">Adherence &lt; 80%</option>
          </select>
        </div>
      </div>

      {/* ── Patient Cards Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPatients.map((patient) => {
          return (
            <div
              key={patient.id}
              className={`card rounded-3xl border-2 p-5 sm:p-6 transition-all hover:shadow-md ${
                patient.isHighRisk
                  ? 'bg-white border-amber-300 ring-1 ring-amber-300/40'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Header: Avatar, Name, Type */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3.5">
                  <Avatar user={patient} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-950">{patient.name}</h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {patient.id.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#046A38] mt-0.5">
                      {patient.diabetesType} • {patient.age}y, {patient.gender}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Diagnosed {patient.diagnosedYear} • Ref: {patient.assignedDoctor || 'Primary Care Team'}
                    </p>
                  </div>
                </div>

                <Badge variant={patient.isHighRisk ? 'warning' : 'success'}>
                  {patient.isHighRisk ? 'Review Flagged' : 'Stable Control'}
                </Badge>
              </div>

              {/* Allergies Alert Banner */}
              <div className="mb-4 p-3 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-rose-700 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-wide text-rose-900">Documented Allergies &amp; Sensitivities</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {patient.allergiesList.map((alg, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-white border border-rose-300 text-rose-800 shadow-2xs"
                      >
                        {alg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clinical Telemetry Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] mb-4 text-center">
                <div>
                  <p className="text-[10px] font-extrabold text-slate-600 uppercase">Latest Glucose</p>
                  <p className="text-sm font-black text-slate-950 mt-0.5">
                    {patient.latestGlucose ? `${patient.latestGlucose.value} mg/dL` : '138 mg/dL'}
                  </p>
                </div>
                <div className="border-x border-[#E8DCC8]">
                  <p className="text-[10px] font-extrabold text-slate-600 uppercase">HbA1c Level</p>
                  <p className="text-sm font-black text-[#046A38] mt-0.5">
                    {patient.latestHbA1c ? `${patient.latestHbA1c.value}%` : '7.1%'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-slate-600 uppercase">Adherence Rate</p>
                  <p className={`text-sm font-black mt-0.5 ${patient.adherencePct >= 80 ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {patient.adherencePct}%
                  </p>
                </div>
              </div>

              {/* Active Prescriptions Preview */}
              <div className="mb-4">
                <p className="text-xs font-black text-slate-900 mb-1.5 flex items-center justify-between">
                  <span>Current Active Medications</span>
                  <span className="text-[10px] font-bold text-slate-600">
                    {patient.activeRxs.length > 0 ? `${patient.activeRxs.length} Prescriptions` : 'Regimen Active'}
                  </span>
                </p>
                <div className="space-y-1.5">
                  {patient.activeRxs.slice(0, 2).flatMap(rx => rx.medicines || []).slice(0, 3).map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-bold p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-950 flex items-center gap-1.5 truncate">
                        <Pill size={14} className="text-[#046A38] shrink-0" />
                        {m.name}
                      </span>
                      <span className="text-[11px] text-slate-600 font-semibold shrink-0 ml-2">
                        {m.frequency} ({m.foodInstruction || 'Meal-tied'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="btn-outline btn-sm text-xs font-bold flex-1 flex items-center justify-center gap-1.5"
                >
                  <Eye size={14} /> Full History
                </button>
                <button
                  onClick={() => navigate('/pharmacist/counselling')}
                  className="btn-primary btn-sm text-xs font-bold flex-1 flex items-center justify-center gap-1.5"
                >
                  <Heart size={14} /> Pharm D Session
                </button>
                <button
                  onClick={() => navigate('/pharmacist/interactions')}
                  className="btn-ghost btn-sm text-xs font-bold px-2 text-slate-700 hover:text-slate-950"
                  title="Check Drug Interactions"
                >
                  <ShieldCheck size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Patient Full Profile Modal ─────────────────────────────── */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#E8DCC8] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Avatar user={selectedPatient} size="md" />
                <div>
                  <h3 className="text-lg font-black text-slate-950">{selectedPatient.name}</h3>
                  <p className="text-xs font-bold text-slate-600">
                    {selectedPatient.diabetesType} • {selectedPatient.gender}, {selectedPatient.age} years old
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs font-medium text-slate-800">
              {/* Demographics & Contact */}
              <div className="p-3.5 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-600">Email Address</p>
                  <p className="font-bold text-slate-950">{selectedPatient.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-600">Phone</p>
                  <p className="font-bold text-slate-950">{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-600">Emergency Contact</p>
                  <p className="font-bold text-slate-950">{selectedPatient.emergencyContact || 'Family Member on file'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-600">Assigned Clinician</p>
                  <p className="font-bold text-[#046A38]">{selectedPatient.assignedDoctor || 'Dr. Arun Krishnamurthy'}</p>
                </div>
              </div>

              {/* Documented Allergies */}
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                <p className="text-xs font-black uppercase text-rose-900 mb-1 flex items-center gap-1.5">
                  <ShieldAlert size={15} /> Allergic Sensitivities &amp; Adverse Drug Reactions
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedPatient.allergiesList.map((a, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 font-bold text-rose-800 shadow-2xs">
                      ⚠️ {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Medication History */}
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-950 mb-2">
                  Complete Longitudinal Pharmacotherapy Record
                </p>
                <div className="space-y-2">
                  {(selectedPatient.activeRxs || []).flatMap(rx => rx.medicines || []).map((med, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                      <div>
                        <p className="font-black text-slate-950 text-sm">{med.name} ({med.dose})</p>
                        <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          Route: {med.route} • Frequency: {med.frequency} • {med.foodInstruction}
                        </p>
                        {med.instructions && (
                          <p className="text-[10px] font-bold text-[#046A38] mt-1 bg-white p-1.5 rounded-lg border border-slate-200">
                            Clinical Instruction: {med.instructions}
                          </p>
                        )}
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => setSelectedPatient(null)}
                className="btn-outline btn-sm font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  navigate('/pharmacist/counselling');
                }}
                className="btn-primary btn-sm font-bold flex items-center gap-1.5"
              >
                <Stethoscope size={14} /> Start Pharm D Counselling
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

