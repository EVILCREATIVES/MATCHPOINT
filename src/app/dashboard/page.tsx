import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { userDashboardData } from "@/lib/mock-data";

export default function UserDashboardPage() {
  const data = userDashboardData;
  const completionRate = Math.round(
    (data.stats.completedSessions / data.stats.totalSessions) * 100
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${data.user.name.split(" ")[0]}`}
        description={data.activePlan ? `Week plan: ${data.activePlan.title}` : "No active plan"}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Sessions Done" value={data.stats.completedSessions} description={`of ${data.stats.totalSessions} total`} />
        <StatCard title="Completion" value={`${completionRate}%`} description="Session completion rate" />
        <StatCard title="Current Streak" value={`${data.stats.currentStreak} days`} description="Keep it going" />
        <StatCard title="Level" value={data.profile.tennisLevel} description={`${data.profile.yearsPlaying} years playing`} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Today's Session */}
        <div className="md:col-span-2 space-y-6">
          {data.todaySession ? (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider">
                      Today&apos;s Session
                    </p>
                    <CardTitle className="text-lg mt-1">{data.todaySession.title}</CardTitle>
                  </div>
                  <Badge variant="court">{data.todaySession.sessionType.replace("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{data.todaySession.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    ⏱ {data.todaySession.durationMinutes} min
                  </span>
                  <span className="text-muted-foreground">
                    📋 {data.todaySession.exercises.length} exercises
                  </span>
                </div>
                {data.todaySession.coachNotes && (
                  <div className="rounded-md bg-muted/50 p-3 border-l-2 border-primary">
                    <p className="text-xs font-medium text-primary mb-1">Coach Note</p>
                    <p className="text-xs text-muted-foreground">{data.todaySession.coachNotes}</p>
                  </div>
                )}
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/dashboard/training">Start Session →</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-lg font-medium">Rest Day</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No session scheduled today. Recovery is part of the plan.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Weekly Progress */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">This Week</CardTitle>
                <Link
                  href="/dashboard/progress"
                  className="text-xs text-primary font-medium hover:underline"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.weeklyProgress.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                          log.status === "completed"
                            ? "bg-success"
                            : log.status === "partial"
                            ? "bg-warning"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground truncate">{log.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {log.selfRating && (
                        <span className="text-xs text-muted-foreground">{log.selfRating}/5</span>
                      )}
                      <Badge
                        variant={
                          log.status === "completed" ? "success" : log.status === "partial" ? "warning" : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Goals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recentGoals.map((goal) => (
                  <div key={goal.id} className="space-y-1">
                    <p className="text-sm font-medium">{goal.title}</p>
                    {goal.targetDate && (
                      <p className="text-xs text-muted-foreground">
                        Target: {new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Focus Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Focus Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.stats.focusAreaBreakdown).map(([area, count]) => {
                  const max = Math.max(...Object.values(data.stats.focusAreaBreakdown));
                  const percent = Math.round((count / max) * 100);
                  return (
                    <div key={area} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{area}</span>
                        <span className="text-muted-foreground">{count} sessions</span>
                      </div>
                      <Progress value={percent} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recommended */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recommendedLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/dashboard/lessons/${lesson.slug}`}
                    className="block group"
                  >
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {lesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lesson.estimatedMinutes} min · {lesson.skillLevel}
                    </p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
