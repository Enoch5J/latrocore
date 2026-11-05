import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/ui';
import {
  Stethoscope, Star, Clock, Phone, Video, CalendarDays, Search,
  ShieldCheck, Pill, ArrowRight, CheckCircle, User, MapPin, Plus, Sparkles, Filter
} from 'lucide-react';
import doctorImg from '../../assets/images/doctor.png';
import pharmacistImg from '../../assets/images/pharmacist.png';
import { addAppointment } from '../../services/dataService';

export default function Doctors() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    type: 'Comprehensive Review',
    date: '',
    time: '10:30',
    mode: 'Tele-Consult HD Video',
    notes: '',
  });

  // Pull any registered users from database/data context
  const allUsers = useMemo(() => {
    if (!data?.users) return [];
    if (Array.isArray(data.users)) return data.users;
    return Object.values(data.users);
  }, [data?.users]);

  const assignedPharmacist = allUsers.find(u => u.role === 'pharmacist' || u.id === currentUser?.assignedPharmacist);
  const assignedDoctor = allUsers.find(u => u.role === 'doctor' || u.id === currentUser?.assignedDoctor);

  // Apollo-style roster with PharmD highlighted
  const specialists = useMemo(() => [
    {
      id: assignedPharmacist?.id || 'doc-pharm-lead',
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
      languages: 'English, Hindi, Tamil, Telugu',
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
        'Your designated PharmD doctor oversees your entire antidiabetic and cardiovascular pharmacotherapy regimen. Acts as the primary safety gatekeeper, screening for adverse side effects, preventing medication conflicts, and guiding dosage titrations.',
    },
    {
      id: assignedDoctor?.id || 'doc-diab-lead',
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
      tagline: 'Glycemic Optimization & Precision Insulin Therapy',
      focusAreas: ['HbA1c Reduction', 'CGM Analytics', 'Insulin Regimen Titration', 'Complication Prevention'],
      description: 'Specializes in personalized glycemic targets, continuous glucose monitoring analysis, and comprehensive treatment protocols.',
    },
    {
      id: 'doc-endo-1',
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
      focusAreas: ['Severe Insulin Resistance', 'Thyroid Dysfunction', 'Beta-Cell Preservation', 'PCOS & Metabolic Care'],
      description: 'Addresses complex neuroendocrine feedback, hormonal regulation, and multi-glandular autoimmune manifestations.',
    },
    {
      id: 'doc-cardio-1',
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
      focusAreas: ['Diabetic Cardiopathy', 'Hypertension & Lipid Target Optimization', 'Statin Safety', 'CAC Score Review'],
      description: 'Provides proactive protection against micro- and macro-vascular cardiovascular complications for diabetic patients.',
    },
    {
      id: 'doc-nutri-1',
      name: 'S. Meenakshi',
      degrees: 'M.Sc (Clinical Nutrition), RD, CDE',
      title: 'Lead Clinical Nutritionist & Diabetes Educator',
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
      focusAreas: ['Low-GI Diet Planning', 'Carbohydrate Counting', 'Meal Timing Optimization', 'Weight Loss Trajectory'],
      description: 'Designs customized meal protocols that eliminate post-prandial glycemic spikes while respecting cultural preferences.',
    },
    {
      id: 'doc-nephro-1',
      name: 'Dr. Rajesh Nair',
      degrees: 'MBBS, MD, DM (Nephrology)',
      title: 'Senior Consultant Nephrologist',
      specialty: 'Nephrologist',
      category: 'nephrology',
      highlight: false,
      role: 'doctor',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
      experience: '15+ Years Clinical Exp',
      rating: '4.91',
      reviewsCount: 290,
      hospital: 'Apollo Kidney Center',
      languages: 'English, Malayalam, Hindi',
      availableSlot: 'Friday, 11:30 AM',
      tagline: 'Diabetic Nephropathy & Renal Preservation',
      focusAreas: ['Microalbuminuria Management', 'eGFR Trend Stabilization', 'RAAS Blockade Guidance', 'Electrolyte Balance'],
      description: 'Ensures long-term kidney protection and reviews renal safety thresholds for all antidiabetic medications.',
    },
  ], [assignedPharmacist, assignedDoctor, currentUser]);

  const pharmLeader = useMemo(() => specialists.find(s => s.highlight), [specialists]);
  const otherSpecialists = useMemo(() => specialists.filter(s => !s.highlight), [specialists]);

  // Filtered specialists
  const filteredSpecialists = useMemo(() => {
    return otherSpecialists.filter(doc => {
      const matchSpecialty = selectedSpecialty === 'all' || doc.category === selectedSpecialty;
      const matchSearch = !search ||
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(search.toLowerCase()) ||
        doc.focusAreas.some(f => f.toLowerCase().includes(search.toLowerCase())) ||
        doc.tagline.toLowerCase().includes(search.toLowerCase());
      return matchSpecialty && matchSearch;
    });
  }, [otherSpecialists, selectedSpecialty, search]);

  const handleStartBooking = (doc) => {
    setSelectedDoc(doc);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setBookingForm({
      type: doc.role === 'pharmacist' ? 'Medication Therapy Review' : 'Follow-up Consultation',
      date: tomorrow,
      time: '10:30',
      mode: 'Tele-Consult HD Video',
      notes: '',
    });
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoc) return;
    const dateStr = bookingForm.date && bookingForm.time
      ? `${bookingForm.date}T${bookingForm.time}:00`
      : new Date(Date.now() + 86400000).toISOString();

    const newApt = {
      patientId: currentUser?.id || 'pat-001',
      doctorId: selectedDoc.role === 'doctor' ? selectedDoc.id : undefined,
      pharmacistId: selectedDoc.role === 'pharmacist' ? selectedDoc.id : undefined,
      type: `${selectedDoc.specialty}: ${bookingForm.type}`,
      date: new Date(dateStr).toISOString(),
      duration: 30,
      location: bookingForm.mode,
      notes: bookingForm.notes || `Scheduled appointment with ${selectedDoc.name}`,
      status: 'scheduled',
      doctorName: selectedDoc.name,
      doctorTitle: selectedDoc.title,
    };

    await addAppointment(newApt);
    refreshData();
    setBookingModalOpen(false);
    addToast({
      type: 'success',
      message: `Appointment with ${selectedDoc.name} (${selectedDoc.specialty}) scheduled!`,
    });
    navigate('/appointments');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest text-[#046A38] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Apollo-Style Care Roster
            </span>
            <span className="text-xs font-bold text-slate-500">• 100% Verified Clinicians</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            Doctors & Specialist Directory
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1 max-w-2xl">
            Multidisciplinary medical network for diabetes management. Consult our clinical pharmacists (PharmD), diabetologists, endocrinologists, and cardiologists.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => navigate('/appointments')}
            className="btn-outline btn-sm font-bold flex items-center gap-1.5 bg-white text-slate-800"
          >
            <CalendarDays size={16} className="text-blue-700" />
            <span>My Appointments</span>
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── PROMINENT FEATURED HERO: CLINICAL PHARMACIST (PharmD) ── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="card border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-teal-50/70 to-white shadow-lg ring-2 ring-emerald-500/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-300/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="p-5 sm:p-7 relative">
          {/* Header pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-emerald-700 text-white px-3.5 py-1 rounded-full shadow-sm">
                <Star size={13} className="fill-white" />
                Featured Primary Care Partner
              </span>
              <span className="text-xs font-black bg-white text-emerald-800 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
                Clinical Pharmacist (PharmD)
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-900 bg-emerald-100/80 px-3 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-700" />
              <span>Apollo Hospital Clinical Partner</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Avatar & Key Details */}
            <div className="lg:col-span-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-3 border-emerald-600 bg-white shadow-md">
                  <img
                    src={pharmacistImg}
                    alt={pharmLeader.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-600 animate-pulse" title="Online for Consultations" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    {pharmLeader.name}
                  </h2>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                    {pharmLeader.degrees}
                  </span>
                </div>
                <p className="text-sm font-black text-emerald-800 mt-1">
                  {pharmLeader.title}
                </p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {pharmLeader.hospital} • {pharmLeader.languages}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star size={14} className="fill-amber-500 text-amber-500" />
                    <span>{pharmLeader.rating} ({pharmLeader.reviewsCount} reviews)</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-800 font-extrabold">{pharmLeader.experience}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock size={12} className="text-emerald-700" />
                    <span>Next Slot: {pharmLeader.availableSlot}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="lg:col-span-4 flex flex-col gap-2.5">
              <button
                onClick={() => handleStartBooking(pharmLeader)}
                className="btn-primary btn-md bg-emerald-700 hover:bg-emerald-800 border-none font-extrabold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Phone size={16} />
                <span>Book PharmD Consultation</span>
              </button>
              <button
                onClick={() => navigate('/patient/medications')}
                className="btn-outline btn-md bg-white hover:bg-emerald-50 text-emerald-950 border-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Pill size={15} className="text-emerald-700" />
                <span>Review Medications & Adverse Risks</span>
              </button>
            </div>
          </div>

          {/* Description & Clinical Specializations */}
          <div className="mt-5 pt-4 border-t border-emerald-200/90 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 p-3 rounded-xl bg-white/95 border border-emerald-200">
              <p className="text-xs font-extrabold text-emerald-950 mb-1">
                Why your PharmD leads medication management:
              </p>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {pharmLeader.description}
              </p>
            </div>
            <div className="md:col-span-6 flex flex-col justify-center">
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Core Clinical Competencies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {pharmLeader.focusAreas.map((area, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-200"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── SEARCH & FILTER CONTROLS ── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="card p-4 border border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search specialists by name, specialty, or condition (e.g. Diabetologist, Insulin, Heart)..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-950 placeholder:text-slate-500 focus:bg-white focus:border-[#046A38] focus:outline-none transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
            {[
              { id: 'all', label: 'All Specialists' },
              { id: 'diabetology', label: 'Diabetologists' },
              { id: 'endocrinology', label: 'Endocrinologists' },
              { id: 'cardiology', label: 'Cardiologists' },
              { id: 'nutrition', label: 'Nutrition & Diet' },
              { id: 'nephrology', label: 'Nephrologists' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedSpecialty(cat.id)}
                className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  selectedSpecialty === cat.id
                    ? 'bg-[#046A38] text-white border-[#046A38] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── SPECIALISTS GRID (ALONGSIDE) ── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Stethoscope size={20} className="text-[#046A38]" />
            <span>Consulting Physicians & Specialists ({filteredSpecialists.length})</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">
            Apollo Hospitals & Diabetes Clinics Network
          </span>
        </div>

        {filteredSpecialists.length === 0 ? (
          <div className="card p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
            <Stethoscope size={32} className="mx-auto text-slate-400 mb-2" />
            <h3 className="font-extrabold text-sm text-slate-900">No specialists found</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or choosing another specialty category.</p>
            <button
              onClick={() => { setSearch(''); setSelectedSpecialty('all'); }}
              className="btn-outline btn-xs font-bold mt-3"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSpecialists.map((doc) => (
              <div
                key={doc.id}
                className="card border-2 border-slate-200 hover:border-[#046A38] bg-white rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  {/* Top Doctor Row */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 shadow-2xs">
                      {typeof doc.avatar === 'string' && doc.avatar.startsWith('http') ? (
                        <img src={doc.avatar} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <img src={doctorImg} alt={doc.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 block w-fit mb-1">
                        {doc.specialty}
                      </span>
                      <h3 className="font-black text-base text-slate-950 truncate group-hover:text-[#046A38]">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-bold text-slate-600 truncate">
                        {doc.degrees}
                      </p>
                    </div>
                  </div>

                  {/* Rating, Experience, Hospital */}
                  <div className="space-y-1.5 mb-3 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold">{doc.experience}</span>
                      <span className="flex items-center gap-1 text-amber-600 font-bold">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        <span>{doc.rating} ({doc.reviewsCount})</span>
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 truncate">
                      {doc.hospital}
                    </p>
                    <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed pt-1">
                      {doc.description}
                    </p>
                  </div>

                  {/* Focus Badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {doc.focusAreas.slice(0, 3).map((f, i) => (
                      <span key={i} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Timing & Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 block leading-tight">Available Slot</span>
                    <span className="text-xs font-black text-slate-900 truncate block">
                      {doc.availableSlot}
                    </span>
                  </div>
                  <button
                    onClick={() => handleStartBooking(doc)}
                    className="btn-primary btn-sm bg-[#046A38] hover:bg-[#03512b] border-none font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <CalendarDays size={14} />
                    <span>Book Visit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ── BOOKING MODAL ── */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        title={selectedDoc ? `Book with ${selectedDoc.name}` : 'Schedule Consultation'}
        size="md"
      >
        {selectedDoc && (
          <div className="space-y-4">
            {/* Doctor mini header */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 bg-white shrink-0">
                <img
                  src={selectedDoc.role === 'pharmacist' ? pharmacistImg : (typeof selectedDoc.avatar === 'string' && selectedDoc.avatar.startsWith('http') ? selectedDoc.avatar : doctorImg)}
                  alt={selectedDoc.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-sm text-slate-950 truncate">{selectedDoc.name}</h4>
                <p className="text-xs font-bold text-emerald-800">{selectedDoc.specialty} • {selectedDoc.degrees}</p>
                <p className="text-[11px] text-slate-500">{selectedDoc.hospital}</p>
              </div>
            </div>

            {/* Form Fields */}
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
    </div>
  );
}

