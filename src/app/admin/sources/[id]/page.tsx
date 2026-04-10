import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IngestionBadge, StatusBadge, TrustBadge, SkillBadge } from "@/components/shared/status-badges";
import { sources, categories, ingestionJobs } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

interface SourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SourceDetailPage({ params }: SourceDetailPageProps) {
  const { id } = await params;
  const source = sources.find((s) => s.id === id);

  if (!source) {
    notFound();
  }

  const category = categories.find((c) => c.id === source.categoryId);
  const jobs = ingestionJobs.filter((j) => j.sourceId === source.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={source.title}
        description={source.description || `${source.sourceType} source`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Reprocess
            </Button>
            <Button variant="outline" size="sm">
              Edit
            </Button>
            {source.status === "active" ? (
              <Button variant="outline" size="sm">
                Deactivate
              </Button>
            ) : (
              <Button size="sm">Activate</Button>
            )}
          </div>
        }
      />

      {/* Status Row */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={source.status} />
        <IngestionBadge state={source.ingestionState} />
        <TrustBadge level={source.trustLevel} />
        {source.skillLevel && <SkillBadge level={source.skillLevel} />}
        <Badge variant="outline" className="capitalize">{source.sourceType}</Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Summary */}
          {source.summary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Generated Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {source.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Chunk Preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Extracted Chunks</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {source.chunkCount} chunks
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {source.chunkCount > 0 ? (
                <div className="space-y-3">
                  {/* Mock chunk previews */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-md border p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Chunk #{i}
                        </span>
                        <span className="text-xs text-muted-foreground">~320 tokens</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {i === 1 &&
                          "The key to a reliable forehand is the unit turn. When you see the ball coming to your forehand side, your first move should be rotating your shoulders and hips as one unit…"}
                        {i === 2 &&
                          "Contact point is critical. The ball should be struck slightly in front of your lead hip, at waist height. This position gives you maximum control and natural topspin…"}
                        {i === 3 &&
                          "The follow-through should feel natural and complete. Allow the racket to travel upward and across your body, finishing over the opposite shoulder…"}
                      </p>
                    </div>
                  ))}
                  {source.chunkCount > 3 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      + {source.chunkCount - 3} more chunks
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No chunks extracted yet.{" "}
                  {source.ingestionState === "pending" && "Ingestion is pending."}
                  {source.ingestionState === "processing" && "Currently processing…"}
                  {source.ingestionState === "failed" && "Ingestion failed."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ingestion Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ingestion Log</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length > 0 ? (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-start justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <IngestionBadge state={job.status} />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(job.createdAt)}
                          </span>
                        </div>
                        {job.errorMessage && (
                          <p className="text-xs text-destructive">{job.errorMessage}</p>
                        )}
                        {job.chunksCreated > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {job.chunksCreated} chunks created
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No ingestion jobs recorded
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MetaRow label="Source Type" value={source.sourceType} />
              {source.author && <MetaRow label="Author" value={source.author} />}
              {category && (
                <MetaRow label="Category" value={`${category.icon} ${category.name}`} />
              )}
              {source.sourceUrl && (
                <MetaRow
                  label="URL"
                  value={
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {source.sourceUrl}
                    </a>
                  }
                />
              )}
              {source.fileSize && (
                <MetaRow
                  label="File Size"
                  value={`${(source.fileSize / 1048576).toFixed(1)} MB`}
                />
              )}
              <MetaRow label="Chunks" value={source.chunkCount.toString()} />
              <MetaRow label="Visibility" value={source.visibility} />
              <Separator />
              <MetaRow label="Created" value={formatDate(source.createdAt)} />
              <MetaRow label="Updated" value={formatDate(source.updatedAt)} />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {source.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {source.tags.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tags</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Embeddings Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Embeddings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="font-medium">
                    {source.chunkCount > 0 ? "Indexed" : "Not indexed"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Vectors</span>
                  <span className="font-medium">{source.chunkCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Model</span>
                  <span className="font-medium text-xs">text-embedding-004</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right capitalize">{value}</span>
    </div>
  );
}
