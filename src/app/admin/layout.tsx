import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar user={user} />
      <div className="md:pl-64">
        <AdminMobileNav />
        <main className="p-6 md:p-8 lg:p-10 max-w-7xl">{children}</main>
      </div>
    </div>
  );
}
