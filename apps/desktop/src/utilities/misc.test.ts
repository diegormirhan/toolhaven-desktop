import { describe, expect, it } from "vitest";
import { barbecueFacts, fuelChoiceFacts, fuelCostFacts, symbolList } from "./misc";

function fact(facts: Array<[string, string]>, name: string): string | undefined {
  return facts.find(([entry]) => entry === name)?.[1];
}

describe("gasoline vs ethanol", () => {
  it("picks ethanol when it costs 70% of gasoline or less", () => {
    expect(fact(fuelChoiceFacts("", { gasoline: "6.00", ethanol: "4.20" }), "Better value")).toBe(
      "Ethanol",
    );
  });

  it("picks gasoline just above the threshold", () => {
    expect(fact(fuelChoiceFacts("", { gasoline: "6.00", ethanol: "4.30" }), "Better value")).toBe(
      "Gasoline",
    );
  });

  it("refuses a non-positive price", () => {
    expect(() => fuelChoiceFacts("", { gasoline: "0", ethanol: "4" })).toThrow();
  });
});

describe("fuel cost", () => {
  it("multiplies litres needed by the price", () => {
    const facts = fuelCostFacts("", { distance: "100", consumption: "10", price: "5" });
    expect(fact(facts, "Fuel needed")).toBe("10 L");
  });
});

describe("barbecue calculator", () => {
  it("scales meat, charcoal, ice and drinks with the guest count", () => {
    const facts = barbecueFacts("", { guests: "10", gramsPerGuest: "400" });
    expect(fact(facts, "Meat")).toBe("4 kg");
    expect(fact(facts, "Ice")).toBe("15 kg");
  });

  it("refuses a non-positive guest count", () => {
    expect(() => barbecueFacts("", { guests: "0" })).toThrow();
  });
});

describe("symbol list", () => {
  it("returns the symbols for the chosen category", () => {
    expect(symbolList("", { category: "math" })).toContain("∞");
  });

  it("returns nothing for an unknown category rather than throwing", () => {
    expect(symbolList("", { category: "unknown" })).toBe("");
  });
});
