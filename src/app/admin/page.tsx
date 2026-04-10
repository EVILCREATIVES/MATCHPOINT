import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IngestionBadge, StatusBadge, TrustBadge } from "@/components/shared/status-badges";
import { adminDashboardStats, sources } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export default function AdminDashboardPage() {
  const stats = adminDashboardStats;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Knowledge base overview and system status"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Sources"
          value={stats.totalSources}
          description="Knowledge base entries"
        />
        <StatCard
          title="Active Sources"
          value={stats.activeSources}
          description="In RAG corpus"
          trend={{ value: 12, label: "this month" }}
        />
        <StatCard
          title="Pending Ingestion"
          value={stats.pendingIngestion}
          description="Awaiting processing"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description="Registered players"
          trend={{ value: 8, label: "this week" }}
        />
        <StatCard
          title="Plans Generated"
          value={stats.totalPlans}
          description="Training plans created"
        />
      </div>

      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">System Status</CardTitle>
            <Badge variant={stats.systemStatus === "healthy" ? "success" : "destructive"}>
              {stats.systemStatus === "healthy" ? "● Healthy" : "● Issue Detected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">RAG Pipeline</p>
              <p className="font-medium text-success">Operational</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Vector Store</p>
              <p className="font-medium text-success">Connected</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">AI Model</p>
              <p className="font-medium text-success">Gemini 3.1 Pro</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Database</p>
              <p className="font-medium text-success">Connected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Sources */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Sources</CardTitle>
              <Link
                href="/admin/sources"
                className="text-xs text-primary font-medium hover:underline"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sources.slice(0, 5).map((source) => (
                <Link
                  key={source.id}
                  href={`/admin/sources/${source.id}`}
                  className="flex items-start justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {source.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {source.sourceType}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(source.createdAt)}
                      </span>
                    </div>
                  </div>
                  <IngestionBadge state={source.ingestionState} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ingestion Queue */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Ingestion Queue</CardTitle>
              <Link
                href="/admin/ingestion"
                className="text-xs text-primary font-medium hover:underline"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sources
                .filter(
                  (s) =>
                    s.ingestionState === "pending" ||
                    s.ingestionState === "processing" ||
                    s.ingestionState === "failed"
                )
                .map((source) => (
                  <div key={source.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{source.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {source.ingestionState === "failed"
                          ? source.errorMessage
                          : `${source.sourceType} · Added ${formatRelativeTime(source.createdAt)}`}
                      </p>
                    </div>
                    <IngestionBadge state={source.ingestionState} />
                  </div>
                ))}
              {sources.filter(
                (s) =>
                  s.ingestionState === "pending" ||
                  s.ingestionState === "processing" ||
                  s.ingestionState === "failed"
              ).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending jobs
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
