"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";

const userMobileNav = [
  { label: "Home", href: "/dashboard", icon: "◈" },
  { label: "Training", href: "/dashboard/training", icon: "🎯" },
  { label: "Lessons", href: "/dashboard/lessons", icon: "📖" },
  { label: "Progress", href: "/dashboard/progress", icon: "📊" },
  { label: "Admin", href: "/admin", icon: "🛡" },
];

export function UserMobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <Logo size="sm" />
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
          MC
        </div>
      </header>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-card/95 backdrop-blur px-2 py-2 safe-area-pb">
        {userMobileNav.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
