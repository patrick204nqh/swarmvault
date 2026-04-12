import { readFileSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, "dist");
const watch = process.argv.includes("--watch");

mkdirSync(distDir, { recursive: true });

const banner = `/*
SwarmVault Obsidian plugin — generated bundle.
Source: https://github.com/swarmclawai/swarmvault
*/`;

const common = {
  entryPoints: [join(here, "src/main.ts")],
  bundle: true,
  format: "cjs",
  target: "es2022",
  platform: "node",
  banner: { js: banner },
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    "node:fs",
    "node:fs/promises",
    "node:path",
    "node:child_process",
    "node:os",
    "node:url",
  ],
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  outfile: join(distDir, "main.js"),
  logLevel: "info",
};

copyFileSync(join(here, "manifest.json"), join(distDir, "manifest.json"));
copyFileSync(join(here, "styles.css"), join(distDir, "styles.css"));

if (watch) {
  const ctx = await esbuild.context(common);
  await ctx.watch();
  console.log("esbuild: watching…");
} else {
  await esbuild.build(common);
  console.log("esbuild: built dist/main.js");
}
