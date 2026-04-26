import Link from "next/link";
import { desc, eq, count, sql } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PracticeRecorder } from "@/components/video/practice-recorder";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { practiceSessions, videoAnalyses } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PracticePage() {
  const user = await requireUser();

  const sessions = await db
    .select({
      id: practiceSessions.id,
      strokeType: practiceSessions.strokeType,
      plannedReps: practiceSessions.plannedReps,
      createdAt: practiceSessions.createdAt,
      takeCount: count(videoAnalyses.id),
      completed: sql<number>`SUM(CASE WHEN ${videoAnalyses.status} = 'completed' THEN 1 ELSE 0 END)`,
    })
    .from(practiceSessions)
    .leftJoin(videoAnalyses, eq(videoAnalyses.sessionId, practiceSessions.id))
    .where(eq(practiceSessions.userId, user.id))
    .groupBy(practiceSessions.id)
    .orderBy(desc(practiceSessions.createdAt))
    .limit(20);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Practice Session"
        description="Record 1–20 shadow swings, get instant AI coaching on each rep"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Record a session</CardTitle>
        </CardHeader>
        <CardContent>
          <PracticeRecorder />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No practice sessions yet. Start one above.
            </p>
          ) : (
            <ul className="divide-y">
              {sessions.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/practice/${s.id}`}
                      className="font-medium text-sm hover:underline capitalize"
                    >
                      {s.strokeType} · {s.plannedReps} {s.plannedReps === 1 ? "rep" : "reps"}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()} ·{" "}
                      {Number(s.completed) || 0} / {s.takeCount} analyzed
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/practice/${s.id}`}
                    className="text-[11px] font-medium rounded-md border px-2 py-1 hover:bg-accent"
                  >
                    View →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
