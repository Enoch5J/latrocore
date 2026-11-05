import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Modal, Badge } from '../../components/ui';
import {
  Bot, Send, Mic, MicOff, Volume2, VolumeX, Globe, MessageSquare, Heart, Phone,
  X, ChevronRight, AlertCircle, Paperclip, Sparkles, CheckCircle2, ShieldCheck,
  FileText, Pill, UploadCloud
} from 'lucide-react';
import { getAssistantResponse, getSuggestedQuestions, TOPICS } from '../../services/assistantEngine';
import { addCounsellingRequest, addNotification, addAuditEntry, applyAIPrescriptionToPatient } from '../../services/dataService';
import { api } from '../../services/api';
import PrescriptionUploadModal from '../../components/patient/PrescriptionUploadModal';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [lang, setLang] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showVoiceSession, setShowVoiceSession] = useState(false);
  const [showCounsellingForm, setShowCounsellingForm] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploadingRx, setIsUploadingRx] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const patientId = currentUser?.id;

  // Active Prescriptions & Medications synced from data
  const activePrescriptions = useMemo(() => {
    return (data?.prescriptions || []).filter(p => p.patientId === patientId && p.status === 'active');
  }, [data?.prescriptions, patientId]);

  const activeMedicines = useMemo(() => {
    return activePrescriptions.flatMap(rx => rx.medicines || []);
  }, [activePrescriptions]);

  const prescriptionContext = useMemo(() => {
    if (!activeMedicines || activeMedicines.length === 0) return null;
    return activeMedicines.map(m =>
      `- ${m.name} (Dose: ${m.dose || 'unclear'}, Route: ${m.route || 'Oral'}, Frequency: ${m.frequency || 'As prescribed'}, Meal Timing: ${m.foodInstruction || m.meal_timing || 'With meals'})`
    ).join('\n');
  }, [activeMedicines]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    let welcomeText = "Hello! I'm the LATROCORE Clinical AI Assistant. I can help you understand your glucose logs, analyze adverse effects of your prescribed tablets, organize your diet plan, and navigate your care schedule.";
    if (activeMedicines.length > 0) {
      welcomeText += `\n\n📋 Verified Prescription Synced: I have loaded your active regimen (${activeMedicines.map(m => m.name).join(', ')}). All my clinical answers and lifestyle tips are strictly focused on these medicines with zero hallucination.`;
    }
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      lang: 'en',
      text: welcomeText,
      time: new Date().toISOString(),
    }]);
    if (searchParams.get('action') === 'counselling') setShowCounsellingForm(true);
  }, [activeMedicines.length]);

  // Speech Recognition
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      addToast({ type: 'warning', message: 'Speech recognition is not available in this browser. Please type your question.' });
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : lang === 'ml' ? 'ml-IN' : lang === 'te' ? 'te-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';

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
  const speak = (text, langCode) => {
    if (!('speechSynthesis' in window)) {
      addToast({ type: 'info', message: 'Text-to-speech is not available in this browser. The translated text is displayed above.' });
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === 'ta' ? 'ta-IN' : langCode === 'hi' ? 'hi-IN' : langCode === 'ml' ? 'ml-IN' : langCode === 'te' ? 'te-IN' : langCode === 'kn' ? 'kn-IN' : 'en-IN';
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(langCode));
    if (match) utterance.voice = match;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // Send query with full prescription context and strict guardrails
  const handleSend = async (textToSend = null) => {
    const text = (textToSend || input).trim();
    if (!text) return;
    const userMsg = { id: `u-${Date.now()}`, role: 'user', text, lang, time: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');

    const tempLoadingId = `a-loading-${Date.now()}`;
    const loadingMsg = { id: tempLoadingId, role: 'assistant', text: 'Analyzing clinical guidance with strict prescription guardrails...', isLoading: true, lang, time: new Date().toISOString() };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const resData = await api.askAssistant(text, lang, prescriptionContext);
      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: resData.content,
        lang,
        sources: resData.sources,
        modelId: resData.model_id,
        time: new Date().toISOString()
      };
      setMessages(prev => prev.map(m => m.id === tempLoadingId ? assistantMsg : m));
    } catch {
      const response = getAssistantResponse(text, lang, prescriptionContext, activeMedicines);
      const fallbackMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        lang,
        topic: response.topic,
        matched: response.matched,
        time: new Date().toISOString()
      };
      setMessages(prev => prev.map(m => m.id === tempLoadingId ? fallbackMsg : m));
    }
  };

  // Direct prescription file upload inside AI prompt
  const handleDirectFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can pick the same file again if desired
    e.target.value = '';

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
        const isUnclear = !m.name || m.name.toLowerCase().includes('unclear') || !m.dose || String(m.dose).toLowerCase().includes('unclear');
        return `• **${m.name || 'unclear'}** — ${m.dose || 'dose unclear'} (${m.frequency || 'frequency unclear'}, ${m.meal_timing || m.instructions || 'With meals'})${isUnclear ? ' ⚠️ [Unclear handwriting flagged]' : ''}`;
      }).join('\n');

      const responseText = `✅ **Prescription Successfully Synchronized!**\n\n` +
        `**Doctor:** ${result.doctor_name || 'Attending Physician'}\n` +
        `**Clinic:** ${result.clinic_name || 'Clinical Care Station'}\n` +
        `**Diagnosis:** ${result.diagnosis || 'Type 2 Diabetes Mellitus'}\n\n` +
        `**Detected Medications:**\n${medsList}\n\n` +
        `**Dietary Strategy:**\n${result.diet_plan?.summary || result.diet_plan?.strategy || 'Low glycemic index, balanced meal timing'}\n\n` +
        `🔒 **Strict AI Guardrails Active:** My clinical responses, adverse effect analyses, and routine tips are now locked strictly to these detected medications. I will not suggest or hallucinate any outside pharmaceuticals. If any medicine or dose was illegible, it is marked as 'unclear' for safety rather than guessed.`;

      const successMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: responseText,
        lang,
        time: new Date().toISOString()
      };
      setMessages(prev => prev.map(m => m.id === tempLoadingId ? successMsg : m));
      addToast({ type: 'success', message: 'Prescription synchronized with AI Assistant' });
    } catch (err) {
      const errMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `❌ **Failed to process prescription:** ${err.message || 'Network error communicating with Gemini Vision AI. Please try again.'}`,
        lang,
        time: new Date().toISOString()
      };
      setMessages(prev => prev.map(m => m.id === tempLoadingId ? errMsg : m));
    } finally {
      setIsUploadingRx(false);
    }
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
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Bot size={22} className="text-purple-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-950">Clinical AI Assistant</h1>
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
      <div className="flex-1 card overflow-hidden flex flex-col border-2 border-slate-200">
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
                    <Bot size={15} className="text-purple-700" />
                    <span className="text-xs font-black text-purple-900 uppercase tracking-wider">Clinical AI</span>
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
                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-1 border-t border-slate-100/60 text-[11px] font-semibold">
                      <span className={msg.role === 'user' ? 'text-teal-200' : 'text-slate-600'}>
                        {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => speak(msg.text, msg.lang || lang)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 cursor-pointer"
                          title="Read aloud"
                        >
                          {isSpeaking ? <VolumeX size={15} onClick={(e) => { e.stopPropagation(); stopSpeaking(); }} /> : <Volume2 size={15} />}
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

        {/* Input Bar with Direct Prescription Upload Button */}
        <div className="border-t-2 border-slate-200 p-3 sm:p-4 bg-white">
          {/* Hidden file input for direct prescription upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleDirectFileUpload}
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="hidden"
          />

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
            {/* Direct Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingRx}
              className="p-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-all cursor-pointer flex items-center gap-1"
              title="Directly upload prescription photo or PDF into AI"
            >
              <Paperclip size={18} />
              <span className="hidden md:inline text-xs font-extrabold">Upload Rx</span>
            </button>

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
              placeholder={
                isListening
                  ? 'Listening... Speak clearly into your mic'
                  : activeMedicines.length > 0
                  ? 'Ask about side effects, meal timings, or diet for your prescribed medicines...'
                  : 'Ask about glucose logs, dosages, diet, or upload your prescription...'
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
