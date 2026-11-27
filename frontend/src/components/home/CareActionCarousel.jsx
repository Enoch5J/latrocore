import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { usePrefersReducedMotion } from '../../hooks/useScrollMotion';
import labReportsImage from '../../assets/care-actions/lab-reports.png';
import visitNotesImage from '../../assets/care-actions/visit-notes.png';
import medicinesImage from '../../assets/care-actions/medicines.png';
import bloodSugarImage from '../../assets/care-actions/blood-sugar.png';
import screeningsImage from '../../assets/care-actions/screenings.png';

const CARE_ACTIONS = [
  { label: 'View lab reports', to: '/patient/investigations', image: labReportsImage },
  { label: 'Read visit notes', to: '/patient/dashboard', image: visitNotesImage },
  { label: 'Order medicines', to: '/patient/medications', image: medicinesImage },
  { label: 'Track blood sugar', to: '/patient/glucose', image: bloodSugarImage },
  { label: 'Check screenings', to: '/patient/screening', image: screeningsImage },
];

// Three copies keep ultra-wide viewports filled while wrapping seamlessly across one set width.
const TRACK_COPIES = [0, 1, 2];
const MARQUEE_SPEED_PX_PER_SEC = 120;

export default function CareActionCarousel() {
  const trackRef = useRef(null);
  const primarySetRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const offsetRef = useRef(0);
  const setWidthRef = useRef(0);
  const pausedRef = useRef(false);

  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);

  useEffect(() => {
    pausedRef.current = prefersReducedMotion || isHovered || isFocusedWithin;
  }, [prefersReducedMotion, isHovered, isFocusedWithin]);

  const normalizeOffset = useCallback((value) => {
    const width = setWidthRef.current;
    if (!width) return 0;
    return ((value % width) + width) % width;
  }, []);

  const applyTransform = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = prefersReducedMotion
      ? 'translate3d(0, 0, 0)'
      : `translate3d(${-offsetRef.current}px, 0, 0)`;
  }, [prefersReducedMotion]);

  const measureTrack = useCallback(() => {
    const primarySet = primarySetRef.current;
    if (!primarySet) return;
    const width = primarySet.getBoundingClientRect().width;
    const gap = Number.parseFloat(window.getComputedStyle(primarySet).columnGap) || 12;

    setWidthRef.current = width + gap;
    offsetRef.current = normalizeOffset(offsetRef.current);
    applyTransform();
  }, [applyTransform, normalizeOffset]);

  useEffect(() => {
    measureTrack();
    window.addEventListener('resize', measureTrack);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measureTrack);
    if (primarySetRef.current) {
      resizeObserver?.observe(primarySetRef.current);
    }
    return () => {
      window.removeEventListener('resize', measureTrack);
      resizeObserver?.disconnect();
    };
  }, [measureTrack]);

  useEffect(() => {
    if (prefersReducedMotion) {
      applyTransform();
      return undefined;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!pausedRef.current && setWidthRef.current > 0) {
        offsetRef.current = normalizeOffset(offsetRef.current + MARQUEE_SPEED_PX_PER_SEC * dt);
        applyTransform();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [applyTransform, normalizeOffset, prefersReducedMotion]);

  const handleViewportFocus = () => setIsFocusedWithin(true);
  const handleViewportBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsFocusedWithin(false);
    }
  };

  return (
    <section
      id="care-continuum"
      aria-labelledby="care-actions-heading"
      className="home-scroll-target home-band-cream border-y border-[#E8DCC8] py-6 sm:py-7"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-reveal="section" className="mb-4">
          <p className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#046A38] font-['Inter',system-ui,sans-serif] mb-2">
            <span className="h-[2px] w-5 sm:w-6 bg-[#046A38]/75 rounded-full" aria-hidden="true" />
            <span>QUICK CARE ACTIONS</span>
          </p>
          <h2
            id="care-actions-heading"
            className="home-section-heading text-3xl sm:text-4xl lg:text-[42px] text-[#093322]"
          >
            What would you like to do?
          </h2>
        </div>

        <div
          data-reveal="section"
          role="region"
          aria-label="Patient care actions"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={handleViewportFocus}
          onBlur={handleViewportBlur}
          className={`relative py-1 ${prefersReducedMotion ? 'overflow-x-auto' : 'overflow-hidden'}`}
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 2.5%, black 97.5%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 2.5%, black 97.5%, transparent 100%)',
          }}
        >
          <div
            ref={trackRef}
            className="flex w-max items-center gap-3 will-change-transform"
          >
            {TRACK_COPIES.map((copyIndex) => {
              const isClone = copyIndex > 0;
              return (
                <div
                  key={copyIndex}
                  ref={copyIndex === 0 ? primarySetRef : undefined}
                  aria-hidden={isClone ? 'true' : undefined}
                  className="flex shrink-0 items-center gap-3"
                >
                  {CARE_ACTIONS.map((action) => (
                    <NavLink
                      key={`${copyIndex}-${action.label}`}
                      to={action.to}
                      tabIndex={isClone ? -1 : undefined}
                      className="group flex h-24 w-[260px] shrink-0 items-center gap-3 rounded-xl border border-[#E8DCC8] bg-white px-3 shadow-sm transition-all hover:border-[#046A38]/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#046A38] lg:w-[270px]"
                    >
                      <img
                        src={action.image}
                        alt=""
                        aria-hidden="true"
                        width={72}
                        height={72}
                        loading="lazy"
                        draggable={false}
                        className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover"
                      />
                      <span className="text-left text-[17px] font-bold leading-snug text-[#093322] group-hover:text-[#046A38]">
                        {action.label}
                      </span>
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
