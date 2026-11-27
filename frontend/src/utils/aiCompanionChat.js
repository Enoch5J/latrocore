export const OPEN_AI_COMPANION_EVENT = 'latrocore:open-ai-companion';
export const DOCTOR_GREETING_DURATION_MS = 3000;
export const DOCTOR_GREETING_REPEAT_INTERVAL_MS = 3000;

/**
 * Run a repeating greeting popup cycle (show for durationMs, hide for repeatIntervalMs)
 * until stop()/cleanup is invoked or shouldStop() returns true.
 */
export function startGreetingCycle({
  onShow,
  onHide,
  shouldStop,
  initialDelayMs = 150,
  durationMs = DOCTOR_GREETING_DURATION_MS,
  repeatIntervalMs = DOCTOR_GREETING_REPEAT_INTERVAL_MS,
}) {
  let cancelled = false;
  let openTimer = null;
  let hideTimer = null;

  const scheduleNext = (delayMs) => {
    if (cancelled || shouldStop?.()) return;
    openTimer = setTimeout(() => {
      if (cancelled || shouldStop?.()) return;
      onShow?.();
      hideTimer = setTimeout(() => {
        if (cancelled) return;
        onHide?.();
        scheduleNext(repeatIntervalMs);
      }, durationMs);
    }, delayMs);
  };

  scheduleNext(initialDelayMs);

  return () => {
    cancelled = true;
    clearTimeout(openTimer);
    clearTimeout(hideTimer);
    openTimer = null;
    hideTimer = null;
  };
}

/**
 * Dispatches an event to open the floating AI assistant and optionally auto-submit the question.
 */
export function openAICompanionWithDraft(question = '', options = {}) {
  if (typeof window === 'undefined') return;
  const text = typeof question === 'string' ? question : '';
  const autoSend = options?.autoSend ?? true;

  window.dispatchEvent(
    new CustomEvent(OPEN_AI_COMPANION_EVENT, {
      detail: { question: text, autoSend },
    })
  );
}
