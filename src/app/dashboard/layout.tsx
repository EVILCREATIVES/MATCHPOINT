import type { Metadata } from "next";
import { UserSidebar } from "@/components/user/user-sidebar";
import { UserMobileNav } from "@/components/user/user-mobile-nav";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-background">
      <UserSidebar user={user} />
      <div className="md:pl-64">
        <UserMobileNav user={user} />
        <main className="p-6 md:p-8 lg:p-10 max-w-7xl pb-24 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
