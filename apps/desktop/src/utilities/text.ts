/**
 * Text transforms that need no binary and no network.
 *
 * Every one is a pure function from a string and a few options to a string,
 * so the panel that runs them is a form and a result, and the tests are a
 * table of inputs and outputs rather than a browser.
 */

export type Options = Record<string, string>;

/** UPPER, lower, Title Case and Sentence case. */
export function changeCase(text: string, options: Options): string {
  switch (options.case) {
    case "upper":
      return text.toLocaleUpperCase();
    case "lower":
      return text.toLocaleLowerCase();
    case "title":
      // Every word, including after a hyphen or an apostrophe, which is what
      // "Title Case" means to anybody typing a headline.
      return text.replace(/\p{L}[\p{L}\p{M}']*/gu, (word) =>
        word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase(),
      );
    case "sentence":
      return text
        .toLocaleLowerCase()
        .replace(/(^|[.!?]\s+)(\p{L})/gu, (_, prefix: string, letter: string) =>
          prefix + letter.toLocaleUpperCase(),
        );
    default:
      return text;
  }
}

/** Reverses the characters, keeping the lines where they are unless asked. */
export function reverseText(text: string, options: Options): string {
  const byLine = options.scope !== "whole";
  const flip = (piece: string) => [...piece].reverse().join("");
  return byLine ? text.split("\n").map(flip).join("\n") : flip(text);
}

/**
 * The upside-down alphabet, which is a substitution rather than a rotation.
 *
 * Unicode has a letter for most of the flipped shapes; the ones it does not
 * have keep their own shape, which reads better than a box.
 */
const UPSIDE_DOWN: Record<string, string> = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ", j: "ɾ",
  k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ",
  u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  A: "∀", B: "𐐒", C: "Ɔ", D: "ᗡ", E: "Ǝ", F: "Ⅎ", G: "פ", H: "H", I: "I", J: "ſ",
  K: "ʞ", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ", Q: "Q", R: "ᴚ", S: "S", T: "┴",
  U: "∩", V: "Λ", W: "M", X: "X", Y: "⅄", Z: "Z",
  "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ", "6": "9", "7": "ㄥ",
  "8": "8", "9": "6",
  ".": "˙", ",": "'", "'": ",", '"': "„", "?": "¿", "!": "¡", "(": ")", ")": "(",
  "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "&": "⅋", "_": "‾",
};

export function upsideDown(text: string): string {
  return [...text]
    .reverse()
    .map((character) => UPSIDE_DOWN[character] ?? character)
    .join("");
}

/** Drops repeated lines, keeping the first of each. */
export function removeDuplicateLines(text: string, options: Options): string {
  const fold = options.caseSensitive === "no";
  const trim = options.trim !== "no";
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    const candidate = trim ? line.trim() : line;
    const key = fold ? candidate.toLocaleLowerCase() : candidate;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(line);
  }
  return kept.join("\n");
}

/** Sorts the lines, in the reader's own alphabet rather than by code point. */
export function sortLines(text: string, options: Options): string {
  const lines = text.split("\n");
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  lines.sort((left, right) => collator.compare(left, right));
  if (options.order === "descending") lines.reverse();
  return lines.join("\n");
}

/** Puts the lines in a random order, which is how a draw is made. */
export function shuffleLines(text: string): string {
  const lines = text.split("\n");
  // Fisher-Yates with the platform's crypto, so a draw cannot be predicted
  // from the clock the way Math.random's seeding once could.
  for (let index = lines.length - 1; index > 0; index -= 1) {
    const swap = randomInteger(index + 1);
    [lines[index], lines[swap]] = [lines[swap]!, lines[index]!];
  }
  return lines.join("\n");
}

/** Find and replace, plain or by pattern. */
export function findAndReplace(text: string, options: Options): string {
  const find = options.find ?? "";
  if (!find) return text;
  const replacement = options.replace ?? "";
  if (options.regex === "yes") {
    const flags = options.caseSensitive === "no" ? "gi" : "g";
    return text.replace(new RegExp(find, flags), replacement);
  }
  if (options.caseSensitive === "no") {
    return text.replace(new RegExp(escapeRegExp(find), "gi"), replacement);
  }
  return text.split(find).join(replacement);
}

/** Collapses runs of spaces, tabs and blank lines. */
export function tidyWhitespace(text: string, options: Options): string {
  let result = text.replace(/[^\S\n]+/g, " ");
  result = result
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  if (options.blankLines !== "keep") result = result.replace(/\n{3,}/g, "\n\n");
  if (options.blankLines === "remove") result = result.replace(/\n+/g, "\n");
  return result.trim();
}

/** Puts something at the start or the end of every line. */
export function affixLines(text: string, options: Options): string {
  const prefix = options.prefix ?? "";
  const suffix = options.suffix ?? "";
  const skipEmpty = options.skipEmpty !== "no";
  return text
    .split("\n")
    .map((line) => (skipEmpty && line.trim() === "" ? line : `${prefix}${line}${suffix}`))
    .join("\n");
}

/** Numbers every line, for a list somebody has to refer back to. */
export function numberLines(text: string, options: Options): string {
  const start = Number(options.start ?? "1") || 1;
  const separator = options.separator ?? ". ";
  const lines = text.split("\n");
  const width = String(start + lines.length - 1).length;
  return lines
    .map((line, index) => `${String(start + index).padStart(width, " ")}${separator}${line}`)
    .join("\n");
}

export type Counted = {
  characters: number;
  charactersWithoutSpaces: number;
  words: number;
  lines: number;
  paragraphs: number;
  sentences: number;
  readingMinutes: number;
};

/** What a text is made of, for a caption that has a limit. */
export function countText(text: string): Counted {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  return {
    // Counted by code point, so an emoji is one character rather than two.
    characters: [...text].length,
    charactersWithoutSpaces: [...text.replace(/\s/gu, "")].length,
    words,
    lines: text === "" ? 0 : text.split("\n").length,
    paragraphs: text.trim() ? text.trim().split(/\n\s*\n/).length : 0,
    sentences: text.trim() ? (text.match(/[^.!?]+[.!?]*/gu) ?? []).length : 0,
    // 200 words a minute is the usual middle of the published range.
    readingMinutes: Math.max(words > 0 ? 1 : 0, Math.round(words / 200)),
  };
}

/** A URL-safe slug: no accents, no punctuation, one hyphen between words. */
export function slugify(text: string, options: Options): string {
  const separator = options.separator === "underscore" ? "_" : "-";
  const slug = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, separator)
    .replace(new RegExp(`${escapeRegExp(separator)}{2,}`, "g"), separator)
    .replace(new RegExp(`^${escapeRegExp(separator)}|${escapeRegExp(separator)}$`, "g"), "");
  return options.case === "keep" ? slug : slug;
}

const LOREM = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do",
  "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim",
  "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in", "reprehenderit",
  "voluptate", "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur",
  "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum",
];

/** Placeholder prose, by paragraph, sentence or word. */
export function loremIpsum(options: Options): string {
  const count = Math.min(200, Math.max(1, Number(options.count ?? "3") || 3));
  const unit = options.unit ?? "paragraphs";
  const classic = options.classic !== "no";

  if (unit === "words") return capitalise(words(count, classic));
  if (unit === "sentences") {
    return Array.from({ length: count }, (_, index) => sentence(classic && index === 0)).join(" ");
  }
  return Array.from({ length: count }, (_, index) =>
    Array.from({ length: 3 + randomInteger(3) }, (__, inner) =>
      sentence(classic && index === 0 && inner === 0),
    ).join(" "),
  ).join("\n\n");

  function sentence(startClassic: boolean): string {
    const length = 6 + randomInteger(10);
    const body = startClassic
      ? `lorem ipsum dolor sit amet consectetur adipiscing elit`
      : words(length, false);
    return `${capitalise(body)}.`;
  }
}

function words(count: number, classic: boolean): string {
  const picked: string[] = [];
  if (classic) picked.push("lorem", "ipsum", "dolor", "sit", "amet");
  while (picked.length < count) picked.push(LOREM[randomInteger(LOREM.length)]!);
  return picked.slice(0, count).join(" ");
}

function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A whole number below `bound`, from the platform's cryptographic source.
 *
 * Rejection sampling rather than a modulo: taking the remainder of a 32-bit
 * draw makes the low values fractionally likelier, which is invisible in a
 * password and wrong in a draw.
 */
export function randomInteger(bound: number): number {
  if (bound <= 0) return 0;
  const limit = Math.floor(0xffffffff / bound) * bound;
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0]!;
  } while (value >= limit);
  return value % bound;
}
