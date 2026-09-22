/**
 * Percentages, fractions, units, simple finance and a couple of health
 * calculators — arithmetic that people reach for a search engine for.
 */

import type { Options } from "./text";
import type { Translate } from "../i18n/language";

const identity: Translate = (value, values) =>
  values ? value.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole)) : value;

// ── Percentage ──────────────────────────────────────────────────────────

export function percentageFacts(
  _input: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const a = Number(options.a ?? "0");
  const b = Number(options.b ?? "0");
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("Both fields need a number.");

  switch (options.mode) {
    case "whatPercent":
      // "A is what % of B"
      if (b === 0) throw new Error("The second number cannot be zero here.");
      return [["Result", t("{a} is {percent}% of {b}", { a, percent: round((a / b) * 100), b })]];
    case "changeFrom":
      // The percentage change from A to B.
      if (a === 0) throw new Error("The first number cannot be zero for a change calculation.");
      return [["Result", t("{percent}% change, from {a} to {b}", { percent: round(((b - a) / a) * 100), a, b })]];
    default:
      // "A% of B"
      return [["Result", t("{a}% of {b} is {result}", { a, b, result: round((a / 100) * b) })]];
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── Rule of three ───────────────────────────────────────────────────────

export function ruleOfThree(_input: string, options: Options): string {
  const a = Number(options.a);
  const b = Number(options.b);
  const c = Number(options.c);
  if ([a, b, c].some((value) => !Number.isFinite(value))) throw new Error("All three fields need a number.");
  if (a === 0) throw new Error("The first value cannot be zero.");
  return String(round((b * c) / a));
}

// ── Fractions ───────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function simplify(numerator: number, denominator: number): [number, number] {
  if (denominator === 0) throw new Error("A fraction cannot have zero on the bottom.");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator) || 1;
  return [(sign * numerator) / divisor, (sign * denominator) / divisor];
}

export function fractionFacts(_input: string, options: Options): Array<[string, string]> {
  const n1 = Number(options.n1 ?? "0");
  const d1 = Number(options.d1 ?? "1");
  const n2 = Number(options.n2 ?? "0");
  const d2 = Number(options.d2 ?? "1");
  if ([n1, d1, n2, d2].some((value) => !Number.isFinite(value))) throw new Error("Every field needs a number.");
  if (d1 === 0 || d2 === 0) throw new Error("A denominator cannot be zero.");

  let numerator: number;
  let denominator: number;
  switch (options.operation) {
    case "subtract":
      numerator = n1 * d2 - n2 * d1;
      denominator = d1 * d2;
      break;
    case "multiply":
      numerator = n1 * n2;
      denominator = d1 * d2;
      break;
    case "divide":
      if (n2 === 0) throw new Error("Cannot divide by a fraction that is zero.");
      numerator = n1 * d2;
      denominator = d1 * n2;
      break;
    default:
      numerator = n1 * d2 + n2 * d1;
      denominator = d1 * d2;
  }
  const [simpleN, simpleD] = simplify(numerator, denominator);
  return [
    ["Result", `${simpleN}/${simpleD}`],
    ["As a decimal", round(simpleN / simpleD).toString()],
    ["Before simplifying", `${numerator}/${denominator}`],
  ];
}

// ── Unit conversion ─────────────────────────────────────────────────────

type UnitTable = Record<string, number>;

/** Every unit's size relative to the table's own base unit. */
const UNIT_TABLES: Record<string, UnitTable> = {
  mass: { mg: 0.001, g: 1, kg: 1000, ton: 1_000_000, oz: 28.349523125, lb: 453.59237 },
  length: { mm: 1, cm: 10, m: 1000, km: 1_000_000, in: 25.4, ft: 304.8, yd: 914.4, mi: 1_609_344 },
  speed: { "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, knot: 0.514444 },
  volume: { ml: 1, l: 1000, "gal(us)": 3785.411784, "fl-oz(us)": 29.5735295625 },
};

export function convertUnit(_input: string, options: Options): string {
  const category = options.category ?? "length";
  const value = Number(options.value ?? "0");
  if (!Number.isFinite(value)) throw new Error("Type a number to convert.");

  if (category === "temperature") return convertTemperature(value, options);

  const table = UNIT_TABLES[category];
  if (!table) throw new Error("Unknown unit category.");
  const from = table[options.from ?? ""];
  const to = table[options.to ?? ""];
  if (from == null || to == null) throw new Error("Choose both units.");
  return round((value * from) / to).toString();
}

function convertTemperature(value: number, options: Options): string {
  const from = options.from ?? "c";
  const to = options.to ?? "f";
  const celsius = from === "f" ? ((value - 32) * 5) / 9 : from === "k" ? value - 273.15 : value;
  const result = to === "f" ? (celsius * 9) / 5 + 32 : to === "k" ? celsius + 273.15 : celsius;
  return round(result).toString();
}

// ── Savings and financing ──────────────────────────────────────────────

export function savingsFacts(_input: string, options: Options): Array<[string, string]> {
  const monthly = Number(options.monthly ?? "0");
  const months = Number(options.months ?? "0");
  const rate = Number(options.rate ?? "0") / 100;
  if ([monthly, months, rate].some((value) => !Number.isFinite(value))) throw new Error("Every field needs a number.");
  if (months < 0 || months > 1200) throw new Error("Pick a number of months between 0 and 1200.");

  let total = 0;
  let contributed = 0;
  for (let month = 0; month < months; month += 1) {
    total = total * (1 + rate) + monthly;
    contributed += monthly;
  }
  return [
    ["Total saved", formatCurrency(total)],
    ["You put in", formatCurrency(contributed)],
    ["Interest earned", formatCurrency(total - contributed)],
  ];
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** The Price table: an equal payment every month, front-loaded on interest. */
export function financingFacts(_input: string, options: Options): Array<[string, string]> {
  const principal = Number(options.principal ?? "0");
  const months = Number(options.months ?? "0");
  const rate = Number(options.rate ?? "0") / 100;
  if ([principal, months, rate].some((value) => !Number.isFinite(value))) {
    throw new Error("Every field needs a number.");
  }
  if (months <= 0 || months > 600) throw new Error("Pick a number of months between 1 and 600.");

  const payment =
    rate === 0 ? principal / months : (principal * rate) / (1 - (1 + rate) ** -months);
  const total = payment * months;
  return [
    ["Monthly payment", formatCurrency(payment)],
    ["Total paid", formatCurrency(total)],
    ["Total interest", formatCurrency(total - principal)],
  ];
}

// ── Health ──────────────────────────────────────────────────────────────

export function bmiFacts(
  _input: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const weightKg = Number(options.weight ?? "0");
  const heightCm = Number(options.height ?? "0");
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || heightCm <= 0 || weightKg <= 0) {
    throw new Error("Weight and height both need a positive number.");
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const category =
    bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obese";
  return [
    ["BMI", round(bmi).toString()],
    ["Category", t(category)],
  ];
}

export function gestationalFacts(
  _input: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const lastPeriod = new Date(options.lastPeriod ?? "");
  if (Number.isNaN(lastPeriod.getTime())) throw new Error("Type the date of the last period.");
  const today = options.today ? new Date(options.today) : new Date();

  const daysSince = Math.round((today.getTime() - lastPeriod.getTime()) / 86_400_000);
  const weeks = Math.floor(daysSince / 7);
  const days = daysSince % 7;
  const dueDate = new Date(lastPeriod);
  dueDate.setDate(dueDate.getDate() + 280);

  return [
    ["Gestational age", t("{weeks} weeks, {days} days", { weeks, days })],
    ["Estimated due date", dueDate.toISOString().slice(0, 10)],
  ];
}

export function fertileWindowFacts(
  _input: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const lastPeriod = new Date(options.lastPeriod ?? "");
  if (Number.isNaN(lastPeriod.getTime())) throw new Error("Type the date of the last period.");
  const cycleLength = Number(options.cycleLength ?? "28");
  if (!Number.isFinite(cycleLength) || cycleLength < 20 || cycleLength > 45) {
    throw new Error("Cycle length is usually between 20 and 45 days.");
  }

  // Ovulation is estimated 14 days before the next period, the luteal phase
  // being the more stable half of the cycle.
  const ovulation = new Date(lastPeriod);
  ovulation.setDate(ovulation.getDate() + cycleLength - 14);
  const windowStart = new Date(ovulation);
  windowStart.setDate(windowStart.getDate() - 5);
  const windowEnd = new Date(ovulation);
  windowEnd.setDate(windowEnd.getDate() + 1);

  return [
    ["Estimated ovulation", ovulation.toISOString().slice(0, 10)],
    [
      "Fertile window",
      t("{start} to {end}", {
        start: windowStart.toISOString().slice(0, 10),
        end: windowEnd.toISOString().slice(0, 10),
      }),
    ],
  ];
}
