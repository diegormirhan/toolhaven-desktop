import { useCallback, useEffect, useRef, useState } from "react";

type DragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  moved: boolean;
};

type Scrollable = { start: boolean; end: boolean };

/** Apple's deceleration projection: where a flick would come to rest. */
function projectMomentum(velocityPerSecond: number, decelerationRate = 0.998): number {
  return ((velocityPerSecond / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past an edge: the further out, the less the content follows. */
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const dragThreshold = 8;

export function useDragRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const scrollFrame = useRef(0);
  const overshootFrame = useRef(0);
  const overshootOffset = useRef(0);
  const scrollableRef = useRef<Scrollable>({ start: false, end: false });
  const [scrollable, setScrollable] = useState<Scrollable>({ start: false, end: false });

  /**
   * Publishes only real changes. Re-rendering the whole row on every frame of a
   * momentum animation is what made the sideways scroll stutter.
   */
  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    const next = { start: rail.scrollLeft > 1, end: rail.scrollLeft < maxScroll - 1 };
    const current = scrollableRef.current;
    if (next.start === current.start && next.end === current.end) return;
    scrollableRef.current = next;
    setScrollable(next);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(
    () => () => {
      cancelAnimationFrame(scrollFrame.current);
      cancelAnimationFrame(overshootFrame.current);
    },
    [],
  );

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  function setOvershoot(offset: number) {
    overshootOffset.current = offset;
    const track = trackRef.current;
    if (track) track.style.transform = offset === 0 ? "" : `translate3d(${offset}px,0,0)`;
  }

  /** Native scroll snapping fights an animation we drive ourselves, so it is suspended. */
  function setAnimating(rail: HTMLDivElement, animating: boolean) {
    if (animating) rail.dataset.animating = "true";
    else delete rail.dataset.animating;
  }

  function stopScrollAnimation() {
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = 0;
    const rail = railRef.current;
    if (rail) setAnimating(rail, false);
  }

  /**
   * Critically damped spring (damping 1.0). Starting from the live scroll position keeps
   * the motion continuous when the rail is grabbed again mid-flight.
   */
  function springScroll(rail: HTMLDivElement, target: number, initialVelocity: number, response = 0.4) {
    const omega = (2 * Math.PI) / response;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    let position = rail.scrollLeft;
    let velocity = initialVelocity;
    let previous = performance.now();
    setAnimating(rail, true);

    const settle = () => {
      rail.scrollLeft = target;
      scrollFrame.current = 0;
      setAnimating(rail, false);
      measure();
    };

    // A throttled window (minimised, backgrounded, some embedded webviews) fires no
    // animation frames. Without this the arrows would silently do nothing.
    const fallback = window.setTimeout(() => {
      cancelAnimationFrame(scrollFrame.current);
      settle();
    }, 150);

    const step = (now: number) => {
      window.clearTimeout(fallback);
      const dt = Math.min((now - previous) / 1000, 1 / 30);
      previous = now;
      velocity += (-(omega * omega) * (position - target) - 2 * omega * velocity) * dt;
      position += velocity * dt;

      // The scroller clamps anyway; clamping here too stops the spring's own state from
      // drifting away from what is on screen and jumping when it settles.
      const bounded = clamp(position, 0, maxScroll);
      if (bounded !== position) {
        position = bounded;
        velocity = 0;
      }
      rail.scrollLeft = position;

      if (Math.abs(position - target) < 0.5 && Math.abs(velocity) < 8) {
        settle();
        return;
      }
      scrollFrame.current = requestAnimationFrame(step);
    };
    scrollFrame.current = requestAnimationFrame(step);
  }

  function releaseOvershoot(offset: number) {
    cancelAnimationFrame(overshootFrame.current);
    overshootFrame.current = 0;
    if (offset === 0) return;
    if (prefersReducedMotion()) {
      setOvershoot(0);
      return;
    }
    const omega = (2 * Math.PI) / 0.35;
    let position = offset;
    let velocity = 0;
    let previous = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 1 / 30);
      previous = now;
      velocity += (-(omega * omega) * position - 2 * omega * velocity) * dt;
      position += velocity * dt;
      if (Math.abs(position) < 0.3) {
        setOvershoot(0);
        overshootFrame.current = 0;
        return;
      }
      setOvershoot(position);
      overshootFrame.current = requestAnimationFrame(step);
    };
    overshootFrame.current = requestAnimationFrame(step);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    const target = event.target as HTMLElement;
    if (!rail || event.button !== 0 || target.closest("button, input, label, a, select")) return;
    stopScrollAnimation();
    cancelAnimationFrame(overshootFrame.current);
    overshootFrame.current = 0;
    setOvershoot(0);
    rail.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: rail.scrollLeft,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    const state = drag.current;
    if (!rail || !state || state.pointerId !== event.pointerId) return;

    const travelled = event.clientX - state.startX;
    // Hysteresis: a few pixels of slack keeps a click on a card from reading as a drag.
    if (!state.moved && Math.abs(travelled) < dragThreshold) return;
    if (!state.moved) {
      state.moved = true;
      rail.dataset.dragging = "true";
    }

    const elapsed = Math.max(1, event.timeStamp - state.lastTime);
    state.velocity = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;

    const desired = state.startScrollLeft - travelled;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const bounded = clamp(desired, 0, maxScroll);
    rail.scrollLeft = bounded;
    setOvershoot(-rubberband(desired - bounded, rail.clientWidth));
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    const state = drag.current;
    if (!rail || !state || state.pointerId !== event.pointerId) return;

    if (rail.hasPointerCapture?.(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    delete rail.dataset.dragging;
    drag.current = null;

    const overshoot = overshootOffset.current;
    releaseOvershoot(overshoot);
    if (!state.moved) return;

    if (prefersReducedMotion()) {
      measure();
      return;
    }

    const velocityPerSecond = state.velocity * 1000;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const projected = clamp(rail.scrollLeft - projectMomentum(velocityPerSecond), 0, maxScroll);
    // Choose the card nearest where the flick was heading, then hand the release
    // velocity to the spring so drag and animation share one continuous motion.
    springScroll(rail, nearestSnap(rail, projected, overshoot), -velocityPerSecond);
  }

  /**
   * Scroll offsets that leave a card flush with the rail's content edge, so a flick
   * never parks a card half off the window. `overshoot` cancels the rubber-band
   * transform that is still applied while measuring.
   */
  function snapTargets(rail: HTMLDivElement, overshoot: number): number[] {
    const track = trackRef.current;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    if (!track) return [0, maxScroll];
    const railLeft = rail.getBoundingClientRect().left;
    const padding = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const cards = Array.from(track.children).map(
      (child) => rail.scrollLeft + (child.getBoundingClientRect().left - overshoot) - railLeft - padding,
    );
    return [0, ...cards, maxScroll].map((point) => clamp(point, 0, maxScroll));
  }

  function nearestSnap(rail: HTMLDivElement, projected: number, overshoot: number): number {
    const targets = snapTargets(rail, overshoot);
    return targets.reduce(
      (best, point) => (Math.abs(point - projected) < Math.abs(best - projected) ? point : best),
      targets[0] ?? projected,
    );
  }

  function scrollByPage(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    stopScrollAnimation();
    const distance = direction * Math.max(280, rail.clientWidth * 0.72);
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const requested = clamp(rail.scrollLeft + distance, 0, maxScroll);
    const target = nearestSnap(rail, requested, 0);
    if (prefersReducedMotion()) {
      rail.scrollLeft = target;
      measure();
      return;
    }
    springScroll(rail, target, 0);
  }

  return { railRef, trackRef, scrollable, onPointerDown, onPointerMove, onPointerUp, onScroll: measure, scrollByPage };
}
