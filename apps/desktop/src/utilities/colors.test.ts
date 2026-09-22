import { describe, expect, it } from "vitest";
import { colorMix, colorShades, hexToRgbaFacts, parseHex, rgbaToHex, toHex } from "./colors";

function fact(facts: Array<[string, string]>, name: string): string | undefined {
  return facts.find(([entry]) => entry === name)?.[1];
}

describe("HEX parsing", () => {
  it("reads a full six-digit HEX", () => {
    expect(parseHex("#ff8800")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it("expands the three-digit shorthand", () => {
    expect(parseHex("#f80")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it("reads the alpha channel from an eight-digit HEX", () => {
    expect(parseHex("#ff880080").a).toBeCloseTo(128 / 255, 2);
  });

  it("rejects something that is not a HEX colour", () => {
    expect(() => parseHex("not a color")).toThrow();
  });
});

describe("HEX to RGBA", () => {
  it("gives rgb, rgba and hsl for the same colour", () => {
    const facts = hexToRgbaFacts("#ff0000");
    expect(fact(facts, "RGB")).toBe("rgb(255, 0, 0)");
    expect(fact(facts, "HSL")).toBe("hsl(0, 100%, 50%)");
  });
});

describe("RGBA to HEX", () => {
  it("converts rgb() back to HEX", () => {
    expect(rgbaToHex("rgb(255, 136, 0)", {})).toBe("#ff8800");
  });

  it("includes the alpha byte only when asked for", () => {
    expect(rgbaToHex("rgba(255, 136, 0, 0.5)", { includeAlpha: "yes" })).toBe("#ff880080");
    expect(rgbaToHex("rgba(255, 136, 0, 0.5)", { includeAlpha: "no" })).toBe("#ff8800");
  });
});

describe("shades", () => {
  it("gives the base colour in the middle, darker before and lighter after", () => {
    const shades = colorShades("#808080", { steps: "2" }).split("\n");
    expect(shades).toHaveLength(5);
    expect(shades[2]).toBe(toHex(parseHex("#808080")));
  });
});

describe("colour mixer", () => {
  it("starts and ends on the two colours given", () => {
    const steps = colorMix("", { first: "#000000", second: "#ffffff", steps: "3" }).split("\n");
    expect(steps[0]).toBe("#000000");
    expect(steps.at(-1)).toBe("#ffffff");
  });
});
