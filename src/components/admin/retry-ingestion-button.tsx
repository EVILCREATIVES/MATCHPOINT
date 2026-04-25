"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RetryIngestionButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, reprocess: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-[11px] font-medium rounded-md border px-2 py-1 hover:bg-accent disabled:opacity-50"
    >
      {pending ? "Retrying…" : "↻ Retry"}
    </button>
  );
}
