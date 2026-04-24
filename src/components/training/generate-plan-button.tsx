"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface GeneratePlanButtonProps {
  label?: string;
  variant?: "default" | "outline";
  className?: string;
}

export function GeneratePlanButton({
  label = "Generate New Plan",
  variant = "default",
  className,
}: GeneratePlanButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClick = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: "weekly" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Plan generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isGenerating || isPending}
      variant={variant}
      className={className}
    >
      {isGenerating || isPending ? "Generating…" : label}
    </Button>
  );
}
