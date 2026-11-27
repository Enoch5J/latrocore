import { useState } from 'react';
import {
  CalendarDays,
  Droplet,
  MessageSquareMore,
  Pill,
} from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useScrollMotion';
import { ABOUT_CARDS } from './aboutCards';

function AboutCardIcon({ iconKey }) {
  switch (iconKey) {
    case 'pill':
      return <Pill size={19} strokeWidth={1.85} />;
    case 'droplet':
      return <Droplet size={19} strokeWidth={1.85} />;
    case 'message':
      return <MessageSquareMore size={19} strokeWidth={1.85} />;
    case 'calendar':
    default:
      return <CalendarDays size={19} strokeWidth={1.85} />;
  }
}

export default function AboutSection({ onExploreSolutions }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleExploreClick = (e) => {
    if (typeof onExploreSolutions === 'function') {
      onExploreSolutions(e);
      return;
    }

    const target = typeof document !== 'undefined' ? document.getElementById('care-continuum') : null;
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    if (typeof window !== 'undefined' && window.location.hash !== '#care-continuum') {
      window.history.replaceState(null, '', '#care-continuum');
    }
  };

  return (
    <section
      id="about-latrocore"
      aria-labelledby="about-latrocore-heading"
      className="home-scroll-target home-band-mint py-14 sm:py-18 lg:py-22"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 xl:gap-18 items-center">
          {/* Left Column: Editorial Introduction */}
          <div data-reveal="section" className="min-w-0">
            <p className="flex items-center gap-3 text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#0D261C] leading-none mb-5">
              <span className="h-[2.5px] w-8 bg-[#046A38] rounded-full" aria-hidden="true" />
              <span>ABOUT LATROCORE</span>
            </p>

            <h2
              id="about-latrocore-heading"
              className="home-section-heading text-2xl sm:text-3xl lg:text-[33px] xl:text-[37px] lg:whitespace-nowrap"
            >
              <span className="text-[#0D261C] inline">Diabetes care </span>
              <span className="text-[#046A38] inline">between visits.</span>
            </h2>

            <div className="mt-6 max-w-[540px] space-y-4 text-[17px] sm:text-[18.5px] lg:text-[19px] leading-[1.7] text-[#1D2D26] font-medium">
              <p>
                Most diabetes care happens at home. That’s where readings get written down, medicines are taken, and questions come up.
              </p>
              <p>
                We built Latrocore to keep those details together, so you can bring a clear record to your next appointment.
              </p>
            </div>

            <div className="mt-8">
              <a
                href="#care-continuum"
                onClick={handleExploreClick}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] px-6 py-3.5 text-[15.5px] sm:text-[16px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(4,106,56,0.5)] transition-all duration-200 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-4"
              >
                <span>Explore our solutions</span>
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:transform-none"
                >
                  →
                </span>
              </a>
            </div>
          </div>

          {/* Right Column: Timeline Card with Four Care Highlights */}
          <div
            data-reveal-grid="about-latrocore"
            data-reveal-order="sequential"
            data-reveal-step="60"
            className="relative rounded-[20px] border border-[#E3EDE6] bg-white p-4 sm:p-5 shadow-[0_12px_36px_-16px_rgba(13,38,28,0.12)]"
          >
            <div
              className="relative"
              onMouseLeave={() => setActiveIndex(0)}
            >
              <span
                aria-hidden="true"
                className="absolute left-[36px] sm:left-[42px] top-10 bottom-10 w-[1.5px] -translate-x-1/2 bg-[#7CC99E]"
              />
              {ABOUT_CARDS.map((card, index) => {
                const isHighlighted = index === activeIndex;
                const isLast = index === ABOUT_CARDS.length - 1;

                return (
                  <div key={card.id}>
                    <article
                      data-reveal="card"
                      onMouseEnter={() => setActiveIndex(index)}
                      onFocus={() => setActiveIndex(index)}
                      tabIndex={0}
                      className={`relative flex items-center gap-4 px-4 py-4 sm:gap-5 sm:px-5 sm:py-5 rounded-xl transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#046A38] focus-visible:outline-offset-2 ${
                        isHighlighted
                          ? 'bg-[#E5F6EC]'
                          : 'bg-transparent hover:bg-[#E5F6EC]/60'
                      }`}
                    >
                      <div
                        aria-hidden="true"
                        className={`relative z-10 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border-[1.5px] transition-colors duration-200 ${
                          isHighlighted
                            ? 'border-[#046A38] text-[#046A38]'
                            : 'border-[#7CC99E] text-[#18372B]'
                        }`}
                      >
                        <AboutCardIcon iconKey={card.iconKey} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[17px] sm:text-[18px] text-[#0D261C] leading-snug tracking-tight">
                          {card.title}
                        </h3>
                        <p className="mt-1 text-[14.5px] sm:text-[15px] text-[#2F3E37] font-medium leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </article>

                    {!isLast && (
                      <div
                        aria-hidden="true"
                        className="ml-[72px] sm:ml-[84px] mr-4 sm:mr-5 border-b border-[#E5EAE6]"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
