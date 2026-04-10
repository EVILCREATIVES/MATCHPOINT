import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function SourcesListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Sources"
        description="0 sources in the knowledge base"
        actions={
          <Button asChild>
            <Link href="/admin/sources/new">+ Add Source</Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search sources…" className="w-64" />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">All</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">📄 PDF</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">🌐 Web</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">▶️ YouTube</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">✏️ Manual</Badge>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="font-semibold">No sources yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Add your first knowledge source — PDFs, websites, YouTube videos, or manual entries.
            Sources are processed and indexed for AI-powered training plan generation.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/admin/sources/new">+ Add First Source</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function getSourceTypeIcon(type: string) {
  switch (type) {
    case "pdf": return "📄";
    case "website": return "🌐";
    case "youtube": return "▶️";
    case "manual": return "✏️";
    default: return "📁";
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function SourcesListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Sources"
        description={`${sources.length} sources in the knowledge base`}
        actions={
          <Button asChild>
            <Link href="/admin/sources/new">+ Add Source</Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search sources…" className="w-64" />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">All</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">📄 PDF</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">🌐 Web</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">▶️ YouTube</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">✏️ Manual</Badge>
        </div>
      </div>

      {/* Sources Table/List */}
      <div className="space-y-3">
        {sources.map((source) => {
          const category = categories.find((c) => c.id === source.categoryId);
          return (
            <Link key={source.id} href={`/admin/sources/${source.id}`}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div className="text-2xl mt-0.5 hidden sm:block">
                      {getSourceTypeIcon(source.sourceType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm md:text-base truncate">
                            {source.title}
                          </h3>
                          {source.author && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              by {source.author}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={source.status} />
                          <IngestionBadge state={source.ingestionState} />
                        </div>
                      </div>

                      {source.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {source.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="capitalize">{source.sourceType}</span>
                        {category && <span>{category.icon} {category.name}</span>}
                        {source.skillLevel && (
                          <SkillBadge level={source.skillLevel} />
                        )}
                        <TrustBadge level={source.trustLevel} />
                        {source.chunkCount > 0 && (
                          <span>{source.chunkCount} chunks</span>
                        )}
                        {source.fileSize && (
                          <span>{formatFileSize(source.fileSize)}</span>
                        )}
                        <span>{formatRelativeTime(source.updatedAt)}</span>
                      </div>

                      {source.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {source.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {source.errorMessage && (
                        <p className="text-xs text-destructive">
                          ⚠ {source.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
