import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/db/schema";
import { setSession } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = loginSchema.parse(body);
    const email = data.email.toLowerCase().trim();

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
