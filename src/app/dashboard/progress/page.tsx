import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        description="Track your training consistency and development"
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Sessions" value={0} />
        <StatCard title="Completed" value={0} />
        <StatCard title="Completion Rate" value="—" />
        <StatCard title="Current Streak" value="0 days" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Session Log */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Session History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                No sessions logged yet. Complete training sessions to build your history.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Focus Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                Focus data will appear after completing sessions.
              </p>
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
