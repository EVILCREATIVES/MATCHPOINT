import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { progressLogs, userProfiles, trainingPlans } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(_request: NextRequest) {
  try {
    const user = await requireUser();

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [logs, [profile], [activePlan]] = await Promise.all([
      db
        .select()
        .from(progressLogs)
        .where(and(eq(progressLogs.userId, user.id), gte(progressLogs.date, since)))
        .orderBy(desc(progressLogs.date))
        .limit(60),
      db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1),
      db
        .select()
        .from(trainingPlans)
        .where(and(eq(trainingPlans.userId, user.id), eq(trainingPlans.isActive, true)))
        .orderBy(desc(trainingPlans.createdAt))
        .limit(1),
    ]);

    if (logs.length === 0) {
      return NextResponse.json({
        summary:
          "Log a few training sessions over the next week and I'll generate a personalized coach summary based on your progress.",
        generatedAt: new Date().toISOString(),
        empty: true,
      });
    }

    const apiKey = process.env.GEMINI_API;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API is not configured" },
        { status: 500 }
      );
    }

    const total = logs.length;
    const completed = logs.filter((l) => l.status === "completed").length;
    const partial = logs.filter((l) => l.status === "partial").length;
    const skipped = logs.filter((l) => l.status === "skipped").length;
    const ratings = logs
      .map((l) => l.selfRating)
      .filter((r): r is number => typeof r === "number");
    const avgRating =
      ratings.length > 0 ? ratings.reduce((s, n) => s + n, 0) / ratings.length : null;
    const totalMinutes = logs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0);

    const focusCounts = new Map<string, number>();
    for (const l of logs) {
      for (const f of (l.focusAreas as string[] | null) ?? []) {
        focusCounts.set(f, (focusCounts.get(f) ?? 0) + 1);
      }
    }
    const topFocus = Array.from(focusCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([f, n]) => `${f} (${n})`)
      .join(", ");

    const recentNotes = logs
      .filter((l) => l.notes)
      .slice(0, 8)
      .map((l) => `- [${l.status}] ${l.notes}`)
      .join("\n");

    const profileLines = profile
      ? [
          `Level: ${profile.tennisLevel}`,
          `Years playing: ${profile.yearsPlaying}`,
          `Goals: ${(profile.currentGoals ?? []).join(", ") || "general improvement"}`,
          `Available days/week: ${profile.availableTrainingDays}`,
          `Minutes/session: ${profile.availableMinutesPerSession}`,
          `Intensity preference: ${profile.preferredPlanIntensity}`,
          profile.physicalLimitations
            ? `Limitations: ${profile.physicalLimitations}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "No profile on file.";

    const planLine = activePlan
      ? `Active plan: "${activePlan.title}" — focus areas ${(activePlan.focusAreas ?? []).join(", ") || "n/a"}`
      : "No active training plan.";

    const prompt = `You are MATCHPOINT, an AI tennis coach. Write a concise, personalized progress summary for ${user.name}.

## Player profile
${profileLines}

## Current plan
${planLine}

## Last 30 days — stats
- Logged sessions: ${total}
- Completed: ${completed} · Partial: ${partial} · Skipped: ${skipped}
- Total training minutes: ${totalMinutes}
- Average self-rating: ${avgRating != null ? avgRating.toFixed(2) + "/5" : "n/a"}
- Top focus tags: ${topFocus || "none tagged"}

## Recent notes
${recentNotes || "No notes."}

## Output format (Markdown, max ~250 words)
**Coach summary** (2 short paragraphs, supportive but honest)

**What's working** — 2 bullet points
**Watch out for** — 2 bullet points
**This week, focus on** — 3 specific, actionable suggestions tied to the player's profile and recent patterns

Do not include disclaimers. Be specific and reference the data.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return NextResponse.json({
      summary,
      generatedAt: new Date().toISOString(),
      stats: { total, completed, partial, skipped, avgRating, totalMinutes },
    });
  } catch (error) {
    console.error("Coach summary failed:", error);
    return NextResponse.json(
      {
        error: "Coach summary failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
