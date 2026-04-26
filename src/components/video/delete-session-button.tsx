"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this practice session and ALL its takes? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/practice-sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status})`);
      }
      router.push("/dashboard/practice");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="text-xs font-medium rounded-md border border-rose-300 text-rose-700 px-3 py-1.5 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
    >
      {busy ? "Deleting…" : "Delete session"}
    </button>
  );
}
