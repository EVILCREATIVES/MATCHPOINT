"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

const adminMobileNav = [
  { label: "Dashboard", href: "/admin", icon: "◈" },
  { label: "Sources", href: "/admin/sources", icon: "◉" },
  { label: "Pro Notes", href: "/admin/pro-notes/new", icon: "✎" },
  { label: "Taxonomy", href: "/admin/taxonomy", icon: "◊" },
  { label: "Settings", href: "/admin/settings", icon: "⚙" },
];

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <Logo size="sm" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Admin
        </span>
      </header>
      <nav className="flex items-center gap-1 overflow-x-auto border-b bg-card px-2 py-1.5 scrollbar-hide">
        {adminMobileNav.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
