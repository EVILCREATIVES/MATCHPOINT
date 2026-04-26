import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { practiceSessions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const ALLOWED_STROKES = new Set([
  "forehand",
  "backhand",
  "serve",
  "volley",
  "return",
  "other",
]);

const schema = z.object({
  strokeType: z.string().min(1).max(50),
  plannedReps: z.number().int().min(1).max(20),
  notes: z.string().max(1000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await requireUser();

  // 30 sessions / hour per user — generous, but not unlimited.
  const rl = rateLimit({
    bucket: "practice:session",
    key: user.id,
    limit: 30,
    windowMs: 60 * 60_000,
  });
  if (!rl.ok) return rateLimitResponse(rl);

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const stroke = data.strokeType.toLowerCase();
  if (!ALLOWED_STROKES.has(stroke)) {
    return NextResponse.json({ error: "Invalid stroke type" }, { status: 400 });
  }

  const [row] = await db
    .insert(practiceSessions)
    .values({
      userId: user.id,
      strokeType: stroke,
      plannedReps: data.plannedReps,
      notes: data.notes ?? null,
    })
    .returning({ id: practiceSessions.id });

  return NextResponse.json({ id: row.id });
}
