#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractMatch(content, regex, label) {
  const match = content.match(regex);
  assertCondition(match?.[1], `Could not read ${label}`);
  return match[1];
}

const rootPackageJson = JSON.parse(await fs.readFile(path.join(repoRoot, "package.json"), "utf8"));
const cliPackageJson = JSON.parse(await fs.readFile(path.join(repoRoot, "packages", "cli", "package.json"), "utf8"));
const enginePackageJson = JSON.parse(await fs.readFile(path.join(repoRoot, "packages", "engine", "package.json"), "utf8"));
const viewerPackageJson = JSON.parse(await fs.readFile(path.join(repoRoot, "packages", "viewer", "package.json"), "utf8"));
const obsidianPluginPackageJson = JSON.parse(
  await fs.readFile(path.join(repoRoot, "packages", "obsidian-plugin", "package.json"), "utf8")
);
const obsidianPluginManifest = JSON.parse(
  await fs.readFile(path.join(repoRoot, "packages", "obsidian-plugin", "manifest.json"), "utf8")
);
const skillContent = await fs.readFile(path.join(repoRoot, "skills", "swarmvault", "SKILL.md"), "utf8");
const cliSource = await fs.readFile(path.join(repoRoot, "packages", "cli", "src", "index.ts"), "utf8");
const mcpSource = await fs.readFile(path.join(repoRoot, "packages", "engine", "src", "mcp.ts"), "utf8");

const rootVersion = rootPackageJson.version;
const skillVersion = extractMatch(skillContent, /^version:\s*"([^"]+)"$/m, "skill version from skills/swarmvault/SKILL.md");
const cliFallbackVersions = [...cliSource.matchAll(/return\s+"([^"]+)";/g)].map((match) => match[1]);
const mcpServerVersion = extractMatch(mcpSource, /const SERVER_VERSION = "([^"]+)";/, "MCP server version from packages/engine/src/mcp.ts");

assertCondition(cliPackageJson.version === rootVersion, "CLI package version is out of sync with root package version");
assertCondition(enginePackageJson.version === rootVersion, "Engine package version is out of sync with root package version");
assertCondition(viewerPackageJson.version === rootVersion, "Viewer package version is out of sync with root package version");
assertCondition(skillVersion === rootVersion, `Skill version ${skillVersion} does not match root package version ${rootVersion}`);
assertCondition(
  cliPackageJson.dependencies?.["@swarmvaultai/engine"] === rootVersion,
  `CLI runtime dependency on @swarmvaultai/engine must match ${rootVersion}`
);
assertCondition(
  cliFallbackVersions.every((version) => version === rootVersion),
  `CLI fallback version surfaces ${JSON.stringify(cliFallbackVersions)} do not all match ${rootVersion}`
);
assertCondition(mcpServerVersion === rootVersion, `MCP server version ${mcpServerVersion} does not match root package version ${rootVersion}`);
assertCondition(
  obsidianPluginPackageJson.version === rootVersion,
  `Obsidian plugin package.json version ${obsidianPluginPackageJson.version} does not match root package version ${rootVersion}`
);
assertCondition(
  obsidianPluginManifest.version === rootVersion,
  `Obsidian plugin manifest.json version ${obsidianPluginManifest.version} does not match root package version ${rootVersion}`
);
assertCondition(
  typeof obsidianPluginManifest.swarmvaultCliMinVersion === "string" &&
    obsidianPluginManifest.swarmvaultCliMinVersion.length > 0,
  "Obsidian plugin manifest.json must declare swarmvaultCliMinVersion"
);
assertCondition(
  compareSemver(obsidianPluginManifest.swarmvaultCliMinVersion, rootVersion) <= 0,
  `Obsidian plugin swarmvaultCliMinVersion ${obsidianPluginManifest.swarmvaultCliMinVersion} must be <= root version ${rootVersion}`
);

console.log(`Release sync check passed for version ${rootVersion}.`);

function compareSemver(a, b) {
  const parse = (v) => {
    const match = String(v).trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
