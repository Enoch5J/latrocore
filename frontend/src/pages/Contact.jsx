import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Home,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
} from 'lucide-react';
import PublicHeader from '../components/home/PublicHeader';
import PublicFooter from '../components/home/PublicFooter';
import { usePrefersReducedMotion } from '../hooks/useScrollMotion';
import { getVerifiedPublicContactInfo } from '../utils/contactInfo';
import { validateCountryPhone } from '../utils/countryPhoneValidation';
import PhoneInputWithCountry from '../components/common/PhoneInputWithCountry';
import { api } from '../services/api';

export const CONTACT_TOPIC_OPTIONS = [
  'Getting started',
  'Account support',
  'Using Latrocore',
  'Clinic or pharmacy enquiry',
  'Other',
];

const EMAIL_PATTERN = /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export function validateContactForm(values) {
  const errors = {};
  const fullName = String(values.full_name || '').trim();
  const email = String(values.email || '').trim();
  const phone = String(values.phone || '').trim();
  const countryCode = String(values.countryCode || '+91').trim();
  const topic = String(values.topic || '').trim();
  const message = String(values.message || '').trim();

  if (fullName.length < 2) {
    errors.full_name = 'Please enter your full name.';
  }
  if (!email) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (phone) {
    const phoneError = validateCountryPhone(countryCode, phone);
    if (phoneError) {
      errors.phone = phoneError;
    }
  }
  if (!topic || !CONTACT_TOPIC_OPTIONS.includes(topic)) {
    errors.topic = 'Please choose an enquiry topic.';
  }
  if (message.length < 5) {
    errors.message = 'Please enter a short message explaining how we can help.';
  }

  return errors;
}

function ContactTopicDropdown({ value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, CONTACT_TOPIC_OPTIONS.indexOf(value)));
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const selectedIndex = CONTACT_TOPIC_OPTIONS.indexOf(value);
  const activeOptionId = `contact-topic-option-${activeIndex}`;

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const openDropdown = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  const chooseOption = (option) => {
    onChange(option);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openDropdown(event.key === 'ArrowUp' ? CONTACT_TOPIC_OPTIONS.length - 1 : undefined);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (
        current + direction + CONTACT_TOPIC_OPTIONS.length
      ) % CONTACT_TOPIC_OPTIONS.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(CONTACT_TOPIC_OPTIONS.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chooseOption(CONTACT_TOPIC_OPTIONS[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label id="contact-topic-label" className="block text-[13px] sm:text-sm font-semibold text-[#093322] mb-1.5">
        Enquiry topic <span className="text-[#046A38]" aria-hidden="true">*</span>
      </label>
      <button
        ref={triggerRef}
        id="contact-topic"
        type="button"
        role="combobox"
        aria-labelledby="contact-topic-label"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="contact-topic-listbox"
        aria-activedescendant={isOpen ? activeOptionId : undefined}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'contact-topic-error' : undefined}
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget)) {
            setIsOpen(false);
          }
        }}
        className={`w-full rounded-xl bg-white border px-4 py-3 pr-10 text-left text-[15px] font-['Inter',system-ui,sans-serif] transition-all focus:border-[#046A38] focus:ring-2 focus:ring-[#046A38]/20 focus:outline-none ${
          error ? 'border-[#E34222]' : 'border-[#D8C6AC]'
        } ${value ? 'text-[#112228]' : 'text-slate-400'}`}
      >
        <span>{value || 'Select an enquiry topic'}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[#48616A] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div
          id="contact-topic-listbox"
          role="listbox"
          aria-labelledby="contact-topic-label"
          className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-[#E8DCC8] bg-white p-1.5 shadow-xl shadow-[#093322]/10"
        >
          {CONTACT_TOPIC_OPTIONS.map((option, index) => {
            const isSelected = value === option;
            const isActive = activeIndex === index;
            return (
              <div
                id={`contact-topic-option-${index}`}
                key={option}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseOption(option)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isSelected
                    ? 'bg-[#E8F5EE] font-semibold text-[#046A38]'
                    : isActive
                      ? 'bg-[#F7F4EE] text-[#093322]'
                      : 'text-[#24383F] hover:bg-[#F7F4EE]'
                }`}
              >
                <span>{option}</span>
                {isSelected && <Check size={16} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p id="contact-topic-error" className="mt-1 text-xs font-medium text-[#CA3517]">
          {error}
        </p>
      )}
    </div>
  );
}

const INITIAL_FORM = {
  full_name: '',
  email: '',
  phone: '',
  topic: '',
  message: '',
  website: '',
};

export default function Contact({ contactInfoOverride = null }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const contactInfo = contactInfoOverride || getVerifiedPublicContactInfo();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [countryCode, setCountryCode] = useState('+91');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [submitFeedback, setSubmitFeedback] = useState('');
  const submitLockRef = useRef(false);

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitStatus === 'error') {
      setSubmitStatus(null);
      setSubmitFeedback('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLockRef.current || isSubmitting) return;

    const errors = validateContactForm({ ...formData, countryCode });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitStatus('error');
      setSubmitFeedback('Please review the highlighted fields before sending.');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitFeedback('');

    try {
      const result = await api.submitContactEnquiry({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim()
          ? `${countryCode}${formData.phone.replace(/\D/g, '')}`
          : null,
        topic: formData.topic.trim(),
        message: formData.message.trim(),
        website: formData.website,
      });

      setSubmitStatus('success');
      setSubmitFeedback(result?.message || 'Thank you. Your message has been received.');
      setFieldErrors({});
      setFormData(INITIAL_FORM);
    } catch (err) {
      // Preserve visitor's entries cleanly on failure
      setSubmitStatus('error');
      setSubmitFeedback(
        err?.message && err.message !== 'Request failed'
          ? err.message
          : 'We could not send your message right now. Your details are still here — please try again.'
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const inputBaseClass =
    "w-full rounded-xl bg-white border px-4 py-3 text-[15px] font-['Inter',system-ui,sans-serif] text-[#112228] placeholder:text-slate-400 transition-colors focus:border-[#046A38] focus:ring-2 focus:ring-[#046A38]/20 focus:outline-none";

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#FAF6EF] text-[#112228] flex flex-col font-['Inter',system-ui,sans-serif] antialiased selection:bg-[#F9EBD7] selection:text-[#046A38]">
      <PublicHeader />

      {/* ── Contact Banner (Full Width, #093322 to #046A38 Gradient) ─── */}
      <section
        aria-labelledby="contact-page-heading"
        className="relative w-full bg-gradient-to-br from-[#093322] via-[#064A2B] to-[#046A38] text-[#FAF6EF] overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(168,215,189,0.16),transparent_55%)] pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 sm:py-12 text-center">
          <h1
            id="contact-page-heading"
            className="font-serif font-bold text-3xl sm:text-4xl lg:text-[42px] text-[#FAF6EF] tracking-tight leading-tight"
          >
            Contact Latrocore
          </h1>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mt-4 flex justify-center">
            <ol className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-xs text-xs font-medium text-[#E8F5EE]">
              <li>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-[#E8F5EE] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#FAF6EF] focus-visible:outline-offset-2 rounded-sm no-underline"
                >
                  <Home size={13} aria-hidden="true" />
                  <span>Home</span>
                </Link>
              </li>
              <li aria-hidden="true" className="text-[#A8D7BD]">
                <ChevronRight size={13} />
              </li>
              <li aria-current="page" className="font-semibold text-white">
                Contact
              </li>
            </ol>
          </nav>

          <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-[15px] leading-relaxed text-[#E8F5EE]/90 font-normal">
            Have a question about using Latrocore, need help with your account, or want to introduce it to your practice? Get in touch with our team.
          </p>
        </div>
      </section>

      {/* ── Main Content (2/3 Enquiry Form + 1/3 Get In Touch Sidebar) ── */}
      <main
        className={`flex-1 w-full bg-[#FAF6EF] ${
          prefersReducedMotion ? '' : 'contact-page-enter'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Column: Compact Enquiry Form Card */}
            <div className="lg:col-span-7 bg-white border border-[#E8DCC8] rounded-3xl p-6 sm:p-8 shadow-xs max-w-2xl w-full mx-auto lg:mx-0">
              <div className="mb-6">
                <h2 className="font-serif font-bold text-2xl sm:text-[26px] text-[#093322] tracking-tight leading-tight">
                  Send us a message
                </h2>
                <p className="mt-1.5 text-sm text-[#48616A] font-normal">
                  Tell us what you need help with and where we can reach you.
                </p>
              </div>

              {submitStatus === 'success' && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-6 rounded-2xl bg-[#E8F5EE] border border-[#A8D7BD] px-4 py-3.5 flex items-start gap-3 text-sm text-[#093322]"
                >
                  <CheckCircle2 size={18} className="text-[#046A38] shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="font-semibold leading-snug">{submitFeedback}</p>
                </div>
              )}

              {submitStatus === 'error' && submitFeedback && (
                <div
                  role="alert"
                  className="mb-6 rounded-2xl bg-[#FDECE8] border border-[#FBD4CB] px-4 py-3.5 text-sm font-medium text-[#A8270E]"
                >
                  {submitFeedback}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Honeypot anti-spam trap */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="contact-website">Leave this field empty</label>
                  <input
                    id="contact-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.website}
                    onChange={handleFieldChange('website')}
                  />
                </div>

                {/* Row 1: Full name */}
                <div>
                  <label
                    htmlFor="contact-full-name"
                    className="block text-[13px] sm:text-sm font-semibold text-[#093322] mb-1.5"
                  >
                    Full name <span className="text-[#046A38]" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-full-name"
                    name="full_name"
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.full_name)}
                    aria-describedby={fieldErrors.full_name ? 'contact-full-name-error' : undefined}
                    value={formData.full_name}
                    onChange={handleFieldChange('full_name')}
                    placeholder="Your full name"
                    className={`${inputBaseClass} ${
                      fieldErrors.full_name ? 'border-[#E34222]' : 'border-[#D8C6AC]'
                    }`}
                  />
                  {fieldErrors.full_name && (
                    <p id="contact-full-name-error" className="mt-1 text-xs font-medium text-[#CA3517]">
                      {fieldErrors.full_name}
                    </p>
                  )}
                </div>

                {/* Row 2: Email address */}
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-[13px] sm:text-sm font-semibold text-[#093322] mb-1.5"
                  >
                    Email address <span className="text-[#046A38]" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                    value={formData.email}
                    onChange={handleFieldChange('email')}
                    placeholder="you@example.com"
                    className={`${inputBaseClass} ${
                      fieldErrors.email ? 'border-[#E34222]' : 'border-[#D8C6AC]'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p id="contact-email-error" className="mt-1 text-xs font-medium text-[#CA3517]">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Row 3: Phone number */}
                <div>
                  <PhoneInputWithCountry
                    id="contact-phone"
                    label="Phone number (Optional)"
                    value={formData.phone}
                    onChange={handleFieldChange('phone')}
                    countryCode={countryCode}
                    onCountryCodeChange={(nextCountryCode) => {
                      setCountryCode(nextCountryCode);
                      if (formData.phone) {
                        const error = validateCountryPhone(nextCountryCode, formData.phone);
                        setFieldErrors((previous) => ({
                          ...previous,
                          ...(error ? { phone: error } : { phone: undefined }),
                        }));
                      }
                    }}
                    error={fieldErrors.phone}
                    onBlur={() => {
                      if (formData.phone.trim()) {
                        const error = validateCountryPhone(countryCode, formData.phone);
                        setFieldErrors((previous) => ({
                          ...previous,
                          ...(error ? { phone: error } : { phone: undefined }),
                        }));
                      }
                    }}
                    required={false}
                  />
                </div>

                {/* Row 4: Enquiry topic */}
                <div>
                  <ContactTopicDropdown
                    value={formData.topic}
                    onChange={(value) => {
                      setFormData((previous) => ({ ...previous, topic: value }));
                      setFieldErrors((previous) => {
                        const next = { ...previous };
                        delete next.topic;
                        return next;
                      });
                      if (submitStatus === 'error') {
                        setSubmitStatus(null);
                        setSubmitFeedback('');
                      }
                    }}
                    error={fieldErrors.topic}
                  />
                </div>

                {/* Row 5: Message + Privacy note */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1.5">
                    <label
                      htmlFor="contact-message"
                      className="block text-[13px] sm:text-sm font-semibold text-[#093322]"
                    >
                      Message <span className="text-[#046A38]" aria-hidden="true">*</span>
                    </label>
                    <p
                      id="contact-privacy-note"
                      className="text-xs font-medium text-[#48616A]"
                    >
                      For your privacy, please leave out prescription details and test results.
                    </p>
                  </div>

                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.message)}
                    aria-describedby={
                      fieldErrors.message
                        ? 'contact-privacy-note contact-message-error'
                        : 'contact-privacy-note'
                    }
                    value={formData.message}
                    onChange={handleFieldChange('message')}
                    placeholder="How can our team help?"
                    className={`${inputBaseClass} resize-y min-h-[126px] ${
                      fieldErrors.message ? 'border-[#E34222]' : 'border-[#D8C6AC]'
                    }`}
                  />
                  {fieldErrors.message && (
                    <p id="contact-message-error" className="mt-1 text-xs font-medium text-[#CA3517]">
                      {fieldErrors.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto min-w-[210px] inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] disabled:opacity-65 text-white text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <span>Send message</span>
                        <Send size={15} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Sticky Get In Touch Sidebar */}
            <aside aria-labelledby="get-in-touch-heading" className="lg:col-span-5 lg:sticky lg:top-36 space-y-4">
              <h2
                id="get-in-touch-heading"
                className="text-xs font-bold uppercase tracking-[0.14em] text-[#046A38]"
              >
                Get in touch
              </h2>

              {contactInfo.hasContactDetails ? (
                <>
                  {contactInfo.address && (
                    <div className="bg-white border border-[#E8DCC8] rounded-2xl p-5 sm:p-6 shadow-2xs flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0">
                        <MapPin size={19} strokeWidth={2} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#48616A]">
                          Office address
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#093322] leading-relaxed">
                          {contactInfo.address}
                        </p>
                        {contactInfo.mapsUrl && (
                          <a
                            href={contactInfo.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#046A38] hover:underline focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2 rounded-xs"
                          >
                            <span>Open in Maps</span>
                            <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {contactInfo.email && (
                    <div className="bg-white border border-[#E8DCC8] rounded-2xl p-5 sm:p-6 shadow-2xs flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0">
                        <Mail size={19} strokeWidth={2} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#48616A]">
                          Email us
                        </p>
                        <a
                          href={`mailto:${contactInfo.email}`}
                          className="mt-1 inline-block text-sm font-semibold text-[#093322] hover:text-[#046A38] break-all underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2 rounded-xs"
                        >
                          {contactInfo.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {contactInfo.phone && (
                    <div className="bg-white border border-[#E8DCC8] rounded-2xl p-5 sm:p-6 shadow-2xs flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0">
                        <Phone size={19} strokeWidth={2} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#48616A]">
                          Mobile number
                        </p>
                        <a
                          href={`tel:${contactInfo.phone.replace(/[^\d+]/g, '')}`}
                          className="mt-1 inline-block text-sm font-semibold text-[#093322] hover:text-[#046A38] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2 rounded-xs"
                        >
                          {contactInfo.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {contactInfo.socials.length > 0 && (
                    <div className="bg-white border border-[#E8DCC8] rounded-2xl p-5 shadow-2xs">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#48616A] mb-3">
                        Connect
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {contactInfo.socials.map((soc) => (
                          <a
                            key={soc.key}
                            href={soc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-[#E8F5EE] hover:bg-[#D1EBDD] text-xs font-semibold text-[#046A38] transition-colors focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2 no-underline"
                          >
                            {soc.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div
                  data-contact-fallback="common-questions"
                  className="bg-white border border-[#E8DCC8] rounded-2xl p-5 sm:p-6 shadow-2xs flex items-start gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0">
                    <HelpCircle size={20} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-lg text-[#093322] leading-snug">
                      Common questions
                    </h3>
                    <p className="mt-1.5 text-sm text-[#24383F] leading-relaxed">
                      Looking for quick answers on daily reminders, glucose logs, or using Latro AI? Browse our frequently asked questions.
                    </p>
                    <Link
                      to="/#faq"
                      className="mt-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#046A38] hover:text-[#03542C] hover:underline focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2 rounded-sm no-underline"
                    >
                      <span>View homepage FAQ</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
