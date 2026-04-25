"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STROKES = [
  { value: "forehand", label: "Forehand" },
  { value: "backhand", label: "Backhand" },
  { value: "serve", label: "Serve" },
  { value: "volley", label: "Volley" },
  { value: "return", label: "Return" },
  { value: "other", label: "Other" },
] as const;

export function VideoUploader() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [strokeType, setStrokeType] = useState("forehand");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("strokeType", strokeType);
      if (notes) fd.append("notes", notes);
      const res = await fetch("/api/videos", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
      setFile(null);
      setNotes("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Video file (MP4 / MOV / WebM, max 25 MB)
          </label>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:bg-background file:text-foreground hover:file:bg-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Stroke</label>
          <select
            value={strokeType}
            onChange={(e) => setStrokeType(e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
          >
            {STROKES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Notes for the AI coach (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="E.g. I feel I'm late on contact and my follow-through is short."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || !file}
        className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Uploading…" : "Upload & analyze"}
      </button>
      <p className="text-[11px] text-muted-foreground">
        Analysis runs server-side with Gemini. Results typically arrive in 30–90 seconds.
      </p>
    </form>
  );
}
