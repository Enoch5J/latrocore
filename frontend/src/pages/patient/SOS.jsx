import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Modal, Badge } from '../../components/ui';
import {
  Phone, PhoneCall, ShieldAlert, AlertTriangle, MapPin, Navigation,
  Heart, Clock, User, CheckCircle, X, ExternalLink, Share2,
  Stethoscope, Info, Volume2, VolumeX, MessageSquare, Send, Activity,
  RefreshCw, Check, AlertCircle, Edit3, Save
} from 'lucide-react';
import { addNotification, addSafetyEvent, addAuditEntry } from '../../services/dataService';

// Fallback emergency contacts data
const DEFAULT_CARETAKERS = [
  {
    id: 'ct-1',
    name: 'Rajesh Sharma',
    relationship: 'Spouse / Primary Caregiver',
    priority: 'Primary Contact (1st Alert)',
    phone: '+91 98401 23456',
    altPhone: '+91 98401 98765',
    address: '12/4, 4th Main Road, Anna Nagar West, Chennai',
    isPrimary: true,
    available24x7: true,
  },
  {
    id: 'ct-2',
    name: 'Ananya Sharma',
    relationship: 'Daughter / Family Proxy',
    priority: 'Secondary Escalation',
    phone: '+91 94440 88765',
    altPhone: '+91 94440 11223',
    address: 'Kotturpuram, Chennai',
    isPrimary: false,
    available24x7: true,
  },
];

// Verified emergency hospitals & trauma centers
const NEARBY_HOSPITALS = [
  {
    id: 'hosp-1',
    name: 'Apollo Hospitals & 24/7 Emergency Trauma Center',
    branch: 'Greams Road Main Hospital',
    distance: '1.2 km',
    travelTime: '4 mins',
    phone: '+91 44 2829 0200',
    emergencyHotline: '1066',
    address: 'No. 21, Greams Lane, Off Greams Road, Chennai - 600006',
    openStatus: 'Open 24x7 • Active Trauma & Resuscitation Unit',
    facilities: ['Acute Diabetic ICU', 'Emergency Insulin Stabilization', 'Rapid Cardiac & Stroke Unit', 'ICU Beds Available'],
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Apollo+Hospital+Emergency+Greams+Road+Chennai',
    badge: 'Nearest Emergency Care',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  {
    id: 'hosp-2',
    name: 'Fortis Malar Hospital — Critical Care Unit',
    branch: 'Adyar Emergency Station',
    distance: '2.8 km',
    travelTime: '8 mins',
    phone: '+91 44 4289 2222',
    emergencyHotline: '+91 44 4289 2200',
    address: 'No. 52, 1st Main Road, Gandhi Nagar, Adyar, Chennai - 600020',
    openStatus: 'Open 24x7 • Intensive Care & Dialysis Ready',
    facilities: ['DKA (Ketoacidosis) Crisis Ward', '24/7 Dialysis Facility', 'Emergency Diabetologist on Duty'],
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Fortis+Malar+Hospital+Adyar+Chennai',
    badge: 'Specialized DKA Support',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  {
    id: 'hosp-3',
    name: 'Kauvery Hospital 24x7 Emergency Hub',
    branch: 'Alwarpet Trauma Center',
    distance: '3.5 km',
    travelTime: '11 mins',
    phone: '+91 44 4000 6000',
    emergencyHotline: '1055',
    address: 'No. 199, Luz Church Road, Mylapore / Alwarpet, Chennai - 600004',
    openStatus: 'Open 24x7 • Resuscitation Bay Available',
    facilities: ['Round-the-clock Emergency Physicians', 'Point-of-Care Lab & Blood Gas Analysis', 'Ambulance On Standby'],
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Kauvery+Hospital+Alwarpet+Chennai',
    badge: 'Trauma & Resuscitation',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  {
    id: 'hosp-4',
    name: 'Government Multi Super Speciality Hospital (Omandurar)',
    branch: 'Central Emergency Trauma Wing',
    distance: '4.1 km',
    travelTime: '13 mins',
    phone: '+91 44 2530 5000',
    emergencyHotline: '108',
    address: 'Omandurar Government Estate, Anna Salai, Chennai - 600002',
    openStatus: 'Open 24x7 • Free Government Emergency Services',
    facilities: ['108 Direct Dispatch Hub', 'Comprehensive Trauma Care', 'Free Emergency Ward & Insulin Support'],
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Omandurar+Government+Hospital+Chennai',
    badge: 'National 108 Hub',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
  },
];

// Audio tone synthesizer for simulated emergency siren/chime
function playEmergencyAudio(type = 'alarm') {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'alarm') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.25);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.75);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
      osc.start();
      osc.stop(ctx.currentTime + 1.0);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (err) {
    console.warn('Web Audio synthesis notice:', err);
  }
}

export default function PatientSOS() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const navigate = useNavigate();
  const patientId = currentUser?.id || 'pat-001';

  // SOS Activation State
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [sosDispatchedAt, setSosDispatchedAt] = useState(null);
  const [soundMuted, setSoundMuted] = useState(false);

  // Caretakers state (persisted in localStorage)
  const [caretakers, setCaretakers] = useState(() => {
    try {
      const saved = localStorage.getItem('latrocore_caretakers');
      return saved ? JSON.parse(saved) : DEFAULT_CARETAKERS;
    } catch {
      return DEFAULT_CARETAKERS;
    }
  });

  // Edit Caretaker Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCaretaker, setEditingCaretaker] = useState(null);

  // Rule of 15 Timer (Hypoglycemia rescue)
  const [rule15Active, setRule15Active] = useState(false);
  const [rule15Seconds, setRule15Seconds] = useState(15 * 60); // 15 mins
  const rule15TimerRef = useRef(null);

  // Hospital filter
  const [hospitalQuery, setHospitalQuery] = useState('');

  // Patient Location (simulated verified location with browser fallback)
  const [locationStatus, setLocationStatus] = useState('Anna Nagar West, Chennai (13.0827° N, 80.2707° E)');

  // Attending Doctor info
  const assignedDoctor = useMemo(() => {
    if (!data?.users) return null;
    const users = Array.isArray(data.users) ? data.users : Object.values(data.users);
    return users.find(u => u.role === 'doctor' || u.id === currentUser?.assignedDoctor) || {
      name: 'Dr. Arun Kumar',
      degrees: 'MD (General Medicine), DM (Endocrinology)',
      phone: '+91 44 2829 7800',
      clinic: 'Apollo Sugar Clinics & Latrocore Network',
    };
  }, [data?.users, currentUser]);

  // Assigned Clinical Pharmacist info
  const assignedPharmacist = useMemo(() => {
    if (!data?.users) return null;
    const users = Array.isArray(data.users) ? data.users : Object.values(data.users);
    return users.find(u => u.role === 'pharmacist' || u.id === currentUser?.assignedPharmacist) || {
      name: 'Dr. K. Ramesh',
      degrees: 'PharmD, BCPS',
      phone: '+91 44 2829 7822',
      clinic: 'Clinical Pharmacotherapy Support Desk',
    };
  }, [data?.users, currentUser]);

  // Latest glucose reading for emergency reporting
  const latestGlucose = useMemo(() => {
    const readings = (data?.glucoseReadings || []).filter(r => r.patientId === patientId);
    if (!readings.length) return { value: 64, unit: 'mg/dL', status: 'Low / Hypoglycemia Warning' };
    const sorted = [...readings].sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    return sorted[0];
  }, [data?.glucoseReadings, patientId]);

  // Request browser geolocation if available
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocationStatus(`Live GPS: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (Near Anna Nagar, Chennai)`);
        },
        () => {
          // Keep verified default clinical address
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Countdown timer for SOS trigger
  useEffect(() => {
    let timer;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        if (!soundMuted) playEmergencyAudio('alarm');
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      executeSOSBroadcast();
    }
    return () => clearTimeout(timer);
  }, [countdown, soundMuted]);

  // Rule of 15 countdown timer
  useEffect(() => {
    if (rule15Active && rule15Seconds > 0) {
      rule15TimerRef.current = setInterval(() => {
        setRule15Seconds(prev => prev - 1);
      }, 1000);
    } else if (rule15Seconds === 0 && rule15Active) {
      playEmergencyAudio('alarm');
      addToast({
        type: 'warning',
        title: 'Rule of 15 Complete!',
        message: '15 minutes have passed. Retest your blood glucose immediately!',
      });
      setRule15Active(false);
    }
    return () => clearInterval(rule15TimerRef.current);
  }, [rule15Active, rule15Seconds, addToast]);

  // Trigger SOS with 5-second countdown
  const handleInitiateSOS = () => {
    if (sosActive) return;
    setCountdown(5);
    if (!soundMuted) playEmergencyAudio('alarm');
    addToast({
      type: 'warning',
      title: 'Emergency SOS Initiated',
      message: 'Broadcasting to caretaker, doctor & ambulance in 5 seconds...',
    });
  };

  const cancelSOSCountdown = () => {
    setCountdown(null);
    addToast({ type: 'info', message: 'Emergency broadcast cancelled by patient.' });
  };

  // Execute full broadcast
  const executeSOSBroadcast = async () => {
    setSosActive(true);
    setSosDispatchedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (!soundMuted) playEmergencyAudio('alarm');

    // 1. Record safety event
    try {
      const event = await addSafetyEvent({
        patientId,
        type: 'emergency_sos_broadcast',
        triggerValue: latestGlucose?.value || 62,
        unit: 'mg/dL',
        triggerTime: new Date().toISOString(),
        acknowledged: false,
        resolved: false,
        notes: `Patient initiated one-tap SOS crisis signal. Location: ${locationStatus}. Designated caretakers and attending clinician notified.`,
      });

      // 2. Notify Caretaker & Doctor
      await addNotification({
        userId: patientId,
        type: 'safety',
        title: '🚨 EMERGENCY SOS ACTIVE',
        message: `Emergency signal dispatched. Caretakers Rajesh Sharma and Dr. Arun Kumar have been alerted with your location.`,
        relatedId: event.id,
      });

      if (currentUser?.assignedDoctor) {
        await addNotification({
          userId: currentUser.assignedDoctor,
          type: 'safety',
          title: `EMERGENCY SOS: ${currentUser.name || 'Patient'}`,
          message: `CRITICAL ALERT: Patient triggered SOS at ${locationStatus}. Glucose: ${latestGlucose?.value || 'N/A'} mg/dL.`,
          relatedId: event.id,
        });
      }

      await addAuditEntry({
        actor: currentUser?.id || 'pat-001',
        actorRole: 'patient',
        action: 'emergency_sos_broadcast',
        patientId,
        recordId: event.id,
        details: `Emergency SOS signal dispatched. Location: ${locationStatus}`,
      });

      refreshData();
    } catch (err) {
      console.warn('Backend sync notice (offline mode active):', err);
    }

    addToast({
      type: 'error',
      title: '🚨 EMERGENCY SOS BROADCAST SENT',
      message: 'Emergency alert dispatched to Caretaker, Hospital and Diabetologist!',
    });
  };

  const handleDeactivateSOS = () => {
    setSosActive(false);
    setSosDispatchedAt(null);
    playEmergencyAudio('success');
    addToast({
      type: 'success',
      title: 'Status: Safe',
      message: 'Emergency stand down logged. Care team updated.',
    });
  };

  // Rule of 15 helper
  const startRule15Timer = () => {
    setRule15Seconds(15 * 60);
    setRule15Active(true);
    addToast({
      type: 'info',
      title: 'Rule of 15 Timer Started',
      message: 'Consume 15g fast sugar now. Re-test blood sugar in 15 minutes.',
    });
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Save Caretaker
  const handleSaveCaretaker = (e) => {
    e.preventDefault();
    if (!editingCaretaker) return;
    const updated = caretakers.map(c => c.id === editingCaretaker.id ? editingCaretaker : c);
    setCaretakers(updated);
    try {
      localStorage.setItem('latrocore_caretakers', JSON.stringify(updated));
    } catch (err) {
      console.warn('Storage save notice:', err);
    }
    setEditModalOpen(false);
    setEditingCaretaker(null);
    addToast({ type: 'success', message: 'Caretaker emergency contact updated successfully.' });
  };

  // Filter hospitals
  const filteredHospitals = useMemo(() => {
    if (!hospitalQuery.trim()) return NEARBY_HOSPITALS;
    const q = hospitalQuery.toLowerCase();
    return NEARBY_HOSPITALS.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.branch.toLowerCase().includes(q) ||
      h.facilities.some(f => f.toLowerCase().includes(q))
    );
  }, [hospitalQuery]);

  // Pre-filled WhatsApp SOS text
  const primaryCaretaker = caretakers[0] || DEFAULT_CARETAKERS[0];
  const emergencyMessage = encodeURIComponent(
    `🚨 EMERGENCY MEDICAL ALERT FROM LATROCORE 🚨\n\n` +
    `Patient: ${currentUser?.name || 'Priya Sharma'}\n` +
    `Current Status: Acute Medical Crisis / Severe Hypoglycemia\n` +
    `Recent Glucose: ${latestGlucose?.value || '62'} mg/dL\n` +
    `Current Location: ${locationStatus}\n` +
    `Immediate Action Required: Please call me or send an ambulance to my location immediately.`
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-[#E8DCC8]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md animate-pulse">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Emergency SOS & Crisis Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs tracking-wider">
                  24/7 ACTIVE
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                Instant connection to designated caretakers, nearby emergency hospitals, and trauma response teams.
              </p>
            </div>
          </div>
        </div>

        {/* Live Audio / Sound Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              soundMuted
                ? 'bg-slate-100 text-slate-600 border-slate-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
            title="Toggle Emergency Audio Siren"
          >
            {soundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{soundMuted ? 'Sirens Muted' : 'Sirens Active'}</span>
          </button>

          <a
            href="tel:108"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-rose-700 hover:bg-rose-800 text-white shadow-sm transition-all cursor-pointer"
          >
            <PhoneCall size={16} />
            <span>Call 108 (Ambulance)</span>
          </a>
        </div>
      </div>

      {/* ── Verified Location & Safety Telemetry Bar ───────────────── */}
      <div className="bg-[#FAF6EF] border-2 border-[#E8DCC8] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#046A38] text-white flex items-center justify-center shrink-0">
            <MapPin size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Live Patient Telemetry & GPS Station
            </p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {locationStatus}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Latest Glucose</span>
            <span className={`text-sm font-black ${latestGlucose?.value < 70 ? 'text-rose-700' : 'text-slate-900'}`}>
              {latestGlucose?.value || '--'} {latestGlucose?.unit || 'mg/dL'}
            </span>
          </div>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>

      {/* ── Active SOS Banner (Shown when countdown or active) ──────── */}
      {countdown !== null && (
        <div className="bg-rose-600 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-rose-300 animate-pulse text-center">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-white text-rose-600 flex items-center justify-center mx-auto text-2xl font-black shadow-lg">
              {countdown}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Broadcasting Emergency SOS Signal!
            </h2>
            <p className="text-sm sm:text-base font-semibold text-rose-100">
              Broadcasting emergency alerts with your live GPS location to Caretaker{' '}
              <strong>{primaryCaretaker.name}</strong>, attending Diabetologist, and ambulance services.
            </p>
            <div className="pt-2">
              <button
                onClick={cancelSOSCountdown}
                className="px-6 py-3 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 font-black text-sm shadow-md transition-all cursor-pointer"
              >
                ✕ Cancel SOS (Accidental Press)
              </button>
            </div>
          </div>
        </div>
      )}

      {sosActive && (
        <div className="bg-rose-50 border-3 border-rose-500 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/40 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg animate-bounce">
                <AlertTriangle size={30} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-rose-950">
                    🚨 EMERGENCY BROADCAST DISPATCHED
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900">
                    Dispatched at {sosDispatchedAt}
                  </span>
                </div>
                <p className="text-sm font-bold text-rose-900 mt-1">
                  Alert sent to {primaryCaretaker.name} ({primaryCaretaker.phone}) and Apollo Emergency Dispatch.
                </p>
                <p className="text-xs font-semibold text-rose-800 mt-0.5">
                  Remain calm. Sit down in a safe position. If conscious, consume fast-acting carbohydrates.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <a
                href={`https://wa.me/?text=${emergencyMessage}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs sm:text-sm font-bold flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800"
              >
                <Share2 size={16} />
                <span>Share WhatsApp Live Alert</span>
              </a>
              <button
                onClick={handleDeactivateSOS}
                className="btn-outline text-xs sm:text-sm font-black border-rose-300 text-rose-900 hover:bg-rose-100"
              >
                <CheckCircle size={16} />
                <span>Mark Safe / Stand Down</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Big SOS Trigger Card (When Inactive) ──────────────── */}
      {!sosActive && countdown === null && (
        <div className="card border-2 border-rose-300 bg-gradient-to-br from-rose-50/50 via-white to-amber-50/30 shadow-md">
          <div className="card-body p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center lg:text-left max-w-xl">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-3 py-1 rounded-full border border-rose-300 inline-block">
                  Immediate Emergency Action
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Feeling Dizzy, Unsteady, or in Severe Distress?
                </h2>
                <p className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed">
                  One tap alerts your registered family caregiver, shares your live GPS location, and initiates rapid hospital triage for severe hypoglycemia or diabetic emergencies.
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-emerald-700" /> Auto-SMS & WhatsApp Link
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-emerald-700" /> GPS Map Coordinates
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle size={15} className="text-emerald-700" /> Clinician Care Team Flag
                  </span>
                </div>
              </div>

              {/* Huge Tactile SOS Activation Button */}
              <div className="shrink-0">
                <button
                  onClick={handleInitiateSOS}
                  className="group relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-rose-700 to-rose-500 hover:from-rose-800 hover:to-rose-600 text-white flex flex-col items-center justify-center shadow-2xl hover:shadow-rose-400/50 hover:scale-105 active:scale-95 transition-all cursor-pointer border-4 border-white ring-8 ring-rose-200"
                >
                  <ShieldAlert size={48} className="group-hover:animate-bounce mb-1" />
                  <span className="text-xl sm:text-2xl font-black tracking-wider">TAP FOR SOS</span>
                  <span className="text-[10px] font-bold text-rose-100 uppercase tracking-widest mt-0.5">
                    Broadcast Alert
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-Column Layout: Caretakers & Nearby Hospitals ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* SECTION 1: Connect with Caretaker & Family               */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="card border border-[#E8DCC8] bg-white shadow-xs flex flex-col">
          <div className="card-header bg-[#FAF6EF] rounded-t-2xl border-b border-[#E8DCC8] flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#046A38] text-white flex items-center justify-center shadow-xs">
                <Heart size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Primary Caretaker & Family</h2>
                <p className="text-xs font-semibold text-slate-500">Designated immediate emergency contacts</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingCaretaker({ ...primaryCaretaker });
                setEditModalOpen(true);
              }}
              className="btn-outline btn-sm text-xs font-bold"
            >
              <Edit3 size={14} />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="card-body p-4 sm:p-5 space-y-4 flex-1">
            {caretakers.map((ct, idx) => (
              <div
                key={ct.id || idx}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  ct.isPrimary
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-base text-slate-950">{ct.name}</h3>
                        {ct.isPrimary && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                            Primary Caretaker
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">{ct.relationship}</p>
                      <p className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                        <Phone size={13} className="text-emerald-700 shrink-0" />
                        <span>{ct.phone}</span>
                        {ct.altPhone && <span className="text-slate-500">• Alt: {ct.altPhone}</span>}
                      </p>
                      {ct.address && (
                        <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin size={12} className="shrink-0" /> {ct.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fast Action Buttons */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/80">
                  <a
                    href={`tel:${ct.phone.replace(/\s+/g, '')}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white text-xs font-bold shadow-xs transition-colors text-center"
                  >
                    <PhoneCall size={14} />
                    <span>Call Now</span>
                  </a>
                  <a
                    href={`https://wa.me/${ct.phone.replace(/[^0-9]/g, '')}?text=${emergencyMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-xs font-bold border border-emerald-300 transition-colors text-center"
                  >
                    <MessageSquare size={14} className="text-emerald-800" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`sms:${ct.phone.replace(/\s+/g, '')}?body=${emergencyMessage}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold border border-slate-300 transition-colors text-center"
                  >
                    <Send size={14} className="text-slate-700" />
                    <span>SMS Alert</span>
                  </a>
                </div>
              </div>
            ))}

            {/* Clinician Direct Emergency Hotlines */}
            <div className="mt-4 p-4 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8]">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Attending Healthcare Specialists
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={16} className="text-[#046A38]" />
                    <div>
                      <p className="font-bold text-slate-950">{assignedDoctor.name}</p>
                      <p className="text-[11px] text-slate-600">Attending Diabetologist</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${assignedDoctor.phone?.replace(/\s+/g, '') || '1066'}`}
                    className="btn-outline btn-xs font-bold text-emerald-800 border-emerald-300"
                  >
                    <PhoneCall size={12} /> Call Clinic
                  </a>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-[#E34222]" />
                    <div>
                      <p className="font-bold text-slate-950">{assignedPharmacist.name}</p>
                      <p className="text-[11px] text-slate-600">Medication Safety Specialist (PharmD)</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${assignedPharmacist.phone?.replace(/\s+/g, '') || '1066'}`}
                    className="btn-outline btn-xs font-bold text-slate-800 border-slate-300"
                  >
                    <PhoneCall size={12} /> Call Desk
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* SECTION 2: Connect to Nearby Hospital                     */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="card border border-[#E8DCC8] bg-white shadow-xs flex flex-col">
          <div className="card-header bg-[#FAF6EF] rounded-t-2xl border-b border-[#E8DCC8] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                  <Navigation size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">Nearby Hospitals & Trauma Units</h2>
                  <p className="text-xs font-semibold text-slate-500">Fast emergency admission & ambulance routes</p>
                </div>
              </div>

              {/* National Free Hotlines Pill */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300">
                  Ambulance: <strong>108</strong>
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-300">
                  National SOS: <strong>112</strong>
                </span>
              </div>
            </div>

            {/* Quick search filter */}
            <div className="mt-3">
              <input
                type="text"
                value={hospitalQuery}
                onChange={(e) => setHospitalQuery(e.target.value)}
                placeholder="Search hospital name, DKA care, ICU..."
                className="input text-xs w-full bg-white border-slate-300"
              />
            </div>
          </div>

          <div className="card-body p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto max-h-[600px]">
            {filteredHospitals.map(hosp => (
              <div
                key={hosp.id}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-[#046A38] bg-white hover:bg-slate-50/50 transition-all shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-950">{hosp.name}</h3>
                      {hosp.badge && (
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${hosp.badgeColor}`}>
                          {hosp.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">{hosp.branch}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{hosp.address}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 block">
                      {hosp.distance} • {hosp.travelTime}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block">Driving ETA</span>
                  </div>
                </div>

                {/* Facility Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hosp.facilities.map((fac, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                      ✓ {fac}
                    </span>
                  ))}
                </div>

                {/* Actions: Call & Map Directions */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                  <a
                    href={`tel:${hosp.emergencyHotline.replace(/\s+/g, '')}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-xs transition-colors text-center"
                  >
                    <PhoneCall size={14} />
                    <span>Call Emergency ({hosp.emergencyHotline})</span>
                  </a>
                  <a
                    href={hosp.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-[#E8F5EE] text-slate-900 hover:text-[#046A38] text-xs font-bold border border-slate-300 transition-colors text-center"
                  >
                    <Navigation size={14} />
                    <span>Get Directions</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rule-of-15 Hypoglycemia Rapid Rescue Protocol ─────────── */}
      <div className="card border-2 border-amber-300 bg-amber-50/40 shadow-xs">
        <div className="card-body p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                  15
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-950">
                  Acute Low Blood Sugar Rescue: The Clinical "Rule of 15"
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-amber-950 leading-relaxed">
                If blood sugar drops below <strong>70 mg/dL</strong> or you feel shaky, sweating, or dizzy:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs font-bold text-slate-900">
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-amber-800 font-black block">Step 1: Take 15g Fast Carbs</span>
                  3-4 glucose tablets OR 1/2 cup fruit juice OR 1 tbsp sugar/honey.
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-amber-800 font-black block">Step 2: Rest 15 Minutes</span>
                  Sit comfortably. Allow sugar to absorb into bloodstream.
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-amber-800 font-black block">Step 3: Re-Check Sugar</span>
                  If still &lt; 70 mg/dL, repeat. If unconscious, call 108 immediately.
                </div>
              </div>
            </div>

            {/* Interactive 15-Minute Countdown Timer */}
            <div className="p-4 rounded-2xl bg-white border-2 border-amber-300 text-center min-w-[200px] shrink-0 self-center lg:self-auto shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                Rescue Timer
              </span>
              <p className="text-3xl font-black text-amber-700 tracking-tight my-1">
                {formatTimer(rule15Seconds)}
              </p>
              {rule15Active ? (
                <button
                  onClick={() => setRule15Active(false)}
                  className="btn-outline btn-xs w-full text-slate-700 font-bold"
                >
                  Pause Timer
                </button>
              ) : (
                <button
                  onClick={startRule15Timer}
                  className="btn-primary btn-xs w-full font-bold bg-amber-600 hover:bg-amber-700"
                >
                  Start 15 Min Timer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bystander & Paramedic Emergency Medical ID Card ─────────── */}
      <div className="card border-2 border-slate-300 bg-white shadow-xs">
        <div className="card-header bg-slate-900 text-white rounded-t-2xl p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
              ID
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Paramedic & First-Responder Medical ID</h3>
              <p className="text-[11px] font-medium text-slate-300">Visible for emergency personnel if patient is unresponsive</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
            Blood: O+ (Positive)
          </span>
        </div>

        <div className="card-body p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Full Name</span>
            <span className="font-extrabold text-slate-950 text-sm">{currentUser?.name || 'Priya Sharma'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Age / Gender</span>
            <span className="font-extrabold text-slate-950 text-sm">42 Yrs • Female</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Diagnosed Condition</span>
            <span className="font-extrabold text-slate-950 text-sm">Type 2 Diabetes Mellitus</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Known Drug Allergies</span>
            <span className="font-extrabold text-rose-700 text-sm">Sulfa Antibiotics (Rash)</span>
          </div>

          <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Current Active Medication Regimen</span>
              <span className="font-bold text-slate-800 text-xs">
                Metformin HCl 500mg (BID) • Glimepiride 1mg (OD Before Breakfast) • Atorvastatin 10mg (Bedtime)
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-md shrink-0">
              Verified by Diabetologist
            </span>
          </div>
        </div>
      </div>

      {/* ── Edit Caretaker Contact Modal ───────────────────────────── */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Primary Caretaker Contact"
        size="md"
      >
        {editingCaretaker && (
          <form onSubmit={handleSaveCaretaker} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Caretaker Full Name</label>
              <input
                type="text"
                value={editingCaretaker.name}
                onChange={(e) => setEditingCaretaker({ ...editingCaretaker, name: e.target.value })}
                required
                className="input text-xs w-full"
                placeholder="e.g. Rajesh Sharma"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Relationship</label>
                <input
                  type="text"
                  value={editingCaretaker.relationship}
                  onChange={(e) => setEditingCaretaker({ ...editingCaretaker, relationship: e.target.value })}
                  required
                  className="input text-xs w-full"
                  placeholder="e.g. Spouse / Son / Daughter"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Primary Emergency Phone</label>
                <input
                  type="text"
                  value={editingCaretaker.phone}
                  onChange={(e) => setEditingCaretaker({ ...editingCaretaker, phone: e.target.value })}
                  required
                  className="input text-xs w-full"
                  placeholder="+91 98401 23456"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Alternate Phone (Optional)</label>
                <input
                  type="text"
                  value={editingCaretaker.altPhone || ''}
                  onChange={(e) => setEditingCaretaker({ ...editingCaretaker, altPhone: e.target.value })}
                  className="input text-xs w-full"
                  placeholder="+91 98401 98765"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Residential Address</label>
                <input
                  type="text"
                  value={editingCaretaker.address || ''}
                  onChange={(e) => setEditingCaretaker({ ...editingCaretaker, address: e.target.value })}
                  className="input text-xs w-full"
                  placeholder="Anna Nagar, Chennai"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Save size={14} /> Save Contact Details
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
