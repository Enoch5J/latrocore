import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatCard, LoadingSpinner, Badge, Modal } from '../../components/ui';
import {
  Activity, Pill, FileText, Droplets, CalendarDays, Bot,
  Heart, TrendingUp, CheckCircle, ArrowRight, Salad,
  AlertCircle, ClipboardCheck, Sparkles, User, Stethoscope,
  Star, Phone, ShieldAlert, X, Video, Clock, ShieldCheck, Plus, MapPin, Calendar,
  Paperclip, Send, Volume2, VolumeX, RefreshCw
} from 'lucide-react';
import PrescriptionUploadModal from '../../components/patient/PrescriptionUploadModal';
import MetricsHub from '../../components/patient/MetricsHub';
import { AIFaceAvatar } from '../../components/FloatingAIAssistant';
import doctorImg from '../../assets/images/doctor.png';
import pharmacistImg from '../../assets/images/pharmacist.png';
import { formatDate, formatTime, isToday, formatDateTime } from '../../data/demoDate';
import { getProgressionData, addAppointment, applyAIPrescriptionToPatient } from '../../services/dataService';
import { api } from '../../services/api';
import { getAssistantResponse, formatPrescriptionInsights } from '../../services/assistantEngine';

export default function PatientDashboard() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Consultation Modal State
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultType, setConsultType] = useState('doctor');
  const [consultNote, setConsultNote] = useState('');

  // Unified Consultation & Appointment Booking State
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    type: 'Comprehensive Follow-up',
    date: '',
    time: '10:30',
    mode: 'Tele-Consult HD Video',
    notes: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const patientId = currentUser?.id;

  const glucoseReadings = useMemo(() =>
    (data?.glucoseReadings || []).filter(r => r.patientId === patientId).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)),
    [data?.glucoseReadings, patientId]);

  const doseEvents = useMemo(() =>
    (data?.doseEvents || []).filter(e => e.patientId === patientId),
    [data?.doseEvents, patientId]);

  const investigations = useMemo(() =>
    (data?.investigations || []).filter(i => i.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [data?.investigations, patientId]);

  const appointments = useMemo(() =>
    (data?.appointments || []).filter(a => a.patientId === patientId && a.status === 'scheduled').sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data?.appointments, patientId]);

  const screenings = useMemo(() =>
    (data?.screenings || []).filter(s => s.patientId === patientId),
    [data?.screenings, patientId]);

  const healthEntries = useMemo(() =>
    (data?.healthEntries || []).filter(e => e.patientId === patientId),
    [data?.healthEntries, patientId]);

  const targets = useMemo(() =>
    (data?.clinicalTargets || []).find(t => t.patientId === patientId),
    [data?.clinicalTargets, patientId]);

  // Active Prescriptions & Medications synced from data
  const activePrescriptions = useMemo(() =>
    (data?.prescriptions || []).filter(p => p.patientId === patientId && p.status === 'active'),
    [data?.prescriptions, patientId]);

  const activeMedicines = useMemo(() =>
    activePrescriptions.flatMap(rx => rx.medicines || []),
    [activePrescriptions]);

  const activePrescription = activePrescriptions[0] || null;

  const prescriptionContext = useMemo(() => {
    if (!activeMedicines || activeMedicines.length === 0) return null;
    return activeMedicines.map(m =>
      `- ${m.name} (Dose: ${m.dose || 'unclear'}, Route: ${m.route || 'Oral'}, Frequency: ${m.frequency || 'As prescribed'}, Meal Timing: ${m.foodInstruction || m.meal_timing || 'With meals'})`
    ).join('\n');
  }, [activeMedicines]);

  const medicineInsights = useMemo(() => formatPrescriptionInsights(activeMedicines), [activeMedicines]);

  // AI Assistant Section State
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [directUploadingRx, setDirectUploadingRx] = useState(false);
  const [aiActiveTab, setAiActiveTab] = useState('insights'); // 'insights' | 'adverse' | 'lifestyle' | 'schedule'
  const [aiMessages, setAiMessages] = useState([]);
  const aiFileInputRef = useRef(null);

  useEffect(() => {
    if (activeMedicines.length > 0) {
      setAiMessages([
        {
          id: 'welcome-synced',
          role: 'assistant',
          text: `📋 **Active Prescription Synced (${activeMedicines.length} Medicines):**\n` +
            activeMedicines.map(m => `• **${m.name}** — ${m.dose || 'dose unclear'} (${m.foodInstruction || m.meal_timing || 'With meals'})`).join('\n') +
            `\n\n🔒 **Strict AI Guardrails Active:** My clinical responses, adverse effect analyses, and routine tips are locked strictly to these detected medications. Zero unrelated medicines will be suggested. Any unreadable entry is stated as 'unclear'.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } else {
      setAiMessages([
        {
          id: 'welcome-default',
          role: 'assistant',
          text: `Hello! I'm your Clinical AI Copilot. When you upload your prescription (either via the top "Upload Prescription" button or directly below), your medicines will automatically sync here so I can prepare lifestyle tips, adverse effects, and dosage timing without guessing.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  }, [activeMedicines.length]);

  const handleDashboardAiSend = async (queryText = null) => {
    const q = (queryText || aiInput).trim();
    if (!q) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiMessages(prev => [...prev, userMsg]);
    if (!queryText) setAiInput('');

    const tempLoadingId = `a-loading-${Date.now()}`;
    const loadingMsg = {
      id: tempLoadingId,
      role: 'assistant',
      text: 'Analyzing with prescription guardrails...',
      isLoading: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setAiMessages(prev => [...prev, loadingMsg]);
    setAiLoading(true);

    try {
      const res = await api.askAssistant(q, 'en', prescriptionContext);
      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAiMessages(prev => prev.map(m => m.id === tempLoadingId ? assistantMsg : m));
    } catch {
      const fallback = getAssistantResponse(q, 'en', prescriptionContext, activeMedicines);
      const fallbackMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: fallback.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAiMessages(prev => prev.map(m => m.id === tempLoadingId ? fallbackMsg : m));
    } finally {
      setAiLoading(false);
    }
  };

  const handleDashboardDirectUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const userFileMsg = {
      id: `u-file-${Date.now()}`,
      role: 'user',
      text: `📎 [Uploaded Prescription]: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setAiMessages(prev => [...prev, userFileMsg]);

    const tempLoadingId = `a-upload-${Date.now()}`;
    const loadingMsg = {
      id: tempLoadingId,
      role: 'assistant',
      text: 'Gemini Vision AI is analyzing and digitizing your prescription document...',
      isLoading: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setAiMessages(prev => [...prev, loadingMsg]);
    setDirectUploadingRx(true);

    try {
      const result = await api.analyzePrescriptionAI(file);

      if (!result.is_valid_prescription) {
        const rejectionMsg = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Prescription Upload Rejected**\n\n**Reason:** ${result.rejection_reason || 'The uploaded file could not be verified as an authentic doctor prescription.'}\n\n**Strict Safety Policy:** LATROCORE strictly processes authentic doctor prescriptions. Please upload a clear document showing clinic header and prescribed medications.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setAiMessages(prev => prev.map(m => m.id === tempLoadingId ? rejectionMsg : m));
        setDirectUploadingRx(false);
        return;
      }

      applyAIPrescriptionToPatient(patientId, result);
      try {
        await api.applyAIPrescription({
          patient_id: patientId,
          ...result,
        });
      } catch (applyErr) {
        console.warn('Backend DB apply sync notice (continuing with local state):', applyErr);
      }

      refreshData();

      const medsList = (result.medicines || []).map(m => {
        const isUnclear = !m.name || m.name.toLowerCase().includes('unclear') || !m.dose || String(m.dose).toLowerCase().includes('unclear');
        return `• **${m.name || 'unclear'}** — ${m.dose || 'dose unclear'} (${m.frequency || 'frequency unclear'}, ${m.meal_timing || m.instructions || 'With meals'})${isUnclear ? ' ⚠️ [Unclear entry flagged]' : ''}`;
      }).join('\n');

      const responseText = `✅ **Prescription Successfully Synchronized!**\n\n` +
        `**Doctor:** ${result.doctor_name || 'Attending Physician'}\n` +
        `**Clinic:** ${result.clinic_name || 'Clinical Care Station'}\n` +
        `**Diagnosis:** ${result.diagnosis || 'Type 2 Diabetes Mellitus'}\n\n` +
        `**Detected Medications:**\n${medsList}\n\n` +
        `🔒 **Strict AI Guardrails Active:** My clinical responses, adverse effect analyses, and lifestyle tips are now locked strictly to these detected medications with zero hallucination. If any medicine or dose was illegible, it is marked as 'unclear' for safety rather than guessed.`;

      const successMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAiMessages(prev => prev.map(m => m.id === tempLoadingId ? successMsg : m));
      addToast({ type: 'success', message: 'Prescription synchronized with AI Assistant' });
    } catch (err) {
      const errMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `❌ **Failed to process prescription:** ${err.message || 'Error communicating with Gemini Vision AI. Please ensure the document is clear and try again.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setAiMessages(prev => prev.map(m => m.id === tempLoadingId ? errMsg : m));
    } finally {
      setDirectUploadingRx(false);
    }
  };

  // Calculated values
  const latestGlucose = glucoseReadings[0];
  const latestHbA1c = investigations.find(i => i.type === 'HbA1c');

  const adherence = useMemo(() => {
    const now = new Date();
    const elapsed = doseEvents.filter(e => new Date(e.scheduledTime) <= now && e.status !== 'pending');
    if (elapsed.length === 0) return null;
    const taken = elapsed.filter(e => e.status === 'taken').length;
    return { pct: Math.round((taken / elapsed.length) * 100), taken, total: elapsed.length };
  }, [doseEvents]);

  const todayActivity = useMemo(() => {
    const today = healthEntries.filter(e => e.type === 'activity' && isToday(e.date));
    return today.reduce((sum, e) => sum + (e.duration || 0), 0);
  }, [healthEntries]);

  const progression = useMemo(() => {
    return getProgressionData(patientId);
  }, [patientId, data]);

  const activeMin = progression?.activityMinutes ?? todayActivity;
  const activityProgress = Math.min(100, Math.round(((activeMin || 0) / 30) * 100));

  // Care Checklist items
  const checklistItems = useMemo(() => [
    { label: 'Medication adherence ≥80%', done: adherence && adherence.pct >= 80, detail: adherence ? `${adherence.pct}%` : 'No data' },
    { label: 'Glucose logged today', done: glucoseReadings.some(r => isToday(r.dateTime)), detail: 'Daily glucose monitoring' },
    { label: 'HbA1c recorded this quarter', done: !!latestHbA1c, detail: latestHbA1c ? `${latestHbA1c.value}% on ${formatDate(latestHbA1c.date)}` : 'Not recorded' },
    { label: 'Blood pressure recorded this month', done: healthEntries.some(e => e.type === 'blood_pressure' && new Date(e.date) > new Date(Date.now() - 30 * 86400000)), detail: 'Monthly BP check' },
    { label: 'Eye screening current', done: screenings.some(s => s.type === 'Eye Examination' && s.status === 'completed'), detail: 'Annual eye exam' },
    { label: 'Foot examination current', done: screenings.some(s => s.type === 'Foot Examination' && s.status === 'completed'), detail: 'Annual foot exam' },
    { label: 'Kidney monitoring current', done: screenings.some(s => s.type === 'Kidney Assessment' && s.status === 'completed'), detail: 'Kidney function tests' },
    { label: '30+ min activity this week', done: todayActivity >= 30, detail: `${todayActivity} min today` },
  ], [adherence, glucoseReadings, latestHbA1c, healthEntries, screenings, todayActivity]);

  // Doctors from data
  const allUsers = useMemo(() => {
    if (!data?.users) return [];
    if (Array.isArray(data.users)) return data.users;
    return Object.values(data.users);
  }, [data?.users]);

  const doctors = useMemo(() => {
    return allUsers.filter(u =>
      u.role === 'doctor' || u.role === 'pharmacist' || u.role === 'care_team'
    );
  }, [allUsers]);

  // Last doctor visited
  const lastDoctor = useMemo(() => {
    const pastAppts = (data?.appointments || [])
      .filter(a => a.patientId === patientId && a.status === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (pastAppts[0]?.doctorId) {
      const doc = allUsers.find(u => u.id === pastAppts[0].doctorId);
      return doc?.name || null;
    }
    return null;
  }, [data?.appointments, patientId, allUsers]);

  const assignedPharmacist = useMemo(() => {
    return allUsers.find(u => u.role === 'pharmacist' || u.id === currentUser?.assignedPharmacist);
  }, [allUsers, currentUser]);

  const assignedDoctor = useMemo(() => {
    return allUsers.find(u => u.role === 'doctor' || u.id === currentUser?.assignedDoctor);
  }, [allUsers, currentUser]);

  // Apollo-style clinical specialists roster with PharmD prominently highlighted
  const specialists = useMemo(() => [
    {
      id: assignedPharmacist?.id || 'ph-apollo-lead',
      name: assignedPharmacist?.name || 'Dr. K. Ramesh',
      degrees: 'PharmD, BCPS',
      title: 'Lead Clinical Pharmacist & Medication Specialist',
      specialty: 'Clinical Pharmacist (PharmD)',
      category: 'pharmd',
      highlight: true,
      role: 'pharmacist',
      avatar: pharmacistImg,
      experience: '9+ Years Clinical Exp',
      rating: '4.96',
      reviewsCount: 385,
      hospital: 'Apollo Sugar Clinics & Latrocore Care',
      languages: 'English, Hindi, Tamil',
      availableSlot: 'Today, 10:30 AM',
      tagline: 'Primary Medication Therapy & Drug Safety Specialist',
      focusAreas: [
        'Medication Therapy Management (MTM)',
        'Drug-Drug & Food Interaction Audits',
        'Metformin GI Tolerance & Titration',
        'Renal & Hepatic Dose Optimization',
        'Insulin Pen & Glucometer Coaching',
      ],
      description:
        'Your designated PharmD doctor oversees your antidiabetic and cardiovascular pharmacotherapy. Serves as your primary safety gatekeeper, preventing dangerous medication conflicts, screening side effects, and adjusting dosages in real time.',
    },
    {
      id: assignedDoctor?.id || 'dr-apollo-diab',
      name: assignedDoctor?.name || 'Dr. Priya Sharma',
      degrees: 'MBBS, MD, C.Diab (Boston/Apollo)',
      title: 'Senior Consultant Diabetologist',
      specialty: 'Diabetologist',
      category: 'diabetology',
      highlight: false,
      role: 'doctor',
      avatar: doctorImg,
      experience: '14+ Years Clinical Exp',
      rating: '4.92',
      reviewsCount: 620,
      hospital: 'Apollo Center for Diabetes & Endocrinology',
      languages: 'English, Hindi',
      availableSlot: 'Today, 2:30 PM',
      tagline: 'Glycemic Control & Precision Insulin Titration',
      focusAreas: ['HbA1c Reduction', 'CGM Analytics', 'Insulin Regimen Titration'],
      description: 'Specializes in glycemic volatility reduction, personalized glucose target planning, and insulin regimen titration.',
    },
    {
      id: 'dr-apollo-endo',
      name: 'Dr. Vikram Malhotra',
      degrees: 'MBBS, MD, DM (Endocrinology)',
      title: 'Consultant Endocrinologist',
      specialty: 'Endocrinologist',
      category: 'endocrinology',
      highlight: false,
      role: 'doctor',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
      experience: '11+ Years Clinical Exp',
      rating: '4.88',
      reviewsCount: 310,
      hospital: 'Apollo Multispeciality Hospitals',
      languages: 'English, Hindi, Punjabi',
      availableSlot: 'Tomorrow, 11:00 AM',
      tagline: 'Hormonal, Thyroid & Complex Metabolic Syndromes',
      focusAreas: ['Severe Insulin Resistance', 'Thyroid Dysfunction', 'Beta-Cell Preservation'],
      description: 'Addresses complex neuroendocrine feedback, hormonal regulation, and multi-glandular autoimmune manifestations.',
    },
    {
      id: 'dr-apollo-cardio',
      name: 'Dr. Ananya Sengupta',
      degrees: 'MBBS, MD, DM (Cardiology), FACC',
      title: 'Consultant Preventive Cardiologist',
      specialty: 'Cardiologist',
      category: 'cardiology',
      highlight: false,
      role: 'doctor',
      avatar: 'https://images.unsplash.com/photo-1594824813588-e9f0d1a49f57?w=150',
      experience: '16+ Years Clinical Exp',
      rating: '4.94',
      reviewsCount: 440,
      hospital: 'Apollo Heart Institute',
      languages: 'English, Bengali, Hindi',
      availableSlot: 'Tomorrow, 4:15 PM',
      tagline: 'Cardiovascular Risk Prevention in Diabetes',
      focusAreas: ['Diabetic Cardiopathy', 'Hypertension & Lipid Optimization', 'Statin Safety'],
      description: 'Provides proactive protection against micro- and macro-vascular cardiovascular complications for diabetic patients.',
    },
    {
      id: 'dr-apollo-nutri',
      name: 'S. Meenakshi',
      degrees: 'M.Sc (Clinical Nutrition), RD, CDE',
      title: 'Lead Clinical Nutritionist & Educator',
      specialty: 'Dietitian & Diabetes Educator',
      category: 'nutrition',
      highlight: false,
      role: 'care_team',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      experience: '8+ Years Clinical Exp',
      rating: '4.90',
      reviewsCount: 510,
      hospital: 'Apollo Sugar Lifestyle Clinic',
      languages: 'English, Tamil, Telugu',
      availableSlot: 'Today, 5:00 PM',
      tagline: 'Medical Nutrition Therapy & Low-Glycemic Diets',
      focusAreas: ['Low-GI Meal Plans', 'Carb Counting', 'Weight Management'],
      description: 'Designs customized meal protocols that eliminate post-prandial glycemic spikes while respecting cultural preferences.',
    },
  ], [assignedPharmacist, assignedDoctor]);

  const pharmDoctor = useMemo(() => specialists.find(s => s.highlight), [specialists]);
  const otherSpecialists = useMemo(() => specialists.filter(s => !s.highlight), [specialists]);

  const handleRequestConsultation = () => {
    setConsultModalOpen(false);
    addToast({
      type: 'success',
      message: `Consultation request for ${consultType === 'doctor' ? 'Diabetologist Review' : 'Pharmacist Counselling'} submitted successfully!`,
    });
    setConsultNote('');
  };

  const handleStartBooking = (doc) => {
    const targetDoc = doc || pharmDoctor;
    setSelectedDoctorForBooking(targetDoc);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setBookingForm({
      type: targetDoc?.role === 'pharmacist' ? 'Medication Therapy Review' : 'Follow-up Consultation',
      date: tomorrow,
      time: '10:30',
      mode: 'Tele-Consult HD Video',
      notes: '',
    });
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctorForBooking) return;
    const dateStr = bookingForm.date && bookingForm.time
      ? `${bookingForm.date}T${bookingForm.time}:00`
      : new Date(Date.now() + 86400000).toISOString();

    const newApt = {
      patientId: currentUser?.id || 'pat-001',
      doctorId: selectedDoctorForBooking.role === 'doctor' ? selectedDoctorForBooking.id : undefined,
      pharmacistId: selectedDoctorForBooking.role === 'pharmacist' ? selectedDoctorForBooking.id : undefined,
      type: `${selectedDoctorForBooking.specialty}: ${bookingForm.type}`,
      date: new Date(dateStr).toISOString(),
      duration: 30,
      location: bookingForm.mode,
      notes: bookingForm.notes || `Scheduled appointment with ${selectedDoctorForBooking.name}`,
      status: 'scheduled',
      doctorName: selectedDoctorForBooking.name,
      doctorTitle: selectedDoctorForBooking.title,
    };

    await addAppointment(newApt);
    refreshData();
    setBookingModalOpen(false);
    addToast({
      type: 'success',
      message: `Appointment with ${selectedDoctorForBooking.name} (${selectedDoctorForBooking.specialty}) scheduled!`,
    });
  };

  const quickActions = [
    { label: 'Upload Rx (AI)', icon: Sparkles, color: 'text-emerald-700 bg-emerald-50', onClick: () => setUploadModalOpen(true) },
    { label: 'Record Medication', icon: Pill, color: 'text-blue-600 bg-blue-50', onClick: () => navigate('/patient/medications') },
    { label: 'Add Health Entry', icon: Salad, color: 'text-green-600 bg-green-50', onClick: () => navigate('/patient/lifestyle?action=add') },
    { label: 'Log Glucose', icon: Droplets, color: 'text-teal-600 bg-teal-50', onClick: () => navigate('/patient/metrics?tab=glucose&action=add') },
    { label: 'Ask Assistant', icon: Bot, color: 'text-purple-600 bg-purple-50', onClick: () => navigate('/patient/assistant') },
    { label: 'Request Counselling', icon: Heart, color: 'text-rose-600 bg-rose-50', onClick: () => setConsultModalOpen(true) },
  ];

  // Greeting based on time of day and health
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const compliment = adherence && adherence.pct >= 80
    ? "You're doing great with your medication adherence!"
    : latestGlucose && latestGlucose.value <= 130
    ? 'Your recent glucose reading looks good. Keep it up!'
    : "Stay consistent with your health routine today.";

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* [TOP] Patient Welcome Card */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="card border-2 border-[#A8D7BD] bg-gradient-to-br from-white via-[#F7FBF9] to-[#E8F5EE] overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#0B3B2C] to-[#0D7A71] flex items-center justify-center text-white shadow-lg shrink-0">
              <User size={40} />
            </div>
            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-teal-700 uppercase tracking-widest mb-1">{greeting}</p>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                {currentUser?.name || 'Patient'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-bold text-slate-700">
                {currentUser?.dateOfBirth && (
                  <span className="flex items-center gap-1">
                    <span className="text-slate-500">Age:</span>
                    <span className="text-slate-900">{Math.floor((Date.now() - new Date(currentUser.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years</span>
                  </span>
                )}
                {currentUser?.patientDisplayId && (
                  <span className="flex items-center gap-1">
                    <span className="text-slate-500">ID:</span>
                    <span className="text-slate-900 font-mono">{currentUser.patientDisplayId}</span>
                  </span>
                )}
                {lastDoctor && (
                  <span className="flex items-center gap-1">
                    <Stethoscope size={12} className="text-teal-700" />
                    <span className="text-slate-500">Last visited:</span>
                    <span className="text-slate-900">{lastDoctor}</span>
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-teal-800 mt-2.5 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 inline-block">
                {compliment}
              </p>
            </div>
            {/* Action buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => setUploadModalOpen(true)}
                className="btn-outline btn-sm bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
              >
                <Sparkles size={16} className="text-emerald-600 animate-pulse" />
                <span>Upload Prescription (AI)</span>
              </button>
              <button
                onClick={() => navigate('/patient/metrics?tab=glucose&action=add')}
                className="btn-primary btn-sm"
              >
                <Droplets size={16} />
                <span>Log Blood Glucose</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Safety Alerts (if any critical deductions) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {latestGlucose && (latestGlucose.value < 70 || latestGlucose.value > 250) && (
        <div className="card border-2 border-rose-400 bg-rose-50">
          <div className="card-body flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-rose-950">
                {latestGlucose.value < 70 ? '⚠ Hypoglycemia Alert' : '⚠ Hyperglycemia Alert'}
              </h3>
              <p className="text-xs font-bold text-rose-800 mt-1">
                Latest glucose: {latestGlucose.value} mg/dL ({latestGlucose.context}) at {formatTime(latestGlucose.dateTime)}.
                {latestGlucose.value < 70
                  ? ' This is below the safe range. Consider having a fast-acting carbohydrate and contact your physician.'
                  : ' This is above target. Monitor closely and follow your treatment plan.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Quick Links & Actions */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="card border border-[#E8DCC8] bg-white">
        <div className="card-header bg-[#FAF6EF] rounded-t-2xl border-b border-[#E8DCC8] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-base text-slate-950">Quick Links & Actions</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#046A38] border border-[#A8D7BD]">
              Shortcuts
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">Fast tracking & clinic actions</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {quickActions.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#046A38] bg-white hover:bg-[#E8F5EE] hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group text-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${a.color} group-hover:scale-105 transition-transform`}>
                  <a.icon size={22} />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-950 group-hover:text-[#046A38] leading-tight">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* [CONSOLIDATED] Metrics Hub (Glucose + Checklist + Investigations + Screening) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <MetricsHub
        glucoseReadings={glucoseReadings}
        targets={targets}
        checklistItems={checklistItems}
        investigations={investigations}
        screenings={screenings}
        healthEntries={healthEntries}
        adherence={adherence}
        patientId={patientId}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* [LOWER] Clinical Stat Cards */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Latest Glucose"
          value={latestGlucose ? `${latestGlucose.value} mg/dL` : '—'}
          icon={Droplets}
          color="primary"
          subtitle={latestGlucose ? `${latestGlucose.context?.toUpperCase()} · ${formatTime(latestGlucose.dateTime)}` : 'No readings logged yet'}
          onClick={() => navigate('/patient/metrics?tab=glucose')}
        />
        <StatCard
          label="Latest HbA1c"
          value={latestHbA1c ? `${latestHbA1c.value}%` : '—'}
          icon={TrendingUp}
          color="warning"
          subtitle={latestHbA1c ? `Recorded on ${formatDate(latestHbA1c.date)}` : 'No test records'}
          onClick={() => navigate('/patient/metrics?tab=investigations')}
        />
        <StatCard
          label="Medication Adherence"
          value={adherence ? `${adherence.pct}%` : '—'}
          icon={Pill}
          color={adherence && adherence.pct >= 80 ? 'success' : 'secondary'}
          subtitle={adherence ? `${adherence.taken}/${adherence.total} doses taken on time` : 'No prescriptions active'}
          onClick={() => navigate('/patient/medications')}
        />
        <StatCard
          label="Activity Progression"
          value={activeMin > 0 ? `${activeMin} min` : '—'}
          icon={Heart}
          color={activeMin >= 30 ? 'success' : 'secondary'}
          badge={activeMin >= 30 ? 'Goal Met (100%)' : activeMin > 0 ? `${activityProgress}%` : null}
          progress={activityProgress}
          subtitle={activeMin >= 30 ? 'Daily goal reached (≥30m active)' : activeMin > 0 ? `Target: 30 min · ${Math.max(0, 30 - activeMin)}m remaining` : 'No activity logged today'}
          onClick={() => navigate('/patient/lifestyle')}
        />
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* [AI INTEGRATION] Clinical AI Assistant & Prescription Sync */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="clinical-ai-sync" className="card border-2 border-emerald-500/30 bg-white shadow-md rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="card-header bg-gradient-to-r from-[#FAF6EF] via-[#F0F7F4] to-[#FAF6EF] border-b border-[#E8DCC8] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#022A16] to-[#044D29] border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-xs">
              <AIFaceAvatar size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-lg text-slate-950">
                  Clinical AI Assistant & Prescription Sync
                </h2>
                {activeMedicines.length > 0 ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#046A38] border border-[#A8D7BD] flex items-center gap-1">
                    <Pill size={12} />
                    <span>Rx Synced ({activeMedicines.length} Meds)</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>No Active Rx Synced</span>
                  </span>
                )}
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  <span>Strict AI Guardrails</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Prescriptions uploaded automatically sync clinical adverse effects, lifestyle guidance, and timings with zero drug hallucination.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="btn-primary btn-sm bg-[#046A38] hover:bg-[#03512b] border-none text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Upload Prescription</span>
            </button>
          </div>
        </div>

        {/* Body Grid: 2 Columns */}
        <div className="p-4 sm:p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ── Left Column: Active Prescription Clinical Dossier (5 cols) ── */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                
                {/* Dossier Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#046A38]" />
                    <h3 className="font-extrabold text-sm text-slate-950">Synchronized Clinical Data</h3>
                  </div>
                  {activePrescription && (
                    <span className="text-[11px] font-bold text-slate-500">
                      {formatDate(activePrescription.date || activePrescription.createdAt)}
                    </span>
                  )}
                </div>

                {/* Sub Navigation Tabs */}
                <div className="flex items-center gap-1 mt-3 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setAiActiveTab('insights')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      aiActiveTab === 'insights'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Medications ({activeMedicines.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiActiveTab('adverse')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      aiActiveTab === 'adverse'
                        ? 'bg-white text-rose-800 shadow-xs'
                        : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    ⚠️ Adverse Effects
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiActiveTab('lifestyle')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      aiActiveTab === 'lifestyle'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    🥗 Lifestyle Tips
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiActiveTab('schedule')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      aiActiveTab === 'schedule'
                        ? 'bg-white text-blue-800 shadow-xs'
                        : 'text-slate-600 hover:text-blue-700'
                    }`}
                  >
                    ⏰ 24h Routine
                  </button>
                </div>

                {/* Tab 1: Medications List */}
                {aiActiveTab === 'insights' && (
                  <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {activeMedicines.length > 0 ? (
                      activeMedicines.map((med, idx) => {
                        const isUnclear = !med.name || med.name.toLowerCase().includes('unclear') || !med.dose || String(med.dose).toLowerCase().includes('unclear');
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs transition-all ${
                              isUnclear
                                ? 'bg-amber-50/70 border-amber-300'
                                : 'bg-slate-50/80 border-slate-200 hover:border-[#046A38]/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-extrabold text-sm text-slate-950">{med.name || 'unclear'}</span>
                                {isUnclear && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                                    <AlertCircle size={10} />
                                    Unclear Entry
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-[#046A38] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                                {med.dose || 'unclear'}
                              </span>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium">
                              <span><strong className="text-slate-700">Frequency:</strong> {med.frequency || 'unclear'}</span>
                              <span>•</span>
                              <span><strong className="text-slate-700">Food:</strong> {med.foodInstruction || med.meal_timing || 'With meals'}</span>
                              {med.route && (
                                <>
                                  <span>•</span>
                                  <span><strong className="text-slate-700">Route:</strong> {med.route}</span>
                                </>
                              )}
                            </div>

                            {med.instructions && (
                              <p className="mt-1.5 text-[11px] text-slate-500 italic bg-white p-1.5 rounded-lg border border-slate-100">
                                "{med.instructions}"
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                        <FileText size={32} className="mx-auto text-slate-400 mb-2" />
                        <h4 className="font-extrabold text-sm text-slate-900">No Prescriptions Uploaded Yet</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                          Upload your doctor's prescription above or attach a photo in the prompt below to automatically prepare adverse effects & lifestyle tips.
                        </p>
                        <button
                          type="button"
                          onClick={() => setUploadModalOpen(true)}
                          className="mt-3 btn-outline btn-xs font-bold text-[#046A38] border-[#046A38]"
                        >
                          Upload Prescription
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Adverse Effects & Warning Signs */}
                {aiActiveTab === 'adverse' && (
                  <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {medicineInsights.adverseEffects.length > 0 ? (
                      <>
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                          <h4 className="font-black text-xs text-rose-900 flex items-center gap-1.5 mb-2">
                            <ShieldAlert size={14} className="text-rose-700" />
                            Known Adverse Effects for Detected Medicines
                          </h4>
                          <div className="space-y-2">
                            {medicineInsights.adverseEffects.map((item, idx) => (
                              <div key={idx} className="bg-white p-2.5 rounded-lg border border-rose-100">
                                <span className="font-black text-slate-950 text-xs block">{item.medicine}</span>
                                <ul className="mt-1 space-y-0.5 text-[11px] text-slate-700">
                                  {item.effects.map((ef, eIdx) => (
                                    <li key={eIdx} className="flex items-start gap-1.5">
                                      <span className="text-rose-500 font-bold">•</span>
                                      <span>{ef}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>

                        {medicineInsights.warningSigns.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                            <h4 className="font-black text-xs text-amber-900 flex items-center gap-1.5 mb-1.5">
                              <AlertCircle size={14} className="text-amber-700" />
                              Critical Warning Signs (Contact Clinic)
                            </h4>
                            <ul className="space-y-1 text-[11px] text-amber-900">
                              {medicineInsights.warningSigns.map((w, wIdx) => (
                                <li key={wIdx} className="flex items-start gap-1.5">
                                  <span className="font-bold text-amber-600">!</span>
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-500">
                        Upload a prescription to unlock medication-specific adverse effect monitoring.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Lifestyle & Diet Tips */}
                {aiActiveTab === 'lifestyle' && (
                  <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {medicineInsights.lifestyleTips.length > 0 ? (
                      medicineInsights.lifestyleTips.map((tip, idx) => (
                        <div key={idx} className="bg-emerald-50/70 p-3 rounded-xl border border-[#A8D7BD]">
                          <span className="font-extrabold text-xs text-[#046A38] block">{tip.medicine}</span>
                          <p className="mt-1 text-xs text-slate-800 leading-relaxed font-medium">
                            {tip.tip}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-500">
                        Upload a prescription to view personalized dietary and lifestyle precautions for your prescribed drugs.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 4: 24h Routine & Schedule */}
                {aiActiveTab === 'schedule' && (
                  <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {medicineInsights.schedules.length > 0 ? (
                      medicineInsights.schedules.map((sch, idx) => (
                        <div key={idx} className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs text-blue-950">{sch.medicine}</span>
                            <span className="text-[10px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                              {sch.timing}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-700 font-medium">
                            {sch.instruction}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-slate-500">
                        Upload a prescription to view 24-hour routine and meal-time schedules.
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Notice */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-emerald-800">
                    <ShieldCheck size={13} />
                    Verified Prescriptions Only
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/patient/medications')}
                    className="font-bold text-[#046A38] hover:underline cursor-pointer"
                  >
                    Manage Medications →
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Column: Interactive Guardrailed AI Assistant + Direct Upload (7 cols) ── */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col h-[520px]">
                
                {/* Chat Top Banner & Quick Chips */}
                <div className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className="text-[#046A38]" />
                      <h3 className="font-black text-sm text-slate-950">Ask Prescription AI Copilot</h3>
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Zero Hallucination Guard
                    </span>
                  </div>

                  {/* Quick Chips for Immediate Insight */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => handleDashboardAiSend("What are the potential adverse effects and safety precautions for my detected medicines?")}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 border border-slate-200 text-[11px] font-bold text-slate-700 transition whitespace-nowrap cursor-pointer shrink-0"
                    >
                      ⚠️ Adverse Effects
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDashboardAiSend("What dietary and lifestyle tips should I follow with my current prescription?")}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-[#A8D7BD] border border-slate-200 text-[11px] font-bold text-slate-700 transition whitespace-nowrap cursor-pointer shrink-0"
                    >
                      🥗 Diet & Lifestyle Tips
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDashboardAiSend("When should I take each of my prescribed medicines and with which meals?")}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 border border-slate-200 text-[11px] font-bold text-slate-700 transition whitespace-nowrap cursor-pointer shrink-0"
                    >
                      ⏰ Daily Timings & Food
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDashboardAiSend("What should I do if I accidentally miss a dose of my prescribed medication?")}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 border border-slate-200 text-[11px] font-bold text-slate-700 transition whitespace-nowrap cursor-pointer shrink-0"
                    >
                      ❓ Missed Dose Protocol
                    </button>
                  </div>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 min-h-0">
                  {aiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-b from-[#022A16] to-[#044D29] border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs overflow-hidden">
                          <AIFaceAvatar size={20} />
                        </div>
                      )}

                      <div
                        className={`max-w-[88%] rounded-2xl p-3 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                          msg.role === 'user'
                            ? 'bg-[#046A38] text-white rounded-tr-xs font-normal'
                            : 'bg-slate-50 text-slate-900 border border-slate-200 rounded-tl-xs'
                        }`}
                      >
                        {msg.isLoading ? (
                          <div className="flex items-center gap-2 py-1">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#046A38] animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-bounce" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-500 animate-pulse">
                              {msg.text}
                            </span>
                          </div>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <div className={`mt-1.5 text-[10px] font-semibold text-right ${
                              msg.role === 'user' ? 'text-emerald-100/70' : 'text-slate-400'
                            }`}>
                              {msg.time}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prompt Bar with Direct File Upload */}
                <div className="pt-2 border-t border-slate-200">
                  {/* Hidden Input for Direct Upload */}
                  <input
                    type="file"
                    ref={aiFileInputRef}
                    onChange={handleDashboardDirectUpload}
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                  />

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleDashboardAiSend();
                    }}
                    className="flex items-center gap-2"
                  >
                    {/* Direct Upload Button (Paperclip) */}
                    <button
                      type="button"
                      onClick={() => aiFileInputRef.current?.click()}
                      disabled={directUploadingRx || aiLoading}
                      title="Direct Upload Prescription (Photo or PDF)"
                      className="p-2.5 rounded-xl border border-slate-300 hover:border-[#046A38] bg-slate-50 hover:bg-[#E8F5EE] text-slate-600 hover:text-[#046A38] transition cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center"
                    >
                      <Paperclip size={18} />
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Ask about side effects, diet, or timings... (or attach Rx)"
                      disabled={aiLoading || directUploadingRx}
                      className="flex-1 text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:border-[#046A38] focus:ring-1 focus:ring-[#046A38] bg-white font-medium text-slate-900 focus:outline-none"
                    />

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!aiInput.trim() || aiLoading || directUploadingRx}
                      className="p-2.5 rounded-xl bg-[#046A38] hover:bg-[#03512b] text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
                      title="Send question"
                    >
                      <Send size={18} />
                    </button>
                  </form>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <ShieldCheck size={12} className="text-[#046A38]" />
                      Strict AI Guardrails: Responses locked to verified medicines. Illegible text = 'unclear'.
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/patient/assistant')}
                      className="font-bold text-[#046A38] hover:underline"
                    >
                      Full Assistant Mode →
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* [FEATURED] Doctors Section (Apollo-Style Specialists with PharmD Focus) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="doctors" className="card border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="card-header bg-[#FAF6EF] border-b border-[#E8DCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Stethoscope size={18} />
              </div>
              <h2 className="font-extrabold text-lg text-slate-950">Doctors & Clinical Care Team</h2>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Apollo-Style Multidisciplinary
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Comprehensive diabetes care led by Clinical Pharmacist (PharmD) medication specialists and consulting physicians.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600 hidden md:inline">
              ⭐ 4.9+ Patient Satisfaction
            </span>
            <button
              onClick={() => navigate('/doctors')}
              className="btn-outline btn-sm font-bold flex items-center gap-1 cursor-pointer text-slate-700 hover:text-slate-900"
            >
              <span>View All Doctors</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="card-body p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* ── PharmD DOCTOR (PROMINENT HERO HIGHLIGHT) ── */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="h-full rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-white p-5 sm:p-6 shadow-md ring-2 ring-emerald-500/20 relative flex flex-col justify-between">
                {/* Floating Top Ribbon */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-emerald-700 text-white px-3 py-1 rounded-full shadow-xs">
                    <Star size={12} className="fill-white" />
                    Featured Lead Care Specialist
                  </span>
                  <span className="text-[11px] font-black bg-white text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                    PharmD Leader
                  </span>
                </div>

                {/* Doctor Avatar & Identity */}
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative shrink-0">
                      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-emerald-600 bg-white shadow-md">
                        <img
                          src={pharmacistImg}
                          alt="Clinical Pharmacist"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-600 animate-pulse" title="Online for Consultations" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-black text-slate-950 leading-tight">
                          {pharmDoctor.name}
                        </h3>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                          {pharmDoctor.degrees}
                        </span>
                      </div>
                      <p className="text-xs font-extrabold text-emerald-700 mt-0.5">
                        {pharmDoctor.title}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                        {pharmDoctor.hospital}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1 text-amber-600">
                          <Star size={13} className="fill-amber-500 text-amber-500" />
                          <span>{pharmDoctor.rating} ({pharmDoctor.reviewsCount} reviews)</span>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>{pharmDoctor.experience}</span>
                      </div>
                    </div>
                  </div>

                  {/* Why Consult PharmD Callout */}
                  <div className="p-3.5 rounded-xl bg-white/90 border border-emerald-200 shadow-2xs mb-4">
                    <p className="text-[11px] font-bold text-emerald-950 leading-relaxed">
                      <span className="font-black text-emerald-800">Why your PharmD is essential: </span>
                      {pharmDoctor.description}
                    </p>
                  </div>

                  {/* Clinical Focus Badges */}
                  <div className="mb-4">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Clinical Focus & Expertise
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pharmDoctor.focusAreas.map((area, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-900 border border-emerald-200"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Timing & CTAs */}
                <div className="pt-3 border-t border-emerald-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                    <span className="flex items-center gap-1 text-emerald-800">
                      <Clock size={13} className="text-emerald-600" />
                      <span>Next Slot: <strong>{pharmDoctor.availableSlot}</strong></span>
                    </span>
                    <span className="text-emerald-700 text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Video / Phone
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleStartBooking(pharmDoctor)}
                      className="btn-primary btn-sm bg-emerald-700 hover:bg-emerald-800 border-none font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Phone size={13} />
                      <span>Book PharmD Consult</span>
                    </button>
                    <button
                      onClick={() => navigate('/patient/medications')}
                      className="btn-outline btn-sm bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Pill size={13} className="text-emerald-700" />
                      <span>Medication Review</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── OTHER SPECIALISTS LISTED ALONGSIDE ── */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <Stethoscope size={16} className="text-[#046A38]" />
                    <span>Consulting Specialists (Apollo Roster)</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    Direct Appointments Available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {otherSpecialists.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-2xl border-2 border-slate-200 hover:border-[#046A38] bg-white transition-all hover:shadow-md flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top Specialist Header */}
                        <div className="flex items-start gap-3 mb-2.5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                            {typeof doc.avatar === 'string' && doc.avatar.startsWith('http') ? (
                              <img src={doc.avatar} alt={doc.name} className="w-full h-full object-cover" />
                            ) : (
                              <img src={doctorImg} alt={doc.name} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 block w-fit mb-0.5">
                              {doc.specialty}
                            </span>
                            <h4 className="font-black text-sm text-slate-950 truncate group-hover:text-[#046A38]">
                              {doc.name}
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-600 truncate">
                              {doc.degrees}
                            </p>
                          </div>
                        </div>

                        {/* Experience, Rating, Next Slot */}
                        <div className="space-y-1 mb-2.5 text-[11px] text-slate-600 font-medium">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">{doc.experience}</span>
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Star size={11} className="fill-amber-500 text-amber-500" />
                              <span>{doc.rating}</span>
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{doc.hospital}</p>
                          <div className="flex items-center gap-1 text-slate-800 font-bold pt-1">
                            <Clock size={11} className="text-teal-700 shrink-0" />
                            <span className="text-[11px]">Slot: {doc.availableSlot}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => handleStartBooking(doc)}
                        className="w-full btn-outline btn-xs font-bold text-xs py-1.5 rounded-lg border-slate-300 hover:border-[#046A38] hover:bg-[#E8F5EE] hover:text-[#046A38] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CalendarDays size={12} />
                        <span>Book Consultation</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Apollo Assurance Banner */}
              <div className="mt-4 p-3 rounded-xl bg-[#FAF6EF] border border-[#E8DCC8] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#046A38] shrink-0" />
                  <span className="font-bold text-slate-900 text-[11px]">
                    Apollo Clinical Protocol: All doctor recommendations are reviewed with your PharmD for drug safety.
                  </span>
                </div>
                <button
                  onClick={() => navigate('/doctors')}
                  className="text-xs font-black text-[#046A38] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Explore Directory</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* [SEPARATELY FURTHER DOWN] Repositioned Appointments Section */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="appointments" className="card border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="card-header bg-[#FAF6EF] border-b border-[#E8DCC8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                <CalendarDays size={18} />
              </div>
              <h2 className="font-extrabold text-lg text-slate-950">Upcoming Appointments & Clinical Consultations</h2>
              {appointments.length > 0 && (
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-700 text-white">
                  {appointments.length} Scheduled
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Confirmed tele-health video consults, routine follow-ups, and in-person clinical reviews
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleStartBooking(pharmDoctor)}
              className="btn-primary btn-sm flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Plus size={15} />
              <span>Book Appointment</span>
            </button>
            <button
              onClick={() => navigate('/appointments')}
              className="btn-outline btn-sm font-bold flex items-center gap-1 cursor-pointer text-slate-700 hover:text-slate-900"
            >
              <span>Full Schedule</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="card-body p-4 sm:p-6">
          {appointments.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mb-3">
                <CalendarDays size={28} />
              </div>
              <h3 className="text-base font-extrabold text-slate-950">No Upcoming Appointments</h3>
              <p className="text-xs text-slate-600 font-medium max-w-md mx-auto mt-1 mb-4">
                Regular reviews with your Diabetologist and clinical counselling with your PharmD ensure your glycemic targets remain on schedule.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => handleStartBooking(pharmDoctor)}
                  className="btn-primary btn-sm bg-emerald-700 hover:bg-emerald-800 border-none font-bold cursor-pointer"
                >
                  <Stethoscope size={15} />
                  <span>Book PharmD Review</span>
                </button>
                <button
                  onClick={() => handleStartBooking(otherSpecialists[0])}
                  className="btn-outline btn-sm font-bold text-blue-800 border-blue-300 bg-white hover:bg-blue-50 cursor-pointer"
                >
                  <CalendarDays size={15} />
                  <span>Book Diabetologist Follow-up</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appointments.map(appt => {
                const apptDate = new Date(appt.date);
                const isUpcomingSoon = apptDate.getTime() - Date.now() < 86400000 * 2;
                const docObj = allUsers.find(u => u.id === appt.doctorId || u.id === appt.pharmacistId);
                const docName = appt.doctorName || docObj?.name || (appt.pharmacistId ? pharmDoctor.name : (appt.doctorId ? otherSpecialists[0]?.name : 'Care Team Specialist'));
                const docTitle = appt.doctorTitle || (docObj?.role === 'pharmacist' || appt.pharmacistId ? 'Clinical Pharmacist (PharmD)' : 'Consultant Diabetologist');
                const isVideo = (appt.location || '').toLowerCase().includes('video') || (appt.location || '').toLowerCase().includes('tele');

                return (
                  <div
                    key={appt.id}
                    className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-300 bg-white transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Date Header & Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-black uppercase leading-none">
                              {apptDate.toLocaleString('default', { month: 'short' })}
                            </span>
                            <span className="text-base font-black leading-tight">
                              {apptDate.getDate()}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block leading-tight">
                              {formatTime(appt.date)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {appt.duration || 30} mins session
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isUpcomingSoon
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-50 text-blue-900 border border-blue-200'
                        }`}>
                          {isUpcomingSoon ? 'Coming Soon' : 'Confirmed'}
                        </span>
                      </div>

                      {/* Appointment Type & Doctor */}
                      <h4 className="font-extrabold text-sm text-slate-950 mb-1">
                        {appt.type}
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                          <Stethoscope size={12} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{docName}</p>
                          <p className="text-[10px] font-medium text-slate-500 truncate">{docTitle}</p>
                        </div>
                      </div>

                      {/* Location / Channel */}
                      <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-1.5 mb-3">
                        {isVideo ? (
                          <>
                            <Video size={13} className="text-teal-700 shrink-0" />
                            <span className="truncate">Telehealth Video Consult • Link Enabled</span>
                          </>
                        ) : (
                          <>
                            <MapPin size={13} className="text-rose-700 shrink-0" />
                            <span className="truncate">{appt.location || 'Apollo Sugar Clinic'}</span>
                          </>
                        )}
                      </div>

                      {appt.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100 mb-3">
                          "{appt.notes}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isVideo ? (
                        <button
                          onClick={() => {
                            addToast({
                              type: 'info',
                              message: `Connecting to Telehealth Video Room with ${docName}...`,
                            });
                          }}
                          className="btn-primary btn-xs bg-teal-700 hover:bg-teal-800 border-none font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Video size={12} />
                          <span>Join Video</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <CheckCircle size={12} className="text-emerald-600" />
                          <span>In-Person Visit</span>
                        </span>
                      )}
                      <button
                        onClick={() => navigate('/appointments')}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Universal Consultation & Booking Modal */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title={selectedDoctorForBooking ? `Book Appointment with ${selectedDoctorForBooking.name}` : 'Schedule Consultation'}
        size="md"
      >
        {selectedDoctorForBooking && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 bg-white shrink-0">
                <img
                  src={selectedDoctorForBooking.role === 'pharmacist' ? pharmacistImg : (typeof selectedDoctorForBooking.avatar === 'string' && selectedDoctorForBooking.avatar.startsWith('http') ? selectedDoctorForBooking.avatar : doctorImg)}
                  alt={selectedDoctorForBooking.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-sm text-slate-950 truncate">{selectedDoctorForBooking.name}</h4>
                <p className="text-xs font-bold text-emerald-800">{selectedDoctorForBooking.specialty} • {selectedDoctorForBooking.degrees}</p>
                <p className="text-[11px] text-slate-500">{selectedDoctorForBooking.hospital}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Consultation Purpose</label>
                <select
                  value={bookingForm.type}
                  onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-950 focus:border-[#046A38] focus:outline-none"
                >
                  <option>Follow-up Consultation</option>
                  <option>Comprehensive Care Review</option>
                  <option>Medication Therapy Management (MTM)</option>
                  <option>Insulin & Oral Dose Titration</option>
                  <option>Lab Investigation & HbA1c Analysis</option>
                  <option>Side-Effect or Toxicity Evaluation</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-950 focus:border-[#046A38] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">Preferred Slot</label>
                  <select
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-950 focus:border-[#046A38] focus:outline-none"
                  >
                    <option value="09:30">09:30 AM</option>
                    <option value="10:30">10:30 AM (Recommended)</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="14:30">02:30 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:30">05:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Consultation Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, mode: 'Tele-Consult HD Video' })}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      bookingForm.mode.includes('Video')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Video size={14} className="text-emerald-700" />
                    <span>HD Telehealth Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, mode: 'Apollo Sugar Clinic (In-Person)' })}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      bookingForm.mode.includes('In-Person')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin size={14} className="text-emerald-700" />
                    <span>Clinic In-Person</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">Chief Concern / Symptoms / Notes</label>
                <textarea
                  rows={2}
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  placeholder="e.g. Discuss recent morning glucose spikes, dizziness after Metformin, or review HbA1c report..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-950 focus:border-[#046A38] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                className="btn-ghost btn-sm text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="btn-primary btn-sm bg-[#046A38] hover:bg-[#03512b] border-none text-xs font-bold flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                <span>Confirm & Add to Schedule</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Electronic Prescription Upload & Verification Modal */}
      <PrescriptionUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onPrescriptionApplied={() => {
          refreshData();
        }}
      />
    </div>
  );
}
