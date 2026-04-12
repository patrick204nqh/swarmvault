import type { CliOutputMode } from "../types";

export interface SwarmVaultSettings {
  cliBinary: string;
  workspaceRootOverride: string;
  defaultQueryOutputMode: CliOutputMode;
  autoCompileOnRawChange: boolean;
  deepLintOnSave: boolean;
  pollIntervalSeconds: number;
  extraArgs: string;
}

export const DEFAULT_SETTINGS: SwarmVaultSettings = {
  cliBinary: "",
  workspaceRootOverride: "",
  defaultQueryOutputMode: "append-note",
  autoCompileOnRawChange: false,
  deepLintOnSave: false,
  pollIntervalSeconds: 0,
  extraArgs: ""
};

export function mergeSettings(partial: Partial<SwarmVaultSettings> | null | undefined): SwarmVaultSettings {
  return { ...DEFAULT_SETTINGS, ...(partial ?? {}) };
}
