import { describe, expect, it } from "vitest";
import { resolveWorkspaceRoot } from "../../src/workspace/resolve-root";

describe("resolveWorkspaceRoot", () => {
  it("returns the override when it contains the marker", () => {
    const existing = new Set(["/foo/bar/swarmvault.schema.md"]);
    const result = resolveWorkspaceRoot(undefined, {
      override: "/foo/bar",
      exists: (p) => existing.has(p)
    });
    expect(result).toEqual({ root: "/foo/bar", source: "override" });
  });

  it("returns not-found when override has no marker", () => {
    const result = resolveWorkspaceRoot(undefined, {
      override: "/foo/bar",
      exists: () => false
    });
    expect(result).toEqual({ root: null, source: "not-found" });
  });

  it("walks up from a descendant until marker is found", () => {
    const existing = new Set(["/project/swarmvault.schema.md"]);
    const result = resolveWorkspaceRoot("/project/wiki/concepts", {
      exists: (p) => existing.has(p),
      isDirectory: () => true
    });
    expect(result).toEqual({ root: "/project", source: "marker" });
  });

  it("returns not-found when walking hits the drive root", () => {
    const result = resolveWorkspaceRoot("/some/path/deep", {
      exists: () => false,
      isDirectory: () => true
    });
    expect(result).toEqual({ root: null, source: "not-found" });
  });

  it("respects maxDepth", () => {
    const existing = new Set(["/a/swarmvault.schema.md"]);
    const result = resolveWorkspaceRoot("/a/b/c/d/e/f/g/h/i/j/k", {
      exists: (p) => existing.has(p),
      isDirectory: () => true,
      maxDepth: 2
    });
    expect(result.root).toBeNull();
  });

  it("finds marker at the start directory", () => {
    const existing = new Set(["/proj/swarmvault.schema.md"]);
    const result = resolveWorkspaceRoot("/proj", {
      exists: (p) => existing.has(p),
      isDirectory: () => true
    });
    expect(result.root).toBe("/proj");
  });
});
