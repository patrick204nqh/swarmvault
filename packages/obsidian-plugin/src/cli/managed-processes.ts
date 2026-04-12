export interface ManagedProcessHandle {
  id: string;
  kind: "watch" | "serve" | "schedule-serve" | "mcp";
  label: string;
  abort: AbortController;
  startedAt: number;
}

type Listener = (snapshot: ReadonlyArray<ManagedProcessHandle>) => void;

export class ManagedProcesses {
  private readonly processes = new Map<string, ManagedProcessHandle>();
  private readonly listeners = new Set<Listener>();
  private counter = 0;

  start(kind: ManagedProcessHandle["kind"], label: string): ManagedProcessHandle {
    const existing = this.findByKindLabel(kind, label);
    if (existing) return existing;
    const id = `${kind}-${++this.counter}`;
    const handle: ManagedProcessHandle = {
      id,
      kind,
      label,
      abort: new AbortController(),
      startedAt: Date.now()
    };
    this.processes.set(id, handle);
    this.notify();
    return handle;
  }

  stop(id: string): boolean {
    const handle = this.processes.get(id);
    if (!handle) return false;
    handle.abort.abort();
    this.processes.delete(id);
    this.notify();
    return true;
  }

  stopByKind(kind: ManagedProcessHandle["kind"]): number {
    let count = 0;
    for (const handle of [...this.processes.values()]) {
      if (handle.kind === kind) {
        handle.abort.abort();
        this.processes.delete(handle.id);
        count += 1;
      }
    }
    if (count > 0) this.notify();
    return count;
  }

  stopAll(): void {
    for (const handle of this.processes.values()) {
      handle.abort.abort();
    }
    this.processes.clear();
    this.notify();
  }

  snapshot(): ReadonlyArray<ManagedProcessHandle> {
    return [...this.processes.values()];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private findByKindLabel(kind: ManagedProcessHandle["kind"], label: string): ManagedProcessHandle | null {
    for (const h of this.processes.values()) {
      if (h.kind === kind && h.label === label) return h;
    }
    return null;
  }

  private notify(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap);
  }
}
