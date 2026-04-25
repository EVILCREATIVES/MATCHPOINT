"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function VideoActionsBar({
  videoId,
  status,
}: {
  videoId: string;
  status: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<"retry" | "delete" | null>(null);

  async function handleRetry() {
    setBusy("retry");
    try {
      const res = await fetch(`/api/videos/${videoId}/analyze`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this video and its analysis?")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === "failed" && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={busy !== null}
          className="text-[11px] font-medium rounded-md border px-2 py-1 hover:bg-accent disabled:opacity-50"
        >
          {busy === "retry" ? "Retrying…" : "↻ Retry"}
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy !== null}
        className="text-[11px] font-medium rounded-md border border-rose-300 text-rose-700 px-2 py-1 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
      >
        {busy === "delete" ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
