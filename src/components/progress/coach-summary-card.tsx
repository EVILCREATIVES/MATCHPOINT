"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CoachSummaryCard() {
  const [summary, setSummary] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/summary", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || `Failed (${res.status})`);
      setSummary(json.summary as string);
      setGeneratedAt(json.generatedAt as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <span>🧠</span> AI Coach Summary
        </CardTitle>
        <Button size="sm" variant={summary ? "outline" : "default"} onClick={generate} disabled={loading}>
          {loading ? "Generating…" : summary ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {!summary && !error && !loading && (
          <p className="text-xs text-muted-foreground">
            Click “Generate” for a personalized analysis of your last 30 days of training,
            with actionable suggestions for this week.
          </p>
        )}
        {summary && (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {summary}
            </div>
            {generatedAt && (
              <p className="text-[11px] text-muted-foreground mt-3">
                Generated {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
