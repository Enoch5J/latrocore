import { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Globe, Sparkles, Volume2, VolumeX, Mic, MicOff, ChevronDown, Heart, Shield, RefreshCw } from 'lucide-react';
import { getAssistantResponse, getSuggestedQuestions } from '../services/assistantEngine';
import { useApp } from '../context/AppContext';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'ta', label: 'தமிழ்', full: 'Tamil' },
  { code: 'hi', label: 'हिंदी', full: 'Hindi' },
];

export default function FloatingAIAssistant() {
  const { currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState('en');
  const [input, setInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! I'm LATROCORE Clinical AI. How can I help you with your blood glucose, medications, or lifestyle today?",
      sources: ['ADA Standards of Care 2024 §6 (Glycemic Targets)'],
      time: 'Just now',
    },
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

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
    recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';

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
    utterance.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
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

    // Simulate AI thinking and retrieve deterministic clinical response
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
    }, 450);
  };

  const suggestions = getSuggestedQuestions(lang).slice(0, 3);

  return (
    <>
      {/* ── Chat Modal Drawer (Floating in bottom-right) ── */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[400px] h-[550px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white p-3.5 px-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center shadow-inner">
                  <Bot size={20} className="text-teal-200" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-teal-900 rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white">LATROCORE AI</span>
                  <span className="text-[10px] bg-teal-700/70 border border-teal-500/40 px-1.5 py-0.2 rounded font-semibold text-teal-200">
                    Clinical Copilot
                  </span>
                </div>
                <p className="text-[11px] text-teal-200/80 font-medium">Sourced diabetes guidance</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="flex items-center bg-teal-950/60 rounded-lg p-0.5 border border-teal-700/50 text-[11px] font-bold">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={`px-1.5 py-0.5 rounded transition ${
                      lang === l.code ? 'bg-teal-600 text-white' : 'text-teal-300 hover:text-white'
                    }`}
                    title={l.full}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-teal-300 hover:text-white hover:bg-teal-800/80 p-1.5 rounded-lg transition"
                aria-label="Close Assistant"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="bg-teal-50/80 border-b border-teal-100 py-1.5 px-3 flex items-center gap-2 text-[11px] text-teal-900">
            <Shield size={12} className="text-teal-700 shrink-0" />
            <span className="truncate">
              Educational diabetes support • Does not substitute doctor prescriptions
            </span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-teal-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot size={15} />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-teal-800 text-white rounded-br-xs font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Sources tag if assistant */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-wrap gap-1">
                      {msg.sources.map((src, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-semibold"
                        >
                          <Sparkles size={9} />
                          {src}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between text-[10px] opacity-70">
                    <span>{msg.time}</span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className="ml-2 p-0.5 hover:text-teal-800 transition"
                        title="Read aloud"
                      >
                        {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-slate-600 font-semibold shrink-0 uppercase tracking-wider">
              Suggestions:
            </span>
            {suggestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="shrink-0 text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-medium px-2.5 py-1 rounded-full border border-slate-200 hover:border-teal-300 transition"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5"
          >
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isListening ? 'Stop listening' : 'Voice input'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about glucose, medications, meals..."
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white text-xs rounded-xl px-3 py-2.5 outline-none transition text-slate-900 font-medium"
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-40 text-white rounded-xl transition shadow-sm"
              title="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* ── Floating Circular Trigger Button (Bottom-Right Corner) ── */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-slate-800 animate-in fade-in slide-in-from-right-2 duration-300">
            <Sparkles size={13} className="text-teal-400" />
            <span>Ask LATROCORE AI</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${
            isOpen
              ? 'bg-slate-900 text-white rotate-90 scale-95 hover:bg-black'
              : 'bg-gradient-to-br from-teal-700 via-teal-800 to-teal-950 text-white hover:scale-105 hover:shadow-teal-900/40 ring-4 ring-white/90 shadow-xl'
          }`}
          aria-label="Toggle Clinical AI Assistant"
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <div className="relative flex items-center justify-center">
              <Bot size={26} className="text-white drop-shadow" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-teal-900 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-teal-900 rounded-full" />
            </div>
          )}
        </button>
      </div>
    </>
  );
}
