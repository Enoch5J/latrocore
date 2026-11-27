import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import medicineIllustration from '../../assets/herosection-images/Friendly Medicine Reminder Companion-1.png';
import aiAssistantIllustration from '../../assets/herosection-images/Friendly woman and health assistant robot-2.png';
import progressTrackingIllustration from '../../assets/herosection-images/Doctor Tracking Glucose Trends-3.png';

const FEATURES = [
  {
    id: 1,
    key: 'medicine',
    title: 'Medicine reminders',
    subtitle: 'Keep your daily routine on track.',
    description: 'Get timely reminders for each dose and see when your refills are coming up.',
    image: medicineIllustration,
    imageAlt: 'Patient managing daily prescribed medicines with companion pill organiser',
    route: '/patient/medications',
  },
  {
    id: 2,
    key: 'ai-support',
    title: 'AI health support',
    subtitle: 'Ask questions in plain language.',
    description: 'Get clear explanations for your lab results, everyday meals, and diabetes care.',
    image: aiAssistantIllustration,
    imageAlt: 'Patient discussing questions with friendly AI health assistant robot',
    route: '/patient/assistant',
  },
  {
    id: 3,
    key: 'progress-tracking',
    title: 'Progress tracking',
    subtitle: 'See your health trends over time.',
    description: 'Follow your blood sugar readings and daily habits to stay ready for your next visit.',
    image: progressTrackingIllustration,
    imageAlt: 'Healthcare doctor reviewing patient glucose trends and longitudinal clinical progress',
    route: '/patient/metrics?tab=glucose',
  },
];

export default function DailyCareCompanion({ isAuthenticated }) {
  const navigate = useNavigate();
  // Default active card is index 1 (AI health support)
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
      className="home-scroll-target home-band-cream relative w-full py-12 sm:py-16 border-b border-[#E8DCC8] overflow-hidden"
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
        <div data-reveal="section" className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <p className="inline-flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#046A38] font-['Inter',system-ui,sans-serif] mb-2.5">
            <span className="h-[2px] w-5 sm:w-6 bg-[#046A38]/75 rounded-full" aria-hidden="true" />
            <span>CONNECTED HEALTH COMPANION</span>
          </p>
          <h2 className="home-section-heading text-3xl sm:text-4xl lg:text-[42px] text-[#093322]">
            A little help, throughout your day.
          </h2>
          <p className="mt-2 text-xs sm:text-sm lg:text-base font-medium text-[#45556C] max-w-xl mx-auto leading-relaxed">
            Your medicines, health questions and progress, thoughtfully connected.
          </p>
        </div>

        {/* 3 Interactive Cards Grid (Identical layout to user screenshot) */}
        <div
          data-reveal-grid="daily-care-companion"
          className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch"
        >
          {FEATURES.map((feature, idx) => {
            const isActive = activeCard === idx;

            return (
              <div key={feature.id} data-reveal="card" className="flex">
                <div
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => setActiveCard(idx)}
                  onFocus={() => setActiveCard(idx)}
                  onClick={() => handleCardClick(feature)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(feature);
                    }
                  }}
                  className={`w-full group relative rounded-3xl bg-white transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between overflow-hidden cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2 ${
                    isActive
                      ? 'border-2 border-[#046A38] ring-4 ring-[#046A38]/10 shadow-xl bg-gradient-to-b from-white to-[#FAF6EF]/60 -translate-y-1'
                      : 'border border-[#E8DCC8] hover:border-[#046A38]/50 shadow-xs hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
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
                  <div className="pt-4 border-t border-[#E8DCC8]/70 mt-auto flex flex-col items-center text-center">
                    <h3 className="font-serif font-bold text-xl sm:text-[22px] text-[#093322] tracking-tight leading-snug group-hover:text-[#046A38] transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-[13px] sm:text-sm font-bold text-[#046A38] mt-1 leading-snug">
                      {feature.subtitle}
                    </p>
                    <p className="text-[13px] sm:text-sm text-[#45556C] font-medium leading-relaxed mt-1.5 max-w-[34ch]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
