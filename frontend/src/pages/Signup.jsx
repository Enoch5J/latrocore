import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import patientImg from '../assets/images/patient.png';
import doctorImg from '../assets/images/doctor.png';
import pharmacistImg from '../assets/images/pharmacist.png';
import latrocoreLogo from '../assets/Latrocore Medical Monogram Logo.png';
import PhoneInputWithCountry from '../components/common/PhoneInputWithCountry';
import {
  ShieldCheck,
  User,
  Stethoscope,
  Pill,
  Mail,
  Eye,
  EyeOff,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Copy,
  Clipboard,
  Ruler,
  Weight as WeightIcon,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

const WORKSTATION_OPTIONS = [
  {
    role: 'patient',
    title: 'Patient Portal',
    badge: 'Personalized Care',
    image: patientImg,
    tagline: 'Continuous Diabetes Telemetry',
    desc: 'Monitor continuous glucose levels, track daily medicines, and get personalized diet care.',
    features: [
      'Longitudinal CGM telemetry & Time-in-Range tracking',
      'Smart insulin-to-carb ratios & dose history',
      'Direct collaboration with endocrinologist'
    ],
    cta: 'Register as Patient'
  },
  {
    role: 'doctor',
    title: 'Doctor Station',
    badge: 'Clinical Practice',
    image: doctorImg,
    tagline: 'Cohort Surveillance & Titration',
    desc: 'Surveil cohort glycemic trajectories, review patient histories, and issue digital prescriptions.',
    features: [
      'Cohort trajectory monitoring & glycemic trends',
      'Digital e-prescriptions & care protocol titration',
      'Real-time hypoglycemia deviation alerts'
    ],
    cta: 'Register as Doctor'
  },
  {
    role: 'pharmacist',
    title: 'Pharmacist Station',
    badge: 'Medication Safety',
    image: pharmacistImg,
    tagline: 'Medication Reconciliation & Dispensing',
    desc: 'Reconcile medications, scan drug interactions, and adjust therapeutic dosages.',
    features: [
      'Automated drug-drug interaction analysis',
      'Renal & hepatic dosage safety verification',
      'Electronic prescription verification & dispensing'
    ],
    cta: 'Register as Pharmacist'
  }
];

const COMMON_CONDITIONS = [
  'Type 2 Diabetes',
  'Type 1 Diabetes',
  'Prediabetes',
  'Gestational Diabetes',
  'Hypertension (High BP)',
  'Dyslipidemia (Cholesterol)',
  'Chronic Kidney Disease',
  'None',
  'Prefer not to disclose'
];

const DOCTOR_SPECIALIZATIONS = [
  'Diabetology',
  'Endocrinology',
  'Internal Medicine',
  'General Physician',
  'Cardiology',
  'Nephrology',
  'Family Medicine',
  'Other'
];

const PHARMACIST_SPECIALIZATIONS = [
  'Clinical Pharmacist',
  'Medication Reconciliation Specialist',
  'Hospital & Health-System Pharmacy',
  'Community / Retail Pharmacy',
  'Diabetic Care Specialist (CDCES)',
  'Ambulatory Care Pharmacist',
  'Other'
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/webp',
  'image/jpeg',
  'image/jpg',
  'image/png'
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const { setAuthUser } = useAuth();
  const { addToast } = useApp() || {};

  // Role selection: If roleParam is provided, skip card picker; otherwise show 3 workstation cards first
  const [showRoleSelection, setShowRoleSelection] = useState(!roleParam);
  const [accountType, setAccountType] = useState(
    roleParam === 'doctor'
      ? 'doctor'
      : roleParam === 'pharmacist'
      ? 'pharmacist'
      : 'patient'
  );

  // ── Step Navigation (1: Identity & OTP, 2: Clinical Details & Password) ──
  const [currentStep, setCurrentStep] = useState(1);

  // ── Common Form State (Section 1) ──────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // ── Patient Metrics in Section 1 (Height in cm & inches, Weight) ───
  const [age, setAge] = useState('');
  const [height, setHeight] = useState(''); // in cm
  const [heightInches, setHeightInches] = useState(''); // in inches
  const [weight, setWeight] = useState(''); // in kg

  const handleHeightCmChange = (val) => {
    setHeight(val);
    if (!val || isNaN(val)) {
      setHeightInches('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setHeightInches((num / 2.54).toFixed(1));
    } else {
      setHeightInches('');
    }
  };

  const handleHeightInchesChange = (val) => {
    setHeightInches(val);
    if (!val || isNaN(val)) {
      setHeight('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setHeight((num * 2.54).toFixed(1));
    } else {
      setHeight('');
    }
  };

  // ── OTP State (Section 1) ──────────────────────────────────────────
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState('');

  // ── Password State (Section 2) ─────────────────────────────────────
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ── Patient Specific State (Section 2) ─────────────────────────────
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [showOtherCondition, setShowOtherCondition] = useState(false);
  const [isConditionsDropdownOpen, setIsConditionsDropdownOpen] = useState(false);
  const conditionsDropdownRef = useRef(null);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState(null);
  const [uploadedFileMeta, setUploadedFileMeta] = useState(null);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [consentHealthData, setConsentHealthData] = useState(false);

  // ── Doctor / Pharmacist Specific State (Section 2) ─────────────────
  const [licenseNumber, setLicenseNumber] = useState('');
  const [council, setCouncil] = useState('');
  const [specialization, setSpecialization] = useState('Diabetology');
  const [otherSpecialization, setOtherSpecialization] = useState('');
  const [hospitalClinic, setHospitalClinic] = useState('');

  // ── Terms & Submit State ───────────────────────────────────────────
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // ── Success State ──────────────────────────────────────────────────
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  const otpInputRefs = useRef([]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Click outside to close conditions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (conditionsDropdownRef.current && !conditionsDropdownRef.current.contains(e.target)) {
        setIsConditionsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isValidEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
  };

  // ── Select Role Handler ───────────────────────────────────────────
  const handleSelectRole = (role) => {
    setAccountType(role);
    setShowRoleSelection(false);
    setSearchParams({ role });
    setFormError('');
    if (role === 'doctor') {
      setSpecialization('Diabetology');
    } else if (role === 'pharmacist') {
      setSpecialization('Clinical Pharmacist');
    }
  };

  // ── Country-Aware Mobile Validation ────────────────────────────────
  const validatePhone = (code, val) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      return 'Mobile number is required.';
    }
    if (code === '+91') {
      if (!/^[5-9]\d{9}$/.test(digits)) {
        return 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).';
      }
    } else if (code === '+1') {
      if (digits.length !== 10) {
        return 'US/Canada phone number must be 10 digits.';
      }
    } else if (code === '+44') {
      if (digits.length < 10 || digits.length > 11) {
        return 'UK phone number must be 10 or 11 digits.';
      }
    } else if (code === '+971') {
      if (digits.length !== 9) {
        return 'UAE phone number must be 9 digits (e.g. 501234567).';
      }
    } else if (code === '+65') {
      if (digits.length !== 8) {
        return 'Singapore phone number must be 8 digits.';
      }
    } else if (code === '+61') {
      if (digits.length !== 9) {
        return 'Australia phone number must be 9 digits.';
      }
    } else if (code === '+49') {
      if (digits.length < 10 || digits.length > 11) {
        return 'German phone number must be 10 or 11 digits.';
      }
    } else {
      if (digits.length < 7 || digits.length > 15) {
        return 'Phone number must be between 7 and 15 digits.';
      }
    }
    return '';
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhone(val);
    if (phoneError) {
      setPhoneError(validatePhone(countryCode, val));
    }
  };

  // Changing email resets OTP verification state immediately
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (isEmailVerified || otpSent) {
      setIsEmailVerified(false);
      setVerificationToken('');
      setOtpSent(false);
      setOtpCode(['', '', '', '', '', '']);
      setOtpError('');
      setOtpSuccessMessage('');
      setDevOtpCode('');
    }
  };

  // ── Send OTP ───────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!isValidEmail(email)) {
      setOtpError('Please enter a valid email address first.');
      return;
    }
    setSendingOtp(true);
    setOtpError('');
    setOtpSuccessMessage('');

    try {
      const purpose =
        accountType === 'patient'
          ? 'patient_signup'
          : accountType === 'doctor'
          ? 'doctor_signup'
          : 'pharmacist_signup';

      const res = await api.sendOtp(email.trim(), purpose);
      setOtpSent(true);
      setCooldown(res?.cooldownSeconds || 60);

      if (res?.devOtp) {
        setDevOtpCode(res.devOtp);
      }
      setOtpSuccessMessage(`Code sent to ${email.trim()}`);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setOtpError(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setSendingOtp(false);
    }
  };

  // ── OTP Inputs & Paste ─────────────────────────────────────────────
  const applyPastedCode = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return false;

    const newOtp = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtpCode(newOtp);
    setOtpError('');

    const nextIndex = Math.min(digits.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
    return true;
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData?.getData('text') || '';
    applyPastedCode(pasted);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const success = applyPastedCode(text);
        if (!success) {
          setOtpError('Clipboard does not contain a numeric code.');
        }
      } else {
        otpInputRefs.current[0]?.focus();
      }
    } catch {
      // Permission denied or browser restriction - focus box 0 for Ctrl+V
      otpInputRefs.current[0]?.focus();
      setOtpError('Clipboard access blocked. Please press Ctrl+V inside the box.');
    }
  };

  const handleOtpDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 1) {
      applyPastedCode(cleaned);
      return;
    }

    const newOtp = [...otpCode];
    newOtp[index] = cleaned.slice(-1);
    setOtpCode(newOtp);

    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ── Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');

    try {
      const purpose =
        accountType === 'patient'
          ? 'patient_signup'
          : accountType === 'doctor'
          ? 'doctor_signup'
          : 'pharmacist_signup';

      const res = await api.verifyOtp(email.trim(), code, purpose);
      if (res?.verificationToken) {
        setVerificationToken(res.verificationToken);
        setIsEmailVerified(true);
        setOtpError('');
        setOtpSuccessMessage('Email verified successfully!');
        setOtpSent(false);
        if (typeof addToast === 'function') {
          addToast('Email verified successfully! You can now proceed to the next step.', 'success');
        }
      } else {
        setOtpError('Verification failed. Invalid response from server.');
      }
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired verification code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── Step 1 Validation & Proceed to Step 2 ──────────────────────────
  const handleProceedToStep2 = () => {
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (accountType === 'patient') {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
        setFormError('Age must be a valid number between 0 and 120.');
        return;
      }
    }

    const phoneValidation = validatePhone(countryCode, phone);
    if (phoneValidation) {
      setPhoneError(phoneValidation);
      setFormError(phoneValidation);
      return;
    }

    if (!isValidEmail(email)) {
      setFormError('Please provide a valid email address.');
      return;
    }

    if (!isEmailVerified || !verificationToken) {
      setFormError('Please verify your email address via the 6-digit OTP code before proceeding.');
      return;
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Patient Conditions Toggle ──────────────────────────────────────
  const toggleCondition = (cond) => {
    if (cond === 'None' || cond === 'Prefer not to disclose') {
      setSelectedConditions([cond]);
      setShowOtherCondition(false);
      setOtherCondition('');
      return;
    }

    let next = selectedConditions.filter((c) => c !== 'None' && c !== 'Prefer not to disclose');

    if (next.includes(cond)) {
      next = next.filter((c) => c !== cond);
    } else {
      next.push(cond);
    }
    setSelectedConditions(next);
  };

  const toggleOtherCondition = () => {
    const nextVal = !showOtherCondition;
    setShowOtherCondition(nextVal);
    if (!nextVal) {
      setOtherCondition('');
    } else {
      setSelectedConditions((prev) =>
        prev.filter((c) => c !== 'None' && c !== 'Prefer not to disclose')
      );
    }
  };

  // ── Prescription Upload Handling ───────────────────────────────────
  const handlePrescriptionSelect = async (file) => {
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFormError('Prescription file must be a PDF, WEBP, PNG, JPG, or JPEG.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFormError('Prescription file size exceeds the 10 MB limit.');
      return;
    }

    setPrescriptionFile(file);
    setFormError('');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPrescriptionPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPrescriptionPreview(null);
    }

    setUploadingPrescription(true);
    try {
      const uploadRes = await api.uploadPrescription(file);
      setUploadedFileMeta(uploadRes);
    } catch (err) {
      setFormError(err.message || 'Failed to upload prescription. You can continue and upload later.');
    } finally {
      setUploadingPrescription(false);
    }
  };

  const removePrescription = () => {
    setPrescriptionFile(null);
    setPrescriptionPreview(null);
    setUploadedFileMeta(null);
  };

  // ── Submit Registration ───────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setFormError('');

    if (!isEmailVerified || !verificationToken) {
      setFormError('Email verification is required. Please return to Step 1.');
      return;
    }

    if (password.length < 12 || password.length > 128) {
      setFormError('Password must be between 12 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Password and confirm password do not match.');
      return;
    }

    if (!acceptTerms) {
      setFormError('You must agree to the Terms of Service and Privacy Policy to proceed.');
      return;
    }

    if (accountType === 'patient') {
      if (!prescriptionFile) {
        setFormError('Medical prescription is required. Please upload your prescription.');
        return;
      }
      if (uploadingPrescription) {
        setFormError('Please wait for your prescription upload to finish.');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (accountType === 'patient') {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          countryCode,
          age: parseInt(age, 10),
          height: height
            ? parseFloat(height)
            : heightInches
            ? parseFloat((parseFloat(heightInches) * 2.54).toFixed(1))
            : null,
          weight: weight ? parseFloat(weight) : null,
          conditions: selectedConditions,
          otherCondition: otherCondition.trim() || null,
          prescriptionFileUrl: uploadedFileMeta?.fileUrl || null,
          prescriptionFileName: uploadedFileMeta?.fileName || null,
          password,
          confirmPassword,
          verificationToken,
          consentHealthData: true,
          acceptTerms
        };

        const res = await api.registerPatient(payload);
        setAuthUser(res.user, res.accessToken);
        setRegistrationSuccess({
          type: 'patient',
          displayId: res.user.displayId,
          name: res.user.name,
          email: res.user.email
        });
      } else if (accountType === 'doctor') {
        if (!licenseNumber.trim()) {
          setFormError('Medical registration / license number is required.');
          setSubmitting(false);
          return;
        }

        if (!council.trim()) {
          setFormError('Medical council or licensing authority is required.');
          setSubmitting(false);
          return;
        }

        const finalSpec = specialization === 'Other' ? otherSpecialization.trim() : specialization;
        if (!finalSpec) {
          setFormError('Please specify your medical specialization.');
          setSubmitting(false);
          return;
        }

        const payload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          countryCode,
          licenseNumber: licenseNumber.trim(),
          council: council.trim(),
          specialization: finalSpec,
          hospitalClinic: hospitalClinic.trim() || null,
          password,
          confirmPassword,
          verificationToken,
          acceptTerms
        };

        const res = await api.registerDoctor(payload);
        setAuthUser(res.user, res.accessToken);
        setRegistrationSuccess({
          type: 'doctor',
          displayId: res.user.displayId,
          name: res.user.name,
          email: res.user.email,
          status: 'pending'
        });
      } else {
        // Pharmacist Registration
        if (!licenseNumber.trim()) {
          setFormError('Pharmacy registration / license number is required.');
          setSubmitting(false);
          return;
        }

        if (!council.trim()) {
          setFormError('State Pharmacy Council or licensing authority is required.');
          setSubmitting(false);
          return;
        }

        const finalSpec = specialization === 'Other' ? otherSpecialization.trim() : specialization;
        if (!finalSpec) {
          setFormError('Please specify your pharmacy practice area.');
          setSubmitting(false);
          return;
        }

        const payload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          countryCode,
          licenseNumber: licenseNumber.trim(),
          council: council.trim(),
          specialization: finalSpec,
          pharmacyName: hospitalClinic.trim() || null,
          password,
          confirmPassword,
          verificationToken,
          acceptTerms
        };

        const res = await api.registerPharmacist(payload);
        setAuthUser(res.user, res.accessToken);
        setRegistrationSuccess({
          type: 'pharmacist',
          displayId: res.user.displayId,
          name: res.user.name,
          email: res.user.email,
          status: 'pending'
        });
      }
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please review your input.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ── Success Screen ─────────────────────────────────────────────────
  if (registrationSuccess) {
    const isDoc = registrationSuccess.type === 'doctor';
    const isPharm = registrationSuccess.type === 'pharmacist';
    return (
      <div className="min-h-screen bg-[#FAF6EF] text-[#112228] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 font-sans">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl shadow-stone-900/5 border border-[#E8DCC8] p-8 sm:p-12 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F5EE] border-2 border-[#046A38] text-[#046A38] flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#046A38] border border-emerald-200 mb-3">
            Registration Complete
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#112228] tracking-tight mb-2">
            Welcome to LATROCORE, {registrationSuccess.name}!
          </h2>

          <div className="my-6 p-5 rounded-2xl bg-[#FAF6EF] border border-[#E8DCC8] text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {isDoc
                  ? 'Assigned Doctor Account ID'
                  : isPharm
                  ? 'Assigned Pharmacist Account ID'
                  : 'Assigned Patient Health ID'}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(registrationSuccess.displayId)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#046A38] hover:text-[#03542C] cursor-pointer"
              >
                {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-[#046A38] tracking-wide">
              {registrationSuccess.displayId}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Please save this ID. It serves as your permanent public health identity within LATROCORE.
            </p>
          </div>

          <div className="text-left mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>
                  {isDoc
                    ? 'Doctor Credential Verification Queued'
                    : isPharm
                    ? 'Pharmacy Practice License Verification Queued'
                    : 'Patient Identity & Enrollment Verification Queued'}
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                As required by clinical governance standards, all accounts must receive verified approval from the authorized Medical Board Administration before clinical workstation tools and medical records can be accessed.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/waiting-approval')}
                className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-[#046A38] hover:bg-[#03542C] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Approval Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="py-3 px-6 rounded-xl font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-all cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF] text-[#112228] flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#046A38] selection:text-white">
      {/* Top Navigation Bar */}
      <div className={`w-full ${showRoleSelection ? 'max-w-md md:max-w-5xl' : 'max-w-lg'} mx-auto flex items-center justify-between gap-3 py-2 mb-2 shrink-0`}>
        <button
          type="button"
          onClick={() => {
            if (!showRoleSelection && !roleParam) {
              setShowRoleSelection(true);
            } else {
              navigate('/');
            }
          }}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold text-black hover:text-[#046A38] bg-white hover:bg-stone-50 border border-[#E8DCC8] shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{!showRoleSelection && !roleParam ? 'Change Workstation' : 'Back to Home'}</span>
        </button>

        <div className="text-xs font-semibold text-black/80 text-right">
          <span className="hidden sm:inline">Already have an account? </span>
          <Link
            to="/login"
            className="font-extrabold text-[#046A38] hover:text-[#03542C] hover:underline transition-colors ml-1"
          >
            Sign in here
          </Link>
        </div>
      </div>

      {/* ── Centered LATROCORE Brand Header (matches Login page width and brand) ── */}
      <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center my-2 sm:my-3">
        <Link
          to="/"
          className="inline-flex flex-col items-center justify-center group focus:outline-none"
        >
          <img
            src={latrocoreLogo}
            alt="LATROCORE Medical Monogram Logo"
            className="h-16 sm:h-22 md:h-24 w-auto object-contain mix-blend-multiply group-hover:scale-105 transition-transform drop-shadow-xs"
          />
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VIEW 1: WORKSTATION / ROLE SELECTION (COMPACT & RESPONSIVE ON MOBILE)
         ══════════════════════════════════════════════════════════════════ */}
      {showRoleSelection ? (
        <div className="w-full max-w-md md:max-w-5xl mx-auto my-auto animate-fade-in px-2 sm:px-4 md:px-0">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8 md:mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F5EE] border border-[#A8D7BD] text-[11px] sm:text-xs font-bold text-[#046A38] mb-2 sm:mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-[#046A38]" />
              <span>LATROCORE Clinical Gateway</span>
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#112228] tracking-tight">
              Select Your Workstation
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm mt-1.5 max-w-sm sm:max-w-md mx-auto">
              Choose whether you are enrolling as a Patient, Doctor, or Pharmacist to access your customized care portal.
            </p>
          </div>

          {/* 3 Workstation Cards (bounded max-width on mobile/tablet, 3-col on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 justify-items-center">
            {WORKSTATION_OPTIONS.map((station) => (
              <div
                key={station.role}
                onClick={() => handleSelectRole(station.role)}
                className="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 border border-[#E8DCC8] hover:border-[#046A38] shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between items-center text-center relative overflow-hidden w-full max-w-[340px] sm:max-w-[380px] md:max-w-none mx-auto"
              >
                <div className="w-full flex flex-col items-center">
                  {/* 3D Illustration */}
                  <div className="w-full aspect-square max-w-[130px] sm:max-w-[150px] md:max-w-[170px] mx-auto mb-3 sm:mb-4 flex items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-[#FAF6EF]/60 group-hover:bg-[#E8F5EE]/80 transition-colors">
                    <img
                      src={station.image}
                      alt={station.title}
                      className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#112228] mb-3 sm:mb-4 group-hover:text-[#046A38] transition-colors">
                    {station.title}
                  </h3>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={() => handleSelectRole(station.role)}
                  className="w-full py-2.5 sm:py-3 md:py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#046A38] group-hover:bg-[#03542C] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{station.cta}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 sm:mt-8 text-center text-[11px] sm:text-xs text-stone-500">
            Protected under LATROCORE Enterprise Healthcare Protocols. Compliant with HIPAA & GDPR.
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
            VIEW 2: REGISTRATION FORM (CLEAN, SPACIOUS, NO LEFT GREEN PANEL)
           ══════════════════════════════════════════════════════════════════ */
        <div className="w-full max-w-lg mx-auto my-auto bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-stone-900/5 border border-[#E8DCC8] p-4 sm:p-7 md:p-8 animate-fade-in">
          
          {/* Header Row: Title & Change Workstation link */}
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E8DCC8] gap-2.5 mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E8F5EE] border border-[#A8D7BD] flex items-center justify-center text-[#046A38] shadow-2xs shrink-0">
                {accountType === 'patient' ? (
                  <User className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#046A38]" />
                ) : accountType === 'doctor' ? (
                  <Stethoscope className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#046A38]" />
                ) : (
                  <Pill className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#046A38]" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-extrabold text-[#112228] tracking-tight truncate">
                  {accountType === 'patient'
                    ? 'Patient Registration'
                    : accountType === 'doctor'
                    ? 'Doctor Onboarding'
                    : 'Pharmacist Registration'}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRoleSelection(true)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-[#046A38] hover:text-[#03542C] bg-[#E8F5EE] hover:bg-[#d8eedf] border border-emerald-200 transition-all cursor-pointer shrink-0"
            >
              <span>Change</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Simple Clean 2-Step Indicator */}
          <div className="flex items-center justify-between mb-6 px-1">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2.5 cursor-pointer focus:outline-none group text-left"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                  isEmailVerified
                    ? 'bg-[#046A38] text-white shadow-2xs'
                    : currentStep === 1
                    ? 'bg-[#046A38] text-white ring-2 ring-[#046A38]/20 shadow-2xs'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {isEmailVerified ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <span
                className={`text-sm font-semibold transition-colors ${
                  currentStep === 1
                    ? 'text-[#046A38] font-bold'
                    : isEmailVerified
                    ? 'text-stone-700'
                    : 'text-stone-500'
                }`}
              >
                Identity &amp; OTP
              </span>
            </button>

            {/* Connecting progress bar */}
            <div className="flex-1 mx-3 sm:mx-4 h-0.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-[#046A38] transition-all duration-300 ${
                  currentStep === 2 || isEmailVerified ? 'w-full' : 'w-0'
                }`}
              />
            </div>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => {
                if (isEmailVerified) setCurrentStep(2);
              }}
              disabled={!isEmailVerified}
              className={`flex items-center gap-2.5 focus:outline-none text-left ${
                !isEmailVerified ? 'cursor-not-allowed opacity-50' : 'cursor-pointer group'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                  currentStep === 2
                    ? 'bg-[#046A38] text-white ring-2 ring-[#046A38]/20 shadow-2xs'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                2
              </div>
              <span
                className={`text-sm font-semibold transition-colors ${
                  currentStep === 2 ? 'text-[#046A38] font-bold' : 'text-stone-500'
                }`}
              >
                {accountType === 'patient' ? 'Profile & Password' : 'Credentials'}
              </span>
            </button>
          </div>

          {/* Form-level Error Banner */}
          {formError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-[#E34222] text-xs sm:text-sm flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{formError}</div>
              <button
                type="button"
                onClick={() => setFormError('')}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 1: Identity, Physical Metrics & Email Verification
             ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* ── ROW 1: Full Name (Row 1) ── */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    accountType === 'doctor'
                      ? 'Dr. Sarah Jenkins'
                      : accountType === 'pharmacist'
                      ? 'Pharm. Rajesh Kumar'
                      : 'Priya Sharma'
                  }
                  className="w-full px-3.5 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                />
              </div>

              {/* ── ROW 2: Mobile Number with Country Picker (Row 2) ── */}
              <div>
                <PhoneInputWithCountry
                  value={phone}
                  onChange={handlePhoneChange}
                  countryCode={countryCode}
                  onCountryCodeChange={(newCode) => {
                    setCountryCode(newCode);
                    if (phone) {
                      setPhoneError(validatePhone(newCode, phone));
                    }
                  }}
                  error={phoneError}
                  onBlur={() => setPhoneError(validatePhone(countryCode, phone))}
                  required
                  label="Mobile Number"
                />
              </div>

              {/* Patient-Only Biometrics: Row 1 (Age & Weight), Row 2 (Height in cm & inches) */}
              {accountType === 'patient' && (
                <div className="space-y-3">
                  {/* Row 1: Age and Weight */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5 truncate">
                        Age (0–120) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 42"
                        className="w-full px-3.5 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5 truncate">
                        <WeightIcon className="w-4 h-4 text-[#046A38] shrink-0" />
                        <span className="truncate">Weight (kg)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="2"
                        max="350"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 68.5"
                        className="w-full px-3.5 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>
                  </div>

                  {/* Row 2: Height in cm and Height in inches (two-way synced) */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5 truncate">
                        <Ruler className="w-4 h-4 text-[#046A38] shrink-0" />
                        <span className="truncate">Height (cm)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="260"
                        value={height}
                        onChange={(e) => handleHeightCmChange(e.target.value)}
                        placeholder="e.g. 172"
                        className="w-full px-3.5 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5 truncate">
                        <Ruler className="w-4 h-4 text-[#046A38] shrink-0" />
                        <span className="truncate">Height (inches)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="12"
                        max="102"
                        value={heightInches}
                        onChange={(e) => handleHeightInchesChange(e.target.value)}
                        placeholder="e.g. 67.7"
                        className="w-full px-3.5 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── ROW 2: Email Address & Verification (1 Row) ── */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-[#FAF6EF]/75 border border-[#E8DCC8] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#046A38]" />
                    <span>Email &amp; Verification</span>
                    <span className="text-red-500">*</span>
                  </span>

                  {isEmailVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#046A38] bg-emerald-100/90 px-2.5 py-0.5 rounded-full shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    disabled={isEmailVerified}
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="name@latrocore.com"
                    className="flex-1 px-3.5 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed transition-all min-w-0"
                  />
                  {!isEmailVerified && (
                    <button
                      type="button"
                      disabled={sendingOtp || cooldown > 0 || !isValidEmail(email)}
                      onClick={handleSendOtp}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#046A38] hover:bg-[#03542C] disabled:bg-stone-300 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {sendingOtp ? 'Sending...' : cooldown > 0 ? `Resend (${cooldown}s)` : otpSent ? 'Resend' : 'Send Code'}
                    </button>
                  )}
                </div>

                {!isEmailVerified && otpSuccessMessage && (
                  <p className="text-xs sm:text-sm text-[#046A38] font-medium flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#046A38]" />
                    <span className="truncate">{otpSuccessMessage}</span>
                  </p>
                )}

                {otpError && (
                  <p className="text-xs sm:text-sm text-[#E34222] font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{otpError}</span>
                  </p>
                )}

                {/* 6-Digit Verification Code Inputs */}
                {otpSent && !isEmailVerified && (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs sm:text-sm font-medium text-stone-700 truncate">
                        Enter 6-digit code:
                      </span>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handlePasteFromClipboard}
                          title="Paste 6-digit code from clipboard"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-[#046A38] hover:text-[#03542C] bg-[#E8F5EE] hover:bg-[#d8eedf] border border-emerald-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Clipboard className="w-3.5 h-3.5" />
                          <span>Paste Code</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2">
                      {otpCode.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="w-8.5 h-10 sm:w-10 sm:h-11 md:w-11 md:h-12 text-center text-base sm:text-lg font-mono font-bold rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] shadow-2xs"
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {devOtpCode ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOtpCode(devOtpCode.split(''));
                            setOtpError('');
                          }}
                          className="text-xs font-bold text-[#046A38] hover:text-[#03542C] bg-[#E8F5EE] px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                        >
                          Auto-fill Dev Code ({devOtpCode})
                        </button>
                      ) : (
                        <span className="text-xs text-stone-400">Max 5 attempts</span>
                      )}
                      <button
                        type="button"
                        disabled={verifyingOtp || otpCode.join('').length !== 6}
                        onClick={handleVerifyOtp}
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#046A38] hover:bg-[#03542C] disabled:bg-stone-300 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                      >
                        {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── SMALL NEXT BUTTON REVEALED AFTER OTP VERIFICATION ── */}
                {isEmailVerified && (
                  <div className="pt-2.5 border-t border-[#E8DCC8] flex items-center justify-between gap-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-sm text-[#046A38] font-bold">
                      <CheckCircle2 className="w-4 h-4 text-[#046A38]" />
                      <span>Email verified!</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleProceedToStep2}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#046A38] hover:bg-[#03542C] shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom State: Only shown if email is NOT yet verified */}
              {!isEmailVerified && (
                <div className="pt-1 text-center text-xs sm:text-sm text-stone-600 font-medium">
                  {otpSent ? (
                    <span className="text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 text-xs">
                      Enter your 6-digit OTP code and click <strong>Verify OTP</strong> to proceed.
                    </span>
                  ) : (
                    <span>
                      Enter your email above and click <strong>Send Code</strong> to receive your OTP.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 2: Clinical Details, Password & Consents
             ══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">

              {/* ── PATIENT SPECIFIC FIELDS ── */}
              {accountType === 'patient' && (
                <div className="space-y-6">
                  {/* Medical Conditions Selector Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                      Chronic / Medical Conditions <span className="text-red-500">*</span>
                    </label>

                    <div ref={conditionsDropdownRef} className="relative">
                      {/* Trigger Box */}
                      <div
                        onClick={() => setIsConditionsDropdownOpen((prev) => !prev)}
                        className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border bg-stone-50/40 hover:bg-stone-50/80 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isConditionsDropdownOpen
                            ? 'border-[#046A38] ring-3 ring-[#046A38]/15 bg-white'
                            : 'border-stone-200'
                        }`}
                      >
                        <div className="flex-1">
                          {selectedConditions.length === 0 && !showOtherCondition ? (
                            <span className="text-sm text-stone-400 select-none">
                              Select chronic or medical conditions...
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {selectedConditions.map((cond) => (
                                <span
                                  key={cond}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF6EF] text-[#046A38] border border-[#E8DCC8]"
                                >
                                  <span>{cond}</span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCondition(cond);
                                    }}
                                    className="hover:text-red-600 rounded-full cursor-pointer transition-colors p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </span>
                                </span>
                              ))}
                              {showOtherCondition && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAF6EF] text-[#046A38] border border-[#E8DCC8]">
                                  <span>Other{otherCondition ? `: ${otherCondition}` : ''}</span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleOtherCondition();
                                    }}
                                    className="hover:text-red-600 rounded-full cursor-pointer transition-colors p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <ChevronDown
                          className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                            isConditionsDropdownOpen ? 'rotate-180 text-[#046A38]' : ''
                          }`}
                        />
                      </div>

                      {/* Floating Dropdown Menu */}
                      {isConditionsDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#E8DCC8] shadow-xl z-30 max-h-64 overflow-y-auto p-1.5 space-y-1 animate-fade-in">
                          {COMMON_CONDITIONS.map((cond) => {
                            const isSelected = selectedConditions.includes(cond);
                            return (
                              <div
                                key={cond}
                                onClick={() => toggleCondition(cond)}
                                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#FAF6EF] text-[#046A38] font-bold'
                                    : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900 font-medium'
                                }`}
                              >
                                <span>{cond}</span>
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'bg-[#046A38] border-[#046A38] text-white'
                                      : 'border-stone-300 bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                                </div>
                              </div>
                            );
                          })}

                          <div
                            onClick={toggleOtherCondition}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                              showOtherCondition
                                ? 'bg-[#FAF6EF] text-[#046A38] font-bold'
                                : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900 font-medium'
                            }`}
                          >
                            <span>Other Condition...</span>
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                showOtherCondition
                                  ? 'bg-[#046A38] border-[#046A38] text-white'
                                  : 'border-stone-300 bg-white'
                              }`}
                            >
                              {showOtherCondition && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {showOtherCondition && (
                      <div className="mt-2.5 animate-fade-in">
                        <label className="block text-xs font-semibold text-stone-600 mb-1">
                          Specify Other Condition
                        </label>
                        <input
                          type="text"
                          value={otherCondition}
                          onChange={(e) => setOtherCondition(e.target.value)}
                          placeholder="e.g. Hashimoto's Thyroiditis, PCOS, Celiac Disease"
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Prescription Upload Dropzone */}
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#046A38] shrink-0" />
                      <span>Recent Medical Prescription</span>
                      <span className="text-red-500">*</span>
                    </label>

                    {!prescriptionFile ? (
                      <label className="border-2 border-dashed border-[#E8DCC8] hover:border-[#046A38] bg-[#FAF6EF]/30 hover:bg-[#FAF6EF]/70 rounded-xl py-4 sm:py-5 px-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group shadow-2xs hover:shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#E8DCC8] flex items-center justify-center text-[#046A38] group-hover:scale-105 group-hover:border-[#046A38]/40 transition-all mb-2 shadow-2xs">
                          <UploadCloud className="w-5 h-5 text-[#046A38]" />
                        </div>
                        <span className="text-sm font-bold text-stone-900 group-hover:text-[#046A38] transition-colors">
                          Click to upload or drag & drop prescription
                        </span>
                        <span className="text-xs text-stone-500 mt-1 font-medium">
                          PDF, PNG, JPG, WEBP (Max 10MB)
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.webp,.png,.jpg,.jpeg"
                          onChange={(e) => handlePrescriptionSelect(e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {prescriptionPreview ? (
                            <img
                              src={prescriptionPreview}
                              alt="Preview"
                              className="w-12 h-12 object-cover rounded-lg border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 text-[#046A38] flex items-center justify-center font-bold text-xs shrink-0">
                              PDF
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <span className="text-sm font-bold text-stone-900 truncate block">
                              {prescriptionFile.name}
                            </span>
                            <span className="text-xs text-stone-400">
                              {(prescriptionFile.size / (1024 * 1024)).toFixed(2)} MB •{' '}
                              {uploadingPrescription ? 'Uploading securely...' : 'Uploaded'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs sm:text-sm font-semibold text-[#046A38] hover:underline cursor-pointer">
                            Replace
                            <input
                              type="file"
                              accept=".pdf,.webp,.png,.jpg,.jpeg"
                              onChange={(e) => handlePrescriptionSelect(e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={removePrescription}
                            className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── DOCTOR SPECIFIC FIELDS ── */}
              {accountType === 'doctor' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                        Medical License Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. MCI-2018-84729"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                        State Medical Council / Authority <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={council}
                        onChange={(e) => setCouncil(e.target.value)}
                        placeholder="e.g. Delhi Medical Council"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                        Primary Specialization <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] cursor-pointer"
                      >
                        {DOCTOR_SPECIALIZATIONS.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                      {specialization === 'Other' && (
                        <input
                          type="text"
                          required
                          value={otherSpecialization}
                          onChange={(e) => setOtherSpecialization(e.target.value)}
                          placeholder="Specify specialization"
                          className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                        Hospital / Clinic Affiliation
                      </label>
                      <input
                        type="text"
                        value={hospitalClinic}
                        onChange={(e) => setHospitalClinic(e.target.value)}
                        placeholder="e.g. Apollo Diabetes Centre"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── PHARMACIST SPECIFIC FIELDS ── */}
              {accountType === 'pharmacist' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                        Pharmacy Registration Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. PCI-REG-2022-77192"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                        State Pharmacy Council / Authority <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={council}
                        onChange={(e) => setCouncil(e.target.value)}
                        placeholder="e.g. Karnataka State Pharmacy Council"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                        Practice Area <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] cursor-pointer"
                      >
                        {PHARMACIST_SPECIALIZATIONS.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                      {specialization === 'Other' && (
                        <input
                          type="text"
                          required
                          value={otherSpecialization}
                          onChange={(e) => setOtherSpecialization(e.target.value)}
                          placeholder="Specify practice area"
                          className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                        Pharmacy / Hospital Affiliation
                      </label>
                      <input
                        type="text"
                        value={hospitalClinic}
                        onChange={(e) => setHospitalClinic(e.target.value)}
                        placeholder="e.g. Fortis Hospital Pharmacy / MedPlus"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password Fields (12-128 chars, Argon2id) - Stacked in 2 distinct rows */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Password (min. 12 chars) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={12}
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-xs text-stone-400 mt-1 block">
                    Letters, numbers, and symbols.
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={12}
                      maxLength={128}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-stone-200 bg-stone-50/40 focus:bg-white text-stone-900 text-sm sm:text-base focus:outline-none focus:ring-3 focus:ring-[#046A38]/15 focus:border-[#046A38] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <span className="text-xs text-[#E34222] font-semibold mt-1 block">
                      Passwords do not match.
                    </span>
                  )}
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#046A38] rounded border-stone-300 focus:ring-[#046A38]"
                  />
                  <span className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    I agree to the{' '}
                    <a href="#terms" className="font-semibold text-[#046A38] hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#privacy" className="font-semibold text-[#046A38] hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              </div>

              {/* Action Buttons: Back & Complete */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="py-3.5 px-6 rounded-xl font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 px-6 rounded-xl font-bold text-white bg-[#046A38] hover:bg-[#03542C] disabled:bg-stone-300 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base whitespace-nowrap"
                >
                  {submitting ? (
                    <span>{accountType === 'patient' ? 'Registering...' : 'Submitting...'}</span>
                  ) : (
                    <>
                      <span>{accountType === 'patient' ? 'Register' : 'Submit'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center text-xs sm:text-sm text-stone-400 py-4 mt-6">
        © 2026 LATROCORE Systems Inc. Clinical precision & data privacy reserved.
      </footer>
    </div>
  );
}
