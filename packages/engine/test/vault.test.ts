import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileVault, ingestInput, initVault, lintVault, queryVault } from "../src/index.js";

const tempDirs: string[] = [];

async function createTempWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "swarmvault-engine-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("swarmvault workflow", () => {
  it("initializes the workspace and installs agent instructions", async () => {
    const rootDir = await createTempWorkspace();
    await initVault(rootDir);

    await expect(fs.access(path.join(rootDir, "swarmvault.config.json"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(rootDir, "AGENTS.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(rootDir, "CLAUDE.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(rootDir, ".cursor", "rules", "swarmvault.mdc"))).resolves.toBeUndefined();
  });

  it("ingests, compiles, queries, and lints using the heuristic provider", async () => {
    const rootDir = await createTempWorkspace();
    await initVault(rootDir);
    const notePath = path.join(rootDir, "notes.md");
    await fs.writeFile(
      notePath,
      [
        "# Local-First SwarmVault",
        "",
        "SwarmVault keeps raw sources immutable while compiling a linked markdown wiki.",
        "The system does not rely on a hosted backend.",
        "Graph exports make provenance visible."
      ].join("\n"),
      "utf8"
    );

    const manifest = await ingestInput(rootDir, "notes.md");
    expect(manifest.sourceId).toContain("local-first-swarmvault");

    const compile = await compileVault(rootDir);
    expect(compile.pageCount).toBeGreaterThan(0);

    const query = await queryVault(rootDir, "What does SwarmVault optimize for?", true);
    expect(query.answer).toContain("Question:");
    expect(query.savedTo).toBeTruthy();

    const findings = await lintVault(rootDir);
    expect(findings.some((finding) => finding.code === "graph_missing")).toBe(false);
  });
});
