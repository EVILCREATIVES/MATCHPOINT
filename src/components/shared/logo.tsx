"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <div className="relative flex items-center justify-center">
        <div className={cn(
          "font-bold tracking-tighter",
          sizes[size],
        )}>
          <span className="text-primary">MATCH</span>
          <span className="text-foreground">POINT</span>
        </div>
      </div>
    </Link>
  );
}
