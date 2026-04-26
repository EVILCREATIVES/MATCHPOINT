"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { LogoutButton } from "@/components/shared/logout-button";

const userNav = [
  { label: "Dashboard", href: "/dashboard", icon: "◈" },
  { label: "Training", href: "/dashboard/training", icon: "🎯" },
  { label: "Practice", href: "/dashboard/practice", icon: "🎥" },
  { label: "Lessons", href: "/dashboard/lessons", icon: "📖" },
  { label: "Progress", href: "/dashboard/progress", icon: "📊" },
  { label: "Profile", href: "/dashboard/profile", icon: "⚙" },
];

export interface UserSidebarProps {
  user: { name: string; email: string; role: "admin" | "user" };
}

export function UserSidebar({ user }: UserSidebarProps) {
  const pathname = usePathname();
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
      <div className="flex h-16 items-center px-6 border-b">
        <Logo size="sm" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {userNav.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t space-y-3">
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="text-base">🛡</span>
            Admin
          </Link>
        )}
        <Link
          href="/dashboard/video-analysis"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <span className="text-base">🎥</span>
          Video Analysis
        </Link>
        <div className="pt-3 border-t space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
