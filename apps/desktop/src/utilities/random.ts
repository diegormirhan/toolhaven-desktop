/** Dice, roulette, the lottery, a raffle, and plain random picks. */

import type { Options } from "./text";
import { randomInteger } from "./text";

function randomBetween(min: number, max: number): number {
  return min + randomInteger(max - min + 1);
}

// ── Dice ────────────────────────────────────────────────────────────────

export function rollDice(_input: string, options: Options): string {
  const sides = Math.max(2, Number(options.sides ?? "6"));
  const count = Math.max(1, Math.min(20, Number(options.count ?? "1")));
  const rolls = Array.from({ length: count }, () => randomBetween(1, sides));
  return rolls.join(", ");
}

// ── Roulette (European: 0-36, with colour) ────────────────────────────────

const ROULETTE_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function spinRouletteFacts(_input: string, _options: Options, t = (value: string) => value): Array<[string, string]> {
  const number = randomBetween(0, 36);
  const color = number === 0 ? t("Green") : ROULETTE_RED.has(number) ? t("Red") : t("Black");
  return [
    ["Number", String(number)],
    ["Color", color],
  ];
}

// ── Mega-Sena (6 unique numbers, 1-60) ─────────────────────────────────────

export function megaSenaNumbers(): string {
  const numbers = new Set<number>();
  while (numbers.size < 6) numbers.add(randomBetween(1, 60));
  return Array.from(numbers)
    .sort((a, b) => a - b)
    .map((value) => String(value).padStart(2, "0"))
    .join(" - ");
}

// ── Raffle: pick winners from a list of names, one per line ────────────────

export function raffleWinners(input: string, options: Options): string {
  const names = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (names.length === 0) throw new Error("List one name per line first.");
  const winnerCount = Math.max(1, Math.min(names.length, Number(options.winners ?? "1")));

  const pool = [...names];
  const winners: string[] = [];
  while (winners.length < winnerCount && pool.length > 0) {
    const index = randomInteger(pool.length);
    winners.push(pool[index]!);
    pool.splice(index, 1);
  }
  return winners.join("\n");
}

// ── Random numbers ──────────────────────────────────────────────────────

export function randomNumbers(_input: string, options: Options): string {
  const min = Number(options.min ?? "1");
  const max = Number(options.max ?? "100");
  const count = Math.max(1, Math.min(50, Number(options.count ?? "5")));
  const unique = options.unique !== "no";
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    throw new Error("Minimum needs to be less than or equal to maximum.");
  }

  if (unique) {
    const span = max - min + 1;
    if (count > span) throw new Error("Not enough numbers in that range to keep them unique.");
    const values = new Set<number>();
    while (values.size < count) values.add(randomBetween(min, max));
    return Array.from(values)
      .sort((a, b) => a - b)
      .join(", ");
  }

  return Array.from({ length: count }, () => randomBetween(min, max)).join(", ");
}

// ── Random words ─────────────────────────────────────────────────────────

const WORD_BANKS: Record<string, string[]> = {
  animals: [
    "gato", "cachorro", "elefante", "girafa", "tigre", "leão", "urso", "raposa", "coelho", "tartaruga",
    "golfinho", "águia", "coruja", "lobo", "panda", "zebra", "canguru", "polvo", "pinguim", "jacaré",
  ],
  names: [
    "Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabriela", "Hugo", "Inês", "João",
    "Larissa", "Marcos", "Nina", "Otávio", "Paula", "Rafael", "Sofia", "Tiago", "Valentina", "Yuri",
  ],
  objects: [
    "cadeira", "janela", "caneta", "relógio", "chave", "garrafa", "livro", "espelho", "mochila", "guarda-chuva",
    "travesseiro", "tesoura", "vela", "moeda", "escova", "panela", "corda", "lâmpada", "caixa", "tapete",
  ],
  colors: [
    "vermelho", "azul", "verde", "amarelo", "roxo", "laranja", "rosa", "preto", "branco", "cinza",
    "marrom", "turquesa", "violeta", "dourado", "prateado",
  ],
};

export function randomWords(_input: string, options: Options): string {
  const bank = WORD_BANKS[options.bank ?? "animals"] ?? WORD_BANKS.animals!;
  const count = Math.max(1, Math.min(20, Number(options.count ?? "5")));
  return Array.from({ length: count }, () => bank[randomInteger(bank.length)]).join(", ");
}
