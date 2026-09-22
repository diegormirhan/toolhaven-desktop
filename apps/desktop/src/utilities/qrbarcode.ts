/**
 * QR codes and barcodes, rendered as SVG rather than to a `<canvas>`.
 *
 * A canvas needs a real 2D rendering context, which the browser provides and
 * the test environment does not — every assertion here would need a browser
 * to run. SVG is markup either library can build without touching a pixel
 * buffer, so the same code path is what ships and what the tests exercise.
 * It is also the better output on its own terms: vector, so it is exactly as
 * sharp printed at any size as it is on screen.
 */

import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import type { Options } from "./text";

/** An SVG string turned into something an `<img src>` can load safely. */
export function toImageSource(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// ── QR code ─────────────────────────────────────────────────────────────

export async function generateQrSvg(text: string, options: Options): Promise<string> {
  if (!text.trim()) throw new Error("Type or paste what the code should hold.");
  const errorCorrection = (options.errorCorrection ?? "M") as "L" | "M" | "Q" | "H";
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: errorCorrection,
    margin: 1,
    color: { dark: options.color ?? "#000000", light: options.background ?? "#ffffff" },
  });
}

export async function generateQrImage(text: string, options: Options): Promise<string> {
  return toImageSource(await generateQrSvg(text, options));
}

// ── Wi-Fi QR code ───────────────────────────────────────────────────────

/** Escapes the characters the Wi-Fi QR payload format treats specially. */
function escapeWifiField(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function wifiPayload(options: Options): string {
  const ssid = escapeWifiField(options.ssid ?? "");
  if (!ssid) throw new Error("Type the network name.");
  const password = escapeWifiField(options.password ?? "");
  const security = options.security ?? "WPA";
  const hidden = options.hidden === "yes" ? "true" : "false";
  if (security === "nopass") return `WIFI:T:nopass;S:${ssid};H:${hidden};;`;
  return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`;
}

export async function generateWifiQrImage(_input: string, options: Options): Promise<string> {
  return generateQrImage(wifiPayload(options), options);
}

// ── Barcode ─────────────────────────────────────────────────────────────

const BARCODE_FORMATS = ["CODE128", "EAN13", "EAN8", "UPC", "CODE39", "ITF14", "MSI", "pharmacode"];

export function generateBarcodeSvg(text: string, options: Options): string {
  if (!text.trim()) throw new Error("Type the value to encode.");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, text, {
      format: options.format ?? "CODE128",
      lineColor: options.color ?? "#000000",
      background: options.background ?? "#ffffff",
      width: 2,
      height: 80,
      displayValue: options.displayValue !== "no",
    });
  } catch {
    throw new Error("That value is not valid for the chosen barcode format.");
  }
  return new XMLSerializer().serializeToString(svg);
}

export function generateBarcodeImage(text: string, options: Options): string {
  return toImageSource(generateBarcodeSvg(text, options));
}

export const barcodeFormats = BARCODE_FORMATS;
