import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import {
  sources,
  sourceChunks,
  techniques,
  drills,
  commonErrors,
  ingestionJobs,
  trainingPlans,
  users,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATE_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  reprocessing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

export default async function AdminDashboardPage() {
  const [
    [{ value: totalSources } = { value: 0 }],
    [{ value: completedSources } = { value: 0 }],
    [{ value: pendingSources } = { value: 0 }],
    [{ value: failedSources } = { value: 0 }],
    [{ value: totalChunks } = { value: 0 }],
    [{ value: totalTechniques } = { value: 0 }],
    [{ value: totalDrills } = { value: 0 }],
    [{ value: totalErrors } = { value: 0 }],
    [{ value: totalUsers } = { value: 0 }],
    [{ value: totalPlans } = { value: 0 }],
    recentSources,
    recentJobs,
  ] = await Promise.all([
    db.select({ value: count() }).from(sources),
    db.select({ value: count() }).from(sources).where(eq(sources.ingestionState, "completed")),
    db.select({ value: count() }).from(sources).where(sql`${sources.ingestionState} IN ('pending','processing','reprocessing')`),
    db.select({ value: count() }).from(sources).where(eq(sources.ingestionState, "failed")),
    db.select({ value: count() }).from(sourceChunks),
    db.select({ value: count() }).from(techniques),
    db.select({ value: count() }).from(drills),
    db.select({ value: count() }).from(commonErrors),
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(trainingPlans),
    db
      .select({
        id: sources.id,
        title: sources.title,
        sourceType: sources.sourceType,
        ingestionState: sources.ingestionState,
        chunkCount: sources.chunkCount,
        createdAt: sources.createdAt,
      })
      .from(sources)
      .orderBy(desc(sources.createdAt))
      .limit(6),
    db
      .select({
        id: ingestionJobs.id,
        sourceId: ingestionJobs.sourceId,
        status: ingestionJobs.status,
        chunksCreated: ingestionJobs.chunksCreated,
        errorMessage: ingestionJobs.errorMessage,
        createdAt: ingestionJobs.createdAt,
        sourceTitle: sources.title,
      })
      .from(ingestionJobs)
      .leftJoin(sources, eq(ingestionJobs.sourceId, sources.id))
      .orderBy(desc(ingestionJobs.createdAt))
      .limit(6),
  ]);

  const dbConfigured = Boolean(process.env.DATABASE_URL);
  const aiConfigured = Boolean(process.env.GEMINI_API);
  const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const authConfigured = Boolean(process.env.AUTH_SECRET);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Knowledge base overview and system status"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Sources" value={totalSources} description={`${completedSources} active`} />
        <StatCard title="In Pipeline" value={pendingSources} description="Pending / processing" />
        <StatCard title="Failed Sources" value={failedSources} description="Need attention" />
        <StatCard title="Indexed Chunks" value={totalChunks} description="In RAG corpus" />
        <StatCard title="Plans Generated" value={totalPlans} description={`${totalUsers} users`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Techniques" value={totalTechniques} />
        <StatCard title="Drills" value={totalDrills} />
        <StatCard title="Common Errors" value={totalErrors} />
        <StatCard title="Users" value={totalUsers} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <StatusRow label="Database" ok={dbConfigured} okText="Connected" badText="DATABASE_URL missing" />
            <StatusRow label="Auth" ok={authConfigured} okText="Configured" badText="AUTH_SECRET missing" />
            <StatusRow label="Blob Storage" ok={blobConfigured} okText="Connected" badText="BLOB_READ_WRITE_TOKEN missing" />
            <StatusRow label="AI Model" ok={aiConfigured} okText="gemini-3-flash-preview" badText="GEMINI_API missing" />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
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
            {recentSources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sources yet. <Link href="/admin/sources/new" className="text-primary hover:underline">Add your first one</Link>.
              </p>
            ) : (
              <ul className="divide-y">
                {recentSources.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/sources/${s.id}`} className="font-medium hover:underline truncate block">
                        {s.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="capitalize">{s.sourceType}</span>
                        <span>{s.chunkCount} chunks</span>
                        <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${STATE_STYLE[s.ingestionState] ?? "bg-muted"}`}>
                      {s.ingestionState}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

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
            {recentJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No ingestion jobs yet.
              </p>
            ) : (
              <ul className="divide-y">
                {recentJobs.map((j) => (
                  <li key={j.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      {j.sourceId ? (
                        <Link href={`/admin/sources/${j.sourceId}`} className="font-medium hover:underline truncate block">
                          {j.sourceTitle ?? "(deleted source)"}
                        </Link>
                      ) : (
                        <span className="font-medium truncate block">{j.sourceTitle ?? "—"}</span>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span>{j.chunksCreated} chunks</span>
                        <span>{new Date(j.createdAt).toLocaleString()}</span>
                      </div>
                      {j.errorMessage && (
                        <p className="text-[11px] text-rose-600 mt-1 line-clamp-1">{j.errorMessage}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${STATE_STYLE[j.status] ?? "bg-muted"}`}>
                      {j.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusRow({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
        <span className={ok ? "" : "text-muted-foreground"}>{ok ? okText : badText}</span>
      </p>
    </div>
  );
}
