import { BellRing, Check, Clock, Pill, Volume2, VolumeX, X } from 'lucide-react';
import { formatOverdueDuration, formatScheduledClock } from '../../utils/medicationAlarm';

export default function MedicationAlarmModal({
  dose,
  pendingCount = 1,
  isMuted = false,
  isSubmitting = false,
  onMarkTaken,
  onSnooze,
  onToggleMute,
  onDismiss,
}) {
  if (!dose) return null;

  const overdueLabel = formatOverdueDuration(dose.scheduledTime);
  const clockTime = formatScheduledClock(dose.scheduledTime);
  const isOverdue = overdueLabel !== 'Due now';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="med-alarm-title"
      aria-describedby="med-alarm-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-[#E8DCC8] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                isOverdue
                  ? 'border-[#FBD4CB] bg-[#FDECE8] text-[#E34222]'
                  : 'border-[#A8D7BD] bg-[#E8F5EE] text-[#046A38]'
              }`}
            >
              <BellRing size={22} className={!isMuted ? 'animate-bounce' : ''} aria-hidden="true" />
            </div>
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  isOverdue
                    ? 'bg-[#FDECE8] text-[#CA3517]'
                    : 'bg-[#E8F5EE] text-[#046A38]'
                }`}
              >
                <Clock size={11} aria-hidden="true" />
                <span>{overdueLabel}</span>
              </span>
              {pendingCount > 1 && (
                <p className="mt-1 text-[11px] font-semibold text-[#48616A]">
                  +{pendingCount - 1} more scheduled {pendingCount - 1 === 1 ? 'dose' : 'doses'} due
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute alarm ring' : 'Mute alarm ring'}
              title={isMuted ? 'Unmute ring' : 'Mute ring'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8DCC8] bg-[#FAF6EF] text-[#24383F] hover:bg-[#F4DEBF]/50 cursor-pointer"
            >
              {isMuted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss reminder"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8DCC8] bg-white text-[#48616A] hover:bg-[#FAF6EF] cursor-pointer"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-5">
          <h2 id="med-alarm-title" className="font-serif text-2xl font-semibold text-[#093322]">
            Time for your medicine
          </h2>
          <p id="med-alarm-desc" className="mt-1 text-sm text-[#48616A]">
            {isOverdue
              ? `Your scheduled ${clockTime} dose has passed and has not been logged yet.`
              : `Your scheduled ${clockTime} dose is due now.`}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-[#E8DCC8] bg-[#FAF6EF] p-4 flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#D1EBDD] text-[#046A38]">
            <Pill size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-[#093322]">
              {dose.medicineName || 'Scheduled Medicine'}
            </p>
            <p className="text-xs font-semibold text-[#24383F]">
              {[dose.dosage, clockTime ? `Scheduled ${clockTime}` : ''].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onMarkTaken}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#046A38] hover:bg-[#03542C] disabled:opacity-60 px-4 py-3 text-sm font-bold text-white shadow-sm cursor-pointer transition-colors"
          >
            <Check size={16} aria-hidden="true" />
            <span>{isSubmitting ? 'Saving…' : 'Mark as Taken'}</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onSnooze}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8C6AC] bg-[#FAF6EF] hover:bg-[#F4DEBF]/55 px-4 py-3 text-sm font-semibold text-[#093322] cursor-pointer transition-colors"
          >
            <Clock size={15} aria-hidden="true" />
            <span>Snooze 10 min</span>
          </button>
        </div>
      </div>
    </div>
  );
}
