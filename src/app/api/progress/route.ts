import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { progressLogs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

const logSchema = z.object({
  sessionId: z.string().uuid().optional(),
  status: z.enum(["completed", "skipped", "partial"]),
  selfRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  focusAreas: z.array(z.string()).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = logSchema.parse(body);
    const user = await getCurrentUser();

    const [log] = await db
      .insert(progressLogs)
      .values({
        userId: user.id,
        sessionId: data.sessionId ?? null,
        date: new Date(),
        status: data.status,
        selfRating: data.selfRating ?? null,
        notes: data.notes ?? null,
        focusAreas: data.focusAreas ?? [],
        durationMinutes: data.durationMinutes ?? null,
      })
      .returning();

    return NextResponse.json({ success: true, log });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to log progress:", error);
    return NextResponse.json(
      { error: "Failed to log progress" },
      { status: 500 }
    );
  }
}
