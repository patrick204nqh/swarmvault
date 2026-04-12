# Changelog

## 0.7.28 — initial scaffold

- Package scaffolded with esbuild build, vitest test harness, manifest pinned to monorepo version.
- `SwarmVaultPlugin` loads and unloads cleanly; status bar indicator; settings tab with CLI path and Verify CLI button.
- Child-process wrapper (`src/cli/run.ts`) with `execFile`-based invocation, JSON parsing, async-iterable stdout/stderr streaming, cancellation, and Windows `.cmd` fallback.
- Release-sync check extended to pin plugin `package.json`, `manifest.json`, and `swarmvaultCliMinVersion` to the monorepo root version.
