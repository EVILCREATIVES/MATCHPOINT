import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/shared/stat-card";
import { progressLogs, userDashboardData } from "@/lib/mock-data";

export default function ProgressPage() {
  const stats = userDashboardData.stats;
  const completionRate = Math.round(
    (stats.completedSessions / stats.totalSessions) * 100
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        description="Track your training consistency and development"
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Sessions" value={stats.totalSessions} />
        <StatCard title="Completed" value={stats.completedSessions} />
        <StatCard title="Completion Rate" value={`${completionRate}%`} />
        <StatCard title="Current Streak" value={`${stats.currentStreak} days`} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Session Log */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Session History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressLogs.map((log) => (
                  <div key={log.id} className="rounded-md border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full flex-shrink-0 ${
                            log.status === "completed"
                              ? "bg-success"
                              : log.status === "partial"
                              ? "bg-warning"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(log.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.selfRating && (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-xs ${
                                  star <= log.selfRating!
                                    ? "text-primary"
                                    : "text-muted-foreground/30"
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                        <Badge
                          variant={
                            log.status === "completed"
                              ? "success"
                              : log.status === "partial"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {log.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="ml-6 space-y-1">
                      {log.focusAreas.length > 0 && (
                        <div className="flex gap-1.5">
                          {log.focusAreas.map((area) => (
                            <Badge key={area} variant="outline" className="text-[10px]">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {log.notes && (
                        <p className="text-xs text-muted-foreground">{log.notes}</p>
                      )}
                      {log.durationMinutes && (
                        <p className="text-xs text-muted-foreground">
                          Duration: {log.durationMinutes} min
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Focus Area Breakdown */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Focus Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.focusAreaBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([area, count]) => {
                    const total = Object.values(stats.focusAreaBreakdown).reduce(
                      (sum, v) => sum + v,
                      0
                    );
                    const percent = Math.round((count / total) * 100);
                    return (
                      <div key={area} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{area}</span>
                          <span className="text-muted-foreground">{percent}%</span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Coach Summary Placeholder */}
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">🧠</div>
              <h3 className="font-semibold text-sm">AI Coach Summary</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Personalized performance analysis and recommendations will appear here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
