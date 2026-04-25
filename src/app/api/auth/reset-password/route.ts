import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { hashResetToken } from "@/lib/password-reset";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(200),
});

export async function POST(request: NextRequest) {
  // 10 attempts / 10 min per IP — guesses against the token space are
  // already astronomically unlikely (32 random bytes), but cap anyway.
  const rl = rateLimit({
    bucket: "auth:reset",
    key: clientIp(request),
    limit: 10,
    windowMs: 10 * 60_000,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const tokenHash = await hashResetToken(data.token);
  const now = new Date();

  const [row] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  // Update password and burn the token in a single best-effort sequence.
  await db
    .update(users)
    .set({ passwordHash, updatedAt: now })
    .where(eq(users.id, row.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, row.id));

  // Invalidate any other outstanding reset tokens for this user.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.userId, row.userId),
        isNull(passwordResetTokens.usedAt)
      )
    );

  return NextResponse.json({ ok: true });
}
