import type { Metadata } from "next";
import { UserSidebar } from "@/components/user/user-sidebar";
import { UserMobileNav } from "@/components/user/user-mobile-nav";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <UserSidebar />
      <div className="md:pl-64">
        <UserMobileNav />
        <main className="p-6 md:p-8 lg:p-10 max-w-7xl pb-24 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
