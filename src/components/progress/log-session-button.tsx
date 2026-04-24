"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogSessionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"completed" | "partial" | "skipped">("completed");
  const [rating, setRating] = useState(4);
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          selfRating: status === "skipped" ? undefined : rating,
          durationMinutes: status === "skipped" ? undefined : duration,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Failed (${res.status})`);
      }
      setOpen(false);
      setNotes("");
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Logging failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Log Session</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border p-4 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Log a session</h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["completed", "partial", "skipped"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`text-xs rounded-md border px-2 py-1.5 capitalize ${
              status === s ? "bg-primary text-primary-foreground" : "bg-background"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {status !== "skipped" && (
        <>
          <label className="block text-xs">
            <span className="text-muted-foreground">Duration (minutes)</span>
            <input
              type="number"
              min={1}
              max={1440}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value || "0", 10))}
              className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted-foreground">Self rating: {rating}/5</span>
            <input
              type="range"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value, 10))}
              className="mt-1 w-full"
            />
          </label>
        </>
      )}

      <label className="block text-xs">
        <span className="text-muted-foreground">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          placeholder="What worked, what felt off…"
        />
      </label>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
