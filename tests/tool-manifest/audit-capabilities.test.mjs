import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("capability audit", () => {
  it("covers the first-version media, files and dev-tool matrix", () => {
    const output = execFileSync(process.execPath, ["scripts/tool-manifest/audit-capabilities.mjs"], { encoding: "utf8" });
    assert.match(output, /Capability audit passed/);
  });
});
