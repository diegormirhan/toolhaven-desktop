import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const stylesheet = readFileSync(
  fileURLToPath(new URL("../../apps/desktop/src/styles/app.css", import.meta.url)),
  "utf8",
);

test("never writes a vendor prefix by hand", () => {
  // The minifier adds whatever prefix this WebView needs. Writing one by hand
  // makes it collapse the pair down to the prefixed declaration alone, which
  // Chromium then does not apply at all -- which is how the modal quietly
  // stopped blurring its background in a release build while dev looked right.
  const handWritten = stylesheet
    .split("\n")
    .map((line, index) => [index + 1, line.trim()])
    .filter(([, line]) => /^-(webkit|moz|ms|o)-/.test(line));

  assert.deepEqual(handWritten, []);
});

test("blurs what is behind the modal", () => {
  assert.match(stylesheet, /\.panel-scrim\s*\{[^}]*backdrop-filter:\s*blur/);
});

test("leaves a way out of the blur for anyone who asked for less transparency", () => {
  assert.match(stylesheet, /prefers-reduced-transparency:\s*reduce/);
});

test("never hardcodes a colour below the token blocks", () => {
  // The token blocks own every literal colour; a hex further down means the
  // light theme has a rule that does not follow it.
  const body = stylesheet.slice(stylesheet.indexOf("* { box-sizing: border-box; }"));
  const literals = body
    .split("\n")
    .map((line, index) => [index, line])
    .filter(([, line]) => /#[0-9a-f]{3,8}\b/i.test(line) && !line.trim().startsWith("/*"))
    .map(([, line]) => line.trim());

  assert.deepEqual(literals, []);
});
