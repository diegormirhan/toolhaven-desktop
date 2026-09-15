import { describe, expect, it } from "vitest";
import { defaultCrop } from "./CropOverlay";

describe("crop rectangle", () => {
  it("starts inset from every edge, so all eight handles can be grabbed", () => {
    const rect = defaultCrop({ width: 480, height: 320 });

    expect(rect).toEqual({ left: 48, top: 32, width: 384, height: 256 });
    // Inset on all four sides: a rectangle flush with an edge hides the
    // handles on that side under the frame.
    expect(rect.left).toBeGreaterThan(0);
    expect(rect.top).toBeGreaterThan(0);
    expect(rect.left + rect.width).toBeLessThan(480);
    expect(rect.top + rect.height).toBeLessThan(320);
  });

  it("stays centred and whole-numbered at awkward sizes", () => {
    // Odd dimensions used to leave a half pixel, which libvips rejects.
    for (const size of [
      { width: 1, height: 1 },
      { width: 401, height: 267 },
      { width: 5120, height: 2880 },
    ]) {
      const rect = defaultCrop(size);
      for (const value of Object.values(rect)) {
        expect(Number.isInteger(value)).toBe(true);
      }
      expect(rect.left + rect.width).toBeLessThanOrEqual(size.width);
      expect(rect.top + rect.height).toBeLessThanOrEqual(size.height);
      // Equal margins either side, give or take the rounding.
      expect(Math.abs(rect.left - (size.width - rect.width - rect.left))).toBeLessThanOrEqual(1);
    }
  });
});
