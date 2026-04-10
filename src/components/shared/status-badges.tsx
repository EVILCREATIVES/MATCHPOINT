"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { IngestionState, SourceStatus, TrustLevel, SkillLevel } from "@/types";

const ingestionStateConfig: Record<IngestionState, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  reprocessing: { label: "Reprocessing", variant: "warning" },
};

const sourceStatusConfig: Record<SourceStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "secondary" },
  archived: { label: "Archived", variant: "secondary" },
};

const trustLevelConfig: Record<TrustLevel, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  trusted: { label: "Trusted", variant: "success" },
  untrusted: { label: "Untrusted", variant: "destructive" },
  unreviewed: { label: "Unreviewed", variant: "secondary" },
};

const skillLevelConfig: Record<SkillLevel, { label: string; variant: "default" | "secondary" | "success" | "warning" | "court" }> = {
  beginner: { label: "Beginner", variant: "secondary" },
  intermediate: { label: "Intermediate", variant: "default" },
  advanced: { label: "Advanced", variant: "court" },
  elite: { label: "Elite", variant: "warning" },
};

export function IngestionBadge({ state, className }: { state: IngestionState; className?: string }) {
  const config = ingestionStateConfig[state];
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}

export function StatusBadge({ status, className }: { status: SourceStatus; className?: string }) {
  const config = sourceStatusConfig[status];
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}

export function TrustBadge({ level, className }: { level: TrustLevel; className?: string }) {
  const config = trustLevelConfig[level];
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}

export function SkillBadge({ level, className }: { level: SkillLevel; className?: string }) {
  const config = skillLevelConfig[level];
  return <Badge variant={config.variant as any} className={className}>{config.label}</Badge>;
}
