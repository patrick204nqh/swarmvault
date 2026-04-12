# SwarmVault for Obsidian

Drive your SwarmVault workspace from inside Obsidian — ingest, compile, query, lint, candidates, approvals, graph — without leaving the editor.

## Requirements

- Obsidian 1.5.0+ (desktop; the plugin is desktop-only because it shells out to the CLI).
- `@swarmvaultai/cli` installed globally and on `PATH`:
  ```sh
  npm i -g @swarmvaultai/cli
  ```
- A SwarmVault workspace (any folder that contains `swarmvault.schema.md` at its root). Open that folder as an Obsidian vault, or open a descendant folder — the plugin walks up to find the workspace root.

## Install

Until the plugin lands in the Obsidian community registry, install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) or drop the release assets (`manifest.json`, `main.js`, `styles.css`) into `<vault>/.obsidian/plugins/swarmvault/`.

## Configure

Open `Settings → Community plugins → SwarmVault`:
- **CLI binary path** — leave blank to use `swarmvault` from PATH, or point at a specific binary.
- **Verify CLI** — runs `swarmvault --version --json` and confirms the version matches the plugin's minimum.
- **Workspace root** — leave blank to auto-detect, or override.
- **Default query output mode** — where answers from `Query from current note` land by default.

## Commands

Full list in the command palette under `SwarmVault:`. Highlights:
- `SwarmVault: Compile` — runs `swarmvault compile`.
- `SwarmVault: Query from current note` — runs a query using the active note's selection/title, streams the answer back into your note.
- `SwarmVault: Open graph pane` — embeds the live graph viewer.
- `SwarmVault: Candidates` / `Approvals` — review pending wiki changes.

## Development

```sh
pnpm install
pnpm --filter @swarmvaultai/obsidian-plugin build
```

The build emits `dist/main.js`, `dist/manifest.json`, `dist/styles.css`. Copy these into a test vault's plugin directory or use `pnpm --filter @swarmvaultai/obsidian-plugin dev` for a watch build.
