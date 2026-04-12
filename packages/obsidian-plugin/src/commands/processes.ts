import { Notice } from "obsidian";
import type { ManagedProcessHandle } from "../cli/managed-processes";
import type SwarmVaultPlugin from "../main";
import { CliInvocationError, CliNotFoundError } from "../types";

export async function startWatch(plugin: SwarmVaultPlugin): Promise<void> {
  await spawnManaged(plugin, {
    kind: "watch",
    label: "swarmvault watch",
    args: ["watch", "--json"]
  });
}

export async function runWatchOnce(plugin: SwarmVaultPlugin): Promise<void> {
  const { executeCli } = await import("./execute");
  await executeCli(plugin, {
    args: ["watch", "--once", "--json"],
    commandLabel: "SwarmVault: Watch once",
    notifyOnSuccess: () => "Watch cycle complete."
  }).catch(() => undefined);
}

export async function showWatchStatus(plugin: SwarmVaultPlugin): Promise<void> {
  const { executeCli } = await import("./execute");
  const res = await executeCli<{
    watchedRepoRoots?: unknown[];
    pendingSemanticRefresh?: unknown[];
  }>(plugin, {
    args: ["watch-status", "--json"],
    commandLabel: "SwarmVault: Watch status"
  }).catch(() => null);
  if (!res?.json) return;
  const roots = res.json.watchedRepoRoots?.length ?? 0;
  const pending = res.json.pendingSemanticRefresh?.length ?? 0;
  new Notice(`Watched repos: ${roots} · pending semantic refresh: ${pending}`);
}

export function stopWatch(plugin: SwarmVaultPlugin): void {
  const stopped = plugin.managedProcesses.stopByKind("watch");
  if (stopped > 0) new Notice(`Stopped ${stopped} watch process(es).`);
}

export async function startServe(plugin: SwarmVaultPlugin): Promise<void> {
  const url = await spawnManaged(plugin, {
    kind: "serve",
    label: "swarmvault graph serve",
    args: ["graph", "serve", "--json"],
    awaitInitialJson: true
  });
  if (url && typeof (url as { url?: string }).url === "string") {
    new Notice(`Graph viewer running at ${(url as { url: string }).url}`);
  }
}

export function stopServe(plugin: SwarmVaultPlugin): void {
  const stopped = plugin.managedProcesses.stopByKind("serve");
  if (stopped > 0) new Notice("Graph viewer stopped.");
}

interface SpawnManagedOptions {
  kind: ManagedProcessHandle["kind"];
  label: string;
  args: readonly string[];
  awaitInitialJson?: boolean;
}

async function spawnManaged(plugin: SwarmVaultPlugin, opts: SpawnManagedOptions): Promise<unknown | null> {
  const existing = plugin.managedProcesses.snapshot().find((h) => h.kind === opts.kind);
  if (existing) {
    new Notice(`${opts.label} is already running.`);
    return null;
  }
  const handle = plugin.managedProcesses.start(opts.kind, opts.label);
  const runLog = await plugin.ensureRunLog();
  const entryId = `managed-${handle.id}`;
  runLog.recordEntry({
    id: entryId,
    command: "swarmvault",
    args: opts.args,
    startedAt: Date.now(),
    status: "running",
    exitCode: null,
    durationMs: null,
    stderr: [],
    stdout: [],
    cancel: () => plugin.managedProcesses.stop(handle.id)
  });
  plugin.statusBarTickRunning(1);

  let firstJsonResolve: ((value: unknown) => void) | null = null;
  const firstJsonPromise = opts.awaitInitialJson
    ? new Promise<unknown>((resolve) => {
        firstJsonResolve = resolve;
      })
    : null;

  const invocation = plugin.cliRunner
    .invoke(plugin.settings.cliBinary, {
      args: opts.args,
      cwd: plugin.workspaceRoot ?? undefined,
      signal: handle.abort.signal,
      onStdoutLine: (line) => {
        runLog.appendStdout(entryId, line);
        if (firstJsonResolve) {
          try {
            const parsed = JSON.parse(line);
            firstJsonResolve(parsed);
            firstJsonResolve = null;
          } catch {
            // Not JSON yet — keep waiting.
          }
        }
      },
      onStderrLine: (line) => runLog.appendStderr(entryId, line)
    })
    .catch((err: unknown) => {
      const msg =
        err instanceof CliNotFoundError
          ? "CLI not found."
          : err instanceof CliInvocationError
            ? `exit ${err.exitCode}`
            : err instanceof Error
              ? err.message
              : String(err);
      new Notice(`${opts.label}: ${msg}`);
      return null;
    })
    .finally(() => {
      plugin.managedProcesses.stop(handle.id);
      plugin.statusBarTickRunning(-1);
      runLog.finishEntry(entryId, {
        status: "succeeded",
        durationMs: Date.now() - handle.startedAt
      });
    });

  if (firstJsonPromise) {
    const url = await Promise.race([firstJsonPromise, new Promise((resolve) => setTimeout(() => resolve(null), 10_000))]);
    return url;
  }
  void invocation;
  return null;
}
