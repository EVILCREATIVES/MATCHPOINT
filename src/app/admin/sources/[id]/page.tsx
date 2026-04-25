import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { DeleteSourceButton } from "@/components/admin/delete-source-button";
import { ReprocessSourceButton } from "@/components/admin/reprocess-source-button";
import { db } from "@/lib/db";
import {
  sources,
  sourceChunks,
  sourceFigures,
  ingestionJobs,
  techniques,
  drills,
  commonErrors,
  progressions,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATE_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  reprocessing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

interface SourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SourceDetailPage({ params }: SourceDetailPageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const [source] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!source) notFound();

  const [
    chunkPreview,
    figures,
    jobs,
    [{ value: techniqueCount } = { value: 0 }],
    [{ value: drillCount } = { value: 0 }],
    [{ value: errorCount } = { value: 0 }],
    [{ value: progressionCount } = { value: 0 }],
  ] = await Promise.all([
    db
      .select({
        id: sourceChunks.id,
        chunkIndex: sourceChunks.chunkIndex,
        kind: sourceChunks.kind,
        pageNumber: sourceChunks.pageNumber,
        tokenCount: sourceChunks.tokenCount,
        content: sourceChunks.content,
      })
      .from(sourceChunks)
      .where(eq(sourceChunks.sourceId, id))
      .orderBy(sourceChunks.chunkIndex)
      .limit(8),
    db
      .select()
      .from(sourceFigures)
      .where(eq(sourceFigures.sourceId, id))
      .limit(20),
    db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.sourceId, id))
      .orderBy(desc(ingestionJobs.createdAt))
      .limit(10),
    db.select({ value: count() }).from(techniques).where(eq(techniques.sourceId, id)),
    db.select({ value: count() }).from(drills).where(eq(drills.sourceId, id)),
    db.select({ value: count() }).from(commonErrors).where(eq(commonErrors.sourceId, id)),
    db.select({ value: count() }).from(progressions).where(eq(progressions.sourceId, id)),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/sources"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Sources
        </Link>
      </div>

      <PageHeader
        title={source.title}
        description={source.author ? `by ${source.author}` : "Knowledge source"}
        actions={
          <div className="flex items-center gap-2">
            {source.sourceUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Open file
                </a>
              </Button>
            )}
            <ReprocessSourceButton sourceId={source.id} />
            <DeleteSourceButton sourceId={source.id} sourceTitle={source.title} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">{source.sourceType}</Badge>
        <span
          className={`text-xs px-2 py-0.5 rounded ${STATE_STYLE[source.ingestionState] ?? "bg-muted"}`}
        >
          {source.ingestionState}
        </span>
        {source.skillLevel && (
          <Badge variant="outline" className="capitalize">{source.skillLevel}</Badge>
        )}
        <Badge variant="outline" className="capitalize">{source.trustLevel}</Badge>
        <Badge variant="outline" className="capitalize">{source.visibility}</Badge>
        {source.language && <Badge variant="outline">{source.language}</Badge>}
      </div>

      {source.errorMessage && (
        <Card className="border-rose-300 bg-rose-50 dark:bg-rose-950/30">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300 mb-1">
              Last error
            </p>
            <p className="text-sm text-rose-800 dark:text-rose-200 whitespace-pre-wrap">
              {source.errorMessage}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Chunks" value={source.chunkCount} />
        <StatCard title="Pages" value={source.pageCount ?? "—"} />
        <StatCard title="File size" value={source.fileSize ? `${Math.round(source.fileSize / 1024)} KB` : "—"} />
        <StatCard title="Analysis v" value={source.analysisVersion} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Techniques" value={techniqueCount} />
        <StatCard title="Drills" value={drillCount} />
        <StatCard title="Errors" value={errorCount} />
        <StatCard title="Progressions" value={progressionCount} />
      </div>

      {source.summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{source.summary}</p>
          </CardContent>
        </Card>
      )}

      {source.tags && source.tags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {source.tags.map((t) => (
                <Badge key={t} variant="outline">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Chunks (first {chunkPreview.length} of {source.chunkCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chunkPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chunks yet.</p>
          ) : (
            <ul className="space-y-3">
              {chunkPreview.map((c) => (
                <li key={c.id} className="border-l-2 border-primary/30 pl-3">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>#{c.chunkIndex}</span>
                    <span className="capitalize">{c.kind}</span>
                    {c.pageNumber != null && <span>p.{c.pageNumber}</span>}
                    <span>{c.tokenCount} tok</span>
                  </div>
                  <p className="text-xs mt-1 line-clamp-4 whitespace-pre-wrap">
                    {c.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {figures.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Figures ({figures.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {figures.map((f) => (
                <li key={f.id} className="text-xs">
                  <p className="font-medium">
                    {f.pageNumber != null ? `p.${f.pageNumber} — ` : ""}{f.caption}
                  </p>
                  {f.description && (
                    <p className="text-muted-foreground mt-0.5">{f.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ingestion History</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ingestion jobs recorded.</p>
          ) : (
            <ul className="divide-y text-xs">
              {jobs.map((j) => (
                <li key={j.id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded ${STATE_STYLE[j.status] ?? "bg-muted"}`}
                      >
                        {j.status}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(j.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {j.errorMessage && (
                      <p className="text-rose-600 mt-1 line-clamp-2">{j.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-muted-foreground shrink-0">
                    {j.chunksCreated} chunks
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
