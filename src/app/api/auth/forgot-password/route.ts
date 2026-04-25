import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import {
  generateResetToken,
  hashResetToken,
  tokenExpiresAt,
} from "@/lib/password-reset";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().max(255),
});

export async function POST(request: NextRequest) {
  // 5 requests / hour per IP — prevents reset spam.
  const rl = rateLimit({
    bucket: "auth:forgot",
    key: clientIp(request),
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  let email: string;
  try {
    const body = await request.json();
    email = schema.parse(body).email.toLowerCase().trim();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always respond OK to prevent account enumeration.
  if (user) {
    try {
      const token = generateResetToken();
      const tokenHash = await hashResetToken(token);
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt: tokenExpiresAt(),
      });

      const origin = new URL(request.url).origin;
      const resetUrl = `${origin}/reset-password?token=${token}`;

      // No mail provider wired — log to server console so the admin can
      // hand it to the user manually. Swap in Resend / SendGrid / SES here.
      console.log(
        `[password-reset] email=${email} url=${resetUrl} (expires in 1h)`
      );
    } catch (err) {
      // Never leak whether the email exists — log internally and respond OK.
      console.error("Password reset token creation failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a reset link has been generated.",
  });
}
