import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../hooks/useScrollMotion';
import { openAICompanionWithDraft } from '../../utils/aiCompanionChat';
import mintDottedWave from '../../assets/hero/mint-dotted-wave.svg';
import { HERO_SLIDES, getNextHeroIndex } from './heroCarouselSlides';
import './HeroCarousel.css';

const SLIDE_COUNT = HERO_SLIDES.length;

export default function HeroCarousel({ onAskLatroAI }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const tabRefs = useRef([]);

  const selectSlide = useCallback((nextIndex, focusTab = false) => {
    setActiveIndex(nextIndex);
    if (focusTab) {
      tabRefs.current[nextIndex]?.focus();
    }
  }, []);

  const handleTabKeyDown = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const nextIndex = getNextHeroIndex(activeIndex, event.key, SLIDE_COUNT);
    selectSlide(nextIndex, true);
  };

  const handleCtaClick = (slide) => {
    if (slide.actionType === 'chat') {
      if (typeof onAskLatroAI === 'function') {
        onAskLatroAI();
      } else {
        openAICompanionWithDraft('', { autoSend: false });
      }
      return;
    }
    if (slide.target) {
      navigate(slide.target);
    }
  };

  return (
    <section
      id="hero-carousel"
      aria-label="Latrocore diabetes care highlights"
      className="latro-hero-section home-band-cream w-full pt-6 pb-6 sm:pt-9 sm:pb-8 lg:pt-12 lg:pb-10"
    >
      <div className="latro-hero-background" aria-hidden="true">
        <img src={mintDottedWave} alt="" draggable={false} />
      </div>
      <div className="latro-hero-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Slides stage */}
        <div className="latro-hero-stage">
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === activeIndex;
            const HeadingTag = isActive ? 'h1' : 'p';

            return (
              <div
                key={slide.id}
                id={`hero-panel-${slide.id}`}
                role="tabpanel"
                aria-labelledby={`hero-tab-${slide.id}`}
                aria-hidden={!isActive}
                data-hero-slide={slide.id}
                data-active={isActive ? 'true' : 'false'}
                className={`latro-hero-slide ${isActive ? 'is-active' : ''}`}
                style={
                  prefersReducedMotion
                    ? { transition: 'none', transform: 'none' }
                    : undefined
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 sm:gap-8 lg:gap-12">
                  {/* Left column */}
                  <div className="md:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left max-w-[540px] mx-auto lg:mx-0">
                    <HeadingTag className="latro-hero-headline m-0 text-[31px] sm:text-[40px] md:text-[38px] lg:text-[48px] xl:text-[54px] max-w-[15ch] sm:max-w-[16ch]">
                      {slide.headline}
                    </HeadingTag>

                    <p className="latro-hero-body mt-3.5 sm:mt-5 text-[15px] sm:text-[16px] lg:text-[18px] font-normal max-w-[42ch]">
                      {slide.body}
                    </p>

                    <div className="mt-6 sm:mt-7">
                      <button
                        type="button"
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => handleCtaClick(slide)}
                        className="latro-hero-cta inline-flex items-center justify-center px-6 py-3 sm:px-7 sm:py-3.5 rounded-full text-sm sm:text-[15px] font-semibold leading-none shadow-sm hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF6EF]"
                      >
                        {slide.buttonLabel}
                      </button>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="md:col-span-6 flex items-center justify-center w-full">
                    <div className="w-full h-[230px] sm:h-[290px] md:h-[320px] lg:h-[385px] xl:h-[420px] flex items-center justify-center">
                      <img
                        src={slide.image}
                        alt={slide.imageAlt}
                        width={slide.imageWidth}
                        height={slide.imageHeight}
                        loading="eager"
                        draggable={false}
                        className="w-full h-full object-contain object-center select-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab strip */}
        <div className="mt-7 sm:mt-9 lg:mt-11">
          <div
            role="tablist"
            aria-label="Hero feature topics"
            onKeyDown={handleTabKeyDown}
            className="grid grid-cols-4 gap-1 sm:gap-4 max-w-4xl mx-auto"
          >
            {HERO_SLIDES.map((slide, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  ref={(el) => { tabRefs.current[idx] = el; }}
                  type="button"
                  role="tab"
                  id={`hero-tab-${slide.id}`}
                  aria-selected={isSelected}
                  aria-controls={`hero-panel-${slide.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => selectSlide(idx, false)}
                  className={`latro-hero-tab relative flex flex-col items-center justify-center min-h-[44px] px-1 sm:px-3 py-2 bg-transparent border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF6EF] rounded-lg ${
                    isSelected ? 'is-active font-bold' : 'font-medium'
                  }`}
                >
                  <span className="text-[12px] min-[390px]:text-[13px] sm:text-[15px] lg:text-base whitespace-nowrap leading-snug">
                    {slide.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`latro-hero-tab-underline mt-2 block h-[3px] w-8 sm:w-11 rounded-full ${
                      isSelected ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
