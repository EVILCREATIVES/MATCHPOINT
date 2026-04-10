import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Knowledge base overview and system status"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Sources" value={0} description="Knowledge base entries" />
        <StatCard title="Active Sources" value={0} description="In RAG corpus" />
        <StatCard title="Pending Ingestion" value={0} description="Awaiting processing" />
        <StatCard title="Total Users" value={0} description="Registered players" />
        <StatCard title="Plans Generated" value={0} description="Training plans created" />
      </div>

      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">System Status</CardTitle>
            <Badge variant="secondary">● Not Connected</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">RAG Pipeline</p>
              <p className="font-medium text-muted-foreground">Not configured</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Vector Store</p>
              <p className="font-medium text-muted-foreground">Not connected</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">AI Model</p>
              <p className="font-medium text-muted-foreground">Not configured</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Database</p>
              <p className="font-medium text-muted-foreground">Not connected</p>
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
            <p className="text-sm text-muted-foreground text-center py-8">
              No sources yet. Add your first knowledge source to get started.
            </p>
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
            <p className="text-sm text-muted-foreground text-center py-8">
              No ingestion jobs. Sources will appear here once added.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
