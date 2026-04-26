"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Loading video frames…",
  "Detecting stroke phases (prep · turn · contact · follow-through)…",
  "Tracking body alignment and footwork…",
  "Reading racket path and swing plane…",
  "Evaluating preparation and unit turn…",
  "Checking contact point relative to body…",
  "Measuring extension through the ball…",
  "Assessing balance and recovery…",
  "Comparing against rubric criteria…",
  "Drafting feedback and key fixes…",
  "Finalizing scores…",
];

interface Props {
  startedAt?: string | Date | null;
}

export function AnalysisThinking({ startedAt }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsed(secs);
      // ~3s per step, loop on the last one if it goes long.
      const idx = Math.min(STEPS.length - 1, Math.floor(secs / 3));
      setStepIdx(idx);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [startedAt]);

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
        Gemini is thinking · {elapsed}s
      </div>
      <ul className="space-y-1 text-xs">
        {STEPS.slice(0, stepIdx + 1).map((s, i) => {
          const isCurrent = i === stepIdx;
          return (
            <li
              key={i}
              className={
                isCurrent
                  ? "text-foreground"
                  : "text-muted-foreground line-through opacity-60"
              }
            >
              <span className="mr-1.5 tabular-nums">
                {isCurrent ? "▸" : "✓"}
              </span>
              {s}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
