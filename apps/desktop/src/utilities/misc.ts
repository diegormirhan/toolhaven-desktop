/** Small calculators and a symbol picker — the things left over. */

import type { Options } from "./text";
import type { Translate } from "../i18n/language";

const identity: Translate = (value, values) =>
  values ? value.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole)) : value;

// ── Fuel: gasoline or ethanol ───────────────────────────────────────────

/**
 * A flex-fuel engine gets roughly 70% as far on a litre of ethanol as on a
 * litre of gasoline, because ethanol carries less energy per litre. So
 * ethanol is the better buy exactly when it costs 70% of the gasoline price
 * or less — the ratio this compares against.
 */
export function fuelChoiceFacts(
  _input: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const gasoline = Number(options.gasoline ?? "0");
  const ethanol = Number(options.ethanol ?? "0");
  if (!Number.isFinite(gasoline) || !Number.isFinite(ethanol) || gasoline <= 0 || ethanol <= 0) {
    throw new Error("Both prices need to be positive numbers.");
  }
  const ratio = ethanol / gasoline;
  // Rounded to the cent before comparing, so 4.20 / 6.00 lands on 0.7 exactly
  // rather than on the 0.7000000000000001 that floating-point division gives.
  const better = Math.round(ratio * 1000) / 1000 <= 0.7 ? t("Ethanol") : t("Gasoline");
  return [
    ["Ratio (ethanol / gasoline)", ratio.toFixed(3)],
    ["Better value", better],
    ["Rule of thumb", t("Ethanol wins when it costs 70% of the gasoline price or less")],
  ];
}

export function fuelCostFacts(_input: string, options: Options): Array<[string, string]> {
  const distance = Number(options.distance ?? "0");
  const consumption = Number(options.consumption ?? "0");
  const price = Number(options.price ?? "0");
  if ([distance, consumption, price].some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Distance, consumption and price all need a positive number.");
  }
  const litres = distance / consumption;
  const cost = litres * price;
  return [
    ["Fuel needed", `${round(litres)} L`],
    ["Estimated cost", cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
  ];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── Barbecue ────────────────────────────────────────────────────────────

export function barbecueFacts(_input: string, options: Options): Array<[string, string]> {
  const guests = Number(options.guests ?? "0");
  const gramsPerGuest = Number(options.gramsPerGuest ?? "400");
  if (!Number.isFinite(guests) || guests <= 0) throw new Error("Type how many guests are coming.");

  const totalMeatGrams = guests * gramsPerGuest;
  // A commonly used rule: about 300 g of charcoal for every kilo of meat.
  const charcoalKg = (totalMeatGrams / 1000) * 0.3;
  const iceKg = guests * 1.5;
  const drinksLitres = guests * 1.5;

  return [
    ["Meat", `${round(totalMeatGrams / 1000)} kg`],
    ["Charcoal", `${round(charcoalKg)} kg`],
    ["Ice", `${round(iceKg)} kg`],
    ["Drinks", `${round(drinksLitres)} L`],
  ];
}

// ── Symbols to copy ─────────────────────────────────────────────────────

const SYMBOL_SETS: Record<string, string[]> = {
  arrows: ["←", "↑", "→", "↓", "↔", "↕", "⇐", "⇒", "⇑", "⇓", "⇔", "↩", "↪", "⤴", "⤵"],
  math: ["±", "×", "÷", "≠", "≈", "≤", "≥", "∞", "√", "∑", "∏", "∫", "∂", "∆", "°", "‰", "π"],
  currency: ["$", "€", "£", "¥", "₹", "₩", "₽", "₺", "₴", "₦", "R$", "¢"],
  hearts: ["♥", "❤", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕", "💞", "💓", "💗"],
  stars: ["★", "☆", "✦", "✧", "✩", "✪", "✫", "✬", "✭", "✮", "✯", "✰"],
  faces: ["☺", "☹", "☻", "😀", "😁", "😂", "🙂", "🙃", "😉", "😊", "😍", "😎", "😢", "😭", "😡"],
  punctuation: ["…", "•", "‣", "◦", "†", "‡", "§", "¶", "©", "®", "™", "«", "»", "¿", "¡"],
};

export function symbolList(_input: string, options: Options): string {
  const category = options.category ?? "arrows";
  return (SYMBOL_SETS[category] ?? []).join(" ");
}

// ── WhatsApp link ───────────────────────────────────────────────────────

export function whatsappLink(_input: string, options: Options): string {
  const digits = (options.phone ?? "").replace(/\D/g, "");
  if (!digits) throw new Error("Type a phone number, with the country code.");
  const message = options.message ?? "";
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}

// ── Minimum wage multiples ──────────────────────────────────────────────

export function minimumWageFacts(_input: string, options: Options): Array<[string, string]> {
  const wage = Number(options.wage ?? "0");
  const reference = Number(options.reference ?? "1412");
  if (!Number.isFinite(wage) || wage <= 0 || !Number.isFinite(reference) || reference <= 0) {
    throw new Error("Both the amount and the minimum wage need to be positive numbers.");
  }
  const multiples = wage / reference;
  return [
    ["Minimum wages", `${round(multiples)}x`],
    ["Amount", wage.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
  ];
}

// ── First million ───────────────────────────────────────────────────────

/** Months to reach a target, saving a fixed amount monthly at a fixed
 * monthly rate — the ordinary future-value-of-an-annuity formula, solved
 * for the number of periods instead of the total. */
export function firstMillionFacts(_input: string, options: Options): Array<[string, string]> {
  const monthly = Number(options.monthly ?? "0");
  const ratePercent = Number(options.rate ?? "0");
  const target = Number(options.target ?? "1000000");
  if (!Number.isFinite(monthly) || monthly <= 0) throw new Error("Type a positive monthly contribution.");
  if (!Number.isFinite(target) || target <= 0) throw new Error("Type a positive target.");

  const rate = ratePercent / 100;
  let months: number;
  if (rate === 0) {
    months = target / monthly;
  } else {
    months = Math.log(1 + (target * rate) / monthly) / Math.log(1 + rate);
  }
  const wholeMonths = Math.ceil(months);
  const years = Math.floor(wholeMonths / 12);
  const remainingMonths = wholeMonths % 12;

  return [
    ["Months needed", String(wholeMonths)],
    ["Roughly", `${years} ${years === 1 ? "year" : "years"}, ${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`],
    ["Total contributed", (wholeMonths * monthly).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
  ];
}
