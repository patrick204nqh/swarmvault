import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FreshnessLevel } from "../types";

interface GraphArtifactLike {
  generatedAt?: string | number;
  meta?: { generatedAt?: string | number };
}

export interface FreshnessReading {
  level: FreshnessLevel;
  generatedAt: Date | null;
  ageMs: number | null;
}

const FRESH_THRESHOLD_MS = 60 * 60 * 1000;
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const OUTDATED_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export async function readFreshness(workspaceRoot: string, now: () => number = () => Date.now()): Promise<FreshnessReading> {
  const graphPath = join(workspaceRoot, "state", "graph.json");
  try {
    const contents = await readFile(graphPath, "utf8");
    const parsed = JSON.parse(contents) as GraphArtifactLike;
    const raw = parsed.meta?.generatedAt ?? parsed.generatedAt ?? null;
    const generatedAt = parseTimestamp(raw);
    if (!generatedAt) return { level: "unknown", generatedAt: null, ageMs: null };
    const ageMs = Math.max(0, now() - generatedAt.getTime());
    return { level: classifyAge(ageMs), generatedAt, ageMs };
  } catch {
    return { level: "unknown", generatedAt: null, ageMs: null };
  }
}

export function classifyAge(ageMs: number): FreshnessLevel {
  if (ageMs < FRESH_THRESHOLD_MS) return "fresh";
  if (ageMs < STALE_THRESHOLD_MS) return "stale";
  if (ageMs < OUTDATED_THRESHOLD_MS) return "stale";
  return "outdated";
}

function parseTimestamp(raw: string | number | null | undefined): Date | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
