import { useCallback, useEffect, useRef, useState } from "react";

export type CropRect = { left: number; top: number; width: number; height: number };

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

const handles: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Smallest crop that still means something, in source pixels. */
const MINIMUM = 16;

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

/**
 * A crop rectangle drawn over the media, in source pixels.
 *
 * Typing four numbers means guessing at a result you cannot see. The rectangle
 * is the same four numbers, so the fields and the drag stay in agreement — one
 * is not a preview of the other.
 *
 * Everything is kept in source pixels and converted at the edges: the rendered
 * size changes with the window, and a rectangle stored in display pixels would
 * silently mean something different after a resize.
 */
export function CropOverlay({
  media,
  natural,
  value,
  onChange,
}: {
  /** The <img> or <video> the rectangle sits on. */
  media: HTMLImageElement | HTMLVideoElement | null;
  natural: { width: number; height: number };
  value: CropRect;
  onChange: (rect: CropRect) => void;
}) {
  const [box, setBox] = useState<DOMRect | null>(null);
  const drag = useRef<{ handle: Handle; startX: number; startY: number; origin: CropRect } | null>(null);

  // The media box moves with the window, so it is measured rather than assumed.
  useEffect(() => {
    if (!media) return;
    const measure = () => setBox(media.getBoundingClientRect());
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(media);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [media]);

  const scale = box && box.width > 0 ? natural.width / box.width : 1;

  const onPointerDown = useCallback(
    (handle: Handle) => (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      (event.target as Element).setPointerCapture(event.pointerId);
      drag.current = {
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...value },
      };
    },
    [value],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const active = drag.current;
      if (!active) return;

      // Pointer travel is in display pixels; the rectangle is not.
      const dx = (event.clientX - active.startX) * scale;
      const dy = (event.clientY - active.startY) * scale;
      const { left, top, width, height } = active.origin;
      let next: CropRect = { left, top, width, height };

      if (active.handle === "move") {
        next.left = clamp(left + dx, 0, natural.width - width);
        next.top = clamp(top + dy, 0, natural.height - height);
      } else {
        // Each edge moves independently, and the opposite edge stays put —
        // which is what makes a handle feel attached to the corner it is on.
        if (active.handle.includes("w")) {
          const edge = clamp(left + dx, 0, left + width - MINIMUM);
          next.width = width + (left - edge);
          next.left = edge;
        }
        if (active.handle.includes("n")) {
          const edge = clamp(top + dy, 0, top + height - MINIMUM);
          next.height = height + (top - edge);
          next.top = edge;
        }
        if (active.handle.includes("e")) {
          next.width = clamp(width + dx, MINIMUM, natural.width - left);
        }
        if (active.handle.includes("s")) {
          next.height = clamp(height + dy, MINIMUM, natural.height - top);
        }
      }

      onChange({
        left: Math.round(next.left),
        top: Math.round(next.top),
        width: Math.round(next.width),
        height: Math.round(next.height),
      });
    },
    [natural.height, natural.width, onChange, scale],
  );

  const endDrag = useCallback((event: React.PointerEvent) => {
    if (drag.current) {
      (event.target as Element).releasePointerCapture?.(event.pointerId);
      drag.current = null;
    }
  }, []);

  if (!box || box.width === 0) return null;

  const toDisplay = (source: number) => source / scale;
  const style = {
    left: `${toDisplay(value.left)}px`,
    top: `${toDisplay(value.top)}px`,
    width: `${toDisplay(value.width)}px`,
    height: `${toDisplay(value.height)}px`,
  };

  return (
    <div
      className="crop-overlay"
      style={{ width: `${box.width}px`, height: `${box.height}px` }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Dimming everything outside the rectangle, so the crop reads as the
          part that survives rather than one more box on top of the picture. */}
      <div className="crop-overlay__shade" style={style} />
      <div
        className="crop-overlay__rect"
        style={style}
        onPointerDown={onPointerDown("move")}
        role="group"
        aria-label={`Crop area, ${Math.round(value.width)} by ${Math.round(value.height)} pixels`}
      >
        <span className="crop-overlay__size">
          {Math.round(value.width)} × {Math.round(value.height)}
        </span>
        {handles.map((handle) => (
          <span
            key={handle}
            className={`crop-handle crop-handle--${handle}`}
            onPointerDown={onPointerDown(handle)}
          />
        ))}
      </div>
    </div>
  );
}

/** A starting rectangle: the middle 80%, so every handle is reachable. */
export function defaultCrop(natural: { width: number; height: number }): CropRect {
  const width = Math.round(natural.width * 0.8);
  const height = Math.round(natural.height * 0.8);
  return {
    left: Math.round((natural.width - width) / 2),
    top: Math.round((natural.height - height) / 2),
    width,
    height,
  };
}
