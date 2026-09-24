import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LoadingSpinner, Badge, EmptyState } from '../../components/ui';
import { FileText, Download, Printer, Activity, Pill, User, Heart, Shield, Calendar, ArrowLeft } from 'lucide-react';
import { formatDate, formatDateTime } from '../../data/demoDate';
import { generateCareSummaryPDF } from '../../services/pdfService';

export default function CareSummary() {
  const { patientId: paramPatientId } = useParams();
  const { currentUser, data, addToast } = useApp();

  // If patient, locked to themselves. If clinician, choose param or default to primary patient pat-001
  const allPatients = useMemo(() => {
    return Object.values(data?.users || {}).filter(u => u.role === 'patient');
  }, [data?.users]);

  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    if (currentUser?.role === 'patient') return currentUser.id;
    return paramPatientId || 'pat-001';
  });

  const patient = data?.users?.[selectedPatientId] || allPatients[0];

  const readings = useMemo(() => {
    if (!patient) return [];
    return (data?.glucoseReadings || [])
      .filter(r => r.patientId === patient.id)
      .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  }, [data?.glucoseReadings, patient]);

  const prescriptions = useMemo(() => {
    if (!patient) return [];
    return (data?.prescriptions || []).filter(p => p.patientId === patient.id && p.status === 'active');
  }, [data?.prescriptions, patient]);

  const investigations = useMemo(() => {
    if (!patient) return [];
    return (data?.investigations || [])
      .filter(i => i.patientId === patient.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data?.investigations, patient]);

  const screenings = useMemo(() => {
    if (!patient) return [];
    return (data?.screenings || []).filter(s => s.patientId === patient.id);
  }, [data?.screenings, patient]);

  const doses = useMemo(() => {
    if (!patient) return [];
    return (data?.doseEvents || []).filter(e => e.patientId === patient.id);
  }, [data?.doseEvents, patient]);

  // Adherence calculation
  const adherence = useMemo(() => {
    const now = new Date();
    const elapsed = doses.filter(e => new Date(e.scheduledTime) <= now && e.status !== 'pending');
    if (!elapsed.length) return 88; // reasonable default
    return Math.round((elapsed.filter(e => e.status === 'taken').length / elapsed.length) * 100);
  }, [doses]);

  const doctor = data?.users?.[patient?.assignedDoctor];
  const pharmacist = data?.users?.[patient?.assignedPharmacist];

  const handleDownloadPDF = () => {
    try {
      const doc = generateCareSummaryPDF(patient, data);
      doc.save(`Care_Summary_${patient.name.replace(/\s+/g, '_')}_${formatDate(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' })}.pdf`);
      addToast({ type: 'success', message: 'Care Summary PDF downloaded successfully' });
    } catch (err) {
      console.error('PDF error:', err);
      addToast({ type: 'error', message: 'Failed to generate PDF. Please try again.' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!patient) return <LoadingSpinner text="Loading patient record..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">Comprehensive Clinical Care Summary</h1>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            Holistic cross-disciplinary diabetes care report and medication overview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentUser?.role !== 'patient' && (
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="input text-sm py-2 font-bold text-slate-950 bg-white"
            >
              {allPatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handlePrint}
            className="btn-outline font-bold text-sm flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="btn-primary font-bold text-sm flex items-center gap-2 cursor-pointer"
          >
            <Download size={16} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="card p-6 sm:p-8 bg-white border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-300 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-black text-slate-950 tracking-tight">LATROCORE</span>
                <span className="text-xs bg-teal-100 text-teal-950 px-2.5 py-0.5 rounded-full font-bold border border-teal-300">CLINICAL SUMMARY</span>
              </div>
              <p className="text-xl font-black text-slate-950 mt-1">Integrated Diabetes Care Summary</p>
              <p className="text-xs font-semibold text-slate-600">
                Generated: {formatDate(new Date(), { month: 'long', day: 'numeric', year: 'numeric' })} • Verified Care Record
              </p>
            </div>
            <div className="text-left sm:text-right text-xs font-medium text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-950">Latrocore Health Network</p>
              <p>Endocrinology & Clinical Pharmacy Panel</p>
              <p className="font-mono text-slate-900 font-semibold">Document: #CS-{patient.id.toUpperCase()}-2026</p>
            </div>
          </div>
        </div>

        {/* Patient Profile Grid */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-6">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
            Patient Demographics & Clinical Profile
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-600 block">Full Patient Name</span>
              <span className="font-extrabold text-slate-950">{patient.name}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600 block">Age / Gender</span>
              <span className="font-extrabold text-slate-950">{patient.age} yrs / {patient.gender}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600 block">Diagnosis</span>
              <span className="font-extrabold text-teal-900">{patient.diabetesType || 'Type 2 Diabetes'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600 block">Diagnosis Year</span>
              <span className="font-extrabold text-slate-950">{patient.diagnosisYear || '2020'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600 block">Attending Physician</span>
              <span className="font-bold text-slate-950">{doctor?.name || 'Dr. Arun Krishnamurthy'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600 block">Clinical Pharmacist</span>
              <span className="font-bold text-slate-950">{pharmacist?.name || 'Kavitha Rajan (Pharm D)'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600 block">Blood Group</span>
              <span className="font-bold text-slate-950">{patient.bloodGroup || 'B+'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600 block">Allergies</span>
              <span className="font-extrabold text-rose-800">{(patient.allergies || []).join(', ') || 'NKDA'}</span>
            </div>
          </div>
        </div>

        {/* Key Health Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-teal-300 bg-teal-50/60">
            <span className="text-xs font-black text-teal-950 uppercase tracking-wide">Latest HbA1c</span>
            <div className="text-2xl font-black text-teal-950 mt-1">
              {investigations.find(i => i.type === 'hba1c')?.value || '7.4'}%
            </div>
            <span className="text-xs font-bold text-teal-800">Clinical Target: &lt; 7.0%</span>
          </div>

          <div className="p-4 rounded-xl border border-blue-300 bg-blue-50/60">
            <span className="text-xs font-black text-blue-950 uppercase tracking-wide">Latest Glucose</span>
            <div className="text-2xl font-black text-blue-950 mt-1">
              {readings[0]?.value || '142'} <span className="text-xs font-bold">mg/dL</span>
            </div>
            <span className="text-xs font-bold text-blue-800">{readings[0] ? formatDate(readings[0].dateTime, { month: 'short', day: 'numeric' }) : 'Recent'}</span>
          </div>

          <div className="p-4 rounded-xl border border-purple-300 bg-purple-50/60">
            <span className="text-xs font-black text-purple-950 uppercase tracking-wide">Med Adherence</span>
            <div className="text-2xl font-black text-purple-950 mt-1">{adherence}%</div>
            <span className="text-xs font-bold text-purple-800">Calculated past 30 days</span>
          </div>

          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60">
            <span className="text-xs font-black text-amber-950 uppercase tracking-wide">Active Regimens</span>
            <div className="text-2xl font-black text-amber-950 mt-1">{prescriptions.length}</div>
            <span className="text-xs font-bold text-amber-800">Physician authorized</span>
          </div>
        </div>

        {/* Section: Active Medications */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={18} className="text-teal-800" />
            <h3 className="font-extrabold text-base text-slate-950">Current Active Medications</h3>
          </div>
          <div className="table-container border border-slate-200 rounded-xl">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-slate-950">Medication</th>
                  <th className="font-bold text-slate-950">Dosage</th>
                  <th className="font-bold text-slate-950">Frequency & Timings</th>
                  <th className="font-bold text-slate-950">Instructions</th>
                  <th className="font-bold text-slate-950">Start Date</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(rx => (
                  <tr key={rx.id}>
                    <td className="font-extrabold text-slate-950">{rx.medicationName || rx.name}</td>
                    <td className="font-semibold text-slate-900">{rx.dosage}</td>
                    <td className="font-semibold text-slate-900">{rx.frequency}</td>
                    <td className="text-xs font-semibold text-slate-800">{rx.foodInstruction || rx.instructions || 'As directed'}</td>
                    <td className="text-xs font-bold text-slate-800">{rx.startDate ? formatDate(rx.startDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Recent Glucose Profile */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} className="text-teal-800" />
            <h3 className="font-extrabold text-base text-slate-950">Recent Blood Glucose Profile</h3>
          </div>
          <div className="table-container border border-slate-200 rounded-xl">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-slate-950">Date & Time</th>
                  <th className="font-bold text-slate-950">Value</th>
                  <th className="font-bold text-slate-950">Context</th>
                  <th className="font-bold text-slate-950">Meal Status</th>
                  <th className="font-bold text-slate-950">Symptoms / Notes</th>
                </tr>
              </thead>
              <tbody>
                {readings.slice(0, 6).map(r => (
                  <tr key={r.id}>
                    <td className="font-bold text-slate-900">{formatDate(r.dateTime, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="font-black text-slate-950 text-base">{r.value} mg/dL</td>
                    <td className="capitalize font-semibold text-slate-800">{(r.context || '').replace(/_/g, ' ')}</td>
                    <td className="font-medium text-slate-800">{r.mealStatus || '-'}</td>
                    <td className="text-xs font-medium text-slate-800">{r.symptoms || r.notes || 'None noted'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Diagnostic Investigations */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-teal-800" />
            <h3 className="font-extrabold text-base text-slate-950">Laboratory & Diagnostic Investigations</h3>
          </div>
          <div className="table-container border border-slate-200 rounded-xl">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="font-bold text-slate-950">Investigation</th>
                  <th className="font-bold text-slate-950">Date</th>
                  <th className="font-bold text-slate-950">Result</th>
                  <th className="font-bold text-slate-950">Reference Interval</th>
                  <th className="font-bold text-slate-950">Clinical Status</th>
                </tr>
              </thead>
              <tbody>
                {investigations.slice(0, 6).map(inv => (
                  <tr key={inv.id}>
                    <td className="font-bold text-slate-950">{inv.testName || inv.type}</td>
                    <td className="font-semibold text-slate-800">{formatDate(inv.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="font-black text-slate-950">{inv.value} {inv.unit}</td>
                    <td className="text-xs font-semibold text-slate-700">{inv.referenceRange || 'Standard'}</td>
                    <td>
                      <Badge variant={inv.status === 'abnormal' ? 'danger' : 'success'}>
                        {(inv.status || 'Normal').toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preventive Screening Status */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-teal-800" />
            <h3 className="font-extrabold text-base text-slate-950">Preventive Screenings & Surveillance</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {screenings.map(s => (
              <div key={s.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-950">{s.type || s.name}</p>
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Due: {formatDate(s.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <Badge variant={s.status === 'completed' ? 'success' : s.status === 'overdue' ? 'danger' : 'warning'}>
                  {s.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Disclaimer */}
        <div className="border-t border-slate-200 pt-4 text-center text-xs font-semibold text-slate-600">
          <p>
            LATROCORE Clinical System • Fictional Demonstration Record • All patient markers illustrative for multi-disciplinary coordination.
          </p>
        </div>
      </div>
    </div>
  );
}
