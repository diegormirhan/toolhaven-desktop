/**
 * Test data: identifiers that follow a real checksum rule without being a
 * real person's or company's.
 *
 * CPF and CNPJ are the two Brazilian identifiers every form asks for, so
 * every form that gets tested needs a fake one that survives the client-side
 * check the real form runs before it accepts anything. Generating one is the
 * validation rule run backwards: pick the free digits, then compute the
 * check digits the rule requires.
 */

import type { Options } from "./text";
import { randomInteger } from "./text";
import type { Translate } from "../i18n/language";

const identity: Translate = (value) => value;

function digits(text: string): number[] {
  return [...text.replace(/\D/g, "")].map(Number);
}

// ── CPF ─────────────────────────────────────────────────────────────────

function cpfCheckDigit(base: number[]): number {
  const weightStart = base.length + 1;
  const sum = base.reduce((total, digit, index) => total + digit * (weightStart - index), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function generateCpf(): string {
  const base = Array.from({ length: 9 }, () => randomInteger(10));
  const digit1 = cpfCheckDigit(base);
  const digit2 = cpfCheckDigit([...base, digit1]);
  return formatCpf([...base, digit1, digit2]);
}

function formatCpf(all: number[]): string {
  const text = all.join("");
  return `${text.slice(0, 3)}.${text.slice(3, 6)}.${text.slice(6, 9)}-${text.slice(9)}`;
}

export function isValidCpf(text: string): boolean {
  const all = digits(text);
  if (all.length !== 11 || all.every((digit) => digit === all[0])) return false;
  const digit1 = cpfCheckDigit(all.slice(0, 9));
  const digit2 = cpfCheckDigit(all.slice(0, 10));
  return all[9] === digit1 && all[10] === digit2;
}

export function cpfTool(text: string, options: Options, t: Translate = identity): string {
  if (options.mode === "validate") {
    if (!text.trim()) return "";
    return isValidCpf(text) ? t("Valid CPF") : t("Not a valid CPF");
  }
  return generateCpf();
}

// ── CNPJ ────────────────────────────────────────────────────────────────

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function cnpjCheckDigit(base: number[], weights: number[]): number {
  const sum = base.reduce((total, digit, index) => total + digit * weights[index]!, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function generateCnpj(): string {
  const base = [...Array.from({ length: 8 }, () => randomInteger(10)), 0, 0, 0, 1];
  const digit1 = cnpjCheckDigit(base, CNPJ_WEIGHTS_1);
  const digit2 = cnpjCheckDigit([...base, digit1], CNPJ_WEIGHTS_2);
  return formatCnpj([...base, digit1, digit2]);
}

function formatCnpj(all: number[]): string {
  const text = all.join("");
  return `${text.slice(0, 2)}.${text.slice(2, 5)}.${text.slice(5, 8)}/${text.slice(8, 12)}-${text.slice(12)}`;
}

export function isValidCnpj(text: string): boolean {
  const all = digits(text);
  if (all.length !== 14 || all.every((digit) => digit === all[0])) return false;
  const digit1 = cnpjCheckDigit(all.slice(0, 12), CNPJ_WEIGHTS_1);
  const digit2 = cnpjCheckDigit(all.slice(0, 13), CNPJ_WEIGHTS_2);
  return all[12] === digit1 && all[13] === digit2;
}

export function cnpjTool(text: string, options: Options, t: Translate = identity): string {
  if (options.mode === "validate") {
    if (!text.trim()) return "";
    return isValidCnpj(text) ? t("Valid CNPJ") : t("Not a valid CNPJ");
  }
  return generateCnpj();
}

// ── CEP ─────────────────────────────────────────────────────────────────

/**
 * A CEP has no check digit — it is a plain 8-digit range assignment — so
 * there is nothing to validate and nothing to compute. This gives a
 * correctly formatted, made-up number for a form that only checks the shape,
 * never a real address: there is no offline database to look one up in.
 */
export function generateCep(): string {
  const all = Array.from({ length: 8 }, () => randomInteger(10));
  const text = all.join("");
  return `${text.slice(0, 5)}-${text.slice(5)}`;
}

// ── UUID batches ────────────────────────────────────────────────────────

export function generateUuidBatch(_input: string, options: Options): string {
  const count = Math.min(100, Math.max(1, Number(options.count ?? "1") || 1));
  return Array.from({ length: count }, () => crypto.randomUUID()).join("\n");
}

// ── Test card numbers ───────────────────────────────────────────────────

/**
 * A Luhn-valid card number for a payment gateway's own sandbox — the same
 * thing Stripe, PayPal and every other processor publish under "test card
 * numbers" in their docs. It has the right shape and passes the checksum
 * every payment form checks client-side; it has no bank behind it and moves
 * no money. A processor's test mode accepts it because the number is on the
 * network's own published test list, not because this tool can forge one
 * that works for real.
 */
// Prefixes come from the networks' own published BIN ranges, the same ones
// every payment gateway's test-card documentation draws from. `prefix` is a
// function rather than a fixed string because Mastercard and Amex each cover
// more than one — computing it fresh per call, instead of once at import
// time, is what makes every generated card vary instead of freezing on
// whichever prefix module load happened to pick.
const CARD_NETWORKS: Record<string, { prefix: () => string; length: number }> = {
  visa: { prefix: () => "4", length: 16 },
  mastercard: { prefix: () => "5" + String(1 + randomInteger(5)), length: 16 },
  amex: { prefix: () => "3" + (randomInteger(2) === 0 ? "4" : "7"), length: 15 },
  discover: { prefix: () => "6011", length: 16 },
};

function luhnCheckDigit(digits: number[]): number {
  let sum = 0;
  // The check digit is position 0 counting from the right of the *finished*
  // number, so every existing digit is one position further out than it
  // will be once the check digit is appended.
  for (let index = 0; index < digits.length; index += 1) {
    const fromRight = digits.length - index;
    let value = digits[index]!;
    if (fromRight % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidCardNumber(text: string): boolean {
  const all = digits(text);
  if (all.length < 12 || all.length > 19) return false;
  return luhnCheckDigit(all.slice(0, -1)) === all.at(-1);
}

export function generateTestCard(_input: string, options: Options): string {
  const network = CARD_NETWORKS[options.network ?? "visa"] ?? CARD_NETWORKS.visa!;
  const prefix = network.prefix();
  const digitsNeeded = network.length - prefix.length - 1;
  const body = prefix + Array.from({ length: digitsNeeded }, () => randomInteger(10)).join("");
  const check = luhnCheckDigit([...body].map(Number));
  const number = body + check;
  return number.match(/.{1,4}/g)!.join(" ");
}

export function testCardFacts(
  _input: string,
  options: Options,
  t: Translate = identity,
): Array<[string, string]> {
  const number = generateTestCard(_input, options);
  const month = String(1 + randomInteger(12)).padStart(2, "0");
  const year = new Date().getFullYear() + 1 + randomInteger(4);
  const isAmex = number.replace(/\s/g, "").length === 15;
  return [
    ["Number", number],
    ["Expiry", `${month}/${String(year).slice(-2)}`],
    [isAmex ? "CID" : "CVV", String(randomInteger(isAmex ? 10000 : 1000)).padStart(isAmex ? 4 : 3, "0")],
    ["Warning", t("Sandbox test card only — it charges nothing and belongs to no one.")],
  ];
}
