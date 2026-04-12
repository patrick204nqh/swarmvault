import type { FreshnessLevel } from "../types";

export interface StatusBarModel {
  workspaceRoot: string | null;
  cliVersion: string | null;
  cliMissing: boolean;
  freshness: FreshnessLevel;
  runningCount: number;
}

export interface StatusBarCallbacks {
  onWorkspaceClick?: () => void;
  onRunLogClick?: () => void;
}

export class StatusBar {
  private readonly root: HTMLElement;
  private workspaceEl!: HTMLElement;
  private freshnessEl!: HTMLElement;
  private freshnessDot!: HTMLElement;
  private runningEl!: HTMLElement;

  constructor(
    root: HTMLElement,
    private readonly callbacks: StatusBarCallbacks = {}
  ) {
    this.root = root;
    this.root.empty();
    this.root.addClass("swarmvault-status-bar");
    this.build();
  }

  update(model: StatusBarModel): void {
    this.updateWorkspace(model);
    this.updateFreshness(model.freshness);
    this.updateRunning(model.runningCount);
  }

  private build(): void {
    this.workspaceEl = this.root.createSpan({ cls: "swarmvault-status-bar__workspace" });
    this.workspaceEl.onClickEvent?.(() => this.callbacks.onWorkspaceClick?.());
    this.workspaceEl.setAttr("aria-label", "SwarmVault workspace");

    this.freshnessEl = this.root.createSpan({ cls: "swarmvault-status-bar__freshness" });
    this.freshnessDot = this.freshnessEl.createSpan({
      cls: "swarmvault-status-bar__dot swarmvault-status-bar__dot--unknown"
    });

    this.runningEl = this.root.createSpan({ cls: "swarmvault-status-bar__running" });
    this.runningEl.onClickEvent?.(() => this.callbacks.onRunLogClick?.());
  }

  private updateWorkspace(model: StatusBarModel): void {
    this.workspaceEl.empty();
    if (model.cliMissing) {
      this.workspaceEl.setText("SV: CLI missing");
      return;
    }
    if (!model.workspaceRoot) {
      this.workspaceEl.setText(model.cliVersion ? `SV ${model.cliVersion} · no workspace` : "SV: probing");
      return;
    }
    const label = compactPath(model.workspaceRoot);
    const version = model.cliVersion ? ` ${model.cliVersion}` : "";
    this.workspaceEl.setText(`SV${version} · ${label}`);
  }

  private updateFreshness(level: FreshnessLevel): void {
    const classes = ["swarmvault-status-bar__dot", `swarmvault-status-bar__dot--${level}`];
    this.freshnessDot.className = classes.join(" ");
    this.freshnessEl.setAttr("aria-label", `Compile freshness: ${level}`);
  }

  private updateRunning(count: number): void {
    this.runningEl.empty();
    if (count > 0) {
      this.runningEl.setText(` · ${count} running`);
    }
  }
}

function compactPath(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  if (segments.length <= 2) return path;
  return `…/${segments[segments.length - 2]}/${segments[segments.length - 1]}`;
}
