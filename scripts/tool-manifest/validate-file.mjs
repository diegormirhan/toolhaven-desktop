import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { validateToolManifest } from "./validate-tool-manifest.mjs";

const manifestArgument = process.argv[2];

if (!manifestArgument) {
  console.error("Usage: node scripts/tool-manifest/validate-file.mjs <manifest.json>");
  process.exitCode = 2;
} else {
  await validateFile(manifestArgument);
}

async function validateFile(manifestPath) {
  const absoluteManifestPath = resolve(manifestPath);

  try {
    const manifestText = await readFile(absoluteManifestPath, "utf8");
    const manifest = JSON.parse(manifestText);
    const issues = validateToolManifest(manifest);

    if (issues.length === 0) {
      console.log(`Valid tool manifest: ${absoluteManifestPath}`);
      return;
    }

    console.error(`Invalid tool manifest: ${absoluteManifestPath}`);
    issues.forEach((issue) => console.error(`- ${issue.path}: ${issue.message}`));
    process.exitCode = 1;
  } catch (error) {
    console.error(`Unable to validate ${absoluteManifestPath}: ${error.message}`);
    process.exitCode = 1;
  }
}
