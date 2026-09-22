/**
 * Encodings, hashes and identifiers — text in, a different shape of text out.
 *
 * The hashes are the one place in this file that is not instant: they go
 * through the platform's crypto API, which is asynchronous. Everything else
 * here is synchronous, plain arithmetic and table lookups.
 */

import type { Options } from "./text";
import { randomInteger } from "./text";
import type { Translate } from "../i18n/language";

const identity: Translate = (value, values) =>
  values ? value.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole)) : value;

// ── Base64 ──────────────────────────────────────────────────────────────

/** UTF-8 safe: `btoa` alone breaks on anything outside Latin-1. */
export function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64Decode(text: string): string {
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function base64Convert(text: string, options: Options): string {
  try {
    return options.direction === "decode" ? base64Decode(text) : base64Encode(text);
  } catch {
    throw new Error("That is not valid Base64.");
  }
}

// ── URL ─────────────────────────────────────────────────────────────────

export function urlConvert(text: string, options: Options): string {
  if (options.direction === "decode") {
    try {
      return decodeURIComponent(text);
    } catch {
      throw new Error("That is not a validly escaped URL.");
    }
  }
  return encodeURIComponent(text);
}

// ── HTML entities ───────────────────────────────────────────────────────

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const HTML_UNESCAPES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

export function htmlConvert(text: string, options: Options): string {
  if (options.direction === "decode") {
    return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z0-9]+);/gi, (whole, entity: string) => {
      if (entity[0] === "#") {
        const codePoint =
          entity[1] === "x" || entity[1] === "X"
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : whole;
      }
      return HTML_UNESCAPES[entity.toLowerCase()] ?? whole;
    });
  }
  return text.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]!);
}

// ── Binary and Morse ────────────────────────────────────────────────────

export function binaryConvert(text: string, options: Options): string {
  if (options.direction === "decode") {
    const groups = text.trim().split(/\s+/).filter(Boolean);
    if (groups.some((group) => !/^[01]{1,8}$/.test(group))) {
      throw new Error("That is not 8-bit binary, space-separated.");
    }
    return groups.map((group) => String.fromCharCode(Number.parseInt(group, 2))).join("");
  }
  return [...new TextEncoder().encode(text)]
    .map((byte) => byte.toString(2).padStart(8, "0"))
    .join(" ");
}

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};
const MORSE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([letter, code]) => [code, letter]),
);

export function morseConvert(text: string, options: Options): string {
  if (options.direction === "decode") {
    return text
      .trim()
      .split(/\s*\/\s*|\s{2,}/)
      .map((word) =>
        word
          .trim()
          .split(/\s+/)
          .map((code) => MORSE_REVERSE[code] ?? "")
          .join(""),
      )
      .join(" ")
      .toLowerCase();
  }
  return text
    .toUpperCase()
    .split(/(\s+)/)
    .map((chunk) => (/^\s+$/.test(chunk) ? "/" : [...chunk].map((letter) => MORSE[letter] ?? "").join(" ")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Hashes ──────────────────────────────────────────────────────────────

async function digestHex(algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512", text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, bytes);
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashText(text: string, options: Options): Promise<string> {
  switch (options.algorithm) {
    case "md5":
      return md5Hex(text);
    case "sha1":
      return digestHex("SHA-1", text);
    case "sha384":
      return digestHex("SHA-384", text);
    case "sha512":
      return digestHex("SHA-512", text);
    default:
      return digestHex("SHA-256", text);
  }
}

export async function hashFacts(text: string): Promise<Array<[string, string]>> {
  const [md5, sha1, sha256, sha384, sha512] = await Promise.all([
    Promise.resolve(md5Hex(text)),
    digestHex("SHA-1", text),
    digestHex("SHA-256", text),
    digestHex("SHA-384", text),
    digestHex("SHA-512", text),
  ]);
  return [
    ["MD5", md5],
    ["SHA-1", sha1],
    ["SHA-256", sha256],
    ["SHA-384", sha384],
    ["SHA-512", sha512],
  ];
}

/**
 * MD5, in full, because it is not in the platform's crypto API.
 *
 * Broken as a security hash decades ago and still the one people paste into
 * a form that has always asked for MD5 — a checksum for a download, an old
 * API signature. RFC 1321, transcribed rather than reinvented: the constants
 * are the ones the standard specifies, and there is no version of this
 * algorithm that reads better than its reference implementation does.
 */
function md5Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const withPadding = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  withPadding.set(bytes);
  withPadding[bytes.length] = 0x80;
  const view = new DataView(withPadding.buffer);
  view.setUint32(withPadding.length - 8, bitLength >>> 0, true);
  view.setUint32(withPadding.length - 4, Math.floor(bitLength / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const k = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000),
  );

  for (let chunk = 0; chunk < withPadding.length; chunk += 64) {
    const m = Array.from({ length: 16 }, (_, index) => view.getUint32(chunk + index * 4, true));
    let [a, b, c, d] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i += 1) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      f = (f + a + k[i]! + m[g]!) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotateLeft(f, s[i]!)) | 0;
    }
    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  return [a0, b0, c0, d0].map(toLittleEndianHex).join("");
}

function rotateLeft(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

function toLittleEndianHex(word: number): string {
  const bytes = [0, 8, 16, 24].map((shift) => (word >>> shift) & 0xff);
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ── JWT ─────────────────────────────────────────────────────────────────

export function decodeJwt(text: string): string {
  const parts = text.trim().split(".");
  if (parts.length < 2) throw new Error("That does not look like a JWT — expected three parts.");
  const header = base64UrlToJson(parts[0]!);
  const payload = base64UrlToJson(parts[1]!);
  return `${JSON.stringify(header, null, 2)}\n\n${JSON.stringify(payload, null, 2)}`;
}

export function jwtFacts(text: string, t: Translate = identity): Array<[string, string]> {
  const parts = text.trim().split(".");
  if (parts.length < 2) return [];
  try {
    const payload = base64UrlToJson(parts[1]!) as Record<string, unknown>;
    const facts: Array<[string, string]> = [];
    if (typeof payload.exp === "number") {
      const expires = new Date(payload.exp * 1000);
      const state = expires < new Date() ? t("expired") : t("valid");
      facts.push(["Expires", t("{date} ({state})", { date: expires.toLocaleString(), state })]);
    }
    if (typeof payload.iat === "number") facts.push(["Issued", new Date(payload.iat * 1000).toLocaleString()]);
    if (typeof payload.sub === "string") facts.push(["Subject", payload.sub]);
    return facts;
  } catch {
    return [];
  }
}

function base64UrlToJson(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(segment.length / 4) * 4, "=");
  return JSON.parse(base64Decode(padded));
}

// ── UUID and passwords ──────────────────────────────────────────────────

export function generateUuid(): string {
  return crypto.randomUUID();
}

const PASSWORD_SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  // Excludes characters that a font or a font substitution can make ambiguous.
  symbols: "!@#$%^&*()-_=+[]{}",
};

export function generatePassword(_input: string, options: Options): string {
  const length = Math.min(128, Math.max(4, Number(options.length ?? "16") || 16));
  const pools = [
    options.lower !== "no" && PASSWORD_SETS.lower,
    options.upper !== "no" && PASSWORD_SETS.upper,
    options.digits !== "no" && PASSWORD_SETS.digits,
    options.symbols === "yes" && PASSWORD_SETS.symbols,
  ].filter((pool): pool is string => Boolean(pool));
  if (pools.length === 0) return "";
  const alphabet = pools.join("");
  return Array.from({ length }, () => alphabet[randomInteger(alphabet.length)]).join("");
}

export function passwordStrength(password: string, t: Translate = identity): Array<[string, string]> {
  if (!password) return [];
  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^a-zA-Z0-9]/.test(password));
  // A rough, well-known rule of thumb: length times the character classes in
  // play approximates how many guesses a cracker needs, in bits.
  const bits = Math.log2(Math.max(1, variety * 26)) * password.length;
  const label = bits < 40 ? "Weak" : bits < 65 ? "Fair" : bits < 90 ? "Strong" : "Very strong";
  return [
    ["Length", String(password.length)],
    ["Estimated strength", t(label)],
  ];
}

// ── Roman numerals ──────────────────────────────────────────────────────

const ROMAN_TABLE: Array<[number, string]> = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 3999) {
    throw new Error("Roman numerals here run from 1 to 3999.");
  }
  let remaining = value;
  let result = "";
  for (const [amount, symbol] of ROMAN_TABLE) {
    while (remaining >= amount) {
      result += symbol;
      remaining -= amount;
    }
  }
  return result;
}

export function fromRoman(roman: string): number {
  const cleaned = roman.trim().toUpperCase();
  if (!/^[MDCLXVI]+$/.test(cleaned)) throw new Error("That is not a Roman numeral.");
  let total = 0;
  let previous = 0;
  for (let index = cleaned.length - 1; index >= 0; index -= 1) {
    const value = ROMAN_TABLE.find(([, symbol]) => symbol === cleaned[index])?.[0] ?? romanDigit(cleaned[index]!);
    if (value < previous) total -= value;
    else total += value;
    previous = value;
  }
  if (toRoman(total) !== cleaned) throw new Error("That is not a valid Roman numeral.");
  return total;
}

function romanDigit(letter: string): number {
  return { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }[letter] ?? 0;
}

export function romanConvert(text: string, options: Options): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (options.direction === "decode") return String(fromRoman(trimmed));
  const value = Number(trimmed);
  if (!Number.isFinite(value)) throw new Error("Type a whole number.");
  return toRoman(value);
}

// ── Number base conversion ──────────────────────────────────────────────

const BASES: Record<string, number> = { binary: 2, octal: 8, decimal: 10, hex: 16 };

export function convertBase(text: string, options: Options): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const from = BASES[options.from ?? "decimal"] ?? 10;
  const to = BASES[options.to ?? "binary"] ?? 2;
  const value = Number.parseInt(trimmed.replace(/^0[bxo]/i, ""), from);
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    throw new Error(`That is not a valid ${options.from ?? "decimal"} number.`);
  }
  return value.toString(to).toUpperCase();
}

// ── Numbers written out, in Portuguese ──────────────────────────────────

const UNITS_PT = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const TENS_PT = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa",
];
const HUNDREDS_PT = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];
const SCALES_PT: Array<[number, string, string]> = [
  [1_000_000_000_000, "trilhão", "trilhões"],
  [1_000_000_000, "bilhão", "bilhões"],
  [1_000_000, "milhão", "milhões"],
  [1_000, "mil", "mil"],
];

function threeDigitsToWords(value: number): string {
  if (value === 0) return "";
  if (value === 100) return "cem";
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(HUNDREDS_PT[hundreds]!);
  if (rest > 0) {
    if (rest < 20) parts.push(UNITS_PT[rest]!);
    else {
      const tens = Math.floor(rest / 10);
      const units = rest % 10;
      parts.push(units > 0 ? `${TENS_PT[tens]} e ${UNITS_PT[units]}` : TENS_PT[tens]!);
    }
  }
  return parts.join(" e ");
}

export function numberToWordsPt(value: number): string {
  if (value === 0) return "zero";
  if (!Number.isInteger(value)) throw new Error("Whole numbers only, for now.");
  const negative = value < 0;
  let remaining = Math.abs(value);
  if (remaining >= 1_000_000_000_000_000) throw new Error("That is larger than this tool goes.");

  const parts: string[] = [];
  for (const [scale, singular, plural] of SCALES_PT) {
    const count = Math.floor(remaining / scale);
    if (count === 0) continue;
    remaining %= scale;
    const word = scale === 1000 && count === 1 ? "mil" : `${threeDigitsToWords(count)} ${count === 1 ? singular : plural}`;
    parts.push(word);
  }
  if (remaining > 0 || parts.length === 0) parts.push(threeDigitsToWords(remaining));

  const joined =
    parts.length > 1
      ? `${parts.slice(0, -1).join(", ")}${remaining > 0 && remaining < 100 && remaining !== 0 ? " e " : " e "}${parts.at(-1)}`
      : parts[0]!;
  return (negative ? "menos " : "") + joined;
}

export function numberWordsConvert(text: string): string {
  const value = Number(text.trim().replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value)) throw new Error("Type a number.");
  return numberToWordsPt(Math.round(value));
}

// ── Timestamps ──────────────────────────────────────────────────────────

export function timestampToDate(text: string, options: Options): string {
  const raw = Number(text.trim());
  if (!Number.isFinite(raw)) throw new Error("Type a Unix timestamp.");
  const milliseconds = options.unit === "milliseconds" ? raw : raw * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) throw new Error("That number is not a usable timestamp.");
  return date.toISOString();
}

export function dateToTimestamp(text: string): string {
  const date = new Date(text.trim());
  if (Number.isNaN(date.getTime())) throw new Error("That is not a date this can parse. Try 2026-01-31T10:00.");
  return String(Math.floor(date.getTime() / 1000));
}
