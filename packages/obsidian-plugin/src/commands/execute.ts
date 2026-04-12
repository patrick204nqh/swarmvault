import { Notice } from "obsidian";
import type SwarmVaultPlugin from "../main";
import { CliInvocationError, CliNotFoundError } from "../types";
import type { RunLogEntry } from "../views/RunLogView";

export interface ExecuteOptions {
  args: readonly string[];
  cwd?: string;
  commandLabel: string;
  notifyOnSuccess?: (json: unknown, rawStdout: string) => string | null;
  notifyOnError?: (err: unknown) => string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ExecuteResult<T = unknown> {
  json: T | null;
  rawStdout: string;
  rawStderr: string;
  exitCode: number;
}

let runCounter = 0;

export async function executeCli<T = unknown>(plugin: SwarmVaultPlugin, options: ExecuteOptions): Promise<ExecuteResult<T>> {
  const runLog = await plugin.ensureRunLog();
  const id = `run-${++runCounter}`;
  const controller = new AbortController();
  const linkedSignal = options.signal ?? controller.signal;
  const entry: RunLogEntry = {
    id,
    command: "swarmvault",
    args: options.args,
    startedAt: Date.now(),
    status: "running",
    exitCode: null,
    durationMs: null,
    stderr: [],
    stdout: [],
    cancel: () => controller.abort()
  };
  runLog.recordEntry(entry);
  plugin.statusBarTickRunning(1);

  try {
    const result = await plugin.cliRunner.invoke<T>(plugin.settings.cliBinary, {
      args: options.args,
      cwd: options.cwd ?? plugin.workspaceRoot ?? undefined,
      timeoutMs: options.timeoutMs,
      signal: linkedSignal,
      onStdoutLine: (line) => runLog.appendStdout(id, line),
      onStderrLine: (line) => runLog.appendStderr(id, line)
    });

    runLog.finishEntry(id, {
      status: "succeeded",
      exitCode: result.exitCode,
      durationMs: result.durationMs
    });

    const message = options.notifyOnSuccess?.(result.json, result.rawStdout);
    if (message) new Notice(message, 4500);

    return { json: result.json, rawStdout: result.rawStdout, rawStderr: result.rawStderr, exitCode: result.exitCode };
  } catch (err) {
    let exitCode: number | null = null;
    if (err instanceof CliInvocationError) {
      exitCode = err.exitCode;
      runLog.appendStderr(id, err.rawStderr);
    }
    runLog.finishEntry(id, {
      status: exitCode === null ? "failed" : "failed",
      exitCode,
      durationMs: Date.now() - entry.startedAt
    });
    const msg = options.notifyOnError
      ? options.notifyOnError(err)
      : err instanceof CliNotFoundError
        ? "SwarmVault CLI not found. Install with `npm i -g @swarmvaultai/cli`."
        : err instanceof Error
          ? err.message
          : String(err);
    new Notice(`${options.commandLabel}: ${msg}`, 7000);
    throw err;
  } finally {
    plugin.statusBarTickRunning(-1);
  }
}
