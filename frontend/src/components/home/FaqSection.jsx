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
      className={`faq-card bg-white rounded-2xl border font-['Inter',system-ui,sans-serif] ${
        reducedMotion ? '' : 'transition-colors duration-200'
      } ${
        isOpen
          ? 'border-[#046A38] shadow-sm'
          : 'border-[#E8DCC8] hover:border-[#046A38]/40 shadow-2xs'
      }`}
    >
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
          <span className="font-['Inter',system-ui,sans-serif] font-semibold text-sm sm:text-[15px] leading-snug text-[#093322] pr-2">
            {item.question}
          </span>
          <span
            aria-hidden="true"
            className={`faq-icon-badge shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
              reducedMotion ? '' : 'transition-colors duration-200'
            } ${
              isOpen
                ? 'bg-[#E8F5EE] text-[#046A38]'
                : 'bg-stone-100 text-slate-600 group-hover:bg-[#E8F5EE] group-hover:text-[#046A38]'
            }`}
          >
            {isOpen ? (
              <Minus size={14} strokeWidth={2.25} />
            ) : (
              <Plus size={14} strokeWidth={2.25} />
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
          <p className="px-5 sm:px-6 pb-5 pt-0 font-['Inter',system-ui,sans-serif] text-xs sm:text-[14px] leading-relaxed text-[#24383F] font-normal">
            {item.answer}
          </p>
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
      className="home-scroll-target home-band-mint py-12 sm:py-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-reveal="section" className="text-center max-w-3xl mx-auto mb-9 sm:mb-11">
          <p className="inline-flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#046A38] font-['Inter',system-ui,sans-serif] mb-2.5">
            <span className="h-[1.5px] w-4 bg-[#046A38]/75 rounded-full" aria-hidden="true" />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </p>
          <h2
            id="faq-heading"
            className="font-serif font-bold text-2xl sm:text-3xl lg:text-[34px] tracking-tight leading-tight text-[#093322]"
          >
            How can Latrocore help <span className="text-[#046A38]">between visits?</span>
          </h2>
        </div>

        {/* Two independent vertical stacks so expanding left cards keeps right cards in place */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
