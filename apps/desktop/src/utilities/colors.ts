/** Colour conversions and palettes — HEX, RGBA, shades and a mix of two. */

import type { Options } from "./text";

export type Rgba = { r: number; g: number; b: number; a: number };

export function parseHex(text: string): Rgba {
  const cleaned = text.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(cleaned)) {
    throw new Error("That is not a HEX colour. Try #RRGGBB or #RGB.");
  }
  const expanded =
    cleaned.length <= 4 ? [...cleaned].map((character) => character + character).join("") : cleaned;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  const a = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function toHex({ r, g, b, a }: Rgba, includeAlpha = false): string {
  const clampedByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const part = (value: number) => clampedByte(value).toString(16).padStart(2, "0");
  const alpha = includeAlpha ? part(a * 255) : "";
  return `#${part(r)}${part(g)}${part(b)}${alpha}`;
}

export function parseRgba(text: string): Rgba {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i.exec(text.trim());
  if (!match) throw new Error("That is not rgb(...) or rgba(...).");
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] != null ? Number(match[4]) : 1,
  };
}

export function hexToRgbaFacts(text: string): Array<[string, string]> {
  const { r, g, b, a } = parseHex(text);
  return [
    ["RGB", `rgb(${r}, ${g}, ${b})`],
    ["RGBA", `rgba(${r}, ${g}, ${b}, ${a})`],
    ["HSL", toHslString(r, g, b)],
  ];
}

export function rgbaToHex(text: string, options: Options): string {
  const rgba = parseRgba(text);
  return toHex(rgba, options.includeAlpha === "yes");
}

function toHslString(r: number, g: number, b: number): string {
  const [h, s, l] = rgbToHsl(r, g, b);
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

// ── Shades ──────────────────────────────────────────────────────────────

export function colorShades(text: string, options: Options): string {
  const base = parseHex(text);
  const steps = Math.min(20, Math.max(1, Number(options.steps ?? "5") || 5));
  const results: string[] = [];
  for (let step = steps; step >= 1; step -= 1) {
    const amount = step / (steps + 1);
    results.push(toHex(mix(base, { r: 0, g: 0, b: 0, a: 1 }, amount)));
  }
  results.push(toHex(base));
  for (let step = 1; step <= steps; step += 1) {
    const amount = step / (steps + 1);
    results.push(toHex(mix(base, { r: 255, g: 255, b: 255, a: 1 }, amount)));
  }
  return results.join("\n");
}

function mix(from: Rgba, to: Rgba, amount: number): Rgba {
  const lerp = (a: number, b: number) => a + (b - a) * amount;
  return { r: lerp(from.r, to.r), g: lerp(from.g, to.g), b: lerp(from.b, to.b), a: 1 };
}

// ── Mixer ───────────────────────────────────────────────────────────────

export function colorMix(_input: string, options: Options): string {
  const first = parseHex(options.first ?? "#000000");
  const second = parseHex(options.second ?? "#ffffff");
  const steps = Math.min(10, Math.max(2, Number(options.steps ?? "5") || 5));
  return Array.from({ length: steps }, (_, index) => toHex(mix(first, second, index / (steps - 1)))).join(
    "\n",
  );
}
