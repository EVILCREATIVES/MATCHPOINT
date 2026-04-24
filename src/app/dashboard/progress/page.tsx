import { desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { LogSessionButton } from "@/components/progress/log-session-button";
import { db } from "@/lib/db";
import { progressLogs } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  skipped: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((d) => startOfDay(d).getTime()));
  let streak = 0;
  const cursor = startOfDay(new Date());
  // Allow today missing — start counting from yesterday if today not logged.
  if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default async function ProgressPage() {
  const user = await getCurrentUser();

  const logs = await db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.userId, user.id))
    .orderBy(desc(progressLogs.date))
    .limit(100);

  const total = logs.length;
  const completed = logs.filter((l) => l.status === "completed").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const completedDates = logs
    .filter((l) => l.status === "completed")
    .map((l) => new Date(l.date));
  const streak = computeStreak(completedDates);

  // Focus distribution
  const focusCounts = new Map<string, number>();
  for (const l of logs) {
    for (const f of (l.focusAreas as string[] | null) ?? []) {
      focusCounts.set(f, (focusCounts.get(f) ?? 0) + 1);
    }
  }
  const focusEntries = Array.from(focusCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        description="Track your training consistency and development"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Sessions" value={total} />
        <StatCard title="Completed" value={completed} />
        <StatCard title="Completion Rate" value={total > 0 ? `${completionRate}%` : "—"} />
        <StatCard title="Current Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <LogSessionButton />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Session History</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No sessions logged yet. Use the button above to log your first one.
                </p>
              ) : (
                <ul className="divide-y">
                  {logs.map((l) => (
                    <li key={l.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
                              STATUS_STYLE[l.status] ?? "bg-muted"
                            }`}
                          >
                            {l.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(l.date).toLocaleString()}
                          </span>
                          {l.durationMinutes && (
                            <span className="text-xs text-muted-foreground">
                              {l.durationMinutes} min
                            </span>
                          )}
                          {l.selfRating && (
                            <span className="text-xs">⭐ {l.selfRating}/5</span>
                          )}
                        </div>
                        {l.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {l.notes}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Focus Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {focusEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tag focus areas on logged sessions to see distribution.
                </p>
              ) : (
                <ul className="space-y-2">
                  {focusEntries.map(([focus, n]) => (
                    <li key={focus} className="text-xs flex items-center justify-between">
                      <span className="capitalize">{focus}</span>
                      <span className="text-muted-foreground">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">🧠</div>
              <h3 className="font-semibold text-sm">AI Coach Summary</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Personalized performance analysis coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
