"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fullRegionName, type BodyLayer } from "@/lib/doc-checkin/regions";
import type { SelectedRegion } from "./anatomy/body-model";
import { ANATOMY_ATTRIBUTION } from "./anatomy/asset-manifest";
import { AdviceView, type BodyAdvice } from "./advice-view";

const BodyCanvas = dynamic(() => import("./anatomy/body-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading 3D model…
    </div>
  ),
});

export interface CheckinHistoryItem {
  id: string;
  regionLabel: string;
  painLevel: number;
  painType: string | null;
  createdAt: string;
  advice: BodyAdvice;
}

interface DocCheckInClientProps {
  defaultGender: "male" | "female";
  history: CheckinHistoryItem[];
}

const PAIN_TYPES = ["ache", "sharp", "stiff", "burning", "tingling", "swelling"];

export function DocCheckInClient({ defaultGender, history: initialHistory }: DocCheckInClientProps) {
  const [layer, setLayer] = useState<BodyLayer>("muscle");
  const [gender, setGender] = useState<"male" | "female">(defaultGender);
  const [selected, setSelected] = useState<SelectedRegion | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  const [painLevel, setPainLevel] = useState(4);
  const [painType, setPainType] = useState<string>("ache");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<BodyAdvice | null>(null);
  const [history, setHistory] = useState<CheckinHistoryItem[]>(initialHistory);

  const selectedName = useMemo(
    () => (selected ? fullRegionName(selected.regionId, selected.side, layer) : null),
    [selected, layer]
  );

  function pickRegion(sel: SelectedRegion) {
    setSelected(sel);
    setAdvice(null);
    setError(null);
  }

  async function submit() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const res = await fetch("/api/doc-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionId: selected.regionId,
          side: selected.side,
          view: "front",
          layer,
          gender,
          painLevel,
          painType,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || `Request failed (${res.status})`);
      setAdvice(json.advice as BodyAdvice);
      setHistory((h) => [
        {
          id: json.id,
          regionLabel: json.regionLabel,
          painLevel,
          painType,
          createdAt: json.createdAt,
          advice: json.advice,
        },
        ...h,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── 3D body picker ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 border-b p-3">
            <div className="inline-flex rounded-md border bg-muted p-0.5 text-xs">
              {(["muscle", "skeleton"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayer(l)}
                  className={cn(
                    "rounded px-3 py-1.5 font-medium capitalize transition-colors",
                    layer === l ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  )}
                >
                  {l === "muscle" ? "💪 Muscle" : "🦴 Skeleton"}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-md border bg-muted p-0.5 text-xs">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={cn(
                    "rounded px-3 py-1.5 font-medium capitalize transition-colors",
                    gender === g ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  )}
                >
                  {g === "male" ? "♂ Man" : "♀ Woman"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[460px] w-full bg-gradient-to-b from-muted/40 to-background">
            <BodyCanvas
              layer={layer}
              gender={gender}
              selected={selected}
              onSelect={pickRegion}
              onHover={setHoverLabel}
            />
            <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
              {hoverLabel ?? "Drag to rotate · scroll to zoom · click a body part"}
            </div>
            {selectedName && (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-primary/90 px-2.5 py-1 text-xs font-medium text-primary-foreground">
                Selected: {selectedName}
              </div>
            )}
          </div>
          {ANATOMY_ATTRIBUTION && (
            <p className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
              {ANATOMY_ATTRIBUTION}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Pain detail + AI chat ── */}
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <span className="text-sm">⚠️</span>
          <p>
            <strong>AI, not a real doctor.</strong> This tool gives general educational
            information only — it can’t diagnose you. For severe, worsening, or lasting pain,
            see a qualified healthcare professional.
          </p>
        </div>

        {!selected && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              👈 Rotate the model and click where it hurts to start a check-in.
            </CardContent>
          </Card>
        )}

        {selected && !advice && (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <p className="text-sm font-semibold">{selectedName}</p>
                <p className="text-xs text-muted-foreground">Tell me about the pain here.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Pain level</span>
                  <span className="tabular-nums text-muted-foreground">{painLevel}/10</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium">Type</span>
                <div className="flex flex-wrap gap-1.5">
                  {PAIN_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setPainType(t)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
                        painType === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="When did it start? Worse when serving, running, at rest…?"
                  rows={3}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                />
              </div>

              {error && <p className="text-xs text-rose-600">{error}</p>}

              <div className="flex gap-2">
                <Button onClick={submit} disabled={loading} className="flex-1">
                  {loading ? "Analyzing…" : "🩺 Get guidance"}
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Thinking through {selectedName?.toLowerCase()}…
            </CardContent>
          </Card>
        )}

        {advice && (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{selectedName}</p>
                <Button variant="ghost" size="sm" onClick={() => setAdvice(null)}>
                  New check-in
                </Button>
              </div>
              <AdviceView advice={advice} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recent check-ins</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((h) => (
              <Card key={h.id}>
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{h.regionLabel}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums">
                      {h.painLevel}/10
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {h.painType ? `${h.painType} · ` : ""}
                    {new Date(h.createdAt).toLocaleDateString()}
                  </p>
                  <p className="line-clamp-3 text-xs text-muted-foreground">{h.advice?.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
