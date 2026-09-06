import assert from "node:assert/strict";
import test from "node:test";

import { resolveInstallationPlan } from "../../scripts/component-installation/resolve-installation-plan.mjs";

function tool(id, { delivery = "on-demand", dependencies = [] } = {}) {
  return {
    id,
    displayName: id,
    status: "planned",
    delivery,
    dependencies,
    sourceRepository: `https://example.org/${id}`,
    licenseExpression: "MIT",
    capabilities: ["tools.run"]
  };
}

function manifestWith(...tools) {
  return {
    schemaVersion: 1,
    target: "x86_64-pc-windows-msvc",
    tools
  };
}

test("orders transitive dependencies before the requested tool", () => {
  const manifest = manifestWith(
    tool("yt-dlp", { dependencies: ["deno", "ffmpeg", "ffprobe"] }),
    tool("deno"),
    tool("ffmpeg"),
    tool("ffprobe")
  );

  const plan = resolveInstallationPlan(manifest, {
    requestedToolIds: ["yt-dlp"],
    installedToolIds: []
  });

  assert.deepEqual(
    plan.map((step) => step.toolId),
    ["deno", "ffmpeg", "ffprobe", "yt-dlp"]
  );
});

test("skips embedded and already installed tools", () => {
  const manifest = manifestWith(
    tool("yt-dlp", { dependencies: ["deno", "ffmpeg", "qpdf"] }),
    tool("deno"),
    tool("ffmpeg"),
    tool("qpdf", { delivery: "embedded" })
  );

  const plan = resolveInstallationPlan(manifest, {
    requestedToolIds: ["yt-dlp"],
    installedToolIds: ["ffmpeg"]
  });

  assert.deepEqual(
    plan.map((step) => step.toolId),
    ["deno", "yt-dlp"]
  );
});

test("deduplicates shared dependencies", () => {
  const manifest = manifestWith(
    tool("video-tools", { dependencies: ["ffmpeg"] }),
    tool("download-tools", { dependencies: ["ffmpeg"] }),
    tool("ffmpeg")
  );

  const plan = resolveInstallationPlan(manifest, {
    requestedToolIds: ["video-tools", "download-tools"],
    installedToolIds: []
  });

  assert.deepEqual(
    plan.map((step) => step.toolId),
    ["ffmpeg", "video-tools", "download-tools"]
  );
});

test("rejects circular dependencies with the full cycle", () => {
  const manifest = manifestWith(
    tool("alpha", { dependencies: ["beta"] }),
    tool("beta", { dependencies: ["gamma"] }),
    tool("gamma", { dependencies: ["alpha"] })
  );

  assert.throws(
    () =>
      resolveInstallationPlan(manifest, {
        requestedToolIds: ["alpha"],
        installedToolIds: []
      }),
    /circular dependency: alpha -> beta -> gamma -> alpha/
  );
});

test("rejects requests for tools outside the catalog", () => {
  const manifest = manifestWith(tool("ffmpeg"));

  assert.throws(
    () =>
      resolveInstallationPlan(manifest, {
        requestedToolIds: ["unknown"],
        installedToolIds: []
      }),
    /requested tool "unknown" is not registered/
  );
});
