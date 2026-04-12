import { CLI_PROBE_TIMEOUT_MS } from "../constants";
import type { CliVersionInfo } from "../types";
import { CliRunner } from "./run";

interface CliVersionJson {
  version?: string;
  swarmvault?: string;
}

export async function probeCliVersion(binary: string, runner: CliRunner = new CliRunner()): Promise<CliVersionInfo> {
  const result = await runner.invoke<CliVersionJson>(binary, {
    args: ["--version", "--json"],
    timeoutMs: CLI_PROBE_TIMEOUT_MS
  });
  const fromJson = result.json?.version ?? result.json?.swarmvault;
  const version = (fromJson ?? result.rawStdout.trim()).replace(/^v/, "");
  return { version, raw: result.rawStdout };
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function parseSemver(value: string): [number, number, number] {
  const match = value
    .trim()
    .replace(/^v/, "")
    .match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
