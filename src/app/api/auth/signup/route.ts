import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { setSession } from "@/lib/session";

const signupSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = signupSchema.parse(body);
    const email = data.email.toLowerCase().trim();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    // First user becomes admin (bootstraps the system).
    const [{ value: existingCount } = { value: 0 }] = await db
      .select({ value: count() })
      .from(users);
    const role = existingCount === 0 ? "admin" : "user";

    const passwordHash = await bcrypt.hash(data.password, 10);

    const [created] = await db
      .insert(users)
      .values({ name: data.name, email, passwordHash, role })
      .returning({ id: users.id, role: users.role });

    await setSession({ userId: created.id, role: created.role });

    return NextResponse.json({
      success: true,
      role: created.role,
      redirect: "/onboarding",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
