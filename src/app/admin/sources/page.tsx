import Link from "next/link";
import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPE_LABEL: Record<string, string> = {
  pdf: "📄 PDF",
  website: "🌐 Web",
  youtube: "▶️ YouTube",
  manual: "✏️ Manual",
};

const STATE_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  reprocessing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

export default async function SourcesListPage() {
  const rows = await db.select().from(sources).orderBy(desc(sources.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Sources"
        description={`${rows.length} source${rows.length === 1 ? "" : "s"} in the knowledge base`}
        actions={
          <Button asChild>
            <Link href="/admin/sources/new">+ Add Source</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search sources…" className="w-64" />
        <div className="flex items-center gap-2">
          <Badge variant="outline">All</Badge>
          <Badge variant="outline">📄 PDF</Badge>
          <Badge variant="outline">🌐 Web</Badge>
          <Badge variant="outline">▶️ YouTube</Badge>
          <Badge variant="outline">✏️ Manual</Badge>
        </div>
      </div>

      {rows.length === 0 ? (
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
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/sources/${s.id}`}
                      className="font-semibold text-sm hover:underline truncate"
                    >
                      {s.title}
                    </Link>
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABEL[s.sourceType] ?? s.sourceType}
                    </Badge>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${STATE_STYLE[s.ingestionState] ?? "bg-muted"}`}
                    >
                      {s.ingestionState}
                    </span>
                    {s.skillLevel && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {s.skillLevel}
                      </Badge>
                    )}
                  </div>
                  {s.author && (
                    <p className="text-xs text-muted-foreground mt-1">by {s.author}</p>
                  )}
                  {s.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {s.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{s.chunkCount} chunks</span>
                    {s.pageCount ? <span>{s.pageCount} pages</span> : null}
                    <span>{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                  {s.errorMessage && (
                    <p className="text-xs text-rose-600 mt-1 line-clamp-2">
                      {s.errorMessage}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

