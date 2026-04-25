"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReprocessSourceButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!confirm("Reprocess this source? Existing chunks and structured knowledge will be replaced.")) {
      return;
    }
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
      alert(err instanceof Error ? err.message : "Reprocess failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Reprocessing…" : "↻ Reprocess"}
    </Button>
  );
}
