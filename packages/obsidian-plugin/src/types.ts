export type CliOutputMode = "inline-replace" | "append-note" | "wiki-outputs" | "ephemeral-pane";

export type FreshnessLevel = "fresh" | "stale" | "outdated" | "unknown";

export interface CliVersionInfo {
  version: string;
  raw: string;
}

export interface CliInvocationResult<T = unknown> {
  exitCode: number;
  json: T | null;
  rawStdout: string;
  rawStderr: string;
  durationMs: number;
}

export interface CliInvocationOptions {
  args: readonly string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
  onStdoutLine?: (line: string) => void;
  onStderrLine?: (line: string) => void;
}

export class CliInvocationError extends Error {
  readonly exitCode: number;
  readonly rawStdout: string;
  readonly rawStderr: string;

  constructor(params: { message: string; exitCode: number; rawStdout: string; rawStderr: string }) {
    super(params.message);
    this.name = "CliInvocationError";
    this.exitCode = params.exitCode;
    this.rawStdout = params.rawStdout;
    this.rawStderr = params.rawStderr;
  }
}

export class CliNotFoundError extends Error {
  readonly attemptedPath: string;

  constructor(attemptedPath: string, cause?: unknown) {
    super(`SwarmVault CLI not found: ${attemptedPath}`);
    this.name = "CliNotFoundError";
    this.attemptedPath = attemptedPath;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
