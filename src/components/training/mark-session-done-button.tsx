"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface MarkSessionDoneButtonProps {
  sessionId: string;
  durationMinutes: number;
  focusAreas?: string[];
  alreadyLogged?: boolean;
}

export function MarkSessionDoneButton({
  sessionId,
  durationMinutes,
  focusAreas,
  alreadyLogged,
}: MarkSessionDoneButtonProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(Boolean(alreadyLogged));

  async function handleClick() {
    setPending(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          status: "completed",
          durationMinutes,
          focusAreas,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.message || json.error || `Failed (${res.status})`);
      setDone(true);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark session done");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        ✓ Logged today
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-medium rounded-md border px-2.5 py-1 hover:bg-accent disabled:opacity-50"
    >
      {pending ? "Saving…" : "Mark done"}
    </button>
  );
}
