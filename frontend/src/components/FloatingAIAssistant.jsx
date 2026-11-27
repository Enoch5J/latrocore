import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, X, Volume2, VolumeX, Mic, MicOff,
  RefreshCw, ChevronDown, Check, Globe, Paperclip, ShieldCheck
} from 'lucide-react';
import { getAssistantResponse } from '../services/assistantEngine';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import { normalizeRole } from '../auth/ProtectedRoute';
import { applyAIPrescriptionToPatient } from '../services/dataService';
import { usePrefersReducedMotion } from '../hooks/useScrollMotion';
import {
  OPEN_AI_COMPANION_EVENT,
  DOCTOR_GREETING_DURATION_MS,
  DOCTOR_GREETING_REPEAT_INTERVAL_MS,
  startGreetingCycle,
} from '../utils/aiCompanionChat';
import FormattedAIMessage from './common/FormattedAIMessage';
import {
  getSpeechLocale,
  resolveSpeechLanguage,
  speakChatText,
  stopChatSpeech,
} from '../utils/chatSpeech';
import doctorImg from '../assets/images/doctor.png';

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
  en: "Hello! I'm Latro AI, your healthcare assistant. How can I assist you with your medications, health questions, or care today?",
  ta: "வணக்கம்! நான் உங்கள் Latro AI உதவியாளர். உங்கள் இரத்த சர்க்கரை, மருந்துகள் அல்லது உணவு முறை பற்றி நான் எப்படி உதவலாம்?",
  hi: "नमस्ते! मैं आपका Latro AI सहायक हूँ। आज मैं आपकी दवाओं, स्वास्थ्य प्रश्नों या आहार योजना में कैसे मदद कर सकता हूँ?",
  ml: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ Latro AI അസിസ്റ്റന്റാണ്. നിങ്ങളുടെ രക്തത്തിലെ പഞ്ചസാര, മരുന്നുകൾ അല്ലെങ്കിൽ ഡയറ്റ് എന്നിവയിൽ എങ്ങനെ സഹായിക്കണം?",
  te: "నమస్కారం! నేను మీ Latro AI అసిస్టెంట్‌ని. మీ బ్లడ్ షుగర్, మందులు లేదా డైట్ ప్లాన్ గురించి నేను ఎలా సహాయపడగలను?",
  kn: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ Latro AI ಸಹಾಯಕ. ನಿಮ್ಮ ರಕ್ತದ ಸಕ್ಕರೆ, ಔಷಧಿಗಳು ಅಥವಾ ಆಹಾರ ಕ್ರಮದ ಬಗ್ಗೆ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
};

const INPUT_PLACEHOLDERS = {
  en: 'Ask about glucose, medications, meals...',
  ta: 'கேள்வி கேட்கவும் (எ.கா. குளுக்கோஸ்)...',
  hi: 'प्रश्न पूछें (जैसे ग्लूकोज, दवा, आहार)...',
  ml: 'ചോദ്യം ചോദിക്കുക (ഉദാ: ഗ്ലൂക്കോസ്)...',
  te: 'ప్రశ్న అడగండి (ఉదా: గ్లూకోజ్, మందులు)...',
  kn: 'ಪ್ರಶ್ನೆ ಕೇಳಿ (ಉದಾ: ಗ್ಲೂಕೋಸ್, ಮಾತ್ರೆಗಳು)...',
};

export function AIFaceAvatar({ size = 36, className = '' }) {
  const dimensions = size != null ? { width: size, height: size } : undefined;
  return (
    <img
      src="/doctor-avatar.png"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = doctorImg;
      }}
      alt="Dr. Latro AI"
      width={size ?? 74}
      height={size ?? 82}
      style={dimensions}
      className={`shrink-0 select-none bg-transparent object-contain object-center ${className}`}
      draggable={false}
    />
  );
}

export default function FloatingAIAssistant({ initialOpen = false, initialGreeting = false } = {}) {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.some((path) =>
    location.pathname.toLowerCase().startsWith(path)
  );
  const { data, refreshData, addToast } = useApp();
  const { user: authUser, isAuthenticated } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [showHiBubble, setShowHiBubble] = useState(
    initialGreeting && !initialOpen && !isAuthPage
  );
  const hasShownGreetingRef = useRef(false);
  const greetingOpenTimerRef = useRef(null);
  const greetingHideTimerRef = useRef(null);
  const [lang, setLang] = useState('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [input, setInput] = useState('');
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [speechNotice, setSpeechNotice] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isUploadingRx, setIsUploadingRx] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [lastUploadId, setLastUploadId] = useState(null);

  const isSignedInPatient = Boolean(
    isAuthenticated && authUser && normalizeRole(authUser.role) === 'patient'
  );
  const patientId = isSignedInPatient ? authUser.id : null;
  const fileInputRef = useRef(null);

  // Active Prescriptions & Medications synced strictly for the signed-in patient
  const activePrescriptions = useMemo(() => {
    if (!isSignedInPatient || !patientId) return [];
    return (data?.prescriptions || []).filter(p => p.patientId === patientId && p.status === 'active');
  }, [data?.prescriptions, isSignedInPatient, patientId]);

  const activeMedicines = useMemo(() => {
    if (!isSignedInPatient) return [];
    return activePrescriptions.flatMap(rx => rx.medicines || []);
  }, [activePrescriptions, isSignedInPatient]);

  const prescriptionContext = useMemo(() => {
    if (!isSignedInPatient || !activeMedicines || activeMedicines.length === 0) return null;
    return activeMedicines.map(m => {
      const dose = m.dose || 'not specified';
      const route = m.route || 'not specified';
      const frequency = m.frequency || 'not specified';
      const times = Array.isArray(m.scheduleTimes) && m.scheduleTimes.length > 0
        ? m.scheduleTimes.join(', ')
        : (Array.isArray(m.times) && m.times.length > 0 ? m.times.join(', ') : 'not specified');
      const mealTiming = m.mealTiming || m.meal_timing || m.foodInstruction || 'not specified';
      const instructions = m.instructions || 'not specified';
      return `- ${m.name} | Dose: ${dose} | Route: ${route} | Frequency: ${frequency} | Schedule Times: ${times} | Meal Timing: ${mealTiming} | Instructions: ${instructions}`;
    }).join('\n');
  }, [activeMedicines, isSignedInPatient]);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      lang: 'en',
      text: WELCOME_MESSAGES.en,
      sources: [],
      time: 'Just now',
    },
  ]);

  const stopAudioPlayback = () => {
    stopChatSpeech(playbackTokenRef);
    setSpeakingMessageId(null);
  };

  // Warm up browser SpeechSynthesis voices as soon as the widget mounts/opens
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const synth = window.speechSynthesis;
    const warmVoices = () => synth.getVoices?.();
    warmVoices();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', warmVoices);
      return () => synth.removeEventListener('voiceschanged', warmVoices);
    }
    return undefined;
  }, []);

  // Stop speech cleanly if the drawer closes
  useEffect(() => {
    if (!isOpen) {
      stopChatSpeech(playbackTokenRef);
      setSpeakingMessageId(null);
      setSpeechNotice(null);
    }
  }, [isOpen]);

  // Reset chat cleanly when authenticated user changes or signs out
  useEffect(() => {
    stopChatSpeech(playbackTokenRef);
    setSpeakingMessageId(null);
    setSpeechNotice(null);
    setIsDraggingFile(false);
    setLastUploadId(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        lang,
        text: WELCOME_MESSAGES[lang] || WELCOME_MESSAGES.en,
        sources: [],
        time: 'Just now',
      },
    ]);
  }, [patientId]);

  // Update untouched initial welcome message when synced medicines load for signed-in patient
  useEffect(() => {
    if (!isSignedInPatient || activeMedicines.length === 0) return;
    const medNames = activeMedicines.map(m => m.name).join(', ');
    setMessages((prev) => {
      if (prev.length === 1 && String(prev[0].id || '').startsWith('welcome')) {
        return [
          {
            id: 'welcome-synced',
            role: 'assistant',
            lang,
            text: `${WELCOME_MESSAGES[lang] || WELCOME_MESSAGES.en}\n\n📋 **Verified Prescription Synced:** I have loaded your active medicines (${medNames}). You can ask about your prescription or any general health or medication question.`,
            sources: [],
            time: 'Just now',
          },
        ];
      }
      return prev;
    });
  }, [isSignedInPatient, activeMedicines, lang]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const langMenuRef = useRef(null);
  const inputRef = useRef(null);
  const handleSendRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopChatSpeech(playbackTokenRef);
    };
  }, []);

  // Open existing chat and immediately submit (or prefill when autoSend is false) from homepage companion cards
  useEffect(() => {
    const handleOpenWithDraft = (event) => {
      const rawQuestion = typeof event?.detail?.question === 'string' ? event.detail.question : '';
      const trimmedQuestion = rawQuestion.trim();
      const shouldAutoSend = event?.detail?.autoSend !== false;

      hasShownGreetingRef.current = true;
      if (typeof greetingOpenTimerRef.current === 'function') {
        greetingOpenTimerRef.current();
      } else {
        clearTimeout(greetingOpenTimerRef.current);
      }
      clearTimeout(greetingHideTimerRef.current);
      setShowHiBubble(false);
      setIsOpen(true);

      if (shouldAutoSend && trimmedQuestion) {
        setInput('');
        handleSendRef.current?.(trimmedQuestion);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
        return;
      }

      setInput(rawQuestion);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          const len = el.value.length;
          if (typeof el.setSelectionRange === 'function') {
            el.setSelectionRange(len, len);
          }
        }
      });
    };

    window.addEventListener(OPEN_AI_COMPANION_EVENT, handleOpenWithDraft);
    return () => window.removeEventListener(OPEN_AI_COMPANION_EVENT, handleOpenWithDraft);
  }, []);

  const dismissHiBubble = () => {
    hasShownGreetingRef.current = true;
    if (typeof greetingOpenTimerRef.current === 'function') {
      greetingOpenTimerRef.current();
    } else {
      clearTimeout(greetingOpenTimerRef.current);
    }
    clearTimeout(greetingHideTimerRef.current);
    setShowHiBubble(false);
  };

  // Show the doctor bot's "Hi there!" popup for 3s, wait 3s, and repeat until dismissed or opened
  useEffect(() => {
    if (isAuthPage || initialOpen || isOpen || hasShownGreetingRef.current) {
      return undefined;
    }

    const cancelCycle = startGreetingCycle({
      onShow: () => setShowHiBubble(true),
      onHide: () => setShowHiBubble(false),
      shouldStop: () => hasShownGreetingRef.current,
      initialDelayMs: 150,
      durationMs: DOCTOR_GREETING_DURATION_MS,
      repeatIntervalMs: DOCTOR_GREETING_REPEAT_INTERVAL_MS,
    });

    greetingOpenTimerRef.current = cancelCycle;

    return () => {
      cancelCycle();
      greetingOpenTimerRef.current = null;
    };
  }, [isAuthPage, initialOpen, isOpen]);

  useEffect(() => {
    return () => {
      if (typeof greetingOpenTimerRef.current === 'function') {
        greetingOpenTimerRef.current();
      } else {
        clearTimeout(greetingOpenTimerRef.current);
      }
      clearTimeout(greetingHideTimerRef.current);
    };
  }, []);

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
    recognition.lang = getSpeechLocale(lang);

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

  // Text to Speech per message with explicit locale + strict voice matching
  const speakText = async (msg) => {
    const messageObj = typeof msg === 'string' ? { id: 'ad-hoc', text: msg } : msg;
    if (!messageObj?.text) return;

    if (speakingMessageId === messageObj.id) {
      stopAudioPlayback();
      return;
    }

    setSpeechNotice(null);

    await speakChatText({
      text: messageObj.text,
      messageLang: messageObj.lang,
      uiLang: lang,
      playbackTokenRef,
      isStillCurrent: () => isMountedRef.current,
      onStart: () => {
        setSpeakingMessageId(messageObj.id);
      },
      onEnd: () => {
        setSpeakingMessageId((curr) => (curr === messageObj.id ? null : curr));
      },
      onError: (noticeText) => {
        setSpeakingMessageId(null);
        setSpeechNotice(noticeText);
        addToast?.({ type: 'info', message: noticeText });
      },
      onUnavailable: (noticeText) => {
        setSpeakingMessageId(null);
        setSpeechNotice(noticeText);
        addToast?.({ type: 'info', message: noticeText });
      },
    });
  };

  const handleSend = async (textToSend = null) => {
    const query = (textToSend || input).trim();
    if (!query) return;
    const requestLang = lang;

    const history = messages
      .filter((m) => !m.isLoading && !String(m.id || '').startsWith('welcome') && !String(m.id || '').startsWith('lang-'))
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.text }));

    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const userMsg = {
      id: `u-${uid}`,
      role: 'user',
      lang: requestLang,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Loading indicator
    const tempAiId = `a-loading-${uid}`;
    const loadingMsg = {
      id: tempAiId,
      role: 'assistant',
      lang: requestLang,
      text: 'Thinking...',
      isLoading: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, loadingMsg]);

    const activeContext = isSignedInPatient ? prescriptionContext : null;

    try {
      // Query backend Gemini API with strict PII scrubbing, safety guardrails, conversation history & patient prescription context
      const data = await api.askAssistant(
        query,
        requestLang,
        activeContext,
        history,
        isSignedInPatient && lastUploadId ? { upload_id: lastUploadId } : {}
      );
      const aiMsg = {
        id: `a-${uid}`,
        role: 'assistant',
        lang: resolveSpeechLanguage(data.content, data.language || requestLang, requestLang),
        text: data.content,
        sources: data.sources || [],
        modelId: data.model_id,
        piiScrubbed: data.pii_scrubbed,
        requiresHandoff: data.requires_handoff,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => prev.map((m) => (m.id === tempAiId ? aiMsg : m)));
    } catch (err) {
      // Graceful local engine fallback with prescription context & conversation history
      const response = getAssistantResponse(
        query,
        requestLang,
        activeContext,
        isSignedInPatient ? activeMedicines : null,
        history
      );
      const fallbackMsg = {
        id: `a-${uid}`,
        role: 'assistant',
        lang: resolveSpeechLanguage(response.text, requestLang, requestLang),
        text: response.text,
        sources: response.sources || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => prev.map((m) => (m.id === tempAiId ? fallbackMsg : m)));
    }
  };

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  // Process prescription upload strictly for signed-in patients
  const processPrescriptionFile = async (file) => {
    if (!file || !isSignedInPatient) return;

    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const userFileMsg = {
      id: `u-file-${uid}`,
      role: 'user',
      text: `📎 [Uploaded Prescription]: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userFileMsg]);

    const tempLoadingId = `a-upload-${uid}`;
    const loadingMsg = {
      id: tempLoadingId,
      role: 'assistant',
      text: 'Gemini Vision AI is analyzing and digitizing your prescription document...',
      isLoading: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, loadingMsg]);
    setIsUploadingRx(true);

    try {
      const result = await api.analyzePrescriptionAI(file);

      if (!result.is_valid_prescription) {
        const rejectionMsg = {
          id: `a-${uid}`,
          role: 'assistant',
          lang: 'en',
          text: `⚠️ **Prescription Upload Rejected**\n\n**Reason:** ${result.rejection_reason || 'The uploaded file could not be verified as an authentic doctor prescription.'}\n\n**Strict Safety Policy:** LATROCORE strictly processes authentic medical prescriptions with clear medication orders. Please upload a clear document showing clinic header and prescribed medications.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => prev.map((m) => (m.id === tempLoadingId ? rejectionMsg : m)));
        return;
      }

      if (result.upload_id) {
        setLastUploadId(result.upload_id);
      }

      // Synchronize locally and to backend patient profile
      if (patientId) {
        applyAIPrescriptionToPatient(patientId, result);
        try {
          await api.applyAIPrescription({
            patient_id: patientId,
            ...result,
          });
        } catch (applyErr) {
          console.warn('Backend DB apply sync notice (continuing with local sync):', applyErr);
        }
        refreshData();
      }

      const medsList = (result.medicines || []).map((m) => {
        const nameStr = m.name || 'unclear';
        const doseStr = m.dose || 'not specified';
        const freqStr = m.frequency || 'not specified';
        const timingStr = m.meal_timing || m.instructions || 'timing not specified';
        const isUnclear = nameStr.toLowerCase().includes('unclear') || String(doseStr).toLowerCase().includes('unclear') || timingStr.toLowerCase().includes('unclear');
        return `• **${nameStr}** — ${doseStr} (${freqStr}, ${timingStr})${isUnclear ? ' ⚠️ [Needs verification]' : ''}`;
      }).join('\n') || '• No legible medicines extracted';

      const responseText = `✅ **Prescription Successfully Synchronized!**\n\n` +
        `**Doctor:** ${result.doctor_name || 'not specified'}\n` +
        `**Diagnosis:** ${result.diagnosis || 'not specified'}\n\n` +
        `**Detected Medications:**\n${medsList}\n\n` +
        `🔒 **Prescription Synced:** You can now ask about a medicine's dose or timing from this document, or still ask any general health or medication question.`;

      const successMsg = {
        id: `a-${uid}`,
        role: 'assistant',
        lang: 'en',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => prev.map((m) => (m.id === tempLoadingId ? successMsg : m)));
      addToast?.({ type: 'success', message: 'Prescription synchronized with Latro AI' });
    } catch (err) {
      const status = err?.status;
      const errMsgLower = String(err?.message || '').toLowerCase();
      const isAuthErr = status === 401 || errMsgLower.includes('authenticated') || errMsgLower.includes('401');
      const isForbiddenErr = status === 403 || errMsgLower.includes('403') || errMsgLower.includes('only patients') || errMsgLower.includes('role required');
      const isThrottled = errMsgLower.includes('503') || errMsgLower.includes('peak demand') || errMsgLower.includes('high demand') || errMsgLower.includes('throttled');
      const friendlyDetail = isAuthErr
        ? 'Please sign in as a patient to upload a prescription.'
        : isForbiddenErr
        ? 'Only signed-in patients can upload prescriptions.'
        : isThrottled
        ? 'Google Gemini AI services are temporarily experiencing peak demand (status 503). Your prescription image was received safely — please click the paperclip to retry in a few seconds.'
        : (err.message || 'Error communicating with Gemini Vision AI. Please ensure the document is clear and try again.');

      const errMsg = {
        id: `a-${uid}`,
        role: 'assistant',
        lang: 'en',
        text: `❌ **Failed to process prescription:** ${friendlyDetail}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => prev.map((m) => (m.id === tempLoadingId ? errMsg : m)));
    } finally {
      setIsUploadingRx(false);
    }
  };

  const handleDirectFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isSignedInPatient) return;
    await processPrescriptionFile(file);
  };

  const handleDragOver = (e) => {
    if (!isSignedInPatient) return;
    const hasFiles = Array.from(e.dataTransfer?.types || []).includes('Files');
    if (!hasFiles) return;
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    if (!isSignedInPatient) return;
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (e) => {
    if (!isSignedInPatient) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    await processPrescriptionFile(file);
  };

  const handlePaste = async (e) => {
    if (!isSignedInPatient) return;
    const items = Array.from(e.clipboardData?.items || []);
    const fileItem = items.find((item) => item.kind === 'file');
    const file = fileItem ? fileItem.getAsFile() : e.clipboardData?.files?.[0];
    if (!file) return;
    e.preventDefault();
    await processPrescriptionFile(file);
  };

  const handleSelectLanguage = (selectedCode) => {
    setLang(selectedCode);
    setLangMenuOpen(false);
    setSpeechNotice(null);

    // Add language switch indicator in chat
    const switchMsg = {
      id: `lang-${Date.now()}`,
      role: 'assistant',
      lang: selectedCode,
      text: WELCOME_MESSAGES[selectedCode] || WELCOME_MESSAGES.en,
      sources: [],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, switchMsg]);
  };

  const resetChat = () => {
    stopAudioPlayback();
    setSpeechNotice(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        lang,
        text: WELCOME_MESSAGES[lang] || WELCOME_MESSAGES.en,
        sources: [],
        time: 'Just now',
      },
    ]);
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

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
            className={`fixed z-50 flex flex-col bg-white overflow-hidden shadow-2xl border ${
              isSignedInPatient && isDraggingFile ? 'border-[#046A38] ring-2 ring-[#046A38]/30' : 'border-stone-200'
            }
              bottom-4 right-4 sm:bottom-6 sm:right-6
              w-[calc(100vw-2rem)] sm:w-[420px] max-w-[440px]
              h-[520px] max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-5rem)]
              rounded-2xl transition-all`}
            role="dialog"
            aria-modal="true"
            aria-label="Latro AI Assistant"
            onDragOver={isSignedInPatient ? handleDragOver : undefined}
            onDragLeave={isSignedInPatient ? handleDragLeave : undefined}
            onDrop={isSignedInPatient ? handleDrop : undefined}
            onPaste={isSignedInPatient ? handlePaste : undefined}
          >

            {/* ── Clean & Simple Single Header ── */}
            <div className="bg-[#046A38] text-white shrink-0 px-4 py-3 flex items-center justify-between gap-3 border-b border-[#03542C]">
              {/* Bot Info with Simple Clean Text */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0 flex items-center justify-center">
                  <AIFaceAvatar size={38} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-white tracking-tight leading-tight">
                    Latro AI
                  </h3>
                  <p className="text-xs text-emerald-100/90 leading-tight mt-0.5 font-normal">
                    Doctor AI Decision Support
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

            {/* ── Active Prescriptions Sync Banner & Quick Chips ── */}
            {activeMedicines.length > 0 && (
              <div className="bg-[#E8F5EE] border-b border-[#A8D7BD] px-3.5 py-2 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="font-extrabold text-[#046A38] flex items-center gap-1 shrink-0">
                    <ShieldCheck size={13} className="text-[#046A38]" />
                    <span>Rx Synced ({activeMedicines.length} Meds):</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 truncate">
                    {activeMedicines.map(m => m.name).join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => handleSend("What are the potential adverse effects and precautions of my prescribed medicines?")}
                    className="px-2 py-0.5 rounded-full bg-white border border-[#A8D7BD] text-[10px] font-bold text-[#046A38] hover:bg-emerald-100 transition whitespace-nowrap cursor-pointer"
                  >
                    ⚠️ Adverse Effects
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend("What lifestyle and diet tips do you recommend for my medications?")}
                    className="px-2 py-0.5 rounded-full bg-white border border-[#A8D7BD] text-[10px] font-bold text-[#046A38] hover:bg-emerald-100 transition whitespace-nowrap cursor-pointer"
                  >
                    🥗 Lifestyle & Diet
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend("What is the daily schedule and timing for taking my medicines?")}
                    className="px-2 py-0.5 rounded-full bg-white border border-[#A8D7BD] text-[10px] font-bold text-[#046A38] hover:bg-emerald-100 transition whitespace-nowrap cursor-pointer"
                  >
                    ⏰ Timing Routine
                  </button>
                </div>
              </div>
            )}

            {/* ── Messages Scroll Area ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF6EF] min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className={`shrink-0 mt-0.5 flex items-start justify-center transition-opacity ${
                      msg.isLoading ? 'opacity-80' : ''
                    }`}>
                      <AIFaceAvatar size={30} />
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
                        {msg.role === 'assistant' ? (
                          <FormattedAIMessage text={msg.text} />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        )}

                        {/* Bottom Metadata & Speech Audio */}
                        <div className={`mt-2 flex items-center justify-between text-[11px] pt-1 ${
                          msg.role === 'user' ? 'text-emerald-100/70' : 'text-stone-500'
                        }`}>
                          <span className="font-semibold text-[10px]">{msg.time}</span>
                          {msg.role === 'assistant' && (() => {
                            const isMsgSpeaking = speakingMessageId === msg.id;
                            return (
                              <button
                                type="button"
                                onClick={() => speakText(msg)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 hover:bg-[#E8F5EE] text-stone-700 hover:text-[#046A38] border border-stone-200 hover:border-[#A8D7BD] transition cursor-pointer text-[10px] font-bold"
                                title={isMsgSpeaking ? 'Stop audio' : 'Read aloud'}
                                aria-label={isMsgSpeaking ? 'Stop reading message aloud' : 'Read message aloud'}
                                aria-pressed={isMsgSpeaking}
                              >
                                {isMsgSpeaking ? (
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
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Audio Playback Availability Notice ── */}
            {speechNotice && (
              <div
                role="status"
                aria-live="polite"
                className="bg-amber-50 border-t border-amber-200 px-3.5 py-2 flex items-center justify-between gap-2 text-[11px] font-medium text-amber-950 shrink-0"
              >
                <span>{speechNotice}</span>
                <button
                  type="button"
                  onClick={() => setSpeechNotice(null)}
                  className="text-amber-800 hover:text-amber-950 p-0.5 rounded shrink-0 cursor-pointer"
                  aria-label="Dismiss audio notice"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* ── Drag & Drop Overlay (Signed-In Patients Only) ── */}
            {isSignedInPatient && isDraggingFile && (
              <div className="bg-emerald-50 border-b border-emerald-300 px-4 py-2 text-center text-xs font-bold text-[#046A38] shrink-0">
                Drop your prescription photo or PDF here to analyze
              </div>
            )}

            {/* ── Input Box Form with Patient-Only Prescription Upload ── */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-2.5 sm:p-3 bg-white border-t border-[#E8DCC8] flex items-center gap-1.5 sm:gap-2 shrink-0"
            >
              {/* Prescription Upload Controls: visible & enabled ONLY for signed-in patients */}
              {isSignedInPatient && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleDirectFileUpload}
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingRx}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
                    title="Upload prescription photo or PDF"
                    aria-label="Upload prescription"
                  >
                    <Paperclip size={16} />
                  </button>
                </>
              )}

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
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={isSignedInPatient ? handlePaste : undefined}
                placeholder={
                  isSignedInPatient && activeMedicines.length > 0
                    ? 'Ask about your prescription or any health question...'
                    : (INPUT_PLACEHOLDERS[lang] || INPUT_PLACEHOLDERS.en)
                }
                className="flex-1 bg-stone-50/70 border border-stone-200 focus:border-[#046A38] focus:bg-white focus:ring-2 focus:ring-[#046A38]/15 text-xs sm:text-sm rounded-xl px-3 py-2 outline-none transition text-stone-900 font-medium placeholder:text-stone-400"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || isUploadingRx}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#046A38] hover:bg-[#03542C] disabled:opacity-40 text-white flex items-center justify-center transition shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0 active:scale-95"
                title="Send message"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>

            {/* Clinical Disclaimer Footnote */}
            <div className="bg-white pb-2 pt-0.5 px-4 text-center shrink-0">
              <p className="text-[10px] text-stone-400 font-medium tracking-tight">
                AI decision support · Always verify with your doctor
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Floating Doctor AI Assistant Avatar Trigger (Bottom-Right Corner) ── */}
      {!isOpen && (
        <div className="fixed bottom-6 sm:bottom-8 right-6 sm:right-8 z-40 flex flex-col items-end">

          {/* ── Temporary 5s Doctor Greeting Speech Bubble Above Doctor Bot ── */}
          {showHiBubble && (
            <div
              role="status"
              aria-live="polite"
              className="mb-2.5 relative cursor-pointer"
              onClick={() => {
                dismissHiBubble();
                setIsOpen(true);
              }}
              style={
                prefersReducedMotion
                  ? undefined
                  : { animation: 'fadeInUp 0.35s ease-out forwards' }
              }
            >
              <div className="relative bg-white border border-[#E8DCC8] shadow-lg rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[235px]">
                {/* Dismiss 'x' button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissHiBubble();
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-white hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-full flex items-center justify-center shadow-md border border-stone-200 transition cursor-pointer"
                  title="Close greeting"
                  aria-label="Close greeting"
                >
                  <X size={11} />
                </button>
                <p className="text-sm font-bold text-[#093322] leading-tight">Hi there! 👋</p>
                <p className="text-[11px] font-medium text-stone-600 mt-0.5 leading-snug">
                  I&apos;m Dr. Latro AI — need help today?
                </p>
                {/* Tail pointing down toward Dr. Latro AI */}
                <span className="absolute right-7 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-[#E8DCC8] rotate-45" />
              </div>
            </div>
          )}

          {/* Trigger Button with Standalone Transparent Doctor Image as Latro AI Bot */}
          <button
            type="button"
            onClick={() => {
              dismissHiBubble();
              setIsOpen(true);
            }}
            className="relative flex flex-col items-center cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 focus:outline-none"
            aria-label="Open Latro AI Assistant"
          >
            <AIFaceAvatar
              size={null}
              className="w-16 h-[70px] sm:w-[74px] sm:h-[82px]"
            />

            <span className="relative z-10 -mt-1 px-3 py-0.5 rounded-full bg-[#046A38] text-white text-[11px] font-bold tracking-tight shadow-sm whitespace-nowrap">
              Latro AI
            </span>
          </button>
        </div>
      )}
    </>
  );
}
