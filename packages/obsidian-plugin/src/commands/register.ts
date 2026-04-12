import type SwarmVaultPlugin from "../main";
import { runAdd, runCompile, runIngest, runInit, runLint } from "./core";
import { runWatchOnce, showWatchStatus, startServe, startWatch, stopServe, stopWatch } from "./processes";
import { runAsk, runQueryFromNote } from "./query";

export function registerCommands(plugin: SwarmVaultPlugin): void {
  plugin.addCommand({
    id: "swarmvault-init",
    name: "Init workspace",
    callback: () => void runInit(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-ingest",
    name: "Ingest path or URL",
    callback: () => void runIngest(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-add",
    name: "Add URL",
    callback: () => void runAdd(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-compile",
    name: "Compile",
    callback: () => void runCompile(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-lint",
    name: "Lint",
    callback: () => void runLint(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-query-from-note",
    name: "Query from current note",
    callback: () => runQueryFromNote(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-ask",
    name: "Ask question",
    callback: () => runAsk(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-watch-start",
    name: "Watch: start",
    callback: () => void startWatch(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-watch-stop",
    name: "Watch: stop",
    callback: () => stopWatch(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-watch-once",
    name: "Watch: run once",
    callback: () => void runWatchOnce(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-watch-status",
    name: "Watch: status",
    callback: () => void showWatchStatus(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-serve-start",
    name: "Graph viewer: start server",
    callback: () => void startServe(plugin)
  });
  plugin.addCommand({
    id: "swarmvault-serve-stop",
    name: "Graph viewer: stop server",
    callback: () => stopServe(plugin)
  });
}
