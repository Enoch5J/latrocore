import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useScrollMotion';

export const LEFT_FAQ_ITEMS = [
  {
    id: 'faq-1',
    question: 'How does Latrocore help between clinic visits?',
    answer:
      'Latrocore brings your medicine schedule, glucose log, and upcoming tests into one place. You can keep track of daily care and prepare questions for your next visit.',
  },
  {
    id: 'faq-2',
    question: 'How do medicine reminders work?',
    answer:
      'Your reminders follow the schedule in your prescription. You can see when a medicine is due, mark a dose as taken, and keep track of upcoming refills.',
  },
  {
    id: 'faq-3',
    question: 'What can I record in my glucose log?',
    answer:
      'You can record the date, time, and glucose reading, then add a note you want to discuss with your care team. Keeping these entries together helps you review them at your next visit.',
  },
];

export const RIGHT_FAQ_ITEMS = [
  {
    id: 'faq-4',
    question: 'Can I ask Latro AI a question without signing in?',
    answer:
      'Yes. Open Latro AI on the homepage to ask general questions about medicines, lab tests, or diabetes care. You can ask in English, Tamil, or Hindi.',
  },
  {
    id: 'faq-5',
    question: 'Who can upload a prescription to Latro AI?',
    answer:
      'Prescription uploads are available to signed-in patients. Sign in with your patient account to upload your prescription and ask Latro AI to explain the instructions written in it.',
  },
  {
    id: 'faq-6',
    question: 'How can I prepare for my next appointment?',
    answer:
      'Review your recent glucose readings, medicine logs, and upcoming tests. You can also ask Latro AI to help you put your questions into words for your doctor or pharmacist.',
  },
];

export function toggleFaqItem(currentOpenId, targetId) {
  return currentOpenId === targetId ? null : targetId;
}

function FaqCard({ item, isOpen, onToggle, reducedMotion }) {
  const buttonId = `${item.id}-button`;
  const panelId = `${item.id}-panel`;

  return (
    <div
      data-reveal="card"
      className={`faq-card group/card relative overflow-hidden rounded-2xl border backdrop-blur-md font-['Inter',system-ui,sans-serif] ${
        reducedMotion ? '' : 'transition-all duration-300 ease-out'
      } ${
        isOpen
          ? 'bg-white/95 border-[#046A38]/75 ring-4 ring-[#046A38]/10 shadow-[0_16px_36px_-14px_rgba(4,106,56,0.25)]'
          : 'bg-white/75 border-white/90 ring-1 ring-[#046A38]/10 shadow-[0_4px_20px_-8px_rgba(9,51,34,0.10)] hover:bg-white/92 hover:border-[#046A38]/45 hover:ring-[#046A38]/15 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(4,106,56,0.22)]'
      }`}
    >
      {/* Subtle left accent bar on hover / open */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[#046A38] transition-all duration-300 ${
          isOpen
            ? 'opacity-100 scale-y-100'
            : 'opacity-0 scale-y-50 group-hover/card:opacity-60 group-hover/card:scale-y-75'
        }`}
      />

      <h3 className="m-0 font-['Inter',system-ui,sans-serif]">
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(item.id)}
          className={`group w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-4 sm:py-[18px] cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2 ${
            isOpen ? 'pb-3 sm:pb-3.5' : ''
          }`}
        >
          <span
            className={`font-['Inter',system-ui,sans-serif] font-semibold text-[15px] sm:text-base leading-snug pr-2 transition-colors duration-200 ${
              isOpen ? 'text-[#046A38]' : 'text-[#093322] group-hover:text-[#046A38]'
            }`}
          >
            {item.question}
          </span>
          <span
            aria-hidden="true"
            className={`faq-icon-badge shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              reducedMotion ? '' : 'transition-all duration-300 ease-out'
            } ${
              isOpen
                ? 'bg-[#E8F5EE] text-[#046A38] ring-2 ring-[#046A38]/20 rotate-180 scale-105'
                : 'bg-white/90 text-slate-600 border border-[#E8DCC8]/80 group-hover:bg-[#E8F5EE] group-hover:text-[#046A38] group-hover:border-[#046A38]/30 group-hover:scale-105'
            }`}
          >
            {isOpen ? (
              <Minus size={14} strokeWidth={2.3} />
            ) : (
              <Plus size={14} strokeWidth={2.3} />
            )}
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        data-open={isOpen ? 'true' : 'false'}
        className="faq-answer-panel"
        style={reducedMotion ? { transition: 'none' } : undefined}
      >
        <div className="faq-answer-inner">
          <div className="mx-5 sm:mx-6 mb-5 pt-3 border-t border-[#E5EFE8]">
            <p className="font-['Inter',system-ui,sans-serif] text-[15px] sm:text-base leading-relaxed text-black font-normal">
              {item.answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FaqSection() {
  const [openId, setOpenId] = useState(LEFT_FAQ_ITEMS[0].id);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleToggle = (id) => {
    setOpenId((prev) => toggleFaqItem(prev, id));
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="home-scroll-target home-band-mint relative overflow-hidden py-12 sm:py-16"
    >
      {/* Subtle ambient depth behind glassmorphic FAQ cards */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-[#046A38]/8 blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 h-72 w-72 rounded-full bg-white/50 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-reveal="section" className="text-center max-w-3xl mx-auto mb-9 sm:mb-11">
          <p className="inline-flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#046A38] font-['Inter',system-ui,sans-serif] mb-2.5">
            <span className="h-[2px] w-5 sm:w-6 bg-[#046A38]/75 rounded-full" aria-hidden="true" />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </p>
          <h2
            id="faq-heading"
            className="font-serif home-section-heading text-3xl sm:text-4xl lg:text-[42px] text-[#093322]"
          >
            How can Latrocore help <span className="text-[#046A38]">between visits?</span>
          </h2>
        </div>

        {/* Two independent vertical stacks so expanding left cards keeps right cards in place */}
        <div data-reveal-grid="faq" className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div data-faq-column="left" className="flex flex-col gap-4">
            {LEFT_FAQ_ITEMS.map((item) => (
              <FaqCard
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={handleToggle}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </div>

          <div data-faq-column="right" className="flex flex-col gap-4">
            {RIGHT_FAQ_ITEMS.map((item) => (
              <FaqCard
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={handleToggle}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
