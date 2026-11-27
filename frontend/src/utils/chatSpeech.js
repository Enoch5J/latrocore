import { stripMarkdown } from './formatAiText';

export const CHAT_LANGUAGE_LOCALES = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  ml: 'ml-IN',
  te: 'te-IN',
  kn: 'kn-IN',
};

const LANGUAGE_ENDONYMS = {
  en: { en: 'English', ta: 'ஆங்கிலம் (English)', hi: 'अंग्रेज़ी (English)', ml: 'ഇംഗ്ലീഷ് (English)', te: 'ఇంగ్లీష్ (English)', kn: 'ಇಂಗ್ಲಿಷ್ (English)' },
  ta: { en: 'Tamil', ta: 'தமிழ்', hi: 'तमिल (Tamil)', ml: 'തമിഴ് (Tamil)', te: 'తమిళం (Tamil)', kn: 'ತಮಿಳು (Tamil)' },
  hi: { en: 'Hindi', ta: 'இந்தி (Hindi)', hi: 'हिन्दी', ml: 'ഹിന്ദി (Hindi)', te: 'హిందీ (Hindi)', kn: 'ಹಿಂದಿ (Hindi)' },
  ml: { en: 'Malayalam', ta: 'மலையாளம் (Malayalam)', hi: 'मलयालम (Malayalam)', ml: 'മലയാളം', te: 'మలయాళం (Malayalam)', kn: 'ಮಲಯಾಳಂ (Malayalam)' },
  te: { en: 'Telugu', ta: 'தெலுங்கு (Telugu)', hi: 'तेलुगु (Telugu)', ml: 'തെലുങ്ക് (Telugu)', te: 'తెలుగు', kn: 'ತೆಲುಗು (Telugu)' },
  kn: { en: 'Kannada', ta: 'கன்னடம் (Kannada)', hi: 'कन्नड़ (Kannada)', ml: 'കന്നഡ (Kannada)', te: 'కన్నడ (Kannada)', kn: 'ಕನ್ನಡ' },
};

const SCRIPT_DETECTORS = [
  { code: 'te', regex: /[\u0C00-\u0C7F]/g },
  { code: 'ta', regex: /[\u0B80-\u0BFF]/g },
  { code: 'hi', regex: /[\u0900-\u097F]/g },
  { code: 'ml', regex: /[\u0D00-\u0D7F]/g },
  { code: 'kn', regex: /[\u0C80-\u0CFF]/g },
];

export function normalizeLangCode(langCode) {
  const code = String(langCode || '').trim().toLowerCase().split(/[-_]/)[0];
  return CHAT_LANGUAGE_LOCALES[code] ? code : '';
}

export function getSpeechLocale(langCode) {
  const code = normalizeLangCode(langCode) || 'en';
  return CHAT_LANGUAGE_LOCALES[code];
}

export function detectLanguageFromText(text) {
  const value = String(text || '');
  if (!value) return '';
  let bestCode = '';
  let bestCount = 0;
  for (const { code, regex } of SCRIPT_DETECTORS) {
    const matches = value.match(regex);
    const count = matches ? matches.length : 0;
    if (count >= 2 && count > bestCount) {
      bestCount = count;
      bestCode = code;
    }
  }
  return bestCode;
}

/**
 * Determine which language an assistant message should be spoken in.
 * Script present in the displayed reply takes precedence for Indic languages,
 * followed by the language stored on the message itself, then fallbackLang.
 */
export function resolveSpeechLanguage(text, messageLang = '', fallbackLang = 'en') {
  const scriptLang = detectLanguageFromText(text);
  if (scriptLang) return scriptLang;
  const stored = normalizeLangCode(messageLang);
  if (stored) return stored;
  return normalizeLangCode(fallbackLang) || 'en';
}

/**
 * Prepare displayed assistant reply text for natural TTS reading.
 */
export function prepareSpeechText(rawText) {
  const cleanLinks = String(rawText ?? '')
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, ' ');
  return stripMarkdown(cleanLinks).replace(/\s{2,}/g, ' ').trim();
}

/**
 * Pick an exact locale voice match first, then a voice sharing the base language.
 * Never falls back to an English or unrelated voice.
 */
export function selectVoiceForLanguage(voices, langCode) {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const baseLang = normalizeLangCode(langCode) || 'en';
  const targetLocale = getSpeechLocale(baseLang).toLowerCase();

  const normalizedVoices = voices
    .filter((v) => v && v.lang)
    .map((v) => ({
      voice: v,
      langLower: String(v.lang).trim().toLowerCase().replace(/_/g, '-'),
    }));

  const exactMatch = normalizedVoices.find((item) => item.langLower === targetLocale);
  if (exactMatch) return exactMatch.voice;

  const sameLanguageMatch = normalizedVoices.find(
    (item) => item.langLower.split('-')[0] === baseLang
  );
  if (sameLanguageMatch) return sameLanguageMatch.voice;

  return null;
}

/**
 * Wait briefly for browser SpeechSynthesis voices to finish populating on a fresh page.
 */
export function waitForSpeechVoices(synth, timeoutMs = 1200) {
  if (!synth || typeof synth.getVoices !== 'function') {
    return Promise.resolve([]);
  }

  const initial = synth.getVoices() || [];
  if (initial.length > 0) {
    return Promise.resolve(initial);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timerId = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timerId) clearTimeout(timerId);
      if (typeof synth.removeEventListener === 'function') {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
      } else if (synth.onvoiceschanged === onVoicesChanged) {
        synth.onvoiceschanged = null;
      }
      resolve(synth.getVoices() || []);
    };

    const onVoicesChanged = () => {
      const loaded = synth.getVoices() || [];
      if (loaded.length > 0) {
        finish();
      }
    };

    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', onVoicesChanged);
    } else {
      synth.onvoiceschanged = onVoicesChanged;
    }

    timerId = setTimeout(finish, timeoutMs);
  });
}

export function getPlaybackUnavailableMessage(displayLang, targetLang, reason = 'missing-voice') {
  const uiLang = normalizeLangCode(displayLang) || 'en';
  const msgLang = normalizeLangCode(targetLang) || uiLang;
  const langLabel = LANGUAGE_ENDONYMS[msgLang]?.[uiLang] || msgLang.toUpperCase();
  const locale = getSpeechLocale(msgLang);

  if (reason === 'unsupported') {
    const unsupportedByLang = {
      en: 'Audio playback is not supported in this browser.',
      ta: 'இந்த உலாவியில் ஆடியோ வாசிப்பு ஆதரிக்கப்படவில்லை.',
      hi: 'इस ब्राउज़र में ऑडियो प्लेबैक समर्थित नहीं है।',
      ml: 'ഈ ബ്രൗസറിൽ ഓഡിയോ പ്ലേബാക്ക് ലഭ്യമല്ല.',
      te: 'ఈ బ్రౌజర్‌లో ఆడియో ప్లేబ్యాక్ సపోర్ట్ చేయబడదు.',
      kn: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಆಡಿಯೋ ಪ್ಲೇಬ್ಯಾಕ್ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ.',
    };
    return unsupportedByLang[uiLang] || unsupportedByLang.en;
  }

  if (reason === 'error') {
    const errorByLang = {
      en: `Unable to play ${langLabel} (${locale}) audio in this browser.`,
      ta: `${langLabel} (${locale}) ஆடியோவை இந்த உலாவியில் இயக்க முடியவில்லை.`,
      hi: `इस ब्राउज़र में ${langLabel} (${locale}) ऑडियो चलाया नहीं जा सका।`,
      ml: `ഈ ബ്രൗസറിൽ ${langLabel} (${locale}) ഓഡിയോ പ്ലേ ചെയ്യാനായില്ല.`,
      te: `ఈ బ్రౌజర్‌లో ${langLabel} (${locale}) ఆడియో ప్లే చేయలేకపోయాము.`,
      kn: `ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ${langLabel} (${locale}) ಆಡಿಯೋ ಪ್ಲೇ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.`,
    };
    return errorByLang[uiLang] || errorByLang.en;
  }

  const missingByLang = {
    en: `Audio playback is unavailable because no ${langLabel} (${locale}) voice is available on this device or browser.`,
    ta: `இந்த சாதனம் அல்லது உலாவியில் ${langLabel} (${locale}) குரல் இல்லாததால் ஆடியோ இயக்க முடியவில்லை.`,
    hi: `इस डिवाइस या ब्राउज़र में ${langLabel} (${locale}) आवाज़ उपलब्ध नहीं होने के कारण ऑडियो नहीं चल सकता।`,
    ml: `ഈ ഉപകരണത്തിലോ ബ്രൗസറിലോ ${langLabel} (${locale}) ശബ്ദം ലഭ്യമല്ലാത്തതിനാൽ ഓഡിയോ പ്ലേ ചെയ്യാനാവില്ല.`,
    te: `ఈ పరికరం లేదా బ్రౌజర్‌లో ${langLabel} (${locale}) వాయిస్ అందుబాటులో లేనందున ఆడియో ప్లే చేయలేము.`,
    kn: `ಈ ಸಾಧನ ಅಥವಾ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ${langLabel} (${locale}) ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ ಆಡಿಯೋ ಪ್ಲೇ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ.`,
  };
  return missingByLang[uiLang] || missingByLang.en;
}

let activeServerAudio = null;
let activeServerAudioUrl = null;

function cleanupServerAudio() {
  if (activeServerAudio) {
    try {
      activeServerAudio.onended = null;
      activeServerAudio.onerror = null;
      activeServerAudio.pause();
    } catch {
      // ignore audio cleanup errors
    }
    activeServerAudio = null;
  }
  if (activeServerAudioUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(activeServerAudioUrl);
    activeServerAudioUrl = null;
  }
}

async function tryServerTtsPlayback({
  spokenText,
  targetLang,
  targetLocale,
  uiLang,
  checkCurrent,
  onStart,
  onEnd,
  onError,
}) {
  if (
    typeof fetch !== 'function' ||
    typeof window === 'undefined' ||
    typeof window.Audio !== 'function' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  try {
    const resp = await fetch('/api/v1/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spokenText, language: targetLang }),
    });
    if (!resp.ok || !checkCurrent()) return false;

    const blob = await resp.blob();
    if (!blob || blob.size === 0 || !checkCurrent()) return false;

    cleanupServerAudio();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new window.Audio(audioUrl);
    activeServerAudio = audio;
    activeServerAudioUrl = audioUrl;

    audio.onended = () => {
      cleanupServerAudio();
      if (checkCurrent()) onEnd?.();
    };
    audio.onerror = () => {
      cleanupServerAudio();
      if (checkCurrent()) {
        onError?.(
          getPlaybackUnavailableMessage(uiLang, targetLang, 'error'),
          targetLang,
          'error'
        );
      }
    };

    onStart?.(targetLang, targetLocale, { name: 'Latro AI Voice', lang: targetLocale });
    await audio.play();
    return true;
  } catch {
    cleanupServerAudio();
    return false;
  }
}

export function stopChatSpeech(playbackTokenRef) {
  if (playbackTokenRef && typeof playbackTokenRef.current === 'number') {
    playbackTokenRef.current += 1;
  }
  cleanupServerAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function speakChatText({
  text,
  messageLang,
  uiLang = 'en',
  playbackTokenRef,
  isStillCurrent,
  onStart,
  onEnd,
  onError,
  onUnavailable,
  waitTimeoutMs = 1200,
}) {
  const targetLang = resolveSpeechLanguage(text, messageLang, uiLang);
  const targetLocale = getSpeechLocale(targetLang);

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const UtteranceCtor = typeof window !== 'undefined' ? window.SpeechSynthesisUtterance : null;

  if (!synth || typeof synth.speak !== 'function' || typeof UtteranceCtor !== 'function') {
    onUnavailable?.(
      getPlaybackUnavailableMessage(uiLang, targetLang, 'unsupported'),
      targetLang,
      'unsupported'
    );
    return false;
  }

  const spokenText = prepareSpeechText(text);
  if (!spokenText) {
    onEnd?.();
    return false;
  }

  const token = playbackTokenRef ? ++playbackTokenRef.current : 0;
  const checkCurrent = () => {
    if (playbackTokenRef && playbackTokenRef.current !== token) return false;
    if (typeof isStillCurrent === 'function' && !isStillCurrent()) return false;
    return true;
  };

  const wasActive = Boolean(synth.speaking || synth.pending || synth.paused);
  if (typeof synth.cancel === 'function') {
    synth.cancel();
  }

  const voices = await waitForSpeechVoices(synth, waitTimeoutMs);
  if (!checkCurrent()) return false;

  if (wasActive) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    if (!checkCurrent()) return false;
  }

  const voice = selectVoiceForLanguage(voices, targetLang);
  if (!voice) {
    const serverPlayed = await tryServerTtsPlayback({
      spokenText,
      targetLang,
      targetLocale,
      uiLang,
      checkCurrent,
      onStart,
      onEnd,
      onError,
    });
    if (serverPlayed) return true;
    if (!checkCurrent()) return false;

    onUnavailable?.(
      getPlaybackUnavailableMessage(uiLang, targetLang, 'missing-voice'),
      targetLang,
      'missing-voice'
    );
    return false;
  }

  const utterance = new UtteranceCtor(spokenText);
  utterance.lang = targetLocale;
  utterance.voice = voice;

  let finished = false;
  utterance.onend = () => {
    if (finished || !checkCurrent()) return;
    finished = true;
    onEnd?.();
  };
  utterance.onerror = (event) => {
    if (finished || !checkCurrent()) return;
    finished = true;
    const errCode = String(event?.error || '').toLowerCase();
    if (errCode === 'canceled' || errCode === 'interrupted') {
      onEnd?.();
      return;
    }
    onError?.(
      getPlaybackUnavailableMessage(uiLang, targetLang, 'error'),
      targetLang,
      'error'
    );
  };

  try {
    onStart?.(targetLang, targetLocale, voice);
    if (synth.paused && typeof synth.resume === 'function') {
      synth.resume();
    }
    synth.speak(utterance);
    return true;
  } catch {
    if (!finished && checkCurrent()) {
      finished = true;
      onError?.(
        getPlaybackUnavailableMessage(uiLang, targetLang, 'error'),
        targetLang,
        'error'
      );
    }
    return false;
  }
}
