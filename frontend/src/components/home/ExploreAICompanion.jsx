import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useScrollMotion';
import { initFanStageReveal } from '../../utils/scrollReveal';
import { openAICompanionWithDraft } from '../../utils/aiCompanionChat';
import {
  AI_COMPANION_TOPICS,
  INITIAL_ACTIVE_INDEX,
  getCircularOffset,
} from './aiCompanionTopics';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const OFFSET_LAYOUT = {
  '-3': {
    zIndex: 1,
    x: 'calc(var(--ai-offset-3) * -1)',
    y: '74px',
    rot: '-14deg',
    scale: '0.73',
    fanDelay: '150ms',
    headerPadding: 'px-4 lg:pl-3 lg:pr-[108px] xl:pl-3.5 xl:pr-[110px]',
    visibilityClass: 'opacity-0 pointer-events-none lg:opacity-90 lg:pointer-events-auto',
  },
  '-2': {
    zIndex: 2,
    x: 'calc(var(--ai-offset-2) * -1)',
    y: '46px',
    rot: '-9.5deg',
    scale: '0.81',
    fanDelay: '100ms',
    headerPadding: 'px-4 lg:pl-3 lg:pr-[96px] xl:pl-3.5 xl:pr-[102px]',
    visibilityClass: 'opacity-0 pointer-events-none lg:opacity-95 lg:pointer-events-auto',
  },
  '-1': {
    zIndex: 3,
    x: 'calc(var(--ai-offset-1) * -1)',
    y: '20px',
    rot: '-5deg',
    scale: '0.90',
    fanDelay: '50ms',
    headerPadding: 'px-4 lg:pl-3.5 lg:pr-[86px] xl:pl-4 xl:pr-[92px]',
    visibilityClass: 'opacity-85 lg:opacity-100 pointer-events-auto',
  },
  '0': {
    zIndex: 4,
    x: '0px',
    y: '0px',
    rot: '0deg',
    scale: '1',
    fanDelay: '0ms',
    headerPadding: 'px-5 sm:px-6',
    visibilityClass: 'opacity-100 pointer-events-auto',
  },
  '1': {
    zIndex: 3,
    x: 'var(--ai-offset-1)',
    y: '20px',
    rot: '5deg',
    scale: '0.90',
    fanDelay: '50ms',
    headerPadding: 'px-4 lg:pl-[86px] lg:pr-3.5 xl:pl-[92px] xl:pr-4',
    visibilityClass: 'opacity-85 lg:opacity-100 pointer-events-auto',
  },
  '2': {
    zIndex: 2,
    x: 'var(--ai-offset-2)',
    y: '46px',
    rot: '9.5deg',
    scale: '0.81',
    fanDelay: '100ms',
    headerPadding: 'px-4 lg:pl-[96px] lg:pr-3 xl:pl-[102px] xl:pr-3.5',
    visibilityClass: 'opacity-0 pointer-events-none lg:opacity-95 lg:pointer-events-auto',
  },
  '3': {
    zIndex: 1,
    x: 'var(--ai-offset-3)',
    y: '74px',
    rot: '14deg',
    scale: '0.73',
    fanDelay: '150ms',
    headerPadding: 'px-4 lg:pl-[108px] lg:pr-3 xl:pl-[110px] xl:pr-3.5',
    visibilityClass: 'opacity-0 pointer-events-none lg:opacity-90 lg:pointer-events-auto',
  },
};

export default function ExploreAICompanion({ onAskQuestion }) {
  const [activeIndex, setActiveIndex] = useState(INITIAL_ACTIVE_INDEX);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const prefersReducedMotion = usePrefersReducedMotion();
  const touchStartRef = useRef(null);
  const stageRef = useRef(null);
  const settleTimerRef = useRef(null);

  const settleImmediately = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (stageRef.current) {
      stageRef.current.setAttribute('data-fan-phase', 'interactive');
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    return initFanStageReveal(stageRef.current, {
      prefersReducedMotion,
      settleTimerRef,
      onSettle: settleImmediately,
    });
  }, [prefersReducedMotion, settleImmediately]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = (e) => setIsDesktop(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    if (typeof mq.addListener === 'function') {
      mq.addListener(update);
      return () => mq.removeListener(update);
    }
    return undefined;
  }, []);

  const total = AI_COMPANION_TOPICS.length;
  const activeTopic = AI_COMPANION_TOPICS[activeIndex];

  const handlePrev = () => {
    settleImmediately();
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    settleImmediately();
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handleSelectTopic = (index) => {
    settleImmediately();
    setActiveIndex(index);
  };

  const handleAskQuestion = (question) => {
    if (typeof onAskQuestion === 'function') {
      onAskQuestion(question);
    } else {
      openAICompanionWithDraft(question);
    }
  };

  const handleCarouselKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handlePrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleNext();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(total - 1);
    }
  };

  const handleTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    touchStartRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const handleTouchEnd = (event) => {
    if (!touchStartRef.current || event.changedTouches.length === 0) return;
    const dx = touchStartRef.current.x - event.changedTouches[0].clientX;
    const dy = touchStartRef.current.y - event.changedTouches[0].clientY;
    touchStartRef.current = null;

    // Trigger slide change only on intentional horizontal swipe
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  return (
    <section
      id="ai-companion-explore"
      aria-labelledby="explore-ai-companion-heading"
      className="home-scroll-target home-band-mint relative z-0 isolate w-full py-12 sm:py-16 border-b border-[#E8DCC8] overflow-x-clip overflow-y-visible"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Subtitle */}
        <div data-reveal="section" className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h2
            id="explore-ai-companion-heading"
            className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-[#093322] tracking-tight leading-tight"
          >
            Explore the Latrocore AI companion
          </h2>
          <p className="mt-2.5 font-['Inter',var(--font-sans)] text-sm sm:text-base font-medium text-[#24383F] leading-relaxed">
            Choose a topic to start a conversation.
          </p>
        </div>

        {/* Interactive 5-Card Fan Carousel */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Explore the Latrocore AI companion topics"
          onKeyDown={handleCarouselKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative"
        >
          {/* Screen-reader live announcement of currently selected topic */}
          <p className="sr-only" aria-live="polite">
            {activeTopic.title}, topic {activeIndex + 1} of {total}. {activeTopic.question}
          </p>

          {/* Overlapping Fan Stage */}
          <div
            ref={stageRef}
            className="ai-companion-stage relative isolate mx-auto w-full h-[480px] sm:h-[510px] lg:h-[480px] xl:h-[520px] flex items-start justify-center pt-2 sm:pt-3 select-none"
          >
            {AI_COMPANION_TOPICS.map((topic, index) => {
              const offset = getCircularOffset(index, activeIndex, total);
              const isActive = offset === 0;
              const layout = OFFSET_LAYOUT[String(offset)] || OFFSET_LAYOUT['3'];
              const TopicIcon = topic.icon;
              const isHiddenCard = !isDesktop && Math.abs(offset) >= 2;

              const transitionClass = prefersReducedMotion
                ? 'transition-none'
                : 'transition-all duration-300 ease-out';

              const sharedCardClasses = `ai-companion-card absolute top-2 sm:top-3 left-1/2 -ml-[calc(var(--ai-card-w)/2)] w-[var(--ai-card-w)] rounded-3xl bg-white flex flex-col text-center origin-center ${transitionClass} ${layout.visibilityClass}`;

              return (
                <article
                  key={topic.id}
                  data-topic-id={topic.id}
                  data-offset={offset}
                  data-active={isActive ? 'true' : 'false'}
                  aria-current={isActive ? 'true' : undefined}
                  aria-hidden={isHiddenCard ? 'true' : undefined}
                  style={{
                    zIndex: layout.zIndex,
                    '--card-x': layout.x,
                    '--card-y': layout.y,
                    '--card-rot': layout.rot,
                    '--card-scale': layout.scale,
                    '--fan-delay': layout.fanDelay,
                  }}
                  className={`${sharedCardClasses} ${
                    isActive
                      ? 'border-2 border-[#046A38]/30 shadow-[0_24px_52px_-16px_rgba(9,51,34,0.22)] ring-1 ring-[#046A38]/10'
                      : 'border border-[#E8DCC8] hover:border-[#046A38]/45 shadow-[0_14px_32px_-14px_rgba(9,51,34,0.14)]'
                  }`}
                >
                  {/* Card Header: Centered Mint Icon Tile + Crisp Title in Exposed Safe Zone */}
                  <div
                    className={`flex flex-col items-center text-center ${
                      isActive ? 'pt-5 sm:pt-6' : 'pt-4 sm:pt-5'
                    } ${layout.headerPadding} ${transitionClass}`}
                  >
                    <div
                      className={`shrink-0 rounded-xl bg-[#E8F5EE] text-[#046A38] border border-[#A8D7BD]/75 flex items-center justify-center shadow-2xs ${
                        isActive ? 'w-10 h-10' : 'w-8 h-8'
                      }`}
                      aria-hidden="true"
                    >
                      <TopicIcon size={isActive ? 19 : 16} strokeWidth={2.2} />
                    </div>
                    <h3
                      className={`font-serif font-bold text-[#093322] tracking-tight leading-snug text-center ${
                        isActive
                          ? 'mt-2.5 text-xl sm:text-[22px]'
                          : Math.abs(offset) >= 2
                          ? 'mt-2 text-[13.5px] xl:text-[14.5px] min-h-[38px] flex items-center justify-center'
                          : 'mt-2 text-[15px] sm:text-base min-h-[42px] flex items-center justify-center'
                      }`}
                    >
                      {topic.title}
                    </h3>
                  </div>

                  {/* Sample Question (Centered and fully visible inside active center card) */}
                  {isActive && (
                    <div className="px-4 sm:px-6 mt-2 min-h-[52px] flex items-center justify-center">
                      <p className="font-['Inter',var(--font-sans)] text-[14px] sm:text-[15px] font-medium text-[#1F343B] leading-snug text-center max-w-[288px] mx-auto">
                        “{topic.question}”
                      </p>
                    </div>
                  )}

                  {/* 4:3 Illustration Container */}
                  <div className={isActive ? 'px-5 sm:px-6 mt-3' : 'px-4 sm:px-5 mt-3 pb-4 sm:pb-5'}>
                    <div
                      className={`w-full aspect-[4/3] rounded-2xl border flex items-center justify-center p-3 sm:p-4 overflow-hidden ${
                        isActive
                          ? 'bg-[#FAF6EF] border-[#E8DCC8]/90'
                          : 'bg-[#FAF6EF]/85 border-[#E8DCC8]/70'
                      }`}
                    >
                      <img
                        src={topic.image}
                        alt={topic.imageAlt}
                        width={topic.imageWidth}
                        height={topic.imageHeight}
                        loading={isActive ? 'eager' : 'lazy'}
                        draggable={false}
                        className="w-full h-full object-contain drop-shadow-[0_10px_18px_rgba(9,51,34,0.10)]"
                      />
                    </div>
                  </div>

                  {/* Active Center Card Full-Width CTA Button */}
                  {isActive ? (
                    <div className="px-5 sm:px-6 pt-4 pb-5 sm:pb-6 mt-auto">
                      <button
                        type="button"
                        onClick={() => handleAskQuestion(topic.question)}
                        className="w-full py-3 px-4 rounded-xl bg-[#046A38] hover:bg-[#03542C] active:scale-[0.99] text-white font-['Inter',var(--font-sans)] font-semibold text-sm shadow-sm hover:shadow-md transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        Ask this question
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      tabIndex={isHiddenCard ? -1 : 0}
                      aria-hidden={isHiddenCard ? 'true' : undefined}
                      aria-label={`Select ${topic.title}`}
                      onClick={() => handleSelectTopic(index)}
                      className="absolute inset-0 rounded-3xl bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF6EF]"
                    />
                  )}
                </article>
              );
            })}
          </div>

          {/* Controls Below Cards: Circular Previous + 5 Selectable Dots + Circular Next */}
          <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous AI companion topic"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-[#E8F5EE] text-[#093322] hover:text-[#046A38] border border-[#E8DCC8] hover:border-[#046A38] shadow-xs flex items-center justify-center cursor-pointer transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF6EF]"
            >
              <ChevronLeft size={20} strokeWidth={2.3} />
            </button>

            <div
              role="tablist"
              aria-label="Choose an AI companion topic"
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#E8DCC8]"
            >
              {AI_COMPANION_TOPICS.map((topic, index) => {
                const isSelected = index === activeIndex;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-label={topic.title}
                    title={topic.title}
                    onClick={() => handleSelectTopic(index)}
                    className={`p-1.5 rounded-full flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-1`}
                  >
                    <span
                      className={`block h-2.5 rounded-full ${
                        prefersReducedMotion ? 'transition-none' : 'transition-all duration-300'
                      } ${
                        isSelected
                          ? 'w-7 bg-[#046A38]'
                          : 'w-2.5 bg-[#A8D7BD] hover:bg-[#429E72]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next AI companion topic"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-[#E8F5EE] text-[#093322] hover:text-[#046A38] border border-[#E8DCC8] hover:border-[#046A38] shadow-xs flex items-center justify-center cursor-pointer transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF6EF]"
            >
              <ChevronRight size={20} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
