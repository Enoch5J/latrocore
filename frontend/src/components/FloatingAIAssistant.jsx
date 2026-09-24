import { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, X, Sparkles, Volume2, VolumeX, Mic, MicOff,
  Shield, RefreshCw, ChevronDown, Check, Globe
} from 'lucide-react';
import { getAssistantResponse, getSuggestedQuestions, SUPPORTED_LANGUAGES } from '../services/assistantEngine';
import { useApp } from '../context/AppContext';

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
          <stop offset="60%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="ai-face-visor" x1="12" y1="14" x2="42" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="45%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="ai-face-cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id="ai-face-ear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="ai-face-sheen" x1="16" y1="15" x2="38" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Cyber Antenna with Radiant Node */}
      <circle cx="27" cy="4.5" r="2.8" fill="#2DD4BF" filter="url(#ai-glow-filter)" />
      <path d="M27 7V12" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />

      {/* Futuristic Audio Pods / Ears (Left & Right) */}
      <rect x="3.5" y="21" width="5" height="13" rx="2.5" fill="url(#ai-face-ear)" />
      <circle cx="6" cy="27.5" r="1.5" fill="#E0F2FE" />
      <rect x="45.5" y="21" width="5" height="13" rx="2.5" fill="url(#ai-face-ear)" />
      <circle cx="48" cy="27.5" r="1.5" fill="#E0F2FE" />

      {/* Ceramic Head Chassis */}
      <rect x="7" y="11" width="40" height="34" rx="16" fill="url(#ai-face-head)" stroke="#94A3B8" strokeWidth="1.2" />

      {/* High-Gloss Curved Obsidian Visor Display */}
      <rect x="11.5" y="15" width="31" height="25" rx="12" fill="url(#ai-face-visor)" />

      {/* Glass Specular Glint Reflection */}
      <path
        d="M15 17.5C21 16 33 16 39 18.5C36.5 22.5 30 23 15 17.5Z"
        fill="url(#ai-face-sheen)"
      />

      {/* Expressive Glowing AI Eyes (Curved Smiling Radiant Cyan / Emerald) */}
      <g filter="url(#ai-glow-filter)">
        {/* Left Eye */}
        <path
          d="M17 26.5C17.2 23 19.5 21 22.5 21C25.5 21 27.5 23 27.5 26.5C27 27.2 25.5 27.5 22.5 27.5C19.5 27.5 17 27.2 17 26.5Z"
          fill="url(#ai-face-cyan)"
        />
        <circle cx="23.5" cy="23.5" r="1.1" fill="#FFFFFF" />

        {/* Right Eye */}
        <path
          d="M26.5 26.5C26.5 23 28.5 21 31.5 21C34.5 21 37 23 37 26.5C37 27.2 34.5 27.5 31.5 27.5C28.5 27.5 26.5 27.2 26.5 26.5Z"
          fill="url(#ai-face-cyan)"
        />
        <circle cx="32.5" cy="23.5" r="1.1" fill="#FFFFFF" />
      </g>

      {/* Cute Glowing Cheek Blush Dots */}
      <circle cx="15.5" cy="31" r="1.8" fill="#2DD4BF" opacity="0.65" filter="url(#ai-glow-filter)" />
      <circle cx="38.5" cy="31" r="1.8" fill="#2DD4BF" opacity="0.65" filter="url(#ai-glow-filter)" />

      {/* Friendly Glowing Digital Smile Curve */}
      <path
        d="M23 32C24.5 34.5 29.5 34.5 31 32"
        stroke="url(#ai-face-cyan)"
        strokeWidth="2.2"
        strokeLinecap="round"
        filter="url(#ai-glow-filter)"
      />

      {/* Forehead Micro-Core Spark */}
      <circle cx="27" cy="17" r="1" fill="#38BDF8" opacity="0.9" />
    </svg>
  );
}

export default function FloatingAIAssistant() {
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

  const handleSend = (textToSend = null) => {
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

    setTimeout(() => {
      const response = getAssistantResponse(query, lang);
      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        sources: response.sources || ['ADA Standards of Care 2024'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 350);
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

  return (
    <>
      {/* ── Chat Modal Drawer (Floating Popover on Desktop, Bottom Sheet on Mobile) ── */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="sm:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className="fixed z-50 flex flex-col bg-white overflow-hidden shadow-2xl border border-slate-200
              inset-x-0 bottom-0 w-full h-[90vh] rounded-t-3xl sm:rounded-3xl
              sm:inset-x-auto sm:bottom-8 sm:right-6 sm:w-[450px] sm:max-w-[calc(100vw-2rem)] sm:h-[630px] sm:max-h-[calc(100vh-4.5rem)]
              animate-in slide-in-from-bottom-5 duration-200 ease-out"
            role="dialog"
            aria-modal="true"
            aria-label="Clinical AI Assistant"
          >
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-full flex items-center justify-center pt-2 pb-1 bg-teal-950 cursor-grab">
              <div className="w-10 h-1 rounded-full bg-teal-400/40" />
            </div>

            {/* ── Clean Unified Header ── */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-850 to-teal-950 text-white shrink-0 shadow-sm border-b border-teal-800">
              {/* Top Row: Brand & Action Controls */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-slate-900 to-teal-950 border border-teal-400/40 flex items-center justify-center shadow-inner overflow-hidden">
                      <AIFaceAvatar size={28} />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-teal-950 rounded-full animate-pulse shadow-[0_0_6px_#34d399]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <h3 className="font-extrabold text-sm text-white tracking-tight leading-tight whitespace-nowrap">
                        LATROCORE AI
                      </h3>
                      <span className="text-[10px] bg-teal-700/80 border border-teal-400/30 px-1.5 py-0.2 rounded font-bold text-teal-100 whitespace-nowrap">
                        Clinical Copilot
                      </span>
                    </div>
                    <p className="text-[11px] text-teal-200/80 font-medium truncate mt-0.5">
                      6 Indian & Global Languages
                    </p>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Reset Chat */}
                  <button
                    onClick={resetChat}
                    className="text-teal-300 hover:text-white hover:bg-teal-800/80 p-1.5 rounded-lg transition cursor-pointer"
                    title="Reset conversation"
                    aria-label="Reset chat"
                  >
                    <RefreshCw size={15} />
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-teal-200 hover:text-white hover:bg-teal-800/80 p-1.5 rounded-lg transition cursor-pointer"
                    title="Close Assistant (Esc)"
                    aria-label="Close Assistant"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Second Row: Sleek Segmented 6-Language Tabs */}
              <div className="bg-teal-950/80 px-3 py-1.5 border-t border-teal-900/60 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 min-w-max">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleSelectLanguage(l.code)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                        lang === l.code
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-teal-200/80 hover:text-white hover:bg-teal-900/80'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Safety Sub-strip */}
              <div className="bg-teal-900/50 px-3.5 py-1 border-t border-teal-800/50 flex items-center justify-between text-[10px] text-teal-200/90 font-medium">
                <span className="flex items-center gap-1.5 truncate">
                  <Shield size={11} className="text-teal-300 shrink-0" />
                  <span>Clinical Decision Support System</span>
                </span>
                <span className="text-[9px] bg-teal-800/70 border border-teal-500/30 px-1.5 py-0.2 rounded font-mono text-teal-100 shrink-0 ml-2">
                  ADA 2024 §6
                </span>
              </div>
            </div>

            {/* ── Messages Scroll Area ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-b from-slate-900 to-teal-950 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs overflow-hidden">
                      <AIFaceAvatar size={20} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-teal-800 text-white rounded-tr-xs font-medium'
                        : 'bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Evidence citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                        {msg.sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] text-teal-850 bg-teal-50 px-2 py-0.5 rounded-md font-semibold border border-teal-200/60"
                          >
                            <Sparkles size={9} className="text-teal-600" />
                            {src}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom Metadata & Speech Audio */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="font-semibold text-[10px]">{msg.time}</span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => speakText(msg.text)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300 transition cursor-pointer text-[10px] font-bold"
                          title="Read aloud"
                          aria-label="Read message aloud"
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX size={12} className="text-teal-700" />
                              <span>Mute</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={12} className="text-teal-700" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Suggested Questions Strip ── */}
            <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] text-teal-850 font-black shrink-0 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="text-teal-600" />
                Prompt:
              </span>
              <div className="flex items-center gap-1.5 min-w-max">
                {suggestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="shrink-0 text-[11px] bg-slate-50 hover:bg-teal-50 hover:text-teal-950 text-slate-700 font-bold px-3 py-1 rounded-full border border-slate-200/90 hover:border-teal-300 transition-all active:scale-95 cursor-pointer shadow-2xs"
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
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
            >
              {/* Mic Speech Input Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 border border-slate-200'
                }`}
                title={isListening ? 'Stop listening' : `Voice input (${currentLangObj.label})`}
                aria-label="Voice input"
              >
                {isListening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={INPUT_PLACEHOLDERS[lang] || INPUT_PLACEHOLDERS.en}
                className="flex-1 bg-slate-50 border-2 border-slate-200 focus:border-teal-700 focus:bg-white text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none transition text-slate-950 font-medium placeholder:text-slate-400"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-10 h-10 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-40 text-white flex items-center justify-center transition shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
                title="Send message"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>

            {/* Clinical Disclaimer Footnote */}
            <div className="bg-white pb-2 px-4 text-center">
              <p className="text-[10px] text-slate-400 font-medium">
                LATROCORE AI provides clinical decision support. Always confirm with your doctor.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Floating AI Assistant Avatar Trigger (Bottom-Right Corner) ── */}
      {!isOpen && (
        <div className="fixed bottom-6 sm:bottom-8 right-5 sm:right-7 z-40 flex items-center group">
          <button
            onClick={() => setIsOpen(true)}
            className="relative flex items-center justify-center cursor-pointer transition-all duration-300 transform group-hover:scale-110 active:scale-95 focus:outline-none"
            aria-label="Open Clinical AI Assistant"
          >
            {/* Outer Radiant Pulsing Aura Rings */}
            <span className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 opacity-60 blur-md group-hover:opacity-100 animate-pulse duration-1000" />
            <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-400 opacity-30 animate-ping duration-1000 pointer-events-none" />

            {/* Glowing Sphere Container */}
            <div className="relative w-15 h-15 sm:w-16 sm:h-16 rounded-full p-[3px] bg-gradient-to-tr from-teal-400 via-cyan-300 to-emerald-400 shadow-[0_10px_35px_rgba(20,184,166,0.6)]">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-900 via-teal-950 to-slate-950 flex items-center justify-center overflow-hidden border border-teal-400/40 relative">
                {/* Internal Holographic Radial Light Beam */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-400/30 via-transparent to-transparent pointer-events-none" />

                {/* Animated Eye-Catching AI Face Avatar */}
                <AIFaceAvatar size={42} className="relative z-10 transition-transform duration-300 group-hover:scale-105" />

                {/* Live Online Glowing Beacon */}
                <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950 shadow-[0_0_10px_#34d399] animate-pulse z-20" />
              </div>
            </div>

            {/* Smooth Floating Label on Hover */}
            <div className="absolute bottom-full mb-3 hidden group-hover:flex flex-col items-center pointer-events-none transition-all duration-200">
              <div className="bg-slate-950/95 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-2xl border border-teal-500/50 flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles size={13} className="text-teal-400 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="bg-gradient-to-r from-teal-200 via-cyan-100 to-white bg-clip-text text-transparent">LATROCORE AI</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
              </div>
              <div className="w-2 h-2 bg-slate-950 border-r border-b border-teal-500/50 transform rotate-45 -mt-1" />
            </div>
          </button>
        </div>
      )}
    </>
  );
}
