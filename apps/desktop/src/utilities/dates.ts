/**
 * Date arithmetic — a day count, an age, a season, a moon phase.
 *
 * Every function here takes a date (or two) and returns a number or a small
 * table of facts. None of them needs a clock running: "today" is read once,
 * at the moment the function is called, the same way any other input is.
 */

import type { Options } from "./text";
import type { Translate } from "../i18n/language";

const identity: Translate = (value, values) =>
  values ? value.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole)) : value;

function parseDate(text: string): Date {
  const trimmed = text.trim();
  // `new Date("2026-01-31")` parses as UTC midnight in every engine, which
  // reads as the day before in any timezone west of Greenwich. Parsing the
  // parts by hand keeps a plain date a local calendar day, not an instant.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(trimmed);
  if (Number.isNaN(date.getTime())) throw new Error("That date could not be read. Try YYYY-MM-DD.");
  return date;
}

function daysBetween(start: Date, end: Date): number {
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDay - startDay) / 86_400_000);
}

// ── Day counter ─────────────────────────────────────────────────────────

export function dayCounterFacts(
  _input: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const start = parseDate(options.start ?? "");
  const end = parseDate(options.end ?? "");
  const days = daysBetween(start, end);
  const weeks = Math.trunc(Math.abs(days) / 7);
  return [
    ["Days", String(Math.abs(days))],
    [
      "Weeks and days",
      `${t(weeks === 1 ? "{weeks} week" : "{weeks} weeks", { weeks })}, ${t(
        Math.abs(days) % 7 === 1 ? "{days} day" : "{days} days",
        { days: Math.abs(days) % 7 },
      )}`,
    ],
    [
      "Direction",
      days === 0
        ? t("Same day")
        : days > 0
          ? t("End is after start")
          : t("End is before start"),
    ],
  ];
}

// ── Business days ───────────────────────────────────────────────────────

/**
 * Easter, by the Anonymous Gregorian algorithm — the base every other
 * movable Brazilian holiday (Carnival, Good Friday, Corpus Christi) is
 * computed from.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

/** National Brazilian holidays: fixed dates plus the ones Easter decides. */
export function brazilianHolidays(year: number): Date[] {
  const easter = easterSunday(year);
  return [
    new Date(year, 0, 1),
    addDays(easter, -47), // Carnaval (terça-feira)
    addDays(easter, -2), // Sexta-feira Santa
    addDays(easter, 60), // Corpus Christi
    new Date(year, 3, 21),
    new Date(year, 4, 1),
    new Date(year, 8, 7),
    new Date(year, 9, 12),
    new Date(year, 10, 2),
    new Date(year, 10, 15),
    new Date(year, 10, 20),
    new Date(year, 11, 25),
  ];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function businessDaysFacts(_input: string, options: Options): Array<[string, string]> {
  const start = parseDate(options.start ?? "");
  const end = parseDate(options.end ?? "");
  const [earlier, later] = start <= end ? [start, end] : [end, start];
  const holidays = [
    ...brazilianHolidays(earlier.getFullYear()),
    ...brazilianHolidays(later.getFullYear()),
  ];

  let businessDays = 0;
  let holidaysSkipped = 0;
  for (let date = new Date(earlier); date < later; date = addDays(date, 1)) {
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    if (holidays.some((holiday) => isSameDay(holiday, date))) {
      holidaysSkipped += 1;
      continue;
    }
    businessDays += 1;
  }
  return [
    ["Business days", String(businessDays)],
    ["National holidays in the range", String(holidaysSkipped)],
  ];
}

// ── Add or subtract days ───────────────────────────────────────────────

export function shiftDate(_input: string, options: Options): string {
  const start = parseDate(options.date ?? "");
  const amount = Number(options.amount ?? "0") || 0;
  const unit = options.unit ?? "days";
  const sign = options.direction === "subtract" ? -1 : 1;
  const result = new Date(start);
  if (unit === "days") result.setDate(result.getDate() + sign * amount);
  else if (unit === "months") result.setMonth(result.getMonth() + sign * amount);
  else result.setFullYear(result.getFullYear() + sign * amount);
  return formatDate(result);
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ── Age ─────────────────────────────────────────────────────────────────

export function ageFacts(
  _input: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const birth = parseDate(options.birth ?? "");
  const today = options.today ? parseDate(options.today) : new Date();
  if (birth > today) throw new Error("That birth date is in the future.");

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return [
    ["Age", t("{years} years, {months} months, {days} days", { years, months, days })],
    ["Total days lived", String(daysBetween(birth, today))],
    ["Next birthday in", t("{days} days", { days: daysUntilNextBirthday(birth, today) })],
  ];
}

function daysUntilNextBirthday(birth: Date, today: Date): number {
  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
  return daysBetween(today, next);
}

// ── Zodiac ──────────────────────────────────────────────────────────────

const ZODIAC: Array<[number, number, string]> = [
  [1, 20, "Capricorn"], [2, 19, "Aquarius"], [3, 20, "Pisces"], [4, 20, "Aries"],
  [5, 21, "Taurus"], [6, 21, "Gemini"], [7, 22, "Cancer"], [8, 23, "Leo"],
  [9, 23, "Virgo"], [10, 23, "Libra"], [11, 22, "Scorpio"], [12, 22, "Sagittarius"],
  [12, 31, "Capricorn"],
];

export function zodiacSign(text: string, options: Options = {}, t: Translate = identity): string {
  const date = parseDate(text);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  for (const [signMonth, cutoffDay, sign] of ZODIAC) {
    if (month === signMonth && day <= cutoffDay) return t(sign);
  }
  return t(ZODIAC.find(([signMonth]) => signMonth === month + 1)?.[2] ?? "Capricorn");
}

// ── Moon phase ──────────────────────────────────────────────────────────

const SYNODIC_MONTH_DAYS = 29.530588861;
// A new moon this algorithm is anchored to, in Julian days.
const KNOWN_NEW_MOON_JD = 2451550.1;

function toJulianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function moonPhaseFacts(
  text: string,
  _options: Options = {},
  t: Translate = identity,
): Array<[string, string]> {
  const date = text.trim() ? parseDate(text) : new Date();
  const daysSince = toJulianDay(date) - KNOWN_NEW_MOON_JD;
  const age = daysSince - Math.floor(daysSince / SYNODIC_MONTH_DAYS) * SYNODIC_MONTH_DAYS;
  const fraction = age / SYNODIC_MONTH_DAYS;

  const phase =
    fraction < 0.03 || fraction > 0.97
      ? "New moon"
      : fraction < 0.22
        ? "Waxing crescent"
        : fraction < 0.28
          ? "First quarter"
          : fraction < 0.47
            ? "Waxing gibbous"
            : fraction < 0.53
              ? "Full moon"
              : fraction < 0.72
                ? "Waning gibbous"
                : fraction < 0.78
                  ? "Last quarter"
                  : "Waning crescent";

  const illumination = Math.round((1 - Math.cos(fraction * 2 * Math.PI)) * 50);
  return [
    ["Phase", t(phase)],
    ["Age", t("{age} days into the cycle", { age: age.toFixed(1) })],
    ["Illumination", `${illumination}%`],
  ];
}

// ── Day and week of the year, and the season ───────────────────────────

export function dayOfYearFacts(
  text: string,
  _options: Options = {},
  t: Translate = identity,
): Array<[string, string]> {
  const date = text.trim() ? parseDate(text) : new Date();
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = daysBetween(startOfYear, date) + 1;
  const daysInYear = isLeapYear(date.getFullYear()) ? 366 : 365;
  const weekOfYear = Math.ceil((dayOfYear + startOfYearWeekday(date.getFullYear())) / 7);
  return [
    ["Day of the year", t("{day} of {total}", { day: dayOfYear, total: daysInYear })],
    ["Week of the year", String(weekOfYear)],
    ["Remaining this year", t("{days} days", { days: daysInYear - dayOfYear })],
  ];
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function startOfYearWeekday(year: number): number {
  return new Date(year, 0, 1).getDay();
}

const SEASON_STARTS: Array<[number, number, string, string]> = [
  [3, 20, "Autumn", "Spring"],
  [6, 20, "Winter", "Summer"],
  [9, 22, "Spring", "Autumn"],
  [12, 21, "Summer", "Winter"],
];

export function seasonFacts(
  text: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const date = text.trim() ? parseDate(text) : new Date();
  const southern = options.hemisphere === "southern";
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let season = southern ? "Summer" : "Winter";
  for (const [startMonth, startDay, northSeason, southSeason] of SEASON_STARTS) {
    if (month > startMonth || (month === startMonth && day >= startDay)) {
      season = southern ? southSeason : northSeason;
    }
  }
  return [
    [
      "Season",
      t("{season} ({hemisphere} hemisphere)", {
        season: t(season),
        hemisphere: southern ? t("southern") : t("northern"),
      }),
    ],
  ];
}
