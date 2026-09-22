import { describe, expect, it } from "vitest";
import {
  backgroundPatternCss,
  borderRadiusCss,
  borderRadiusPreview,
  boxShadowCss,
  checkboxCss,
  clipPathCss,
  clipPathPreview,
  cubicBezierCss,
  gradientCss,
  gradientPreview,
  loaderCss,
  loaderPreview,
  switchCss,
  switchPreview,
  textGlitchCss,
  textGlitchPreview,
  triangleCss,
  trianglePreview,
} from "./css";

describe("border radius", () => {
  it("puts all four corners in CSS order: TL TR BR BL", () => {
    expect(
      borderRadiusCss("", { tl: "4", tr: "8", br: "12", bl: "16" }),
    ).toBe("border-radius: 4px 8px 12px 16px;");
  });

  it("previews the same four corners as an inline style", () => {
    expect(borderRadiusPreview({ tl: "4", tr: "8", br: "12", bl: "16" }).style.borderRadius).toBe(
      "4px 8px 12px 16px",
    );
  });
});

describe("box shadow", () => {
  it("converts the colour and opacity into one rgba value", () => {
    expect(boxShadowCss("", { x: "0", y: "4", blur: "10", spread: "0", color: "#ff0000", opacity: "50" })).toBe(
      "box-shadow: 0px 4px 10px 0px rgba(255, 0, 0, 0.5);",
    );
  });

  it("puts inset first when asked for", () => {
    expect(boxShadowCss("", { inset: "yes", color: "#000000", opacity: "25" })).toMatch(/^box-shadow: inset /);
  });
});

describe("gradient", () => {
  it("builds a linear gradient with the given angle", () => {
    expect(gradientCss("", { shape: "linear", angle: "90", from: "#000", to: "#fff" })).toBe(
      "background: linear-gradient(90deg, #000, #fff);",
    );
  });

  it("builds a radial gradient instead when asked", () => {
    expect(gradientCss("", { shape: "radial", from: "#000", to: "#fff" })).toBe(
      "background: radial-gradient(circle, #000, #fff);",
    );
  });

  it("previews the same background the CSS declares", () => {
    expect(gradientPreview({ shape: "linear", angle: "90", from: "#000", to: "#fff" }).style.background).toBe(
      "linear-gradient(90deg, #000, #fff)",
    );
  });
});

describe("clip path", () => {
  it("has a shape for every choice the field offers", () => {
    for (const shape of ["circle", "triangle", "trapezoid", "pentagon", "hexagon", "star", "arrow"]) {
      expect(clipPathCss("", { shape })).toContain("clip-path:");
      expect(clipPathPreview({ shape }).style.clipPath).toBeTruthy();
    }
  });

  it("falls back to a circle for an unknown shape rather than an empty path", () => {
    expect(clipPathCss("", { shape: "not-a-shape" })).toContain("circle(50%");
  });
});

describe("background pattern", () => {
  it("has a distinct declaration for each of the three patterns", () => {
    const dots = backgroundPatternCss("", { pattern: "dots" });
    const stripes = backgroundPatternCss("", { pattern: "stripes" });
    const grid = backgroundPatternCss("", { pattern: "grid" });
    expect(dots).toContain("radial-gradient");
    expect(stripes).toContain("repeating-linear-gradient");
    expect(grid).toContain("background-size");
    expect(new Set([dots, stripes, grid]).size).toBe(3);
  });
});

describe("triangle", () => {
  it("points in the direction asked, using the border trick", () => {
    const up = triangleCss("", { direction: "up", size: "40", color: "#f00" });
    expect(up).toContain("border-color: transparent transparent #f00 transparent");
  });

  it("previews with the same border colours", () => {
    const preview = trianglePreview({ direction: "down", size: "40", color: "#0f0" });
    expect(preview.style.borderColor).toBe("#0f0 transparent transparent transparent");
  });
});

describe("loader", () => {
  it("draws a ring by default", () => {
    expect(loaderCss("", {})).toContain("border-radius: 50%");
    expect(loaderPreview({}).kind).toBe("loader");
  });

  it("draws dots instead when asked", () => {
    expect(loaderCss("", { style: "dots" })).toContain("radial-gradient(circle closest-side");
  });
});

describe("cubic bezier", () => {
  it("uses the named preset's own values", () => {
    expect(cubicBezierCss("", { preset: "ease-in" })).toBe(
      "animation-timing-function: cubic-bezier(0.42, 0, 1, 1);",
    );
  });

  it("uses the four custom values when the preset is custom", () => {
    expect(cubicBezierCss("", { preset: "custom", x1: "0.1", y1: "0.2", x2: "0.3", y2: "0.4" })).toBe(
      "animation-timing-function: cubic-bezier(0.1, 0.2, 0.3, 0.4);",
    );
  });
});

describe("text glitch", () => {
  it("splits the text-shadow between the two colours given", () => {
    expect(textGlitchCss("", { color1: "#f00", color2: "#0ff" })).toContain(
      "text-shadow: 2px 0 #f00, -2px 0 #0ff;",
    );
  });

  it("previews the typed text, or a default when none was typed", () => {
    expect(textGlitchPreview({ text: "Hello" }).label).toBe("Hello");
    expect(textGlitchPreview({}).label).toBe("GLITCH");
  });
});

describe("switch", () => {
  it("sizes the track from the thumb size plus its margin", () => {
    expect(switchCss("", { size: "24", color: "#6366f1" })).toContain("width: 43.2px");
  });

  it("carries the thumb size as a custom property for the preview", () => {
    expect(switchPreview({ size: "24" }).style["--thumb-size"]).toBe("20px");
  });
});

describe("checkbox", () => {
  it("maps each shape choice to its own border radius", () => {
    expect(checkboxCss("", { shape: "circle" })).toContain("border-radius: 50%");
    expect(checkboxCss("", { shape: "square" })).toContain("border-radius: 0;");
    expect(checkboxCss("", { shape: "rounded" })).toContain("border-radius: 6px;");
  });
});
