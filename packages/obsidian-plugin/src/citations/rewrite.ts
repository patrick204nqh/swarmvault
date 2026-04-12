import type { PageIdIndex } from "../workspace/page-id-index";

const PAGE_ID_TOKEN = /\[\[page_id:([A-Za-z0-9_:\-/.]+?)(?:\|([^\]]+))?\]\]/g;

export function rewriteCitations(markdown: string, index: PageIdIndex): string {
  if (index.size === 0) return markdown;
  return markdown.replace(PAGE_ID_TOKEN, (match, pageId: string, alias: string | undefined) => {
    const entry = index.byPageId.get(pageId);
    if (!entry) return match;
    const target = stripMdExtension(entry.path);
    const label = alias?.trim() || entry.title || pageId;
    return `[[${target}|${label}]]`;
  });
}

function stripMdExtension(path: string): string {
  return path.replace(/\.md$/i, "");
}
