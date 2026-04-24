// ============================================================
// MATCHPOINT — Current user resolver (placeholder)
// ============================================================
// The app does not yet have auth wired. Until it does, every
// dashboard request resolves to a single "demo" user that is
// auto-created on first access. Replace `getCurrentUser()` with
// a real session lookup (NextAuth, Clerk, etc.) when ready.
// ============================================================

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/db/schema";

const DEMO_EMAIL = "demo@matchpoint.local";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const [existing] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: "Demo Player",
      role: "user",
    })
    .returning({ id: users.id, email: users.email, name: users.name });

  // Ensure they have a profile so the training generator has inputs.
  await db.insert(userProfiles).values({
    userId: created.id,
    tennisLevel: "intermediate",
    yearsPlaying: 2,
    dominantHand: "right",
    availableTrainingDays: 3,
    availableMinutesPerSession: 60,
  });

  return created;
}
