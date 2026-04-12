import { describe, expect, it } from "vitest";
import { rewriteCitations } from "../../src/citations/rewrite";
import type { PageIdIndex } from "../../src/workspace/page-id-index";

function makeIndex(entries: Array<{ pageId: string; path: string; title?: string }>): PageIdIndex {
  const byPageId = new Map(entries.map((e) => [e.pageId, { pageId: e.pageId, path: e.path, title: e.title ?? null }]));
  return { byPageId, size: byPageId.size };
}

describe("rewriteCitations", () => {
  it("rewrites page_id tokens to wikilinks with title labels", () => {
    const index = makeIndex([{ pageId: "abc123", path: "wiki/concepts/rag.md", title: "Retrieval-Augmented Generation" }]);
    const out = rewriteCitations("See [[page_id:abc123]] for details.", index);
    expect(out).toBe("See [[wiki/concepts/rag|Retrieval-Augmented Generation]] for details.");
  });

  it("preserves explicit alias when provided", () => {
    const index = makeIndex([{ pageId: "abc", path: "wiki/x.md", title: "X" }]);
    const out = rewriteCitations("[[page_id:abc|the X thing]]", index);
    expect(out).toBe("[[wiki/x|the X thing]]");
  });

  it("leaves unknown page ids untouched", () => {
    const index = makeIndex([{ pageId: "known", path: "wiki/k.md" }]);
    const out = rewriteCitations("[[page_id:known]] and [[page_id:unknown]]", index);
    expect(out).toBe("[[wiki/k|known]] and [[page_id:unknown]]");
  });

  it("returns the input unchanged when index is empty", () => {
    const index = makeIndex([]);
    const input = "[[page_id:any]] still present";
    expect(rewriteCitations(input, index)).toBe(input);
  });

  it("uses pageId as fallback label when title is missing", () => {
    const index = makeIndex([{ pageId: "xyz", path: "wiki/x.md" }]);
    expect(rewriteCitations("[[page_id:xyz]]", index)).toBe("[[wiki/x|xyz]]");
  });

  it("rewrites ids containing colons, slashes, and dots", () => {
    const index = makeIndex([
      { pageId: "concept:augmented", path: "candidates/concepts/augmented.md", title: "augmented" },
      { pageId: "source:arxiv/2401.00001", path: "wiki/sources/arxiv-2401-00001.md" }
    ]);
    const out = rewriteCitations("See [[page_id:concept:augmented]] and [[page_id:source:arxiv/2401.00001]].", index);
    expect(out).toBe("See [[candidates/concepts/augmented|augmented]] and [[wiki/sources/arxiv-2401-00001|source:arxiv/2401.00001]].");
  });
});
