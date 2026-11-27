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
      className="home-scroll-target bg-[#FAF8F3] py-12 sm:py-16 lg:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-10 lg:gap-14 xl:gap-20 items-center">
          {/* Left Column: Editorial Introduction */}
          <div data-reveal="section" className="min-w-0">
            <p className="flex items-center gap-3 text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] text-[#0D261C] leading-none mb-5">
              <span className="h-[2.5px] w-8 bg-[#169B53] rounded-full" aria-hidden="true" />
              <span>ABOUT LATROCORE</span>
            </p>

            <h2
              id="about-latrocore-heading"
              className="font-sans font-extrabold text-[36px] sm:text-[44px] lg:text-[50px] tracking-[-0.025em] leading-[1.08]"
            >
              <span className="text-[#0D261C] block">Diabetes care</span>
              <span className="text-[#169B53] block">between visits.</span>
            </h2>

            <div className="mt-6 max-w-[440px] space-y-4 text-[15px] sm:text-[15.5px] leading-[1.65] text-[#22312B] font-normal">
              <p>
                Most diabetes care happens at home. That’s where readings get written down, medicines are taken, and questions come up.
              </p>
              <p>
                We built Latrocore to keep those details together, so you can bring a clear record to your next appointment.
              </p>
            </div>

            <div className="mt-7">
              <a
                href="#care-continuum"
                onClick={handleExploreClick}
                className="group inline-flex items-center gap-2 text-[15px] font-semibold text-[#137A43] hover:text-[#0D5C32] underline underline-offset-[6px] decoration-[1.5px] transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#169B53] focus-visible:outline-offset-4 rounded-sm"
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
            className="relative rounded-[20px] border border-[#EFECE4] bg-white p-3.5 sm:p-4 shadow-[0_12px_36px_-16px_rgba(13,38,28,0.12)]"
          >
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute left-[34px] sm:left-[38px] top-9 bottom-9 w-[1.5px] -translate-x-1/2 bg-[#7CC99E]"
              />
              {ABOUT_CARDS.map((card, index) => {
                const isHighlighted = index === 0;
                const isLast = index === ABOUT_CARDS.length - 1;

                return (
                  <div key={card.id}>
                    <article
                      data-reveal="card"
                      className={`relative flex items-center gap-4 px-3.5 py-4 sm:gap-5 sm:px-4 sm:py-4.5 rounded-xl transition-colors ${
                        isHighlighted
                          ? 'bg-[#E5F6EC]'
                          : 'bg-transparent hover:bg-[#F5FBF7]/70'
                      }`}
                    >
                      <div
                        aria-hidden="true"
                        className={`relative z-10 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white border-[1.5px] ${
                          isHighlighted
                            ? 'border-[#169B53] text-[#169B53]'
                            : 'border-[#7CC99E] text-[#18372B]'
                        }`}
                      >
                        <AboutCardIcon iconKey={card.iconKey} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[16px] sm:text-[17px] text-[#0D261C] leading-snug tracking-tight">
                          {card.title}
                        </h3>
                        <p className="mt-0.5 text-[13.5px] sm:text-[14px] text-[#2F3E37] font-normal leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </article>

                    {!isLast && (
                      <div
                        aria-hidden="true"
                        className="ml-[68px] sm:ml-[76px] mr-3.5 sm:mr-4 border-b border-[#E5EAE6]"
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
