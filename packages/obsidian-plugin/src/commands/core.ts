import { Notice } from "obsidian";
import type SwarmVaultPlugin from "../main";
import { SimpleInputModal } from "../modals/SimpleInputModal";
import { executeCli } from "./execute";

export async function runInit(plugin: SwarmVaultPlugin): Promise<void> {
  const result = await executeCli<{ status?: string; rootDir?: string }>(plugin, {
    args: ["init", "--json"],
    commandLabel: "SwarmVault: Init",
    notifyOnSuccess: (json) => {
      const r = json as { status?: string; rootDir?: string } | null;
      return `Initialized SwarmVault workspace${r?.rootDir ? ` at ${r.rootDir}` : ""}.`;
    }
  });
  if (result.json) {
    await plugin.refreshWorkspace();
  }
}

export async function runIngest(plugin: SwarmVaultPlugin): Promise<void> {
  const initial = inferIngestTarget(plugin);
  new SimpleInputModal(plugin.app, {
    title: "SwarmVault: Ingest",
    description: "Path or URL to ingest into raw/.",
    placeholder: "/abs/path or https://…",
    initialValue: initial,
    submitLabel: "Ingest",
    onSubmit: async (value) => {
      await executeCli(plugin, {
        args: ["ingest", value, "--json"],
        commandLabel: "SwarmVault: Ingest",
        notifyOnSuccess: () => `Ingested ${value}`
      }).catch(() => undefined);
    }
  }).open();
}

export async function runAdd(plugin: SwarmVaultPlugin): Promise<void> {
  new SimpleInputModal(plugin.app, {
    title: "SwarmVault: Add",
    description: "Supported URL or arXiv id to capture before ingest.",
    placeholder: "https://arxiv.org/abs/… or 2401.12345",
    submitLabel: "Add",
    onSubmit: async (value) => {
      await executeCli(plugin, {
        args: ["add", value, "--json"],
        commandLabel: "SwarmVault: Add",
        notifyOnSuccess: () => `Added ${value}`
      }).catch(() => undefined);
    }
  }).open();
}

export async function runCompile(plugin: SwarmVaultPlugin): Promise<void> {
  await executeCli<{ sourceCount?: number; pageCount?: number; changedPages?: unknown[] }>(plugin, {
    args: ["compile", "--json"],
    commandLabel: "SwarmVault: Compile",
    notifyOnSuccess: (json) => {
      const r = json as { sourceCount?: number; pageCount?: number; changedPages?: unknown[] } | null;
      if (!r) return "Compile complete.";
      return `Compiled ${r.sourceCount ?? "?"} sources, ${r.pageCount ?? "?"} pages (${r.changedPages?.length ?? 0} changed).`;
    }
  })
    .catch(() => undefined)
    .finally(() => {
      void plugin.refreshFreshness();
    });
}

export async function runLint(plugin: SwarmVaultPlugin): Promise<void> {
  const result = await executeCli<Array<{ severity: string; code: string; message: string; pagePath?: string }>>(plugin, {
    args: ["lint", "--json"],
    commandLabel: "SwarmVault: Lint",
    notifyOnSuccess: (json) => {
      const findings = (json as unknown[]) ?? [];
      return findings.length === 0 ? "Lint: no findings." : `Lint: ${findings.length} finding(s).`;
    }
  }).catch(() => null);
  if (!result?.json) return;
  const findings = result.json as Array<{ severity: string; code: string; message: string; pagePath?: string }>;
  if (findings.length === 0) return;
  const preview = findings
    .slice(0, 5)
    .map((f) => `[${f.severity}] ${f.code}: ${f.message}${f.pagePath ? ` (${f.pagePath})` : ""}`)
    .join("\n");
  new Notice(preview, 10_000);
}

function inferIngestTarget(plugin: SwarmVaultPlugin): string {
  const active = plugin.app.workspace.getActiveFile();
  if (active && plugin.workspaceRoot) {
    const abs = `${plugin.workspaceRoot}/${active.path}`;
    if (abs.includes("/raw/")) return abs;
  }
  return "";
}
