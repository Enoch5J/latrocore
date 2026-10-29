import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

import medicineIllustration from '../../assets/herosection-images/Friendly Medicine Reminder Companion-1.png';
import aiAssistantIllustration from '../../assets/herosection-images/Friendly woman and health assistant robot-2.png';
import progressTrackingIllustration from '../../assets/herosection-images/Doctor Tracking Glucose Trends-3.png';

const FEATURES = [
  {
    id: 1,
    key: 'medicine',
    title: 'Medicine reminders',
    subtitle: 'Keep your prescribed routine on track.',
    description: 'Thoughtful daily alerts synchronized with your prescription routine to prevent missed doses.',
    image: medicineIllustration,
    imageAlt: 'Patient managing daily prescribed medicines with companion pill organiser',
    route: '/patient/medications',
  },
  {
    id: 2,
    key: 'ai-support',
    title: 'AI health support',
    subtitle: 'Ask questions. Understand your care.',
    description: 'Instant educational clarity on diabetic lab terms, dietary glycemic index, and lifestyle habits.',
    image: aiAssistantIllustration,
    imageAlt: 'Patient discussing questions with friendly AI health assistant robot',
    route: '/patient/assistant',
  },
  {
    id: 3,
    key: 'progress-tracking',
    title: 'Progress tracking',
    subtitle: 'See your health trends over time.',
    description: 'Continuous glycemic telemetry curves, Time-in-Range tracking, and longitudinal milestones.',
    image: progressTrackingIllustration,
    imageAlt: 'Healthcare doctor reviewing patient glucose trends and longitudinal clinical progress',
    route: '/patient/glucose',
  },
];

export default function DailyCareCompanion({ isAuthenticated }) {
  const navigate = useNavigate();
  // Default active card is index 1 (AI health support), exactly matching the user's screenshot
  const [activeCard, setActiveCard] = useState(1);

  const handleCardClick = (feature) => {
    setActiveCard(feature.id - 1);
    if (isAuthenticated) {
      navigate(feature.route);
    } else {
      navigate('/login?role=patient');
    }
  };

  return (
    <section
      id="daily-care-companion"
      className="relative w-full py-12 sm:py-16 bg-[#FAF6EF] border-b border-[#E8DCC8] overflow-hidden"
      aria-label="Everyday Health Support & Companion Features"
    >
      {/* Background Grid Pattern & Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[#046A38]/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-[#E34222]/4 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#E8DCC8_1px,transparent_1px),linear-gradient(to_bottom,#E8DCC8_1px,transparent_1px)] bg-[size:48px_48px] opacity-25" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E8F5EE] border border-[#A8D7BD] text-xs font-bold text-[#046A38] uppercase tracking-wider mb-2.5 shadow-2xs">
            <Sparkles size={13} className="text-[#046A38]" />
            <span>Connected Health Companion</span>
          </span>
          <h2 className="font-serif font-black text-2xl sm:text-3xl lg:text-4xl text-[#093322] tracking-tight leading-tight">
            A little help, throughout your day.
          </h2>
          <p className="mt-2 text-xs sm:text-sm lg:text-base font-medium text-[#45556C] max-w-xl mx-auto leading-relaxed">
            Your medicines, health questions and progress, thoughtfully connected.
          </p>
        </div>

        {/* 3 Interactive Cards Grid (Identical layout to user screenshot) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {FEATURES.map((feature, idx) => {
            const isActive = activeCard === idx;

            return (
              <div
                key={feature.id}
                onMouseEnter={() => setActiveCard(idx)}
                onClick={() => handleCardClick(feature)}
                className={`group relative rounded-3xl bg-white transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between overflow-hidden cursor-pointer select-none ${
                  isActive
                    ? 'border-2 border-[#046A38] ring-4 ring-[#046A38]/10 shadow-xl bg-gradient-to-b from-white to-[#FAF6EF]/60 -translate-y-1'
                    : 'border border-[#E8DCC8] hover:border-[#046A38]/50 shadow-xs hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* ── CARD 2 OVERLAY: Top-Left AI Query Badge (User Screenshot Match) ── */}
                {feature.key === 'ai-support' && (
                  <div
                    className={`absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-20 max-w-[215px] p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#A8D7BD] shadow-md transition-all duration-300 pointer-events-none ${
                      isActive ? 'opacity-100 scale-100' : 'opacity-85 scale-95'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#E8F5EE] text-[#046A38] flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={13} className="text-[#046A38]" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[11px] font-black text-slate-900">
                          “What does HbA1c mean?”
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-[#FAF6EF] border border-[#E8DCC8] text-[8.5px] font-black text-[#046A38] uppercase">
                            Educational guidance
                          </span>
                          <span className="flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-[#046A38] animate-pulse" />
                            <span className="w-1 h-1 rounded-full bg-[#046A38] animate-pulse delay-100" />
                            <span className="w-1 h-1 rounded-full bg-[#046A38] animate-pulse delay-200" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2.5D Illustration Stage */}
                <div className="relative w-full h-[220px] sm:h-[240px] flex items-center justify-center overflow-visible mt-2 mb-2">
                  <img
                    src={feature.image}
                    alt={feature.imageAlt}
                    width={320}
                    height={320}
                    loading="lazy"
                    className="max-h-[205px] sm:max-h-[225px] w-auto max-w-full object-contain drop-shadow-[0_12px_22px_rgba(4,106,56,0.10)] transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Card Editorial Details */}
                <div className="pt-4 border-t border-[#E8DCC8]/70 mt-auto flex flex-col">
                  <h3 className="font-serif font-bold text-xl sm:text-[22px] text-[#093322] tracking-tight leading-snug group-hover:text-[#046A38] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] font-bold text-[#046A38] mt-1 leading-snug">
                    {feature.subtitle}
                  </p>
                  <p className="text-xs sm:text-[13px] text-[#45556C] font-normal leading-relaxed mt-1.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
