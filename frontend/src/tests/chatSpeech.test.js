import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CHAT_LANGUAGE_LOCALES,
  detectLanguageFromText,
  getPlaybackUnavailableMessage,
  getSpeechLocale,
  prepareSpeechText,
  resolveSpeechLanguage,
  selectVoiceForLanguage,
  speakChatText,
  stopChatSpeech,
  waitForSpeechVoices,
} from '../utils/chatSpeech';

function createMockSpeechEnv(initialVoices = []) {
  let voices = [...initialVoices];
  const listeners = new Map();
  const utterances = [];

  class MockSpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
      this.lang = '';
      this.voice = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(() => {
      const prev = utterances[utterances.length - 1];
      const wasSpeaking = synth.speaking;
      synth.speaking = false;
      synth.pending = false;
      if (wasSpeaking && prev?.onerror) {
        prev.onerror({ error: 'interrupted' });
      }
    }),
    resume: vi.fn(),
    speak: vi.fn((utterance) => {
      utterances.push(utterance);
      synth.speaking = true;
    }),
    addEventListener: vi.fn((event, cb) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(cb);
    }),
    removeEventListener: vi.fn((event, cb) => {
      listeners.get(event)?.delete(cb);
    }),
    emitVoicesChanged(nextVoices) {
      voices = [...nextVoices];
      for (const cb of listeners.get('voiceschanged') || []) {
        cb();
      }
    },
  };

  globalThis.window = {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
  };

  return { synth, utterances };
}

describe('Multilingual Chat Speech Playback (chatSpeech.js)', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('maps every chat dropdown language explicitly to its locale', () => {
    expect(CHAT_LANGUAGE_LOCALES).toEqual({
      en: 'en-IN',
      ta: 'ta-IN',
      hi: 'hi-IN',
      ml: 'ml-IN',
      te: 'te-IN',
      kn: 'kn-IN',
    });
    expect(getSpeechLocale('te')).toBe('te-IN');
    expect(getSpeechLocale('ta')).toBe('ta-IN');
    expect(getSpeechLocale('hi')).toBe('hi-IN');
    expect(getSpeechLocale('ml')).toBe('ml-IN');
    expect(getSpeechLocale('kn')).toBe('kn-IN');
    expect(getSpeechLocale('en')).toBe('en-IN');
  });

  it('prefers exact locale match first, then same base language, and never falls back to English', () => {
    const enVoice = { name: 'Google US English', lang: 'en-US' };
    const enInVoice = { name: 'Google English India', lang: 'en-IN' };
    const teGenericVoice = { name: 'Telugu Generic', lang: 'te' };
    const teInVoice = { name: 'Microsoft Chitra - Telugu', lang: 'te-IN' };

    expect(selectVoiceForLanguage([enVoice, teGenericVoice, teInVoice], 'te')).toBe(teInVoice);
    expect(selectVoiceForLanguage([enVoice, teGenericVoice], 'te')).toBe(teGenericVoice);
    expect(selectVoiceForLanguage([enVoice, enInVoice], 'en')).toBe(enInVoice);
    expect(selectVoiceForLanguage([enVoice], 'en')).toBe(enVoice);

    // Must never pick an English voice for Telugu or other Indian languages
    for (const langCode of ['te', 'ta', 'hi', 'ml', 'kn']) {
      expect(selectVoiceForLanguage([enVoice, enInVoice], langCode)).toBeNull();
    }
  });

  it('resolves reply language from displayed script and stored message lang regardless of user greeting or later dropdown change', () => {
    const teluguReply = 'నమస్కారం! నేను మీ Latro AI అసిస్టెంట్‌ని. మీ బ్లడ్ షుగర్ గురించి నేను ఎలా సహాయపడగలను?';
    expect(detectLanguageFromText(teluguReply)).toBe('te');

    // Even if user typed "hii" (English) and later switched dropdown to "en", Telugu reply still plays in Telugu
    expect(resolveSpeechLanguage(teluguReply, 'te', 'en')).toBe('te');
    expect(resolveSpeechLanguage(teluguReply, '', 'en')).toBe('te');

    // English reply stays in English even when dropdown was later switched to Telugu
    expect(resolveSpeechLanguage('Hello! I am Latro AI.', 'en', 'te')).toBe('en');
  });

  it('strips markdown, links, and emojis cleanly before speaking', () => {
    const plain = prepareSpeechText('✅ **Metformin:** Take with food. **[Sign In](/login)**');
    expect(plain).toBe('Metformin: Take with food. Sign In');
  });

  it('waits for voiceschanged on first click when browser voices load asynchronously', async () => {
    const teInVoice = { name: 'Google తెలుగు', lang: 'te-IN' };
    const { synth, utterances } = createMockSpeechEnv([]);

    const voicesPromise = waitForSpeechVoices(synth, 1000);
    setTimeout(() => {
      synth.emitVoicesChanged([{ name: 'English', lang: 'en-US' }, teInVoice]);
    }, 50);

    await vi.advanceTimersByTimeAsync(60);
    const loaded = await voicesPromise;
    expect(loaded).toHaveLength(2);

    // Also test full speakChatText waiting for voiceschanged on a fresh page
    const { synth: freshSynth, utterances: freshUtterances } = createMockSpeechEnv([]);
    const tokenRef = { current: 0 };
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const onUnavailable = vi.fn();

    const speakPromise = speakChatText({
      text: 'నమస్కారం! నేను మీ Latro AI అసిస్టెంట్‌ని.',
      messageLang: 'te',
      uiLang: 'en', // Dropdown switched to English afterward!
      playbackTokenRef: tokenRef,
      onStart,
      onEnd,
      onUnavailable,
      waitTimeoutMs: 1000,
    });

    setTimeout(() => {
      freshSynth.emitVoicesChanged([{ name: 'English', lang: 'en-US' }, teInVoice]);
    }, 50);

    await vi.advanceTimersByTimeAsync(60);
    const started = await speakPromise;

    expect(started).toBe(true);
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(onStart).toHaveBeenCalledWith('te', 'te-IN', teInVoice);
    expect(freshUtterances).toHaveLength(1);
    expect(freshUtterances[0].lang).toBe('te-IN');
    expect(freshUtterances[0].voice).toBe(teInVoice);

    // Finish utterance cleanly
    freshUtterances[0].onend();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(utterances).toHaveLength(0);
  });

  it('refuses English fallback and returns localized unavailability notice for every dropdown language when no voice matches', async () => {
    const { synth, utterances } = createMockSpeechEnv([{ name: 'Microsoft Zira', lang: 'en-US' }]);
    const tokenRef = { current: 0 };

    for (const uiLang of ['en', 'ta', 'hi', 'ml', 'te', 'kn']) {
      const onStart = vi.fn();
      const onUnavailable = vi.fn();

      const started = await speakChatText({
        text: 'నమస్కారం! నేను మీ Latro AI అసిస్టెంట్‌ని.',
        messageLang: 'te',
        uiLang,
        playbackTokenRef: tokenRef,
        onStart,
        onUnavailable,
        waitTimeoutMs: 10,
      });

      expect(started).toBe(false);
      expect(onStart).not.toHaveBeenCalled();
      expect(utterances).toHaveLength(0);
      expect(synth.speak).not.toHaveBeenCalled();
      expect(onUnavailable).toHaveBeenCalledTimes(1);
      const [msg, resolvedLang, reason] = onUnavailable.mock.calls[0];
      expect(resolvedLang).toBe('te');
      expect(reason).toBe('missing-voice');
      expect(msg).toBe(getPlaybackUnavailableMessage(uiLang, 'te', 'missing-voice'));
      expect(msg.length).toBeGreaterThan(10);
    }
  });

  it('stops previous audio when Listen is clicked on another reply and handles error/stop accurately', async () => {
    const enInVoice = { name: 'Google English India', lang: 'en-IN' };
    const taInVoice = { name: 'Google தமிழ்', lang: 'ta-IN' };
    const { synth, utterances } = createMockSpeechEnv([enInVoice, taInVoice]);
    const tokenRef = { current: 0 };

    const firstStart = vi.fn();
    const firstEnd = vi.fn();
    const firstError = vi.fn();

    await speakChatText({
      text: 'Hello, this is Latro AI.',
      messageLang: 'en',
      uiLang: 'en',
      playbackTokenRef: tokenRef,
      onStart: firstStart,
      onEnd: firstEnd,
      onError: firstError,
    });

    expect(utterances).toHaveLength(1);
    expect(utterances[0].lang).toBe('en-IN');

    // Click Listen on a Tamil reply while the English reply is playing
    const secondStart = vi.fn();
    const secondEnd = vi.fn();
    const secondError = vi.fn();

    const secondPromise = speakChatText({
      text: 'வணக்கம்! நான் உங்கள் Latro AI உதவியாளர்.',
      messageLang: 'ta',
      uiLang: 'en',
      playbackTokenRef: tokenRef,
      onStart: secondStart,
      onEnd: secondEnd,
      onError: secondError,
    });

    await vi.advanceTimersByTimeAsync(50);
    await secondPromise;

    expect(synth.cancel).toHaveBeenCalled();
    // Stale interrupted error from first utterance must NOT call firstError or clear second playback
    expect(firstError).not.toHaveBeenCalled();
    expect(secondStart).toHaveBeenCalledWith('ta', 'ta-IN', taInVoice);
    expect(utterances).toHaveLength(2);
    expect(utterances[1].lang).toBe('ta-IN');

    // Genuine error on second utterance invokes onError cleanly
    utterances[1].onerror({ error: 'synthesis-failed' });
    expect(secondError).toHaveBeenCalledTimes(1);

    stopChatSpeech(tokenRef);
    expect(tokenRef.current).toBeGreaterThan(1);
  });
});
