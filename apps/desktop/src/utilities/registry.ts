import * as text from "./text";
import type { Options } from "./text";

/**
 * The tools the app performs itself.
 *
 * Everything in here is a pure function of a string and some options. There is
 * no binary to download, no process to supervise and no file on disk: the work
 * is small enough that a panel can do it as you type. That is a different kind
 * of tool from the rest of the catalog, so it gets its own panel rather than
 * being bent into the one built around files and a queue.
 */

export type UtilityField = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  defaultValue?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  choices?: Array<{ value: string; label: string }>;
  /** Shown only when this returns true, so a form has no dead controls. */
  showWhen?: (values: Options) => boolean;
  hint?: string;
};

export type Utility = {
  id: string;
  label: string;
  description: string;
  /** What the big box at the top is for. Some utilities generate, and take none. */
  input: "text" | "none";
  inputLabel?: string;
  fields?: UtilityField[];
  run: (input: string, options: Options) => string;
  /** A result shown as a list of name and value rather than as a block of text. */
  facts?: (input: string, options: Options) => Array<[string, string]>;
};

export type UtilityGroup = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  utilities: Utility[];
};

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const utilityGroups: UtilityGroup[] = [
  {
    id: "text-tools",
    title: "Work on text",
    description: "Case, order, duplicates, replacements and counts — as you type.",
    keywords: [
      "text", "case", "uppercase", "lowercase", "title", "sentence", "reverse", "upside down",
      "duplicate", "sort", "alphabetical", "shuffle", "random", "replace", "find", "whitespace",
      "trim", "prefix", "suffix", "number", "lines", "count", "characters", "words", "slug",
      "lorem", "ipsum", "placeholder",
    ],
    utilities: [
      {
        id: "case",
        label: "Change case",
        description: "Upper, lower, title or sentence case.",
        input: "text",
        fields: [
          {
            key: "case",
            label: "Case",
            type: "select",
            defaultValue: "upper",
            choices: [
              { value: "upper", label: "UPPERCASE" },
              { value: "lower", label: "lowercase" },
              { value: "title", label: "Title Case" },
              { value: "sentence", label: "Sentence case" },
            ],
          },
        ],
        run: text.changeCase,
      },
      {
        id: "reverse",
        label: "Reverse text",
        description: "Read the characters backwards.",
        input: "text",
        fields: [
          {
            key: "scope",
            label: "Reverse",
            type: "select",
            defaultValue: "lines",
            choices: [
              { value: "lines", label: "Each line on its own" },
              { value: "whole", label: "The whole text, lines included" },
            ],
          },
        ],
        run: text.reverseText,
      },
      {
        id: "upside-down",
        label: "Upside down",
        description: "Flip the letters for a caption or a bio.",
        input: "text",
        run: (value) => text.upsideDown(value),
      },
      {
        id: "duplicates",
        label: "Remove duplicate lines",
        description: "Keep the first of each line, drop the rest.",
        input: "text",
        fields: [
          {
            key: "caseSensitive",
            label: "Match the case",
            type: "select",
            defaultValue: "yes",
            choices: yesNo,
          },
          {
            key: "trim",
            label: "Ignore spaces at the ends",
            type: "select",
            defaultValue: "yes",
            choices: yesNo,
          },
        ],
        run: text.removeDuplicateLines,
      },
      {
        id: "sort",
        label: "Sort lines",
        description: "Alphabetical order, in your own alphabet.",
        input: "text",
        fields: [
          {
            key: "order",
            label: "Order",
            type: "select",
            defaultValue: "ascending",
            choices: [
              { value: "ascending", label: "A to Z" },
              { value: "descending", label: "Z to A" },
            ],
          },
        ],
        run: text.sortLines,
      },
      {
        id: "shuffle",
        label: "Shuffle lines",
        description: "Put the lines in a random order — a draw, from a list.",
        input: "text",
        run: (value) => text.shuffleLines(value),
      },
      {
        id: "replace",
        label: "Find and replace",
        description: "Every occurrence, plain or by pattern.",
        input: "text",
        fields: [
          { key: "find", label: "Find", type: "text", placeholder: "what to look for" },
          { key: "replace", label: "Replace with", type: "text", placeholder: "leave empty to delete" },
          {
            key: "caseSensitive",
            label: "Match the case",
            type: "select",
            defaultValue: "yes",
            choices: yesNo,
          },
          {
            key: "regex",
            label: "Treat it as a pattern",
            type: "select",
            defaultValue: "no",
            choices: yesNo,
            hint: "A regular expression, where $1 in the replacement is the first group.",
          },
        ],
        run: text.findAndReplace,
      },
      {
        id: "whitespace",
        label: "Tidy the spacing",
        description: "Collapse runs of spaces, tabs and blank lines.",
        input: "text",
        fields: [
          {
            key: "blankLines",
            label: "Blank lines",
            type: "select",
            defaultValue: "collapse",
            choices: [
              { value: "collapse", label: "At most one in a row" },
              { value: "keep", label: "Leave them alone" },
              { value: "remove", label: "Remove them all" },
            ],
          },
        ],
        run: text.tidyWhitespace,
      },
      {
        id: "affix",
        label: "Prefix and suffix",
        description: "Put something at the start or the end of every line.",
        input: "text",
        fields: [
          { key: "prefix", label: "Prefix", type: "text", placeholder: "before each line" },
          { key: "suffix", label: "Suffix", type: "text", placeholder: "after each line" },
          {
            key: "skipEmpty",
            label: "Skip empty lines",
            type: "select",
            defaultValue: "yes",
            choices: yesNo,
          },
        ],
        run: text.affixLines,
      },
      {
        id: "number-lines",
        label: "Number the lines",
        description: "1., 2., 3. — aligned, however many there are.",
        input: "text",
        fields: [
          { key: "start", label: "Start at", type: "number", defaultValue: "1", min: 0 },
          { key: "separator", label: "After the number", type: "text", defaultValue: ". " },
        ],
        run: text.numberLines,
      },
      {
        id: "count",
        label: "Count what is there",
        description: "Characters, words, lines and how long it takes to read.",
        input: "text",
        run: (value) => value,
        facts: (value) => {
          const counted = text.countText(value);
          return [
            ["Characters", String(counted.characters)],
            ["Characters without spaces", String(counted.charactersWithoutSpaces)],
            ["Words", String(counted.words)],
            ["Lines", String(counted.lines)],
            ["Paragraphs", String(counted.paragraphs)],
            ["Sentences", String(counted.sentences)],
            ["Reading time", `${counted.readingMinutes} min`],
          ];
        },
      },
      {
        id: "slug",
        label: "Make a slug",
        description: "A URL-safe version: no accents, no punctuation.",
        input: "text",
        fields: [
          {
            key: "separator",
            label: "Separator",
            type: "select",
            defaultValue: "hyphen",
            choices: [
              { value: "hyphen", label: "Hyphen (-)" },
              { value: "underscore", label: "Underscore (_)" },
            ],
          },
        ],
        run: text.slugify,
      },
      {
        id: "lorem",
        label: "Lorem ipsum",
        description: "Placeholder prose, by paragraph, sentence or word.",
        input: "none",
        fields: [
          { key: "count", label: "How many", type: "number", defaultValue: "3", min: 1, max: 200 },
          {
            key: "unit",
            label: "Of",
            type: "select",
            defaultValue: "paragraphs",
            choices: [
              { value: "paragraphs", label: "Paragraphs" },
              { value: "sentences", label: "Sentences" },
              { value: "words", label: "Words" },
            ],
          },
          {
            key: "classic",
            label: "Start with “Lorem ipsum”",
            type: "select",
            defaultValue: "yes",
            choices: yesNo,
          },
        ],
        run: (_input, options) => text.loremIpsum(options),
      },
    ],
  },
];

export function utilityGroup(id: string): UtilityGroup | undefined {
  return utilityGroups.find((group) => group.id === id);
}

export function utilityById(groupId: string, utilityId: string): Utility | undefined {
  return utilityGroup(groupId)?.utilities.find((utility) => utility.id === utilityId);
}

/** The ids of every group, which the catalog turns into cards. */
export const utilityGroupIds = utilityGroups.map((group) => group.id);
