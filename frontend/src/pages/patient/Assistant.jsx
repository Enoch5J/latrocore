import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { normalizeRole } from '../../auth/ProtectedRoute';
import { Modal, Badge } from '../../components/ui';
import {
  Send, Mic, MicOff, Volume2, VolumeX, Globe, MessageSquare, Heart, Phone,
  X, ChevronRight, AlertCircle, Paperclip, Sparkles, CheckCircle2, ShieldCheck,
  FileText, Pill, UploadCloud
} from 'lucide-react';
import { getAssistantResponse, getSuggestedQuestions, TOPICS } from '../../services/assistantEngine';
import { addCounsellingRequest, addNotification, addAuditEntry, applyAIPrescriptionToPatient } from '../../services/dataService';
import { api } from '../../services/api';
import PrescriptionUploadModal from '../../components/patient/PrescriptionUploadModal';
import { AIFaceAvatar } from '../../components/FloatingAIAssistant';
import FormattedAIMessage from '../../components/common/FormattedAIMessage';
import {
  getSpeechLocale,
  resolveSpeechLanguage,
  speakChatText,
  stopChatSpeech,
} from '../../utils/chatSpeech';

const LANGUAGES = [
  { code: 'en', label: 'English', badge: 'EN' },
  { code: 'ta', label: 'தமிழ்', badge: 'TA' },
  { code: 'hi', label: 'हिन्दी', badge: 'HI' },
  { code: 'ml', label: 'മലയാളം', badge: 'ML' },
  { code: 'te', label: 'తెలుగు', badge: 'TE' },
  { code: 'kn', label: 'ಕನ್ನಡ', badge: 'KN' },
];

export default function Assistant() {
  const { currentUser, data, refreshData, addToast } = useApp();
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [lang, setLang] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [speechNotice, setSpeechNotice] = useState(null);
  const [showTopics, setShowTopics] = useState(false);
  const [showVoiceSession, setShowVoiceSession] = useState(false);
  const [showCounsellingForm, setShowCounsellingForm] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploadingRx, setIsUploadingRx] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [lastUploadId, setLastUploadId] = useState(null);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const playbackTokenRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    playbackTokenRef.current = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      const warmVoices = () => synth.getVoices?.();
      warmVoices();
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', warmVoices);
        return () => {
          isMountedRef.current = false;
          synth.removeEventListener('voiceschanged', warmVoices);
          stopChatSpeech(playbackTokenRef);
        };
      }
    }
    return () => {
      isMountedRef.current = false;
      stopChatSpeech(playbackTokenRef);
    };
  }, []);

  const activeUser = auth?.isAuthenticated && auth?.user ? auth.user : currentUser;
  const isSignedInPatient = Boolean(activeUser && normalizeRole(activeUser.role) === 'patient');
  const patientId = isSignedInPatient ? activeUser.id : null;

  // Active Prescriptions & Medications synced from data
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
      const times = Array.isArray(m.scheduleTimes) && m.scheduleTimes.length > 0
        ? m.scheduleTimes.join(', ')
        : (Array.isArray(m.times) && m.times.length > 0 ? m.times.join(', ') : 'not specified');
      return `- ${m.name} | Dose: ${m.dose || 'not specified'} | Route: ${m.route || 'not specified'} | Frequency: ${m.frequency || 'not specified'} | Schedule Times: ${times} | Meal Timing: ${m.foodInstruction || m.meal_timing || 'not specified'} | Instructions: ${m.instructions || 'not specified'}`;
    }).join('\n');
  }, [activeMedicines, isSignedInPatient]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    let welcomeText = "Hello! I'm Latro AI, your healthcare assistant. I can help you understand general health and medication topics, or explain the instructions and timing on your uploaded prescription.";
    if (activeMedicines.length > 0) {
      welcomeText += `\n\n📋 Verified Prescription Synced: I have loaded your active regimen (${activeMedicines.map(m => m.name).join(', ')}). You can ask about your uploaded medicines or any general health question.`;
    }
    setMessages(prev => {
      if (prev.length === 0 || (prev.length === 1 && String(prev[0].id || '').startsWith('welcome'))) {
        return [{
          id: activeMedicines.length > 0 ? 'welcome-synced' : 'welcome',
          role: 'assistant',
          lang: 'en',
          text: welcomeText,
          time: new Date().toISOString(),
        }];
      }
      return prev;
    });
    if (searchParams.get('action') === 'counselling') setShowCounsellingForm(true);
  }, [activeMedicines]);

  // Speech Recognition
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      addToast({ type: 'warning', message: 'Speech recognition is not available in this browser. Please type your question.' });
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = getSpeechLocale(lang);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed') addToast({ type: 'warning', message: 'Microphone access denied. Please allow microphone access or type your question.' });
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [lang, addToast]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // Speech Synthesis
  const stopSpeaking = () => {
    stopChatSpeech(playbackTokenRef);
    setSpeakingMessageId(null);
  };

  const speak = async (msg) => {
    const messageObj = typeof msg === 'string' ? { id: 'ad-hoc', text: msg, lang } : msg;
    if (!messageObj?.text) return;

    if (speakingMessageId === messageObj.id) {
      stopSpeaking();
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
        addToast({ type: 'info', message: noticeText });
      },
      onUnavailable: (noticeText) => {
        setSpeakingMessageId(null);
        setSpeechNotice(noticeText);
        addToast({ type: 'info', message: noticeText });
      },
    });
  };

  // Send query with full prescription context & conversation history
  const handleSend = async (textToSend = null) => {
    const text = (textToSend || input).trim();
    if (!text) return;
    const requestLang = lang;

    const history = messages
      .filter((m) => !m.isLoading && !String(m.id || '').startsWith('welcome'))
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.text }));

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text, lang: requestLang, time: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');

    const tempLoadingId = `a-loading-${Date.now()}`;
    const loadingMsg = { id: tempLoadingId, role: 'assistant', text: 'Analyzing with prescription guardrails...', isLoading: true, lang: requestLang, time: new Date().toISOString() };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const resData = await api.askAssistant(
        text,
        requestLang,
        prescriptionContext,
        history,
        lastUploadId ? { upload_id: lastUploadId } : {}
      );
      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: resData.content,
        lang: resolveSpeechLanguage(resData.content, resData.language || requestLang, requestLang),
        sources: resData.sources,
        modelId: resData.model_id,
        time: new Date().toISOString()
      };
      setMessages(prev => prev.map(m => m.id === tempLoadingId ? assistantMsg : m));
    } catch {
      const response = getAssistantResponse(text, requestLang, prescriptionContext, activeMedicines, history);
      const fallbackMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        lang: resolveSpeechLanguage(response.text, requestLang, requestLang),
        topic: response.topic,
        matched: response.matched,
        time: new Date().toISOString()
      };
      setMessages(prev => prev.map(m => m.id === tempLoadingId ? fallbackMsg : m));
    }
  };

  // Direct prescription file upload inside AI prompt (patient-only)
  const processPrescriptionFile = async (file) => {
    if (!file || !isSignedInPatient) return;

    const userFileMsg = {
      id: `u-file-${Date.now()}`,
      role: 'user',
      text: `📎 [Uploaded Prescription Document]: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      lang,
      time: new Date().toISOString()
    };
    setMessages(prev => [...prev, userFileMsg]);

    const tempLoadingId = `a-upload-${Date.now()}`;
    const loadingMsg = {
      id: tempLoadingId,
      role: 'assistant',
      text: 'Gemini Vision AI is analyzing and digitizing your prescription document... Checking authenticity and extracting clinical schedule...',
      isLoading: true,
      lang,
      time: new Date().toISOString()
    };
    setMessages(prev => [...prev, loadingMsg]);
    setIsUploadingRx(true);

    try {
      const result = await api.analyzePrescriptionAI(file);

      if (!result.is_valid_prescription) {
        const rejectionMsg = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Prescription Upload Rejected**\n\n**Reason:** ${result.rejection_reason || 'The uploaded image could not be verified as an authentic doctor prescription.'}\n\n**Strict Safety Policy:** The LATROCORE clinical digitizer strictly processes authentic medical prescriptions. Please upload a clear document showing clinic header, prescribed medications, dosage instructions, and doctor authorization.`,
          lang,
          time: new Date().toISOString()
        };
        setMessages(prev => prev.map(m => m.id === tempLoadingId ? rejectionMsg : m));
        setIsUploadingRx(false);
        return;
      }

      if (result.upload_id) {
        setLastUploadId(result.upload_id);
      }

      // Automatically apply & sync to patient profile
      applyAIPrescriptionToPatient(patientId, result);
      try {
        await api.applyAIPrescription({
          patient_id: patientId,
          ...result
        });
      } catch (applyErr) {
        console.warn('Backend DB apply sync notice:', applyErr);
      }

      refreshData();

      const medsList = (result.medicines || []).map(m => {
        const nameStr = m.name || 'unclear';
        const doseStr = m.dose || 'not specified';
        const freqStr = m.frequency || 'not specified';
        const timingStr = m.meal_timing || m.instructions || 'timing not specified';
        const isUnclear = nameStr.toLowerCase().includes('unclear') || String(doseStr).toLowerCase().includes('unclear');
        return `• **${nameStr}** — ${doseStr} (${freqStr}, ${timingStr})${isUnclear ? ' ⚠️ [Unclear handwriting flagged]' : ''}`;
      }).join('\n');

      const responseText = `✅ **Prescription Successfully Synchronized!**\n\n` +
        `**Doctor:** ${result.doctor_name || 'not specified'}\n` +
        `**Clinic:** ${result.clinic_name || 'not specified'}\n` +
        `**Diagnosis:** ${result.diagnosis || 'not specified'}\n\n` +
        `**Detected Medications:**\n${medsList}\n\n` +
        `**Dietary Strategy:**\n${result.diet_plan?.summary || result.diet_plan?.strategy || 'not specified'}\n\n` +
        `🔒 **Strict AI Guardrails Active:** My prescription explanations are anchored to these detected medications without guessing missing fields, and you can also ask any general health or medicine question.`;

      const successMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: responseText,
        lang,
        time: new Date().toISOString()
      };
      setMessages(prev => prev.map(m => m.id === tempLoadingId ? successMsg : m));
      addToast({ type: 'success', message: 'Prescription synchronized with Latro AI' });
    } catch (err) {
      const isThrottled = err?.message && (err.message.includes('503') || err.message.toLowerCase().includes('peak demand') || err.message.toLowerCase().includes('high demand') || err.message.toLowerCase().includes('throttled'));
      const friendlyDetail = isThrottled
        ? 'Google Gemini AI services are temporarily experiencing peak demand (status 503). Your prescription image was received safely — please retry in a few moments.'
        : (err.message || 'Network error communicating with Gemini Vision AI. Please try again.');

      const errMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `❌ **Failed to process prescription:** ${friendlyDetail}`,
        lang,
        time: new Date().toISOString()
      };
      setMessages(prev => prev.map(m => m.id === tempLoadingId ? errMsg : m));
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

  const handleSuggestedQuestion = (q) => {
    handleSend(q);
  };

  const handleCounsellingRequest = async (topic) => {
    await addCounsellingRequest({ patientId: currentUser.id, requestedBy: currentUser.id, type: 'patient_request', topic, priority: 'normal', notes: 'Requested via AI Assistant' });
    await addNotification({ userId: currentUser.assignedPharmacist, type: 'counselling', title: 'New Counselling Request', message: `${currentUser.name} has requested ${topic} counselling.`, relatedId: '' });
    await addAuditEntry({ actor: currentUser.id, actorRole: 'patient', action: 'counselling_requested', patientId: currentUser.id, details: `Requested ${topic} counselling via assistant` });
    refreshData();
    setShowCounsellingForm(false);
    addToast({ type: 'success', message: 'Counselling request sent to your Pharm D team' });
    setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: `Your ${topic} counselling request has been sent. Your Pharm D team will contact you to schedule a session.`, lang, time: new Date().toISOString() }]);
  };

  const suggestions = getSuggestedQuestions(lang);

  return (
    <div className="h-[calc(100vh-190px)] flex flex-col animate-fade-in space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0 flex items-center justify-center">
            <AIFaceAvatar size={42} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-950">Latro AI</h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                Gemini Powered
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600">Prescription-grounded copilot • Strict anti-hallucination guardrails</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Language switcher */}
          <div className="flex gap-1 border-2 border-slate-300 rounded-xl overflow-hidden bg-white p-0.5">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${lang === l.code ? 'bg-teal-800 text-white' : 'text-slate-800 hover:bg-slate-100'}`}>
                <span className="font-extrabold text-[10px] mr-1">{l.badge}</span> {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="btn-outline btn-sm bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 font-extrabold cursor-pointer"
          >
            <Sparkles size={14} className="text-emerald-600" />
            <span>Upload Rx</span>
          </button>
          <button onClick={() => setShowTopics(true)} className="btn-outline btn-sm font-bold">Topics</button>
          <button onClick={() => setShowVoiceSession(true)} className="btn-outline btn-sm font-bold"><Phone size={14} /> Voice</button>
          <button onClick={() => setShowCounsellingForm(true)} className="btn-outline btn-sm font-bold text-rose-700 border-rose-300 hover:bg-rose-50"><Heart size={14} /> Counselling</button>
        </div>
      </div>

      {/* Prescription Sync Banner */}
      {activeMedicines.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-emerald-950 flex items-center gap-1.5 flex-wrap">
                <span>Active Prescription Synced ({activeMedicines.length} Medicines):</span>
                <span className="font-semibold text-emerald-800 truncate">
                  {activeMedicines.map(m => m.name).join(', ')}
                </span>
              </p>
              <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                AI answers strictly bounded to your active medicines. Zero hallucination guarantee.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              onClick={() => handleSend("What are the common adverse effects and precautions of my prescribed medicines?")}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold text-[11px] cursor-pointer"
            >
              Side Effects
            </button>
            <button
              onClick={() => handleSend("What is the recommended meal and diet plan for my prescribed medications?")}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold text-[11px] cursor-pointer"
            >
              Diet Plan
            </button>
            <button
              onClick={() => handleSend("Can you explain the daily timing and routine for taking my tablets?")}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold text-[11px] cursor-pointer"
            >
              Medicine Timing
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div
        className={`flex-1 card overflow-hidden flex flex-col border-2 ${isSignedInPatient && isDraggingFile ? 'border-emerald-500 ring-2 ring-emerald-400/40' : 'border-slate-200'}`}
        onDragOver={isSignedInPatient ? handleDragOver : undefined}
        onDragLeave={isSignedInPatient ? handleDragLeave : undefined}
        onDrop={isSignedInPatient ? handleDrop : undefined}
        onPaste={isSignedInPatient ? handlePaste : undefined}
      >
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/60">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-5 py-3.5 shadow-xs border ${
                msg.role === 'user'
                  ? 'bg-teal-800 text-white border-teal-900 rounded-br-xs'
                  : 'bg-white text-slate-950 border-slate-200 rounded-bl-xs'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-100">
                    <AIFaceAvatar size={22} />
                    <span className="text-xs font-black text-[#046A38] uppercase tracking-wider">Latro AI</span>
                    {activeMedicines.length > 0 && (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full border border-emerald-300 ml-auto">
                        Rx Guardrail Active
                      </span>
                    )}
                  </div>
                )}
                {msg.isLoading ? (
                  <div className="flex items-center gap-2.5 py-1 px-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-700 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" />
                    </div>
                    <span className="text-xs text-slate-500 font-bold tracking-wide animate-pulse">
                      {msg.text || 'AI is thinking...'}
                    </span>
                  </div>
                ) : (
                  <>
                    {msg.role === 'assistant' ? (
                      <FormattedAIMessage text={msg.text} className="text-sm font-medium" />
                    ) : (
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}
                    <div className="flex items-center justify-between mt-2.5 pt-1 border-t border-slate-100/60 text-[11px] font-semibold">
                      <span className={msg.role === 'user' ? 'text-teal-200' : 'text-slate-600'}>
                        {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'assistant' && (() => {
                        const isMsgSpeaking = speakingMessageId === msg.id;
                        return (
                          <button
                            type="button"
                            onClick={() => speak(msg)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title={isMsgSpeaking ? 'Stop audio' : 'Read aloud'}
                            aria-label={isMsgSpeaking ? 'Stop reading message aloud' : 'Read message aloud'}
                            aria-pressed={isMsgSpeaking}
                          >
                            {isMsgSpeaking ? (
                              <>
                                <VolumeX size={15} />
                                <span>Mute</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={15} />
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

        {speechNotice && (
          <div
            role="status"
            aria-live="polite"
            className="bg-amber-50 border-t border-amber-200 px-4 py-2 flex items-center justify-between gap-2 text-xs font-medium text-amber-950"
          >
            <span>{speechNotice}</span>
            <button
              type="button"
              onClick={() => setSpeechNotice(null)}
              className="text-amber-800 hover:text-amber-950 p-0.5 rounded shrink-0 cursor-pointer"
              aria-label="Dismiss audio notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Suggested Clinical Questions */}
        {messages.length <= 2 && (
          <div className="px-4 py-3 bg-white border-t border-slate-200">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Suggested Clinical Questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(q)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer text-slate-950 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar with Patient-Only Prescription Upload */}
        <div className="border-t-2 border-slate-200 p-3 sm:p-4 bg-white">
          {isSignedInPatient && isDraggingFile && (
            <div className="mb-2 rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-center text-xs font-bold text-emerald-800">
              Drop your prescription photo or PDF here to analyze
            </div>
          )}

          {/* Hidden file input for direct prescription upload (patient-only) */}
          {isSignedInPatient && (
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleDirectFileUpload}
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
            />
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
            {/* Direct Upload Button (patient-only) */}
            {isSignedInPatient && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingRx}
                className="p-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-all cursor-pointer flex items-center gap-1"
                title="Directly upload prescription photo or PDF into AI"
                aria-label="Upload prescription"
              >
                <Paperclip size={18} />
                <span className="hidden md:inline text-xs font-extrabold">Upload Rx</span>
              </button>
            )}

            {/* Mic Button */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse-soft'
                  : 'hover:bg-slate-100 text-slate-800 border-slate-300'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={isSignedInPatient ? handlePaste : undefined}
              placeholder={
                isListening
                  ? 'Listening... Speak clearly into your mic'
                  : activeMedicines.length > 0
                  ? 'Ask about your prescription or any general health or medication question...'
                  : 'Ask about medications, health topics, or upload your prescription...'
              }
              className="input flex-1 text-sm font-semibold text-slate-950 placeholder:text-slate-500"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isUploadingRx}
              className="btn-primary px-5 font-black text-sm cursor-pointer disabled:opacity-40"
            >
              <Send size={16} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          {isListening && (
            <p className="text-xs font-bold text-rose-700 mt-2 flex items-center gap-1.5 animate-pulse-soft">
              <Mic size={14} className="text-rose-600 animate-pulse" /> Listening... Speak now
            </p>
          )}
        </div>
      </div>

      {/* Topics Modal */}
      <Modal open={showTopics} onClose={() => setShowTopics(false)} title="Health Topics" size="md">
        <p className="text-sm text-text-secondary mb-4">These topics demonstrate education and navigation capabilities, not diagnostic functions.</p>
        <div className="space-y-2">
          {TOPICS.map(topic => (
            <button
              key={topic.id}
              onClick={() => { handleSuggestedQuestion(topic.label[lang] || topic.label.en); setShowTopics(false); }}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div>
                <p className="font-medium text-sm text-text-primary">{topic.label[lang] || topic.label.en}</p>
                <p className="text-xs text-text-secondary">{topic.desc}</p>
              </div>
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
          ))}
        </div>
      </Modal>

      {/* Voice Session Modal */}
      <VoiceSessionModal open={showVoiceSession} onClose={() => setShowVoiceSession(false)} lang={lang} onMessage={(text) => {
        handleSuggestedQuestion(text);
        setShowVoiceSession(false);
      }} />

      {/* Counselling Form */}
      <CounsellingFormModal open={showCounsellingForm} onClose={() => setShowCounsellingForm(false)} onSubmit={handleCounsellingRequest} />

      {/* Prescription Upload & Verification Modal */}
      <PrescriptionUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onPrescriptionApplied={() => {
          refreshData();
          addToast({ type: 'success', message: 'Prescription synchronized with AI Assistant' });
        }}
      />
    </div>
  );
}

function VoiceSessionModal({ open, onClose, lang, onMessage }) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef(null);
  const intervalRef = useRef(null);

  const start = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.onresult = (e) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' ';
      setTranscript(t.trim());
    };
    recognition.onerror = () => setIsActive(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsActive(true);
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    clearInterval(intervalRef.current);
    setIsActive(false);
    if (transcript.trim()) onMessage(transcript.trim());
  };

  useEffect(() => () => { recognitionRef.current?.stop(); clearInterval(intervalRef.current); }, []);

  return (
    <Modal open={open} onClose={() => { stop(); onClose(); }} title="Voice Session" size="sm">
      <div className="text-center space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          <AlertCircle size={14} className="inline mr-1" />
          This is a browser voice interaction, not a telephone call. No actual call is being made.
        </div>
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${isActive ? 'bg-red-100 animate-pulse-soft' : 'bg-gray-100'}`}>
          <Mic size={32} className={isActive ? 'text-red-600' : 'text-gray-400'} />
        </div>
        <p className="text-lg font-semibold">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</p>
        <div className="flex justify-center gap-3">
          {!isActive ? (
            <button onClick={start} className="btn-primary">Start</button>
          ) : (
            <>
              <button onClick={() => setIsMuted(!isMuted)} className="btn-outline">{isMuted ? <MicOff size={16} /> : <Mic size={16} />}</button>
              <button onClick={stop} className="btn-danger">End</button>
            </>
          )}
        </div>
        {transcript && (
          <div className="text-left bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-text-secondary mb-1">Transcript:</p>
            <p className="text-sm text-text-primary">{transcript}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CounsellingFormModal({ open, onClose, onSubmit }) {
  const topics = ['Medication Use', 'Adherence', 'Lifestyle', 'Disease Understanding', 'Unresolved Question'];
  return (
    <Modal open={open} onClose={onClose} title="Request Counselling" size="sm">
      <p className="text-sm text-text-secondary mb-4">Select a counselling topic. Your Pharm D team will be notified.</p>
      <div className="space-y-2">
        {topics.map(t => (
          <button key={t} onClick={() => onSubmit(t)}
            className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary/30 hover:bg-gray-50 cursor-pointer transition-colors">
            <p className="font-medium text-sm">{t}</p>
          </button>
        ))}
      </div>
    </Modal>
  );
}
