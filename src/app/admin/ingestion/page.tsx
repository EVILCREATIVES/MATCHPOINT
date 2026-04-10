import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IngestionBadge } from "@/components/shared/status-badges";
import { ingestionJobs, sources } from "@/lib/mock-data";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function IngestionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingestion Pipeline"
        description="Monitor and manage knowledge base ingestion jobs"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold mt-1">
              {ingestionJobs.filter((j) => j.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Processing</p>
            <p className="text-2xl font-bold mt-1">
              {ingestionJobs.filter((j) => j.status === "processing").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold mt-1">
              {ingestionJobs.filter((j) => j.status === "completed").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-destructive mt-1">
              {ingestionJobs.filter((j) => j.status === "failed").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ingestionJobs.map((job) => {
              const source = sources.find((s) => s.id === job.sourceId);
              return (
                <div
                  key={job.id}
                  className="flex items-start justify-between gap-4 rounded-md border p-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {source?.title || "Unknown Source"}
                      </p>
                      <IngestionBadge state={job.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span>Created {formatRelativeTime(job.createdAt)}</span>
                      {job.startedAt && <span>Started {formatRelativeTime(job.startedAt)}</span>}
                      {job.completedAt && <span>Completed {formatRelativeTime(job.completedAt)}</span>}
                      {job.chunksCreated > 0 && <span>{job.chunksCreated} chunks</span>}
                    </div>
                    {job.errorMessage && (
                      <p className="text-xs text-destructive mt-1">⚠ {job.errorMessage}</p>
                    )}
                    {job.metadata && (
                      <div className="flex gap-2 mt-1">
                        {Object.entries(job.metadata).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="text-[10px]">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {job.status === "failed" && (
                      <Button variant="outline" size="sm">
                        Retry
                      </Button>
                    )}
                    {job.status === "pending" && (
                      <Button size="sm">
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
