import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bot, Send, X, Sparkles, Volume2, VolumeX, Mic, MicOff,
  Shield, RefreshCw, ChevronDown, Check, Globe
} from 'lucide-react';
import { getAssistantResponse, getSuggestedQuestions, SUPPORTED_LANGUAGES } from '../services/assistantEngine';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify'];

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', sub: 'English' },
  { code: 'ta', label: 'தமிழ்', short: 'தமிழ்', sub: 'Tamil' },
  { code: 'hi', label: 'हिंदी', short: 'हिंदी', sub: 'Hindi' },
  { code: 'ml', label: 'മലയാളം', short: 'മലയാളം', sub: 'Malayalam' },
  { code: 'te', label: 'తెలుగు', short: 'తెలుగు', sub: 'Telugu' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕನ್ನಡ', sub: 'Kannada' },
];

const WELCOME_MESSAGES = {
  en: "Hello! I'm LATROCORE Clinical AI. How can I assist you with your glucose, medications, or diet today?",
  ta: "வணக்கம்! நான் LATROCORE கிளினிக்கல் AI உதவியாளர். உங்கள் இரத்த சர்க்கரை, மருந்துகள் அல்லது உணவு முறை பற்றி நான் எப்படி உதவலாம்?",
  hi: "नमस्ते! मैं LATROCORE क्लिनिकल AI हूँ। आज मैं आपकी रक्त शर्करा, दवाओं या आहार योजना में कैसे मदद कर सकता हूँ?",
  ml: "നമസ്കാരം! ഞാൻ LATROCORE ക്ലിനിക്കൽ AI അസിസ്റ്റന്റാണ്. നിങ്ങളുടെ രക്തത്തിലെ പഞ്ചസാര, മരുന്നുകൾ അല്ലെങ്കിൽ ഡയറ്റ് എന്നിവയിൽ എങ്ങനെ സഹായിക്കണം?",
  te: "నమస్కారం! నేను LATROCORE క్లినికల్ AI అసిస్టెంట్‌ని. మీ బ్లడ్ షుగర్, మందులు లేదా డైట్ ప్లాన్ గురించి నేను ఎలా సహాయపడగలను?",
  kn: "ನಮಸ್ಕಾರ! ನಾನು LATROCORE ಕ್ಲಿನಿಕಲ್ AI ಸಹಾಯಕ. ನಿಮ್ಮ ರಕ್ತದ ಸಕ್ಕರೆ, ಔಷಧಿಗಳು ಅಥವಾ ಆಹಾರ ಕ್ರಮದ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
};

const INPUT_PLACEHOLDERS = {
  en: 'Ask about glucose, medications, meals...',
  ta: 'கேள்வி கேட்கவும் (எ.கா. குளுக்கோஸ்)...',
  hi: 'प्रश्न पूछें (जैसे ग्लूकोज, दवा, आहार)...',
  ml: 'ചോദ്യം ചോദിക്കുക (ഉദാ: ഗ്ലൂക്കോസ്)...',
  te: 'ప్రశ్న అడగండి (ఉదా: గ్లూకోజ్, మందులు)...',
  kn: 'ಪ್ರಶ್ನೆ ಕೇಳಿ (ಉದಾ: ಗ್ಲೂಕೋಸ್, ಮಾತ್ರೆಗಳು)...',
};

export function AIFaceAvatar({ size = 36, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 54 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <filter id="ai-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="ai-face-head" x1="10" y1="8" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F5F5F4" />
          <stop offset="100%" stopColor="#E7E5E4" />
        </linearGradient>
        <linearGradient id="ai-face-visor" x1="12" y1="14" x2="42" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#022312" />
          <stop offset="45%" stopColor="#03351C" />
          <stop offset="100%" stopColor="#044D29" />
        </linearGradient>
        <linearGradient id="ai-face-emerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="ai-face-ear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#046A38" />
          <stop offset="100%" stopColor="#023B1E" />
        </linearGradient>
        <linearGradient id="ai-face-sheen" x1="16" y1="15" x2="38" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Medical Cyber Antenna with Radiant Emerald Node */}
      <circle cx="27" cy="4.5" r="2.8" fill="#34D399" filter="url(#ai-glow-filter)" />
      <path d="M27 7V12" stroke="#046A38" strokeWidth="2.5" strokeLinecap="round" />

      {/* Ceramic Clinical Audio Pods (Left & Right) */}
      <rect x="3.5" y="21" width="5" height="13" rx="2.5" fill="url(#ai-face-ear)" />
      <circle cx="6" cy="27.5" r="1.5" fill="#E8F5EE" />
      <rect x="45.5" y="21" width="5" height="13" rx="2.5" fill="url(#ai-face-ear)" />
      <circle cx="48" cy="27.5" r="1.5" fill="#E8F5EE" />

      {/* Ceramic Head Chassis */}
      <rect x="7" y="11" width="40" height="34" rx="16" fill="url(#ai-face-head)" stroke="#D6D3D1" strokeWidth="1.2" />

      {/* High-Gloss Curved Forest Visor Display */}
      <rect x="11.5" y="15" width="31" height="25" rx="12" fill="url(#ai-face-visor)" />

      {/* Glass Specular Glint Reflection */}
      <path
        d="M15 17.5C21 16 33 16 39 18.5C36.5 22.5 30 23 15 17.5Z"
        fill="url(#ai-face-sheen)"
      />

      {/* Expressive Glowing AI Eyes (Curved Smiling Radiant Emerald) */}
      <g filter="url(#ai-glow-filter)">
        {/* Left Eye */}
        <path
          d="M17 26.5C17.2 23 19.5 21 22.5 21C25.5 21 27.5 23 27.5 26.5C27 27.2 25.5 27.5 22.5 27.5C19.5 27.5 17 27.2 17 26.5Z"
          fill="url(#ai-face-emerald)"
        />
        <circle cx="23.5" cy="23.5" r="1.1" fill="#FFFFFF" />

        {/* Right Eye */}
        <path
          d="M26.5 26.5C26.5 23 28.5 21 31.5 21C34.5 21 37 23 37 26.5C37 27.2 34.5 27.5 31.5 27.5C28.5 27.5 26.5 27.2 26.5 26.5Z"
          fill="url(#ai-face-emerald)"
        />
        <circle cx="32.5" cy="23.5" r="1.1" fill="#FFFFFF" />
      </g>

      {/* Cute Glowing Cheek Blush Dots */}
      <circle cx="15.5" cy="31" r="1.8" fill="#34D399" opacity="0.65" filter="url(#ai-glow-filter)" />
      <circle cx="38.5" cy="31" r="1.8" fill="#34D399" opacity="0.65" filter="url(#ai-glow-filter)" />

      {/* Friendly Glowing Digital Smile Curve */}
      <path
        d="M23 32C24.5 34.5 29.5 34.5 31 32"
        stroke="url(#ai-face-emerald)"
        strokeWidth="2.2"
        strokeLinecap="round"
        filter="url(#ai-glow-filter)"
      />

      {/* Forehead Micro-Core Spark */}
      <circle cx="27" cy="17" r="1" fill="#6EE7B7" opacity="0.9" />
    </svg>
  );
}

export default function FloatingAIAssistant() {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.some((path) =>
    location.pathname.toLowerCase().startsWith(path)
  );
  const { currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: WELCOME_MESSAGES.en,
      sources: ['ADA Standards of Care 2024 §6 (Glycemic Targets)'],
      time: 'Just now',
    },
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const langMenuRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (langMenuOpen) setLangMenuOpen(false);
        else if (isOpen) setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, langMenuOpen]);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    if (langMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langMenuOpen]);

  // Speech Recognition
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : lang === 'ml' ? 'ml-IN' : lang === 'te' ? 'te-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  // Text to Speech
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : lang === 'ml' ? 'ml-IN' : lang === 'te' ? 'te-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleSend = async (textToSend = null) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Loading indicator
    const tempAiId = `a-loading-${Date.now()}`;
    const loadingMsg = {
      id: tempAiId,
      role: 'assistant',
      text: '',
      isLoading: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      // Query backend Gemini API with strict PII scrubbing & safety guardrails
      const data = await api.askAssistant(query, lang);
      const sourcesList = data?.sources && Array.isArray(data.sources)
        ? data.sources.map((s) => (typeof s === 'string' ? s : `${s.title}${s.section ? ' (' + s.section + ')' : ''}`))
        : ['ADA Standards of Care 2024'];

      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.content,
        sources: sourcesList,
        modelId: data.model_id,
        piiScrubbed: data.pii_scrubbed,
        requiresHandoff: data.requires_handoff,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => prev.map((m) => (m.id === tempAiId ? aiMsg : m)));
    } catch (err) {
      // Graceful local clinical engine fallback
      const response = getAssistantResponse(query, lang);
      const fallbackMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        sources: response.sources || ['ADA Standards of Care 2024'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => prev.map((m) => (m.id === tempAiId ? fallbackMsg : m)));
    }
  };

  const handleSelectLanguage = (selectedCode) => {
    setLang(selectedCode);
    setLangMenuOpen(false);

    // Add language switch indicator in chat
    const switchMsg = {
      id: `lang-${Date.now()}`,
      role: 'assistant',
      text: WELCOME_MESSAGES[selectedCode] || WELCOME_MESSAGES.en,
      sources: ['ADA Standards of Care 2024'],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, switchMsg]);
  };

  const resetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: WELCOME_MESSAGES[lang] || WELCOME_MESSAGES.en,
        sources: ['ADA Standards of Care 2024 §6 (Glycemic Targets)'],
        time: 'Just now',
      },
    ]);
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const suggestions = getSuggestedQuestions(lang).slice(0, 3);

  if (isAuthPage) {
    return null;
  }

  return (
    <>
      {/* ── Chat Modal Drawer (Floating Popover on Desktop, Bottom Sheet on Mobile) ── */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="sm:hidden fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className="fixed z-50 flex flex-col bg-white overflow-hidden shadow-2xl border border-stone-200
              bottom-4 right-4 sm:bottom-6 sm:right-6
              w-[calc(100vw-2rem)] sm:w-[420px] max-w-[440px]
              h-[520px] max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-5rem)]
              rounded-2xl transition-all"
            role="dialog"
            aria-modal="true"
            aria-label="Clinical AI Assistant"
          >

            {/* ── Clean & Simple Single Header ── */}
            <div className="bg-[#046A38] text-white shrink-0 px-4 py-3 flex items-center justify-between gap-3 border-b border-[#03542C]">
              {/* Bot Info with Simple Clean Text */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-[#03542C] border border-emerald-400/30 flex items-center justify-center overflow-hidden">
                    <AIFaceAvatar size={26} />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#046A38] rounded-full" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-white tracking-tight leading-tight">
                    LATROCORE AI
                  </h3>
                  <p className="text-xs text-emerald-100/90 leading-tight mt-0.5 font-normal">
                    Clinical Assistant
                  </p>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Language Selector Dropdown */}
                <div className="relative" ref={langMenuRef}>
                  <button
                    type="button"
                    onClick={() => setLangMenuOpen(!langMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition cursor-pointer"
                    title="Select language"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>{currentLangObj.label}</span>
                    <ChevronDown className={`w-3 h-3 text-emerald-200 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Language Dropdown Menu */}
                  {langMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 flex items-center justify-between">
                        <span>Select Language</span>
                        <span className="text-[#046A38] font-mono font-bold">6 Active</span>
                      </div>
                      <div className="py-1">
                        {LANGUAGES.map((l) => (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => handleSelectLanguage(l.code)}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                              lang === l.code
                                ? 'bg-[#E8F5EE] text-[#046A38] font-bold'
                                : 'text-stone-700 hover:bg-stone-50 font-medium'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">{l.label}</span>
                              <span className="text-[10px] text-stone-400">{l.sub}</span>
                            </div>
                            {lang === l.code && <Check className="w-4 h-4 text-[#046A38]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset Chat */}
                <button
                  onClick={resetChat}
                  className="text-emerald-200 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
                  title="Reset conversation"
                  aria-label="Reset chat"
                >
                  <RefreshCw size={15} />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-emerald-200 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
                  title="Close Assistant (Esc)"
                  aria-label="Close Assistant"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ── Messages Scroll Area ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF6EF] min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className={`w-7 h-7 rounded-xl bg-gradient-to-b from-[#022A16] to-[#044D29] border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs overflow-hidden transition-all ${
                      msg.isLoading ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-white animate-pulse' : ''
                    }`}>
                      <AIFaceAvatar size={20} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-xs transition-all duration-200 ${
                      msg.role === 'user'
                        ? 'bg-[#046A38] text-white rounded-tr-xs font-normal'
                        : 'bg-white text-stone-900 border border-[#E8DCC8] rounded-tl-xs'
                    }`}
                  >
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2.5 py-1 px-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#046A38] animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-[#34D399] animate-bounce" />
                        </div>
                        <span className="text-[11px] font-medium text-stone-400 tracking-wide animate-pulse">
                          AI is thinking...
                        </span>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Evidence citations */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap gap-1">
                            {msg.sources.map((src, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[10px] text-[#046A38] bg-[#E8F5EE] px-2 py-0.5 rounded-md font-semibold border border-[#A8D7BD]/60"
                              >
                                <Sparkles size={9} className="text-[#046A38]" />
                                {src}
                              </span>
                            ))}
                            {msg.piiScrubbed && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium border border-amber-200">
                                Telemetry Redacted for Privacy
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bottom Metadata & Speech Audio */}
                        <div className={`mt-2 flex items-center justify-between text-[11px] pt-1 ${
                          msg.role === 'user' ? 'text-emerald-100/70' : 'text-stone-500'
                        }`}>
                          <span className="font-semibold text-[10px]">{msg.time}</span>
                          {msg.role === 'assistant' && (
                            <button
                              onClick={() => speakText(msg.text)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 hover:bg-[#E8F5EE] text-stone-700 hover:text-[#046A38] border border-stone-200 hover:border-[#A8D7BD] transition cursor-pointer text-[10px] font-bold"
                              title="Read aloud"
                              aria-label="Read message aloud"
                            >
                              {isSpeaking ? (
                                <>
                                  <VolumeX size={12} className="text-[#046A38]" />
                                  <span>Mute</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 size={12} className="text-[#046A38]" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Suggested Questions Strip ── */}
            <div className="px-3.5 py-2 bg-white border-t border-[#E8DCC8] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] text-[#046A38] font-black shrink-0 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="text-[#046A38]" />
                Prompt:
              </span>
              <div className="flex items-center gap-1.5 min-w-max">
                {suggestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="shrink-0 text-[11px] bg-[#FAF6EF] hover:bg-[#E8F5EE] hover:text-[#046A38] text-stone-700 font-bold px-3 py-1 rounded-full border border-[#E8DCC8] hover:border-[#A8D7BD] transition-all active:scale-95 cursor-pointer shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Input Box Form ── */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-2.5 sm:p-3 bg-white border-t border-[#E8DCC8] flex items-center gap-2 shrink-0"
            >
              {/* Mic Speech Input Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : 'bg-stone-100 text-stone-700 hover:bg-[#E8F5EE] hover:text-[#046A38] border border-stone-200 hover:border-[#A8D7BD]'
                }`}
                title={isListening ? 'Stop listening' : `Voice input (${currentLangObj.label})`}
                aria-label="Voice input"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={INPUT_PLACEHOLDERS[lang] || INPUT_PLACEHOLDERS.en}
                className="flex-1 bg-stone-50/70 border border-stone-200 focus:border-[#046A38] focus:bg-white focus:ring-2 focus:ring-[#046A38]/15 text-xs sm:text-sm rounded-xl px-3 py-2 outline-none transition text-stone-900 font-medium placeholder:text-stone-400"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#046A38] hover:bg-[#03542C] disabled:opacity-40 text-white flex items-center justify-center transition shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0 active:scale-95"
                title="Send message"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>

            {/* Clinical Disclaimer Footnote */}
            <div className="bg-white pb-2 pt-0.5 px-3 text-center shrink-0">
              <p className="text-[10px] text-stone-400 font-medium leading-tight">
                LATROCORE AI provides clinical decision support. Always confirm with your doctor.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Floating AI Assistant Avatar Trigger (Bottom-Right Corner) ── */}
      {!isOpen && (
        <div className="fixed bottom-6 sm:bottom-8 right-6 sm:right-8 z-40 flex flex-col items-center group">
          {/* Centered Floating Tooltip Badge */}
          <div className="mb-2 hidden group-hover:flex flex-col items-center pointer-events-none transition-all duration-200 animate-fade-in select-none">
            <div className="bg-stone-900 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-2xl border border-emerald-500/50 flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md">
              <Sparkles size={13} className="text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="bg-gradient-to-r from-emerald-200 via-emerald-100 to-white bg-clip-text text-transparent">
                LATROCORE AI
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5 shadow-[0_0_6px_#34d399]" />
            </div>
            {/* Pointer arrow pointing straight down into the antenna */}
            <div className="w-2.5 h-2.5 bg-stone-900 border-r border-b border-emerald-500/50 transform rotate-45 -mt-1.5" />
          </div>

          {/* Trigger Button with AI Face Avatar */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center justify-center cursor-pointer transition-all duration-300 transform group-hover:scale-108 active:scale-95 focus:outline-none"
            aria-label="Open Clinical AI Assistant"
          >
            {/* Outer Radiant Pulsing Aura Rings in Forest Green & Emerald */}
            <span className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-[#046A38] via-emerald-400 to-[#03542C] opacity-60 blur-md group-hover:opacity-90 animate-pulse duration-1000" />
            <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#046A38] to-emerald-400 opacity-30 animate-ping duration-1000 pointer-events-none" />

            {/* Glowing Sphere Container */}
            <div className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-full p-[3px] bg-gradient-to-tr from-[#046A38] via-emerald-400 to-[#02331B] shadow-[0_10px_35px_rgba(4,106,56,0.5)]">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#022A16] via-[#044D29] to-[#022A16] flex items-center justify-center overflow-hidden border border-emerald-400/40 relative">
                {/* Internal Holographic Radial Light Beam */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-400/25 via-transparent to-transparent pointer-events-none" />

                {/* Animated Eye-Catching AI Face Avatar */}
                <AIFaceAvatar size={42} className="relative z-10 transition-transform duration-300 group-hover:scale-105" />

                {/* Live Online Glowing Beacon */}
                <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#022A16] shadow-[0_0_10px_#34d399] animate-pulse z-20" />
              </div>
            </div>
          </button>
        </div>
      )}
    </>
  );
}
