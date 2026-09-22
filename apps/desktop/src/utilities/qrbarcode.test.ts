import { describe, expect, it } from "vitest";
import {
  barcodeFormats,
  generateBarcodeImage,
  generateBarcodeSvg,
  generateQrSvg,
  toImageSource,
  wifiPayload,
} from "./qrbarcode";

describe("QR codes", () => {
  it("produces an SVG document", async () => {
    const svg = await generateQrSvg("https://example.com", {});
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("refuses an empty payload rather than encoding nothing", async () => {
    await expect(generateQrSvg("", {})).rejects.toThrow();
  });

  it("uses the requested error-correction level without throwing", async () => {
    for (const level of ["L", "M", "Q", "H"]) {
      await expect(generateQrSvg("test", { errorCorrection: level })).resolves.toContain("<svg");
    }
  });
});

describe("Wi-Fi QR payload", () => {
  it("builds the WIFI: string the format expects", () => {
    expect(wifiPayload({ ssid: "HomeNet", password: "s3cret", security: "WPA" })).toBe(
      "WIFI:T:WPA;S:HomeNet;P:s3cret;H:false;;",
    );
  });

  it("omits the password field's value for an open network", () => {
    expect(wifiPayload({ ssid: "Guest", security: "nopass" })).toBe("WIFI:T:nopass;S:Guest;H:false;;");
  });

  it("escapes characters the format treats as separators", () => {
    expect(wifiPayload({ ssid: "My;Net", password: "a,b", security: "WPA" })).toBe(
      "WIFI:T:WPA;S:My\\;Net;P:a\\,b;H:false;;",
    );
  });

  it("marks a hidden network", () => {
    expect(wifiPayload({ ssid: "Hidden", security: "WPA", hidden: "yes" })).toContain("H:true");
  });

  it("refuses an empty network name", () => {
    expect(() => wifiPayload({ ssid: "" })).toThrow();
  });
});

describe("barcodes", () => {
  it("produces an SVG for the default format", () => {
    // displayValue's text label needs to measure text width, which needs a
    // real canvas — unavailable under jsdom. The label itself is exercised
    // in the running app, where a real browser provides one.
    const svg = generateBarcodeSvg("123456789012", { displayValue: "no" });
    expect(svg).toContain("<svg");
  });

  it("has an entry in the format list for every offered choice", () => {
    expect(barcodeFormats).toContain("CODE128");
    expect(barcodeFormats).toContain("EAN13");
  });

  it("rejects a value that is not valid for the chosen format", () => {
    // EAN-13 needs 12 or 13 digits; letters are not a valid EAN-13 payload.
    expect(() => generateBarcodeSvg("not-a-number", { format: "EAN13" })).toThrow();
  });

  it("refuses an empty value", () => {
    expect(() => generateBarcodeSvg("", {})).toThrow();
  });

  it("wraps the SVG as a data URL an <img> can load", () => {
    const image = generateBarcodeImage("123456789012", { displayValue: "no" });
    expect(image).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});

describe("image source encoding", () => {
  it("round-trips an SVG containing non-ASCII text", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>café</text></svg>';
    const source = toImageSource(svg);
    const decoded = decodeURIComponent(escape(atob(source.split(",")[1]!)));
    expect(decoded).toBe(svg);
  });
});
