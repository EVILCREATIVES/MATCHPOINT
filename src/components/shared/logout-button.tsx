"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({
  className,
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { redirect?: string };
      router.push(json.redirect ?? "/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={
        className ??
        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
      }
    >
      <span className="text-base">⎋</span>
      {pending ? "Signing out…" : label}
    </button>
  );
}
