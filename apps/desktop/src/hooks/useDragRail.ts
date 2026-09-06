import { useRef } from "react";

type DragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  lastX: number;
  lastTime: number;
  velocity: number;
};

export function useDragRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    const target = event.target as HTMLElement;
    if (!rail || event.button !== 0 || target.closest("button, input, label, a")) return;
    rail.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: rail.scrollLeft,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
    rail.dataset.dragging = "true";
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    const state = drag.current;
    if (!rail || !state || state.pointerId !== event.pointerId) return;

    const elapsed = Math.max(1, event.timeStamp - state.lastTime);
    state.velocity = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
    rail.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    const state = drag.current;
    if (!rail || !state || state.pointerId !== event.pointerId) return;

    if (rail.hasPointerCapture?.(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    delete rail.dataset.dragging;
    drag.current = null;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const projected = rail.scrollLeft - state.velocity * 220;
    rail.scrollTo({ left: projected, behavior: "smooth" });
  }

  function scrollByPage(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left: direction * Math.max(280, (railRef.current?.clientWidth ?? 0) * 0.72),
      behavior: "smooth",
    });
  }

  return { railRef, onPointerDown, onPointerMove, onPointerUp, scrollByPage };
}
