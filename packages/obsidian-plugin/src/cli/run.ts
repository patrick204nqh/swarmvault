import { type ChildProcess, type SpawnOptions, spawn } from "node:child_process";
import { CLI_KILL_GRACE_MS, DEFAULT_CLI_BINARY } from "../constants";
import { CliInvocationError, type CliInvocationOptions, type CliInvocationResult, CliNotFoundError } from "../types";
import { isEnoent, isWindows, withCmdSuffix } from "./windows-shim";

type SpawnFn = typeof spawn;

export interface CliRunnerDeps {
  spawn?: SpawnFn;
  now?: () => number;
}

export class CliRunner {
  private readonly spawn: SpawnFn;
  private readonly now: () => number;

  constructor(deps: CliRunnerDeps = {}) {
    this.spawn = deps.spawn ?? spawn;
    this.now = deps.now ?? (() => Date.now());
  }

  async invoke<T = unknown>(binary: string, options: CliInvocationOptions): Promise<CliInvocationResult<T>> {
    const resolved = binary || DEFAULT_CLI_BINARY;
    try {
      return await this.invokeWithPath<T>(resolved, options);
    } catch (err) {
      if (isEnoent(err) && isWindows()) {
        const withSuffix = withCmdSuffix(resolved);
        if (withSuffix !== resolved) {
          try {
            return await this.invokeWithPath<T>(withSuffix, options);
          } catch (retryErr) {
            if (isEnoent(retryErr)) {
              throw new CliNotFoundError(resolved, retryErr);
            }
            throw retryErr;
          }
        }
      }
      if (isEnoent(err)) {
        throw new CliNotFoundError(resolved, err);
      }
      throw err;
    }
  }

  private invokeWithPath<T>(binary: string, options: CliInvocationOptions): Promise<CliInvocationResult<T>> {
    return new Promise((resolve, reject) => {
      const start = this.now();
      const spawnOptions: SpawnOptions = {
        cwd: options.cwd,
        env: options.env ?? process.env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      };

      let child: ChildProcess;
      try {
        child = this.spawn(binary, options.args as string[], spawnOptions);
      } catch (err) {
        reject(err);
        return;
      }

      child.once("error", reject);

      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];
      const stdoutLines = new LineSplitter((line) => {
        options.onStdoutLine?.(line);
      });
      const stderrLines = new LineSplitter((line) => {
        options.onStderrLine?.(line);
      });

      child.stdout?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => {
        stdoutChunks.push(chunk);
        stdoutLines.push(chunk);
      });
      child.stderr?.setEncoding("utf8");
      child.stderr?.on("data", (chunk: string) => {
        stderrChunks.push(chunk);
        stderrLines.push(chunk);
      });

      const cleanup: Array<() => void> = [];

      if (options.timeoutMs !== undefined) {
        const t = setTimeout(() => killChild(child, "timeout"), options.timeoutMs);
        cleanup.push(() => clearTimeout(t));
      }

      if (options.signal) {
        const onAbort = () => killChild(child, "aborted");
        options.signal.addEventListener("abort", onAbort, { once: true });
        cleanup.push(() => options.signal?.removeEventListener("abort", onAbort));
      }

      child.once("close", (exitCode) => {
        for (const fn of cleanup) fn();
        stdoutLines.flush();
        stderrLines.flush();

        const rawStdout = stdoutChunks.join("");
        const rawStderr = stderrChunks.join("");
        const durationMs = this.now() - start;
        const code = typeof exitCode === "number" ? exitCode : -1;
        const json = tryParseJson<T>(rawStdout);

        if (code !== 0) {
          reject(
            new CliInvocationError({
              message: `swarmvault exited with code ${code}`,
              exitCode: code,
              rawStdout,
              rawStderr
            })
          );
          return;
        }

        resolve({ exitCode: code, json, rawStdout, rawStderr, durationMs });
      });
    });
  }
}

function killChild(child: ChildProcess, reason: string): void {
  if (child.killed || child.exitCode !== null) return;
  child.kill("SIGTERM");
  const fallback = setTimeout(() => {
    if (!child.killed && child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }, CLI_KILL_GRACE_MS);
  fallback.unref?.();
  child.once("close", () => clearTimeout(fallback));
  void reason;
}

function tryParseJson<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const lastLine = trimmed.split(/\r?\n/).filter(Boolean).pop();
    if (!lastLine) return null;
    try {
      return JSON.parse(lastLine) as T;
    } catch {
      return null;
    }
  }
}

class LineSplitter {
  private buffer = "";
  constructor(private readonly onLine: (line: string) => void) {}

  push(chunk: string): void {
    this.buffer += chunk;
    for (;;) {
      const newlineIndex = this.buffer.indexOf("\n");
      if (newlineIndex < 0) break;
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newlineIndex + 1);
      this.onLine(line);
    }
  }

  flush(): void {
    if (this.buffer.length > 0) {
      this.onLine(this.buffer.replace(/\r$/, ""));
      this.buffer = "";
    }
  }
}
