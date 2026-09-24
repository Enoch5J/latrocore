import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Modal, Badge } from '../../components/ui';
import { Bot, Send, Mic, MicOff, Volume2, VolumeX, Globe, MessageSquare, Heart, Phone, X, ChevronRight, AlertCircle } from 'lucide-react';
import { getAssistantResponse, getSuggestedQuestions, TOPICS } from '../../services/assistantEngine';
import { addCounsellingRequest, addNotification, addAuditEntry } from '../../services/dataService';

const LANGUAGES = [
  { code: 'en', label: 'English', badge: 'EN' },
  { code: 'ta', label: 'தமிழ்', badge: 'TA' },
  { code: 'hi', label: 'हिन्दी', badge: 'HI' },
  { code: 'ml', label: 'മലയാളം', badge: 'ML' },
  { code: 'te', label: 'తెలుగు', badge: 'TE' },
  { code: 'kn', label: 'ಕನ್ನಡ', badge: 'KN' },
];

export default function Assistant() {
  const { currentUser, refreshData, addToast } = useApp();
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
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    setMessages([{
      id: 'welcome', role: 'assistant', lang: 'en',
      text: "Hello! I'm the LATROCORE AI Assistant (Simulated). I can help you understand your glucose logs, find prescription information, answer medication questions, and navigate the platform. How can I help you today?",
      time: new Date().toISOString(),
    }]);
    if (searchParams.get('action') === 'counselling') setShowCounsellingForm(true);
  }, []);

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

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: input.trim(), lang, time: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const response = getAssistantResponse(input.trim(), lang);
      const assistantMsg = { id: `a-${Date.now()}`, role: 'assistant', text: response.text, lang, topic: response.topic, matched: response.matched, time: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);
    }, 500);
  };

  const handleSuggestedQuestion = (q) => {
    setInput(q);
    setTimeout(() => {
      const userMsg = { id: `u-${Date.now()}`, role: 'user', text: q, lang, time: new Date().toISOString() };
      setMessages(prev => [...prev, userMsg]);
      setTimeout(() => {
        const response = getAssistantResponse(q, lang);
        const assistantMsg = { id: `a-${Date.now()}`, role: 'assistant', text: response.text, lang, topic: response.topic, matched: response.matched, time: new Date().toISOString() };
        setMessages(prev => [...prev, assistantMsg]);
      }, 500);
      setInput('');
    }, 100);
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
    <div className="h-[calc(100vh-200px)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><Bot size={20} className="text-purple-600" /></div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">AI Assistant</h1>
            <p className="text-xs text-text-secondary">Simulated AI assistant • Not a medical advisor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="flex gap-1 border-2 border-slate-300 rounded-xl overflow-hidden bg-white p-0.5">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${lang === l.code ? 'bg-teal-800 text-white' : 'text-slate-800 hover:bg-slate-100'}`}>
                <span className="font-extrabold text-[10px] mr-1">{l.badge}</span> {l.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowTopics(true)} className="btn-outline btn-sm">Topics</button>
          <button onClick={() => setShowVoiceSession(true)} className="btn-outline btn-sm"><Phone size={14} /> Voice</button>
          <button onClick={() => setShowCounsellingForm(true)} className="btn-outline btn-sm text-rose-700 border-rose-300 hover:bg-rose-50"><Heart size={14} /> Request Support</button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 card overflow-hidden flex flex-col border-2 border-slate-200">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/60">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-xs border ${
                msg.role === 'user' ? 'bg-teal-800 text-white border-teal-900 rounded-br-xs' : 'bg-white text-slate-950 border-slate-200 rounded-bl-xs'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-100">
                    <Bot size={15} className="text-purple-700" />
                    <span className="text-xs font-black text-purple-900 uppercase tracking-wider">LATROCORE AI</span>
                  </div>
                )}
                <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-between mt-2.5 pt-1 border-t border-slate-100/60 text-[11px] font-semibold">
                  <span className={msg.role === 'user' ? 'text-teal-200' : 'text-slate-600'}>{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.role === 'assistant' && (
                    <button onClick={() => speak(msg.text, msg.lang || lang)} className="p-1 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-950 cursor-pointer" title="Read aloud">
                      {isSpeaking ? <VolumeX size={15} onClick={(e) => { e.stopPropagation(); stopSpeaking(); }} /> : <Volume2 size={15} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div className="px-4 py-3 bg-white border-t border-slate-200">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Suggested Clinical Questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((q, i) => (
                <button key={i} onClick={() => handleSuggestedQuestion(q)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer text-slate-950 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t-2 border-slate-200 p-3 sm:p-4 bg-white">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
            <button type="button" onClick={isListening ? stopListening : startListening}
              className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer ${isListening ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse-soft' : 'hover:bg-slate-100 text-slate-800 border-slate-300'}`}
              title={isListening ? 'Stop listening' : 'Start voice input'}>
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening... Speak clearly into your mic'
                  : lang === 'ta'
                  ? 'உங்கள் கேள்வியை தட்டச்சு செய்யவும்...'
                  : lang === 'hi'
                  ? 'अपना प्रश्न लिखें...'
                  : lang === 'ml'
                  ? 'ചോദ്യങ്ങൾ ചോദിക്കുക (ഉദാ: ഗ്ലൂക്കോസ്, മരുന്നുകൾ)...'
                  : lang === 'te'
                  ? 'మీ ప్రశ్నను ఇక్కడ అడగండి...'
                  : lang === 'kn'
                  ? 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...'
                  : 'Ask about glucose logs, dosages, diet, or tests...'
              }
              className="input flex-1" />
            <button type="submit" disabled={!input.trim()} className="btn-primary px-5"><Send size={16} /><span className="hidden sm:inline">Send</span></button>
          </form>
          {isListening && <p className="text-xs font-bold text-rose-700 mt-2 flex items-center gap-1.5 animate-pulse-soft"><Mic size={14} className="text-rose-600 animate-pulse" /> Listening... Speak now</p>}
        </div>
      </div>

      {/* Topics Modal */}
      <Modal open={showTopics} onClose={() => setShowTopics(false)} title="Health Topics" size="md">
        <p className="text-sm text-text-secondary mb-4">These topics demonstrate education and navigation capabilities, not diagnostic functions.</p>
        <div className="space-y-2">
          {TOPICS.map(topic => (
            <button key={topic.id} onClick={() => { handleSuggestedQuestion(topic.label[lang] || topic.label.en); setShowTopics(false); }}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-gray-50 cursor-pointer transition-colors">
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
