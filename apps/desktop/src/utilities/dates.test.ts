import { describe, expect, it } from "vitest";
import {
  ageFacts,
  businessDaysFacts,
  dayCounterFacts,
  dayOfYearFacts,
  easterSunday,
  moonPhaseFacts,
  seasonFacts,
  shiftDate,
  zodiacSign,
} from "./dates";

function fact(facts: Array<[string, string]>, name: string): string | undefined {
  return facts.find(([entry]) => entry === name)?.[1];
}

describe("Easter", () => {
  it("matches the published date for several years", () => {
    expect(easterSunday(2024).toDateString()).toBe(new Date(2024, 2, 31).toDateString());
    expect(easterSunday(2025).toDateString()).toBe(new Date(2025, 3, 20).toDateString());
    expect(easterSunday(2026).toDateString()).toBe(new Date(2026, 3, 5).toDateString());
  });
});

describe("day counter", () => {
  it("counts the days between two dates regardless of order", () => {
    expect(fact(dayCounterFacts("", { start: "2026-01-01", end: "2026-01-11" }), "Days")).toBe("10");
    expect(fact(dayCounterFacts("", { start: "2026-01-11", end: "2026-01-01" }), "Days")).toBe("10");
  });

  it("says the same day is the same day", () => {
    expect(fact(dayCounterFacts("", { start: "2026-06-01", end: "2026-06-01" }), "Days")).toBe("0");
  });
});

describe("business days", () => {
  it("excludes weekends", () => {
    // Monday 2026-01-05 to the following Monday: 5 weekdays in between.
    const facts = businessDaysFacts("", { start: "2026-01-05", end: "2026-01-12" });
    expect(fact(facts, "Business days")).toBe("5");
  });

  it("also excludes national holidays that fall on a weekday", () => {
    // 2026-01-01 is a Thursday and a national holiday.
    const facts = businessDaysFacts("", { start: "2025-12-31", end: "2026-01-02" });
    expect(fact(facts, "National holidays in the range")).toBe("1");
  });
});

describe("shifting a date", () => {
  it("adds days, months and years", () => {
    expect(shiftDate("", { date: "2026-01-31", amount: "1", unit: "days", direction: "add" })).toBe(
      "2026-02-01",
    );
    expect(shiftDate("", { date: "2026-01-31", amount: "1", unit: "months", direction: "add" })).toBe(
      "2026-03-03",
    );
  });

  it("subtracts when asked to", () => {
    expect(shiftDate("", { date: "2026-01-10", amount: "5", unit: "days", direction: "subtract" })).toBe(
      "2026-01-05",
    );
  });
});

describe("age", () => {
  it("counts full years, months and days", () => {
    const facts = ageFacts("", { birth: "2000-06-15", today: "2026-06-14" });
    expect(fact(facts, "Age")).toBe("25 years, 11 months, 30 days");
  });

  it("refuses a birth date in the future", () => {
    expect(() => ageFacts("", { birth: "2099-01-01", today: "2026-01-01" })).toThrow();
  });
});

describe("zodiac", () => {
  it("reads the cutoff dates correctly", () => {
    expect(zodiacSign("2026-03-20")).toBe("Pisces");
    expect(zodiacSign("2026-03-21")).toBe("Aries");
  });
});

describe("moon phase", () => {
  it("stays within the documented range and picks a named phase", () => {
    const facts = moonPhaseFacts("2026-01-01");
    const phase = fact(facts, "Phase");
    expect(phase).toMatch(/moon|crescent|gibbous|quarter/i);
    const illumination = Number(fact(facts, "Illumination")?.replace("%", ""));
    expect(illumination).toBeGreaterThanOrEqual(0);
    expect(illumination).toBeLessThanOrEqual(100);
  });
});

describe("day of year", () => {
  it("counts January 1st as day 1", () => {
    expect(fact(dayOfYearFacts("2026-01-01"), "Day of the year")).toMatch(/^1 of/);
  });

  it("knows 2028 is a leap year", () => {
    expect(fact(dayOfYearFacts("2028-06-01"), "Day of the year")).toMatch(/of 366$/);
  });
});

describe("season", () => {
  it("flips between hemispheres", () => {
    expect(fact(seasonFacts("2026-01-15", { hemisphere: "northern" }), "Season")).toMatch(/^Winter/);
    expect(fact(seasonFacts("2026-01-15", { hemisphere: "southern" }), "Season")).toMatch(/^Summer/);
  });
});
