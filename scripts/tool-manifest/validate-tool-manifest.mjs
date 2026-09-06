const SUPPORTED_SCHEMA_VERSION = 1;
const SUPPORTED_TARGET = "x86_64-pc-windows-msvc";
const TOOL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CAPABILITY_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;
const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;

export function validateToolManifest(manifest) {
  if (!isRecord(manifest)) {
    return [{ path: "$", message: "manifest must be a JSON object" }];
  }

  const issues = [];
  validateManifestHeader(manifest, issues);

  if (!Array.isArray(manifest.tools)) {
    issues.push({ path: "tools", message: "tools must be an array" });
    return issues;
  }

  const registeredToolIds = new Set();
  const registeredBundlePaths = new Set();

  manifest.tools.forEach((tool, toolIndex) => {
    validateTool(tool, toolIndex, registeredToolIds, registeredBundlePaths, issues);
  });

  manifest.tools.forEach((tool, toolIndex) => {
    validateToolDependencies(tool, toolIndex, registeredToolIds, issues);
  });

  return issues;
}

function validateManifestHeader(manifest, issues) {
  if (manifest.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    issues.push({ path: "schemaVersion", message: "supported value is 1" });
  }

  if (manifest.target !== SUPPORTED_TARGET) {
    issues.push({
      path: "target",
      message: 'supported value is "x86_64-pc-windows-msvc"'
    });
  }
}

function validateTool(tool, toolIndex, registeredToolIds, registeredBundlePaths, issues) {
  const toolPath = `tools[${toolIndex}]`;

  if (!isRecord(tool)) {
    issues.push({ path: toolPath, message: "tool must be a JSON object" });
    return;
  }

  validateToolIdentity(tool, toolPath, registeredToolIds, issues);
  validateDelivery(tool.delivery, `${toolPath}.delivery`, issues);
  validateNonEmptyString(tool.displayName, `${toolPath}.displayName`, issues);
  validateHttpsUrl(tool.sourceRepository, `${toolPath}.sourceRepository`, issues);
  validateNonEmptyString(tool.licenseExpression, `${toolPath}.licenseExpression`, issues);
  validateCapabilities(tool.capabilities, `${toolPath}.capabilities`, issues);

  if (tool.status === "planned") {
    if (tool.artifacts !== undefined) {
      issues.push({
        path: `${toolPath}.artifacts`,
        message: "planned tools cannot declare release artifacts"
      });
    }
    return;
  }

  if (tool.status !== "bundled") {
    issues.push({
      path: `${toolPath}.status`,
      message: 'status must be "planned" or "bundled"'
    });
    return;
  }

  validateNonEmptyString(tool.version, `${toolPath}.version`, issues);
  validateArtifacts(tool.artifacts, toolPath, registeredBundlePaths, issues);
}

function validateDelivery(delivery, path, issues) {
  if (delivery !== "embedded" && delivery !== "on-demand") {
    issues.push({ path, message: 'delivery must be "embedded" or "on-demand"' });
  }
}

function validateToolDependencies(tool, toolIndex, registeredToolIds, issues) {
  if (!isRecord(tool) || tool.dependencies === undefined) {
    return;
  }

  const dependenciesPath = `tools[${toolIndex}].dependencies`;

  if (!Array.isArray(tool.dependencies)) {
    issues.push({ path: dependenciesPath, message: "dependencies must be an array" });
    return;
  }

  const declaredDependencies = new Set();

  tool.dependencies.forEach((dependencyId, dependencyIndex) => {
    const dependencyPath = `${dependenciesPath}[${dependencyIndex}]`;

    if (typeof dependencyId !== "string" || !TOOL_ID_PATTERN.test(dependencyId)) {
      issues.push({ path: dependencyPath, message: "dependency must be a valid tool id" });
      return;
    }

    if (declaredDependencies.has(dependencyId)) {
      issues.push({ path: dependencyPath, message: `duplicate dependency "${dependencyId}"` });
      return;
    }

    declaredDependencies.add(dependencyId);

    if (!registeredToolIds.has(dependencyId)) {
      issues.push({ path: dependencyPath, message: `unknown tool dependency "${dependencyId}"` });
    }
  });
}

function validateToolIdentity(tool, toolPath, registeredToolIds, issues) {
  if (typeof tool.id !== "string" || !TOOL_ID_PATTERN.test(tool.id)) {
    issues.push({
      path: `${toolPath}.id`,
      message: "tool id must use lowercase kebab-case"
    });
    return;
  }

  if (registeredToolIds.has(tool.id)) {
    issues.push({
      path: `${toolPath}.id`,
      message: `duplicate tool id "${tool.id}"`
    });
    return;
  }

  registeredToolIds.add(tool.id);
}

function validateCapabilities(capabilities, path, issues) {
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    issues.push({ path, message: "tool requires at least one capability" });
    return;
  }

  const registeredCapabilities = new Set();

  capabilities.forEach((capability, capabilityIndex) => {
    const capabilityPath = `${path}[${capabilityIndex}]`;

    if (typeof capability !== "string" || !CAPABILITY_PATTERN.test(capability)) {
      issues.push({
        path: capabilityPath,
        message: "capability must use a namespaced identifier"
      });
      return;
    }

    if (registeredCapabilities.has(capability)) {
      issues.push({ path: capabilityPath, message: `duplicate capability "${capability}"` });
      return;
    }

    registeredCapabilities.add(capability);
  });
}

function validateArtifacts(artifacts, toolPath, registeredBundlePaths, issues) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    issues.push({
      path: `${toolPath}.artifacts`,
      message: "bundled tools require at least one artifact"
    });
    return;
  }

  artifacts.forEach((artifact, artifactIndex) => {
    const artifactPath = `${toolPath}.artifacts[${artifactIndex}]`;

    if (!isRecord(artifact)) {
      issues.push({ path: artifactPath, message: "artifact must be a JSON object" });
      return;
    }

    validateArtifact(artifact, artifactPath, registeredBundlePaths, issues);
  });
}

function validateArtifact(artifact, artifactPath, registeredBundlePaths, issues) {
  validateHttpsUrl(artifact.url, `${artifactPath}.url`, issues, "artifact URL must use HTTPS");

  if (typeof artifact.sha256 !== "string" || !SHA256_PATTERN.test(artifact.sha256)) {
    issues.push({
      path: `${artifactPath}.sha256`,
      message: "SHA-256 must contain exactly 64 hexadecimal characters"
    });
  }

  if (!isSafeRelativePath(artifact.bundlePath)) {
    issues.push({
      path: `${artifactPath}.bundlePath`,
      message: "bundle path must be a safe relative path"
    });
    return;
  }

  const normalizedBundlePath = artifact.bundlePath.replaceAll("\\", "/").toLowerCase();

  if (registeredBundlePaths.has(normalizedBundlePath)) {
    issues.push({
      path: `${artifactPath}.bundlePath`,
      message: `duplicate bundle path "${artifact.bundlePath}"`
    });
    return;
  }

  registeredBundlePaths.add(normalizedBundlePath);
}

function validateNonEmptyString(candidate, path, issues) {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    issues.push({ path, message: "value must be a non-empty string" });
  }
}

function validateHttpsUrl(candidate, path, issues, message = "URL must use HTTPS") {
  if (typeof candidate !== "string") {
    issues.push({ path, message });
    return;
  }

  try {
    const parsedUrl = new URL(candidate);
    if (parsedUrl.protocol !== "https:") {
      issues.push({ path, message });
    }
  } catch {
    issues.push({ path, message });
  }
}

function isSafeRelativePath(candidate) {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return false;
  }

  const normalizedPath = candidate.replaceAll("\\", "/");
  const segments = normalizedPath.split("/");

  return (
    !normalizedPath.startsWith("/") &&
    !normalizedPath.includes(":") &&
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
  );
}

function isRecord(candidate) {
  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
}
