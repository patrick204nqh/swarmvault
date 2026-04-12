import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface PageIdEntry {
  pageId: string;
  path: string;
  title: string | null;
}

export interface PageIdIndex {
  byPageId: ReadonlyMap<string, PageIdEntry>;
  size: number;
}

interface GraphArtifactShape {
  pages?: Array<{ pageId?: string; id?: string; path?: string; title?: string }>;
  nodes?: Array<{
    pageId?: string;
    id?: string;
    path?: string;
    label?: string;
    title?: string;
  }>;
}

export async function loadPageIdIndex(workspaceRoot: string): Promise<PageIdIndex> {
  const byPageId = new Map<string, PageIdEntry>();
  try {
    const contents = await readFile(join(workspaceRoot, "state", "graph.json"), "utf8");
    const parsed = JSON.parse(contents) as GraphArtifactShape;
    for (const page of parsed.pages ?? []) {
      const pageId = page.pageId ?? page.id;
      if (!pageId || !page.path) continue;
      byPageId.set(pageId, {
        pageId,
        path: page.path,
        title: page.title ?? null
      });
    }
    for (const node of parsed.nodes ?? []) {
      const pageId = node.pageId ?? node.id;
      if (!pageId || byPageId.has(pageId)) continue;
      if (!node.path) continue;
      byPageId.set(pageId, {
        pageId,
        path: node.path,
        title: node.title ?? node.label ?? null
      });
    }
  } catch {
    // Silent: an unindexed workspace just means no pageId rewriting — citations stay as-is.
  }
  return { byPageId, size: byPageId.size };
}
