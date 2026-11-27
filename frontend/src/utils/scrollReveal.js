/**
 * Accessible bidirectional scroll-reveal controller using a shared
 * IntersectionObserver and CSS transitions (opacity + transform only).
 *
 * Behavior guarantees:
 * - Elements default to visible when JS is disabled/unmounted or when
 *   prefers-reduced-motion: reduce is active.
 * - Elements already in view on initialization stay visible without flashing.
 * - Each section (<section> / <footer>) resets independently only after it
 *   has completely left the viewport (either above or below), so reversing
 *   scroll direction while a section is still visible never flickers or restarts.
 * - Multi-card rows on desktop/tablet gather gently toward their row midpoint
 *   before fanning symmetrically outward into their respective grid positions,
 *   replaying cleanly on every subsequent entry from above or below.
 */

const ROW_TOP_TOLERANCE_PX = 24;
const CARD_STAGGER_STEP_MS = 65;
const REVEAL_EDGE_OFFSET_PX = 32;
const MAX_ROW_PULL_PX = 220;
const ROW_PULL_FACTOR = 0.45;

export function getPrefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getViewportHeight() {
  return window.innerHeight || document.documentElement?.clientHeight || 0;
}

function getScrollY() {
  return window.scrollY ?? window.pageYOffset ?? 0;
}

function isDocumentAtBottom() {
  const scrollY = getScrollY();
  const scrollHeight = document.documentElement?.scrollHeight ?? 0;
  return scrollHeight > 0 && getViewportHeight() + scrollY >= scrollHeight - 36;
}

function isDocumentAtTop() {
  return getScrollY() <= 8;
}

function getStickyHeaderOffset() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
    return 0;
  }
  const header = document.querySelector('header');
  if (!header || typeof header.getBoundingClientRect !== 'function') {
    return 0;
  }
  if (typeof window.getComputedStyle === 'function') {
    const pos = window.getComputedStyle(header).position;
    if (pos !== 'sticky' && pos !== 'fixed') {
      return 0;
    }
  }
  const rect = header.getBoundingClientRect();
  if (rect.height > 0 && rect.top <= 4 && rect.bottom > 0 && rect.bottom < getViewportHeight() * 0.35) {
    return Math.round(rect.bottom);
  }
  return 0;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function sortReadingOrder(elements) {
  return [...elements].sort((a, b) => {
    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    const hasLayoutA = rectA.width > 0 || rectA.height > 0;
    const hasLayoutB = rectB.width > 0 || rectB.height > 0;

    if (hasLayoutA && hasLayoutB) {
      if (Math.abs(rectA.top - rectB.top) > ROW_TOP_TOLERANCE_PX) {
        return rectA.top - rectB.top;
      }
      if (rectA.left !== rectB.left) {
        return rectA.left - rectB.left;
      }
    }

    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

function groupIntoVisualRows(cards) {
  const sorted = sortReadingOrder(cards);
  const rows = [];

  for (const card of sorted) {
    const rect = card.getBoundingClientRect();
    const grid = card.closest('[data-reveal-grid]') || card.parentElement;
    const hasLayout = rect.width > 0 || rect.height > 0;

    let matchedRow = rows.find((row) => {
      if (row.grid !== grid) return false;
      if (!hasLayout || !row.hasLayout) return true;
      return Math.abs(row.top - rect.top) <= ROW_TOP_TOLERANCE_PX;
    });

    if (!matchedRow) {
      matchedRow = { grid, top: rect.top, hasLayout, items: [], rects: [] };
      rows.push(matchedRow);
    }

    matchedRow.items.push(card);
    matchedRow.rects.push(rect);
  }

  return rows;
}

/**
 * Pulls multi-card desktop/tablet rows gently toward their row midpoint so cards
 * glide from the middle outward to their respective grid slots on reveal.
 * Single-column stacked cards (mobile) keep horizontal pull at 0px.
 *
 * Clears inline pull transforms on pending cards before reading bounding rects
 * so repeated visits always measure untransformed grid slot coordinates.
 */
function applyRowMiddleOrigins(cards, targetSubset = null) {
  if (cards.length === 0) return;

  const updateSet = targetSubset ? new Set(targetSubset) : new Set(cards);
  for (const card of cards) {
    if (card.getAttribute('data-reveal-state') === 'pending' || updateSet.has(card)) {
      card.style.removeProperty('--reveal-from-x');
      card.style.removeProperty('--reveal-from-y');
      card.style.removeProperty('--reveal-from-scale');
    }
  }

  const rows = groupIntoVisualRows(cards);

  for (const row of rows) {
    if (row.items.length <= 1 || !row.hasLayout) {
      for (const card of row.items) {
        if (!updateSet.has(card)) continue;
        card.style.setProperty('--reveal-from-x', '0px');
        card.style.setProperty('--reveal-from-y', '12px');
        card.style.setProperty('--reveal-from-scale', '0.97');
      }
      continue;
    }

    const minLeft = Math.min(...row.rects.map((r) => r.left));
    const maxRight = Math.max(...row.rects.map((r) => r.right));
    const rowCenterX = (minLeft + maxRight) / 2;

    row.items.forEach((card, idx) => {
      if (!updateSet.has(card)) return;
      const rect = row.rects[idx];
      const cardCenterX = rect.left + rect.width / 2;
      const pullX = Math.round(
        clamp((rowCenterX - cardCenterX) * ROW_PULL_FACTOR, -MAX_ROW_PULL_PX, MAX_ROW_PULL_PX)
      );
      card.style.setProperty('--reveal-from-x', `${pullX}px`);
      card.style.setProperty('--reveal-from-y', '14px');
      card.style.setProperty('--reveal-from-scale', '0.93');
    });
  }
}

/**
 * Assigns symmetrical center-outward stagger delays per visible row so inner
 * cards open first and outer cards fan smoothly outward from the middle.
 * Grids marked with data-reveal-order="sequential" instead reveal in reading
 * order using data-reveal-step (defaulting to CARD_STAGGER_STEP_MS).
 */
function assignRowStaggerDelays(cards) {
  const rows = groupIntoVisualRows(cards);
  const delays = new Map();
  const sequentialCounters = new Map();

  for (const row of rows) {
    const grid = row.grid;
    const isSequential =
      grid &&
      typeof grid.getAttribute === 'function' &&
      grid.getAttribute('data-reveal-order') === 'sequential';

    if (isSequential) {
      const stepAttr = Number(grid.getAttribute('data-reveal-step'));
      const stepMs = Number.isFinite(stepAttr) && stepAttr >= 0 ? stepAttr : CARD_STAGGER_STEP_MS;
      let nextIdx = sequentialCounters.get(grid) ?? 0;
      for (const card of row.items) {
        delays.set(card, nextIdx * stepMs);
        nextIdx += 1;
      }
      sequentialCounters.set(grid, nextIdx);
      continue;
    }

    const count = row.items.length;
    const mid = (count - 1) / 2;
    row.items.forEach((card, idx) => {
      const ringDistance = Math.floor(Math.abs(idx - mid));
      delays.set(card, ringDistance * CARD_STAGGER_STEP_MS);
    });
  }

  return delays;
}

export function initScrollReveals(root) {
  if (!root || typeof window === 'undefined') {
    return () => {};
  }

  const targets = Array.from(root.querySelectorAll('[data-reveal]'));
  if (targets.length === 0) {
    return () => {};
  }

  const clearMotionVars = (el) => {
    el.style.removeProperty('--reveal-delay');
    el.style.removeProperty('--reveal-from-x');
    el.style.removeProperty('--reveal-from-y');
    el.style.removeProperty('--reveal-from-scale');
  };

  const setImmediate = (el) => {
    clearMotionVars(el);
    el.setAttribute('data-reveal-state', 'immediate');
  };

  const setVisible = (el, delayMs = 0) => {
    if (delayMs > 0) {
      el.style.setProperty('--reveal-delay', `${delayMs}ms`);
    } else {
      el.style.removeProperty('--reveal-delay');
    }
    el.setAttribute('data-reveal-state', 'visible');
  };

  const setPending = (el) => {
    el.style.removeProperty('--reveal-delay');
    el.setAttribute('data-reveal-state', 'pending');
  };

  if (getPrefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    targets.forEach(setImmediate);
    return () => {};
  }

  // Group animated elements independently per enclosing <section> / <footer>
  const scopeMap = new Map();
  for (const el of targets) {
    const scope = (typeof el.closest === 'function' && el.closest('section, footer')) || el;
    if (!scopeMap.has(scope)) {
      scopeMap.set(scope, []);
    }
    scopeMap.get(scope).push(el);
  }

  const scopes = Array.from(scopeMap.entries()).map(([container, elements]) => ({
    container,
    elements,
    cards: elements.filter((el) => el.getAttribute('data-reveal') === 'card'),
  }));

  const isScopeCompletelyOutside = (scope, viewportHeight) => {
    if (viewportHeight <= 0) return false;
    const elementRects = scope.elements.map((el) => el.getBoundingClientRect());
    const hasElementsLayout = elementRects.some((r) => r.width > 0 || r.height > 0);
    if (!hasElementsLayout) return false;

    const minTop = Math.min(...elementRects.map((r) => r.top));
    const maxBottom = Math.max(...elementRects.map((r) => r.bottom));

    // In real DOM, <section>/<footer> encloses its descendants. In unit tests with
    // un-updated mock section rects, fall back to the descendant envelope.
    const containerRect =
      scope.container !== scope.elements[0] && typeof scope.container.getBoundingClientRect === 'function'
        ? scope.container.getBoundingClientRect()
        : null;

    const containerWrapsDescendants =
      containerRect &&
      (containerRect.width > 0 || containerRect.height > 0) &&
      containerRect.top <= minTop + 40 &&
      containerRect.bottom >= maxBottom - 40;

    const top = containerWrapsDescendants ? containerRect.top : minTop;
    const bottom = containerWrapsDescendants ? containerRect.bottom : maxBottom;

    return bottom <= 0 || top >= viewportHeight;
  };

  const isElementReadyToEnter = (rect, viewportHeight, stickyTop, atTop, atBottom) => {
    if (viewportHeight <= 0) return true;
    if (rect.width === 0 && rect.height === 0) return false;

    if (atBottom && rect.top < viewportHeight && rect.bottom > stickyTop) {
      return true;
    }
    if (atTop) {
      return rect.bottom > 0 && rect.top <= viewportHeight * 0.82;
    }

    const edgeAllowance = Math.min(
      REVEAL_EDGE_OFFSET_PX,
      Math.max(4, Math.round(rect.height * 0.5))
    );
    const topThreshold = stickyTop + edgeAllowance;
    const bottomThreshold = viewportHeight - edgeAllowance;

    return rect.top <= bottomThreshold && rect.bottom >= topThreshold;
  };

  const resetScopeToPending = (scope) => {
    let changed = false;
    for (const el of scope.elements) {
      if (el.getAttribute('data-reveal-state') !== 'pending') {
        setPending(el);
        changed = true;
      }
    }
    if (scope.cards.length > 0 && (changed || !scope.cards[0].style.getPropertyValue('--reveal-from-y'))) {
      applyRowMiddleOrigins(scope.cards);
    }
  };

  const revealBatch = (elementsToReveal) => {
    if (elementsToReveal.length === 0) return;

    const visibleCards = [];
    const visibleSections = [];

    for (const el of elementsToReveal) {
      if (el.getAttribute('data-reveal-state') !== 'pending') continue;
      if (el.getAttribute('data-reveal') === 'card') {
        visibleCards.push(el);
      } else {
        visibleSections.push(el);
      }
    }

    for (const el of visibleSections) {
      setVisible(el, 0);
    }

    if (visibleCards.length > 0) {
      const delays = assignRowStaggerDelays(visibleCards);
      for (const card of visibleCards) {
        setVisible(card, delays.get(card) ?? 0);
      }
    }
  };

  // Initial setup: elements currently in view stay immediate; offscreen elements start pending
  const initVh = getViewportHeight();
  const initStickyTop = getStickyHeaderOffset();
  const initAtBottom = isDocumentAtBottom();
  const initAtTop = isDocumentAtTop();
  const initialPendingCards = [];

  for (const scope of scopes) {
    if (isScopeCompletelyOutside(scope, initVh)) {
      for (const el of scope.elements) {
        setPending(el);
        if (el.getAttribute('data-reveal') === 'card') {
          initialPendingCards.push(el);
        }
      }
      continue;
    }

    for (const el of scope.elements) {
      const rect = el.getBoundingClientRect();
      const inView = isElementReadyToEnter(rect, initVh, initStickyTop, initAtTop, initAtBottom);

      if (inView) {
        setImmediate(el);
      } else {
        setPending(el);
        if (el.getAttribute('data-reveal') === 'card') {
          initialPendingCards.push(el);
        }
      }
    }
  }

  applyRowMiddleOrigins(initialPendingCards);

  let observer = null;
  let rafId = null;
  let needsOriginRefresh = false;
  let cleanedUp = false;

  const evaluateAllScopes = () => {
    if (cleanedUp) return;

    const vh = getViewportHeight();
    const stickyTop = getStickyHeaderOffset();
    const atBottom = isDocumentAtBottom();
    const atTop = isDocumentAtTop();

    if (needsOriginRefresh) {
      needsOriginRefresh = false;
      const allPendingCards = targets.filter(
        (el) => el.getAttribute('data-reveal') === 'card' && el.getAttribute('data-reveal-state') === 'pending'
      );
      applyRowMiddleOrigins(allPendingCards);
    }

    const readyToReveal = [];

    for (const scope of scopes) {
      if (isScopeCompletelyOutside(scope, vh)) {
        const hasFocusedChild =
          typeof document !== 'undefined' &&
          document.activeElement &&
          typeof scope.container?.contains === 'function' &&
          scope.container.contains(document.activeElement);
        if (!hasFocusedChild) {
          resetScopeToPending(scope);
        }
        continue;
      }

      for (const el of scope.elements) {
        if (el.getAttribute('data-reveal-state') !== 'pending') continue;
        const rect = el.getBoundingClientRect();

        if (isElementReadyToEnter(rect, vh, stickyTop, atTop, atBottom)) {
          readyToReveal.push(el);
        }
      }
    }

    revealBatch(readyToReveal);
  };

  const sweepPending = () => {
    rafId = null;
    evaluateAllScopes();
  };

  function scheduleSweep() {
    if (cleanedUp || rafId !== null) return;
    let ranSync = false;
    const id = requestAnimationFrame(() => {
      ranSync = true;
      sweepPending();
    });
    if (!ranSync) {
      rafId = id;
    }
  }

  function handleResize() {
    needsOriginRefresh = true;
    scheduleSweep();
  }

  function handleFocusIn(event) {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    const revealEl = target.closest('[data-reveal]');
    const immediateTargets = new Set();

    if (revealEl && revealEl.getAttribute('data-reveal-state') === 'pending') {
      immediateTargets.add(revealEl);
    }

    const sectionEl = target.closest('section, footer');
    if (sectionEl) {
      const sectionHeader = sectionEl.querySelector('[data-reveal="section"]');
      if (sectionHeader && sectionHeader.getAttribute('data-reveal-state') === 'pending') {
        immediateTargets.add(sectionHeader);
      }
    }

    for (const el of immediateTargets) {
      setImmediate(el);
    }
  }

  const stopTracking = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener('scroll', scheduleSweep);
    window.removeEventListener('resize', handleResize);
    root.removeEventListener('focusin', handleFocusIn);
    if (motionQuery) {
      if (typeof motionQuery.removeEventListener === 'function') {
        motionQuery.removeEventListener('change', handleReducedMotionChange);
      } else if (typeof motionQuery.removeListener === 'function') {
        motionQuery.removeListener(handleReducedMotionChange);
      }
    }
  };

  function handleReducedMotionChange(event) {
    if (!event.matches) return;
    targets.forEach(setImmediate);
    stopTracking();
  }

  observer = new IntersectionObserver(
    () => {
      evaluateAllScopes();
    },
    {
      threshold: 0,
      rootMargin: '0px',
    }
  );

  for (const el of targets) {
    observer.observe(el);
  }
  for (const scope of scopes) {
    if (!targets.includes(scope.container) && typeof scope.container.getBoundingClientRect === 'function') {
      observer.observe(scope.container);
    }
  }

  window.addEventListener('scroll', scheduleSweep, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });
  root.addEventListener('focusin', handleFocusIn);

  const motionQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  if (motionQuery) {
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleReducedMotionChange);
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(handleReducedMotionChange);
    }
  }

  return stopTracking;
}

/**
 * Bidirectional scroll controller for the 7-card ExploreAICompanion fan stage.
 * Replays the converged -> entering -> interactive fan-out whenever the stage
 * re-enters from above or below, resetting cleanly only after its enclosing
 * section fully leaves the viewport.
 */
export function initFanStageReveal(
  stage,
  { prefersReducedMotion = false, settleTimerRef = null, onSettle = null } = {}
) {
  if (!stage || typeof window === 'undefined') {
    return () => {};
  }

  const settleNow = () => {
    if (typeof onSettle === 'function') {
      onSettle();
    } else {
      if (settleTimerRef?.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      stage.setAttribute('data-fan-phase', 'interactive');
    }
  };

  if (prefersReducedMotion || getPrefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    settleNow();
    return () => {};
  }

  const section = (typeof stage.closest === 'function' && stage.closest('section')) || stage;
  stage.setAttribute('data-fan-phase', 'converged');

  let observer = null;
  let rafA = null;
  let rafB = null;
  let scrollRaf = null;
  let localTimer = null;
  let cleanedUp = false;

  const clearPendingTimers = () => {
    if (rafA !== null) {
      cancelAnimationFrame(rafA);
      rafA = null;
    }
    if (rafB !== null) {
      cancelAnimationFrame(rafB);
      rafB = null;
    }
    if (localTimer) {
      clearTimeout(localTimer);
      localTimer = null;
    }
    if (settleTimerRef?.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  };

  const triggerFanOut = () => {
    if (cleanedUp || stage.getAttribute('data-fan-phase') !== 'converged') return;
    stage.setAttribute('data-fan-phase', 'entering');
    clearPendingTimers();
    const timer = setTimeout(() => {
      localTimer = null;
      if (settleTimerRef) settleTimerRef.current = null;
      if (cleanedUp) return;
      if (stage.getAttribute('data-fan-phase') === 'entering') {
        stage.setAttribute('data-fan-phase', 'interactive');
      }
    }, 880);
    localTimer = timer;
    if (settleTimerRef) {
      settleTimerRef.current = timer;
    }
  };

  const resetToConverged = () => {
    if (cleanedUp || stage.getAttribute('data-fan-phase') === 'converged') return;
    clearPendingTimers();
    stage.setAttribute('data-fan-phase', 'converged');
  };

  const getExitRect = (stageRect) => {
    if (section === stage || typeof section.getBoundingClientRect !== 'function') {
      return stageRect;
    }
    const sectionRect = section.getBoundingClientRect();
    const stageHasLayout = stageRect.width > 0 || stageRect.height > 0;
    const sectionWrapsStage =
      (sectionRect.width > 0 || sectionRect.height > 0) &&
      (!stageHasLayout ||
        (sectionRect.top <= stageRect.top + 40 && sectionRect.bottom >= stageRect.bottom - 40));
    return sectionWrapsStage ? sectionRect : stageRect;
  };

  const evaluateStage = () => {
    scrollRaf = null;
    if (cleanedUp) return;

    const vh = getViewportHeight();
    if (vh <= 0) return;

    const stageRect = stage.getBoundingClientRect();
    const exitRect = getExitRect(stageRect);

    if (
      (exitRect.width > 0 || exitRect.height > 0) &&
      (exitRect.bottom <= 0 || exitRect.top >= vh)
    ) {
      const hasFocusedChild =
        typeof document !== 'undefined' &&
        document.activeElement &&
        typeof section.contains === 'function' &&
        section.contains(document.activeElement);
      if (!hasFocusedChild) {
        resetToConverged();
      }
      return;
    }

    if (stage.getAttribute('data-fan-phase') !== 'converged') {
      return;
    }

    const atBottom = isDocumentAtBottom();
    const atTop = isDocumentAtTop();
    const stickyTop = getStickyHeaderOffset();

    const topTrigger = stickyTop + 36;
    const bottomTrigger = vh - 48;

    const readyFromBottom = atBottom && stageRect.top < vh && stageRect.bottom > stickyTop;
    const readyFromTop = atTop && stageRect.bottom > 0 && stageRect.top < vh;
    const readyInBand = stageRect.top <= bottomTrigger && stageRect.bottom >= topTrigger;

    if (readyFromBottom || readyFromTop || readyInBand) {
      triggerFanOut();
    }
  };

  function scheduleScrollCheck() {
    if (cleanedUp || scrollRaf !== null) return;
    let ranSync = false;
    const id = requestAnimationFrame(() => {
      ranSync = true;
      evaluateStage();
    });
    if (!ranSync) {
      scrollRaf = id;
    }
  }

  const initVh = getViewportHeight();
  const initialStageRect = stage.getBoundingClientRect();
  const initialExitRect = getExitRect(initialStageRect);
  const initiallyOutside =
    (initialExitRect.width > 0 || initialExitRect.height > 0) &&
    (initialExitRect.bottom <= 0 || initialExitRect.top >= initVh);

  if (!initiallyOutside && initVh > 0 && initialStageRect.top < initVh - 48 && initialStageRect.bottom > 0) {
    let ranSyncA = false;
    const idA = requestAnimationFrame(() => {
      ranSyncA = true;
      rafA = null;
      let ranSyncB = false;
      const idB = requestAnimationFrame(() => {
        ranSyncB = true;
        rafB = null;
        triggerFanOut();
      });
      if (!ranSyncB) rafB = idB;
    });
    if (!ranSyncA) rafA = idA;
  }

  observer = new IntersectionObserver(
    () => {
      evaluateStage();
    },
    {
      threshold: [0, 0.12],
      rootMargin: '0px',
    }
  );
  observer.observe(stage);
  if (section !== stage) {
    observer.observe(section);
  }

  window.addEventListener('scroll', scheduleScrollCheck, { passive: true });
  window.addEventListener('resize', scheduleScrollCheck, { passive: true });

  const handleFocusIn = () => {
    if (stage.getAttribute('data-fan-phase') === 'converged') {
      clearPendingTimers();
      settleNow();
    }
  };
  stage.addEventListener('focusin', handleFocusIn);

  const motionQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  const handleMotionChange = (event) => {
    if (!event.matches) return;
    clearPendingTimers();
    settleNow();
  };

  if (motionQuery) {
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleMotionChange);
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(handleMotionChange);
    }
  }

  return () => {
    cleanedUp = true;
    observer?.disconnect();
    window.removeEventListener('scroll', scheduleScrollCheck);
    window.removeEventListener('resize', scheduleScrollCheck);
    stage.removeEventListener('focusin', handleFocusIn);
    clearPendingTimers();
    if (scrollRaf !== null) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = null;
    }
    if (motionQuery) {
      if (typeof motionQuery.removeEventListener === 'function') {
        motionQuery.removeEventListener('change', handleMotionChange);
      } else if (typeof motionQuery.removeListener === 'function') {
        motionQuery.removeListener(handleMotionChange);
      }
    }
  };
}
