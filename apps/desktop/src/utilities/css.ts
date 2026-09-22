/**
 * CSS generators — a set of options in, a CSS declaration block out, plus a
 * live preview built from the same values.
 *
 * The preview is never raw HTML: it is a plain object of CSS properties,
 * applied to a box React already owns through its own `style` prop. Nothing
 * generated here is ever parsed as markup, so there is no injection surface
 * to worry about — the worst a bad value can do is draw an ugly box.
 */

import type { Options } from "./text";
import { parseHex } from "./colors";

export type PreviewKind = "box" | "loader" | "switch" | "bezier" | "glitch";
export type Preview = { kind: PreviewKind; style: Record<string, string | number>; label?: string };

function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function block(declarations: Array<[string, string]>): string {
  return declarations.map(([property, value]) => `  ${property}: ${value};`).join("\n");
}

// ── Border radius ───────────────────────────────────────────────────────

export function borderRadiusCss(_input: string, options: Options): string {
  const tl = options.tl ?? "16";
  const tr = options.tr ?? "16";
  const br = options.br ?? "16";
  const bl = options.bl ?? "16";
  return `border-radius: ${tl}px ${tr}px ${br}px ${bl}px;`;
}

export function borderRadiusPreview(options: Options): Preview {
  const tl = `${options.tl ?? "16"}px`;
  const tr = `${options.tr ?? "16"}px`;
  const br = `${options.br ?? "16"}px`;
  const bl = `${options.bl ?? "16"}px`;
  return { kind: "box", style: { borderRadius: `${tl} ${tr} ${br} ${bl}` } };
}

// ── Box shadow ──────────────────────────────────────────────────────────

export function boxShadowCss(_input: string, options: Options): string {
  const x = options.x ?? "0";
  const y = options.y ?? "8";
  const blur = options.blur ?? "24";
  const spread = options.spread ?? "0";
  const color = options.color ?? "#000000";
  const opacity = Number(options.opacity ?? "25") / 100;
  const inset = options.inset === "yes" ? "inset " : "";
  return `box-shadow: ${inset}${x}px ${y}px ${blur}px ${spread}px ${toRgba(color, opacity)};`;
}

export function boxShadowPreview(options: Options): Preview {
  const x = options.x ?? "0";
  const y = options.y ?? "8";
  const blur = options.blur ?? "24";
  const spread = options.spread ?? "0";
  const color = options.color ?? "#000000";
  const opacity = Number(options.opacity ?? "25") / 100;
  const inset = options.inset === "yes" ? "inset " : "";
  return {
    kind: "box",
    style: { boxShadow: `${inset}${x}px ${y}px ${blur}px ${spread}px ${toRgba(color, opacity)}` },
  };
}

// ── Gradient ────────────────────────────────────────────────────────────

export function gradientCss(_input: string, options: Options): string {
  const from = options.from ?? "#6366f1";
  const to = options.to ?? "#ec4899";
  const angle = options.angle ?? "135";
  const shape = options.shape ?? "linear";
  const value =
    shape === "radial"
      ? `radial-gradient(circle, ${from}, ${to})`
      : `linear-gradient(${angle}deg, ${from}, ${to})`;
  return `background: ${value};`;
}

export function gradientPreview(options: Options): Preview {
  const from = options.from ?? "#6366f1";
  const to = options.to ?? "#ec4899";
  const angle = options.angle ?? "135";
  const shape = options.shape ?? "linear";
  const background =
    shape === "radial"
      ? `radial-gradient(circle, ${from}, ${to})`
      : `linear-gradient(${angle}deg, ${from}, ${to})`;
  return { kind: "box", style: { background } };
}

// ── Glassmorphism ───────────────────────────────────────────────────────

export function glassmorphismCss(_input: string, options: Options): string {
  const blur = options.blur ?? "12";
  const opacity = Number(options.opacity ?? "18") / 100;
  const borderOpacity = Number(options.opacity ?? "18") / 100 + 0.15;
  return block([
    ["background", `rgba(255, 255, 255, ${opacity})`],
    ["backdrop-filter", `blur(${blur}px)`],
    ["-webkit-backdrop-filter", `blur(${blur}px)`],
    ["border", `1px solid rgba(255, 255, 255, ${Math.min(1, borderOpacity)})`],
    ["border-radius", "16px"],
  ]);
}

export function glassmorphismPreview(options: Options): Preview {
  const blur = options.blur ?? "12";
  const opacity = Number(options.opacity ?? "18") / 100;
  return {
    kind: "box",
    style: {
      background: `rgba(255, 255, 255, ${opacity})`,
      backdropFilter: `blur(${blur}px)`,
      border: `1px solid rgba(255, 255, 255, ${Math.min(1, opacity + 0.15)})`,
      borderRadius: "16px",
    },
  };
}

// ── Clip path ───────────────────────────────────────────────────────────

const CLIP_PATHS: Record<string, string> = {
  circle: "circle(50% at 50% 50%)",
  triangle: "polygon(50% 0%, 0% 100%, 100% 100%)",
  trapezoid: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
  pentagon: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  arrow: "polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)",
};

export function clipPathCss(_input: string, options: Options): string {
  return `clip-path: ${CLIP_PATHS[options.shape ?? "circle"] ?? CLIP_PATHS.circle};`;
}

export function clipPathPreview(options: Options): Preview {
  return {
    kind: "box",
    style: { clipPath: CLIP_PATHS[options.shape ?? "circle"] ?? CLIP_PATHS.circle!, background: "#6366f1" },
  };
}

// ── Background pattern ──────────────────────────────────────────────────

export function backgroundPatternCss(_input: string, options: Options): string {
  const color = options.color ?? "#6366f1";
  const size = options.size ?? "20";
  const pattern = options.pattern ?? "dots";
  if (pattern === "stripes") {
    return block([
      [
        "background",
        `repeating-linear-gradient(45deg, ${color}, ${color} ${Number(size) / 4}px, transparent ${Number(size) / 4}px, transparent ${size}px)`,
      ],
    ]);
  }
  if (pattern === "grid") {
    return block([
      [
        "background-image",
        `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      ],
      ["background-size", `${size}px ${size}px`],
    ]);
  }
  return block([
    ["background-image", `radial-gradient(${color} 2px, transparent 2px)`],
    ["background-size", `${size}px ${size}px`],
  ]);
}

export function backgroundPatternPreview(options: Options): Preview {
  const color = options.color ?? "#6366f1";
  const size = Number(options.size ?? "20");
  const pattern = options.pattern ?? "dots";
  if (pattern === "stripes") {
    return {
      kind: "box",
      style: {
        background: `repeating-linear-gradient(45deg, ${color}, ${color} ${size / 4}px, transparent ${size / 4}px, transparent ${size}px)`,
      },
    };
  }
  if (pattern === "grid") {
    return {
      kind: "box",
      style: {
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
      },
    };
  }
  return {
    kind: "box",
    style: { backgroundImage: `radial-gradient(${color} 2px, transparent 2px)`, backgroundSize: `${size}px ${size}px` },
  };
}

// ── Triangle ────────────────────────────────────────────────────────────

export function triangleCss(_input: string, options: Options): string {
  const size = options.size ?? "60";
  const color = options.color ?? "#6366f1";
  const direction = options.direction ?? "up";
  const borders: Record<string, string> = {
    up: `border-width: 0 ${Number(size) / 2}px ${size}px ${Number(size) / 2}px;\n  border-color: transparent transparent ${color} transparent;`,
    down: `border-width: ${size}px ${Number(size) / 2}px 0 ${Number(size) / 2}px;\n  border-color: ${color} transparent transparent transparent;`,
    left: `border-width: ${Number(size) / 2}px ${size}px ${Number(size) / 2}px 0;\n  border-color: transparent ${color} transparent transparent;`,
    right: `border-width: ${Number(size) / 2}px 0 ${Number(size) / 2}px ${size}px;\n  border-color: transparent transparent transparent ${color};`,
  };
  return `width: 0;\n  height: 0;\n  border-style: solid;\n  ${borders[direction] ?? borders.up}`;
}

export function trianglePreview(options: Options): Preview {
  const size = Number(options.size ?? "60");
  const color = options.color ?? "#6366f1";
  const direction = options.direction ?? "up";
  const base: Record<string, Record<string, string>> = {
    up: { borderWidth: `0 ${size / 2}px ${size}px ${size / 2}px`, borderColor: `transparent transparent ${color} transparent` },
    down: { borderWidth: `${size}px ${size / 2}px 0 ${size / 2}px`, borderColor: `${color} transparent transparent transparent` },
    left: { borderWidth: `${size / 2}px ${size}px ${size / 2}px 0`, borderColor: `transparent ${color} transparent transparent` },
    right: { borderWidth: `${size / 2}px 0 ${size / 2}px ${size}px`, borderColor: `transparent transparent transparent ${color}` },
  };
  return {
    kind: "box",
    style: { width: 0, height: 0, borderStyle: "solid", ...(base[direction] ?? base.up) },
  };
}

// ── Loader / spinner ────────────────────────────────────────────────────

export function loaderCss(_input: string, options: Options): string {
  const color = options.color ?? "#6366f1";
  const size = options.size ?? "40";
  const style = options.style ?? "spin";
  if (style === "dots") {
    return block([
      ["width", `${size}px`],
      ["height", `${Number(size) / 5}px`],
      ["background", `radial-gradient(circle closest-side, ${color} 90%, transparent) 0 0 / 33% 100% space`],
      ["animation", "utility-dots 1s infinite linear"],
    ]);
  }
  return block([
    ["width", `${size}px`],
    ["height", `${size}px`],
    ["border", `${Math.max(2, Number(size) / 10)}px solid ${toRgba(color, 0.2)}`],
    ["border-top-color", color],
    ["border-radius", "50%"],
    ["animation", "utility-spin 0.8s linear infinite"],
  ]);
}

export function loaderPreview(options: Options): Preview {
  const color = options.color ?? "#6366f1";
  const size = Number(options.size ?? "40");
  const style = options.style ?? "spin";
  if (style === "dots") {
    return {
      kind: "loader",
      style: {
        width: size,
        height: size / 5,
        background: `radial-gradient(circle closest-side, ${color} 90%, transparent) 0 0 / 33% 100% space`,
        animation: "utility-dots 1s infinite linear",
      },
    };
  }
  return {
    kind: "loader",
    style: {
      width: size,
      height: size,
      border: `${Math.max(2, size / 10)}px solid ${toRgba(color, 0.2)}`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "utility-spin 0.8s linear infinite",
    },
  };
}

// ── Cubic bezier ────────────────────────────────────────────────────────

const BEZIER_PRESETS: Record<string, string> = {
  ease: "0.25, 0.1, 0.25, 1",
  "ease-in": "0.42, 0, 1, 1",
  "ease-out": "0, 0, 0.58, 1",
  "ease-in-out": "0.42, 0, 0.58, 1",
  bounce: "0.68, -0.55, 0.27, 1.55",
  anticipate: "0.36, 0, 0.66, -0.56",
};

export function cubicBezierCss(_input: string, options: Options): string {
  const preset = options.preset ?? "custom";
  const values =
    preset !== "custom"
      ? (BEZIER_PRESETS[preset] ?? BEZIER_PRESETS.ease)
      : [options.x1 ?? "0.25", options.y1 ?? "0.1", options.x2 ?? "0.25", options.y2 ?? "1"].join(", ");
  return `animation-timing-function: cubic-bezier(${values});`;
}

export function cubicBezierPreview(options: Options): Preview {
  const preset = options.preset ?? "custom";
  const values =
    preset !== "custom"
      ? (BEZIER_PRESETS[preset] ?? BEZIER_PRESETS.ease)
      : [options.x1 ?? "0.25", options.y1 ?? "0.1", options.x2 ?? "0.25", options.y2 ?? "1"].join(", ");
  return {
    kind: "bezier",
    style: { animationTimingFunction: `cubic-bezier(${values})`, animation: "utility-slide 1.6s infinite alternate" },
  };
}

// ── Text glitch ─────────────────────────────────────────────────────────

export function textGlitchCss(_input: string, options: Options): string {
  const color1 = options.color1 ?? "#ff00c1";
  const color2 = options.color2 ?? "#00fff9";
  return block([
    ["position", "relative"],
    ["color", "#fff"],
    ["text-shadow", `2px 0 ${color1}, -2px 0 ${color2}`],
    ["animation", "utility-glitch 2.5s infinite"],
  ]);
}

export function textGlitchPreview(options: Options): Preview {
  const color1 = options.color1 ?? "#ff00c1";
  const color2 = options.color2 ?? "#00fff9";
  return {
    kind: "glitch",
    style: {
      color: "#fff",
      textShadow: `2px 0 ${color1}, -2px 0 ${color2}`,
      animation: "utility-glitch 2.5s infinite",
    },
    label: options.text?.trim() || "GLITCH",
  };
}

// ── Switch and checkbox (shape only — a preview, not a working control) ──

export function switchCss(_input: string, options: Options): string {
  const color = options.color ?? "#6366f1";
  const size = options.size ?? "24";
  return [
    `/* Track */\nwidth: ${Number(size) * 1.8}px;\nheight: ${size}px;\nborder-radius: ${size}px;\nbackground: ${color};\nposition: relative;`,
    `\n\n/* Thumb (::after) */\nwidth: ${Number(size) - 4}px;\nheight: ${Number(size) - 4}px;\nborder-radius: 50%;\nbackground: #fff;\nposition: absolute;\ntop: 2px;\nright: 2px;\ntransition: 0.2s;`,
  ].join("");
}

export function switchPreview(options: Options): Preview {
  const color = options.color ?? "#6366f1";
  const size = Number(options.size ?? "24");
  return {
    kind: "switch",
    style: {
      width: size * 1.8,
      height: size,
      borderRadius: size,
      background: color,
      "--thumb-size": `${size - 4}px`,
    },
  };
}

export function checkboxCss(_input: string, options: Options): string {
  const color = options.color ?? "#6366f1";
  const size = options.size ?? "22";
  const shape = options.shape ?? "rounded";
  const radius = shape === "circle" ? "50%" : shape === "square" ? "0" : "6px";
  return block([
    ["width", `${size}px`],
    ["height", `${size}px`],
    ["border-radius", radius],
    ["border", `2px solid ${color}`],
    ["accent-color", color],
    ["appearance", "none"],
  ]);
}

export function checkboxPreview(options: Options): Preview {
  const color = options.color ?? "#6366f1";
  const size = Number(options.size ?? "22");
  const shape = options.shape ?? "rounded";
  const borderRadius = shape === "circle" ? "50%" : shape === "square" ? "0" : "6px";
  return { kind: "box", style: { width: size, height: size, borderRadius, border: `2px solid ${color}` } };
}
