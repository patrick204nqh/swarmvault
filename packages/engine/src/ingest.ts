import fs from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";
import { Readability } from "@mozilla/readability";
import mime from "mime-types";
import { initWorkspace, loadVaultConfig } from "./config.js";
import type { SourceManifest } from "./types.js";
import { appendLogEntry } from "./logs.js";
import { ensureDir, fileExists, readJsonFile, sha256, slugify, toPosix, writeJsonFile } from "./utils.js";

function inferKind(mimeType: string, filePath: string): SourceManifest["sourceKind"] {
  if (mimeType.includes("markdown")) {
    return "markdown";
  }
  if (mimeType.startsWith("text/")) {
    return "text";
  }
  if (mimeType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
    return "pdf";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.includes("html")) {
    return "html";
  }
  return "binary";
}

function titleFromText(fallback: string, content: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function guessMimeType(target: string): string {
  return mime.lookup(target) || "application/octet-stream";
}

async function convertHtmlToMarkdown(html: string, url: string): Promise<{ markdown: string; title: string }> {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  const body = article?.content ?? dom.window.document.body.innerHTML;
  const markdown = turndown.turndown(body);
  return {
    markdown,
    title: article?.title?.trim() || new URL(url).hostname
  };
}

async function readManifestByHash(manifestsDir: string, contentHash: string): Promise<SourceManifest | null> {
  const entries = await fs.readdir(manifestsDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const manifest = await readJsonFile<SourceManifest>(path.join(manifestsDir, entry.name));
    if (manifest?.contentHash === contentHash) {
      return manifest;
    }
  }
  return null;
}

export async function ingestInput(rootDir: string, input: string): Promise<SourceManifest> {
  const { paths } = await initWorkspace(rootDir);
  await ensureDir(path.join(paths.rawDir, "sources"));
  await ensureDir(paths.manifestsDir);
  await ensureDir(paths.extractsDir);

  const isUrl = /^https?:\/\//i.test(input);
  const now = new Date().toISOString();

  let title = path.basename(input);
  let mimeType = "application/octet-stream";
  let storedExtension = ".bin";
  let payloadBytes: Buffer;
  let extractedTextPath: string | undefined;
  let sourceKind: SourceManifest["sourceKind"] = "binary";

  if (isUrl) {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${input}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    payloadBytes = Buffer.from(arrayBuffer);
    mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || guessMimeType(input);
    sourceKind = inferKind(mimeType, input);

    if (sourceKind === "html" || mimeType.startsWith("text/html")) {
      const html = payloadBytes.toString("utf8");
      const converted = await convertHtmlToMarkdown(html, input);
      title = converted.title;
      payloadBytes = Buffer.from(converted.markdown, "utf8");
      mimeType = "text/markdown";
      sourceKind = "markdown";
      storedExtension = ".md";
    } else {
      title = new URL(input).hostname + new URL(input).pathname;
      const extension = path.extname(new URL(input).pathname) || (mime.extension(mimeType) ? `.${mime.extension(mimeType)}` : ".bin");
      storedExtension = extension;
    }
  } else {
    const absoluteInput = path.resolve(rootDir, input);
    payloadBytes = await fs.readFile(absoluteInput);
    mimeType = guessMimeType(absoluteInput);
    sourceKind = inferKind(mimeType, absoluteInput);
    storedExtension = path.extname(absoluteInput) || `.${mime.extension(mimeType) || "bin"}`;
    if (sourceKind === "markdown" || sourceKind === "text") {
      title = titleFromText(path.basename(absoluteInput, path.extname(absoluteInput)), payloadBytes.toString("utf8"));
    } else {
      title = path.basename(absoluteInput, path.extname(absoluteInput));
    }
  }

  const contentHash = sha256(payloadBytes);
  const existing = await readManifestByHash(paths.manifestsDir, contentHash);
  if (existing) {
    return existing;
  }

  const sourceId = `${slugify(title)}-${contentHash.slice(0, 8)}`;
  const storedPath = path.join(paths.rawDir, "sources", `${sourceId}${storedExtension}`);
  await fs.writeFile(storedPath, payloadBytes);

  if (sourceKind === "markdown" || sourceKind === "text") {
    extractedTextPath = path.join(paths.extractsDir, `${sourceId}.md`);
    await fs.writeFile(extractedTextPath, payloadBytes.toString("utf8"), "utf8");
  }

  const manifest: SourceManifest = {
    sourceId,
    title,
    originType: isUrl ? "url" : "file",
    sourceKind,
    originalPath: isUrl ? undefined : toPosix(path.resolve(rootDir, input)),
    url: isUrl ? input : undefined,
    storedPath: toPosix(path.relative(rootDir, storedPath)),
    extractedTextPath: extractedTextPath ? toPosix(path.relative(rootDir, extractedTextPath)) : undefined,
    mimeType,
    contentHash,
    createdAt: now,
    updatedAt: now
  };

  await writeJsonFile(path.join(paths.manifestsDir, `${sourceId}.json`), manifest);
  await appendLogEntry(rootDir, "ingest", title, [`source_id=${sourceId}`, `kind=${sourceKind}`]);
  return manifest;
}

export async function listManifests(rootDir: string): Promise<SourceManifest[]> {
  const { paths } = await loadVaultConfig(rootDir);
  if (!(await fileExists(paths.manifestsDir))) {
    return [];
  }
  const entries = await fs.readdir(paths.manifestsDir);
  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => readJsonFile<SourceManifest>(path.join(paths.manifestsDir, entry)))
  );

  return manifests.filter((manifest): manifest is SourceManifest => Boolean(manifest));
}

export async function readExtractedText(rootDir: string, manifest: SourceManifest): Promise<string | undefined> {
  if (!manifest.extractedTextPath) {
    return undefined;
  }
  const absolutePath = path.resolve(rootDir, manifest.extractedTextPath);
  if (!(await fileExists(absolutePath))) {
    return undefined;
  }
  return fs.readFile(absolutePath, "utf8");
}
