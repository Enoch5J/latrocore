/**
 * Helpers and Web Audio chime controller for due & overdue medication alarms.
 */

export const ALARM_SNOOZE_MS = 10 * 60 * 1000;
const CHIME_INTERVAL_MS = 2600;
const CHIME_FREQUENCIES = [880, 1046.5, 1318.5];

export function findDueOrOverdueDoses(
  doseEvents = [],
  patientId,
  now = new Date(),
  snoozedUntilMap = {},
  dismissedDoseIds = new Set()
) {
  if (!patientId || !Array.isArray(doseEvents) || doseEvents.length === 0) {
    return [];
  }

  const nowMs = now.getTime();
  const todayStr = now.toDateString();

  return doseEvents
    .filter((dose) => {
      if (!dose || dose.patientId !== patientId || dose.status !== 'pending') {
        return false;
      }
      if (dismissedDoseIds?.has?.(dose.id)) {
        return false;
      }
      const scheduled = new Date(dose.scheduledTime);
      const scheduledMs = scheduled.getTime();
      if (!Number.isFinite(scheduledMs)) {
        return false;
      }
      if (scheduled.toDateString() !== todayStr) {
        return false;
      }
      if (scheduledMs > nowMs) {
        return false;
      }
      const snoozedUntil = snoozedUntilMap?.[dose.id] || 0;
      if (snoozedUntil > nowMs) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
}

export function formatOverdueDuration(scheduledTime, now = new Date()) {
  const scheduledMs = new Date(scheduledTime).getTime();
  if (!Number.isFinite(scheduledMs)) return 'Due now';
  const diffMin = Math.floor((now.getTime() - scheduledMs) / 60000);
  if (diffMin < 1) return 'Due now';
  if (diffMin < 60) return `${diffMin} min overdue`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return mins > 0 ? `${hours}h ${mins}m overdue` : `${hours}h overdue`;
}

export function formatScheduledClock(scheduledTime) {
  const dt = new Date(scheduledTime);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function createMedicationAlarmPlayer() {
  let audioCtx = null;
  let intervalId = null;
  let active = false;

  const playChimeOnce = () => {
    if (!active || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!audioCtx) {
        audioCtx = new AudioCtx();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      if (audioCtx.state !== 'running') return;

      const baseTime = audioCtx.currentTime;
      CHIME_FREQUENCIES.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = baseTime + idx * 0.14;
        const stop = start + 0.24;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, stop);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(stop + 0.02);
      });
    } catch {
      // Ignore Web Audio errors when autoplay is blocked before user gesture.
    }
  };

  return {
    start() {
      if (active || typeof window === 'undefined') return;
      active = true;
      playChimeOnce();
      intervalId = window.setInterval(playChimeOnce, CHIME_INTERVAL_MS);
    },
    stop() {
      active = false;
      if (intervalId !== null && typeof window !== 'undefined') {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      if (audioCtx && typeof audioCtx.close === 'function') {
        audioCtx.close().catch(() => {});
        audioCtx = null;
      }
    },
  };
}
