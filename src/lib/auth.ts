// ============================================================
// MATCHPOINT — Auth helpers
// ============================================================
// Session-cookie auth (see lib/session.ts). These helpers run on
// the server only; for middleware-level gating use lib/session.ts
// decodeSession() directly against request cookies.
// ============================================================

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

/** Returns the current user or null if not signed in. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  const [u] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return u ?? null;
}

/** Returns the current user, or redirects to /login if not signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Returns the current admin user, or redirects appropriately. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
