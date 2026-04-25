"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SearchResult {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  content: string;
  score: number;
  pageNumber?: number | null;
  kind?: string;
}

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), topK: 8, rerank: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || `Search failed (${res.status})`);
      setResults(json.results as SearchResult[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <form onSubmit={runSearch} className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Ask the knowledge base — e.g. "how to fix a late forehand"'
            className="h-10 flex-1 min-w-[260px] rounded-md border bg-background px-3 text-sm"
          />
          <Button type="submit" disabled={loading || query.trim().length < 2}>
            {loading ? "Searching…" : "🔎 Ask"}
          </Button>
          {results && (
            <button
              type="button"
              onClick={() => {
                setResults(null);
                setQuery("");
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </form>

        {error && (
          <p className="text-xs text-rose-600">{error}</p>
        )}

        {results && results.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground">
            No matches in the knowledge base. Try a different phrasing.
          </p>
        )}

        {results && results.length > 0 && (
          <ul className="space-y-3 pt-2">
            {results.map((r) => (
              <li key={r.chunkId} className="border-l-2 border-primary/40 pl-3">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground truncate">📚 {r.sourceTitle}</span>
                  {r.pageNumber != null && <span>p.{r.pageNumber}</span>}
                  {r.kind && <span className="capitalize">{r.kind}</span>}
                  <span>score {r.score.toFixed(3)}</span>
                </div>
                <p className="text-xs mt-1 line-clamp-5 whitespace-pre-wrap">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
