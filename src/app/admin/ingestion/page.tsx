import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { RetryIngestionButton } from "@/components/admin/retry-ingestion-button";
import { db } from "@/lib/db";
import { ingestionJobs, sources } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATE_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  reprocessing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

function fmtDuration(start: Date | null, end: Date | null) {
  if (!start) return "—";
  const ms = (end ?? new Date()).getTime() - start.getTime();
  if (ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}m ${rest}s`;
}

export default async function IngestionPage() {
  const [
    [{ value: pending } = { value: 0 }],
    [{ value: processing } = { value: 0 }],
    [{ value: completed } = { value: 0 }],
    [{ value: failed } = { value: 0 }],
    jobs,
  ] = await Promise.all([
    db.select({ value: count() }).from(ingestionJobs).where(eq(ingestionJobs.status, "pending")),
    db
      .select({ value: count() })
      .from(ingestionJobs)
      .where(sql`${ingestionJobs.status} IN ('processing','reprocessing')`),
    db.select({ value: count() }).from(ingestionJobs).where(eq(ingestionJobs.status, "completed")),
    db.select({ value: count() }).from(ingestionJobs).where(eq(ingestionJobs.status, "failed")),
    db
      .select({
        id: ingestionJobs.id,
        sourceId: ingestionJobs.sourceId,
        status: ingestionJobs.status,
        startedAt: ingestionJobs.startedAt,
        completedAt: ingestionJobs.completedAt,
        chunksCreated: ingestionJobs.chunksCreated,
        errorMessage: ingestionJobs.errorMessage,
        createdAt: ingestionJobs.createdAt,
        sourceTitle: sources.title,
      })
      .from(ingestionJobs)
      .leftJoin(sources, eq(ingestionJobs.sourceId, sources.id))
      .orderBy(desc(ingestionJobs.createdAt))
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ingestion Pipeline"
        description="Monitor and manage knowledge base ingestion jobs"
        actions={<AutoRefresh intervalMs={5000} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold mt-1">{pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Processing</p>
            <p className="text-2xl font-bold mt-1">{processing}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold mt-1">{completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold mt-1">{failed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No ingestion jobs yet. Add a source on{" "}
              <Link href="/admin/sources/new" className="text-primary hover:underline">
                /admin/sources/new
              </Link>{" "}
              to kick off the pipeline.
            </p>
          ) : (
            <ul className="divide-y">
              {jobs.map((j) => (
                <li
                  key={j.id}
                  className="py-3 flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${STATE_STYLE[j.status] ?? "bg-muted"}`}
                      >
                        {j.status}
                      </span>
                      {j.sourceId && j.sourceTitle ? (
                        <Link
                          href={`/admin/sources/${j.sourceId}`}
                          className="font-medium hover:underline truncate"
                        >
                          {j.sourceTitle}
                        </Link>
                      ) : (
                        <span className="font-medium truncate">
                          {j.sourceTitle ?? "(deleted source)"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>{new Date(j.createdAt).toLocaleString()}</span>
                      <span>{j.chunksCreated} chunks</span>
                      <span>
                        ⏱ {fmtDuration(j.startedAt, j.completedAt)}
                      </span>
                    </div>
                    {j.errorMessage && (
                      <p className="text-[11px] text-rose-600 mt-1 line-clamp-2">
                        {j.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {j.status === "failed" && j.sourceId && (
                      <RetryIngestionButton sourceId={j.sourceId} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
