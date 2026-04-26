import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/db/schema";
import { setSession } from "@/lib/session";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Hardcoded super-admin shortcut. Username + password are both "ECADMIN".
// On first use, ensures an admin user exists and onboarding is marked complete.
const ECADMIN_USERNAME = "ECADMIN";
const ECADMIN_PASSWORD = "ECADMIN";
const ECADMIN_EMAIL = "ecadmin@matchpoint.local";

const loginSchema = z.object({
  email: z.string().min(1).max(255),
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);
    const rawId = data.email.trim();

    // ── Hardcoded admin bypass ──
    if (
      rawId.toUpperCase() === ECADMIN_USERNAME &&
      data.password === ECADMIN_PASSWORD
    ) {
      let [admin] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, ECADMIN_EMAIL))
        .limit(1);

      if (!admin) {
        const passwordHash = await bcrypt.hash(ECADMIN_PASSWORD, 10);
        const [created] = await db
          .insert(users)
          .values({
            name: "EC Admin",
            email: ECADMIN_EMAIL,
            passwordHash,
            role: "admin",
          })
          .returning({ id: users.id, role: users.role });
        admin = created;

        // Seed a minimal profile so onboarding is skipped.
        await db.insert(userProfiles).values({
          userId: admin.id,
          onboardingCompleted: true,
        });
      } else if (admin.role !== "admin") {
        await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.id, admin.id));
        admin.role = "admin";
      }

      await setSession({ userId: admin.id, role: "admin" });
      return NextResponse.json({
        success: true,
        role: "admin",
        redirect: "/admin",
      });
    }

    // ── Normal email/password flow ──
    const email = rawId.toLowerCase();

    // 5 attempts / minute per (IP + email) — slows credential stuffing.
    const rl = rateLimit({
      bucket: "auth:login",
      key: `${clientIp(request)}|${email}`,
      limit: 5,
      windowMs: 60_000,
    });
    if (!rl.ok) return rateLimitResponse(rl);

    const [user] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await setSession({ userId: user.id, role: user.role });

    // Decide redirect based on onboarding state.
    const [profile] = await db
      .select({ done: userProfiles.onboardingCompleted })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    const redirect = profile?.done
      ? user.role === "admin" ? "/admin" : "/dashboard"
      : "/onboarding";

    return NextResponse.json({ success: true, role: user.role, redirect });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
