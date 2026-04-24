import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { techniques, drills, commonErrors, sources } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SKILL_STYLE: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  intermediate: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  advanced: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  elite: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

interface SearchParams {
  q?: string;
  level?: string;
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, level } = await searchParams;

  const rows = await db
    .select({
      id: techniques.id,
      name: techniques.name,
      category: techniques.category,
      skillLevel: techniques.skillLevel,
      description: techniques.description,
      tags: techniques.tags,
      sourceTitle: sources.title,
    })
    .from(techniques)
    .leftJoin(sources, sql`${techniques.sourceId} = ${sources.id}`)
    .orderBy(desc(techniques.createdAt));

  const filtered = rows.filter((r) => {
    if (level && r.skillLevel !== level) return false;
    if (q) {
      const needle = q.toLowerCase();
      const hay = `${r.name} ${r.category ?? ""} ${r.description}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  // Counts for related drills/errors per technique (loose name match)
  const allDrills = await db.select({ name: drills.name, focus: drills.focus }).from(drills);
  const allErrors = await db
    .select({ techniqueName: commonErrors.techniqueName })
    .from(commonErrors);

  function relatedCounts(name: string) {
    const lower = name.toLowerCase();
    const numDrills = allDrills.filter(
      (d) => (d.focus ?? "").toLowerCase().includes(lower) || d.name.toLowerCase().includes(lower)
    ).length;
    const numErrors = allErrors.filter(
      (e) => (e.techniqueName ?? "").toLowerCase() === lower
    ).length;
    return { numDrills, numErrors };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons"
        description={`${filtered.length} lesson${filtered.length === 1 ? "" : "s"} from your knowledge base`}
      />

      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search lessons…"
          className="h-9 w-64 rounded-md border bg-background px-3 text-sm"
        />
        <select
          name="level"
          defaultValue={level ?? ""}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="elite">Elite</option>
        </select>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground"
        >
          Search
        </button>
        {(q || level) && (
          <Link
            href="/dashboard/lessons"
            className="h-9 inline-flex items-center rounded-md border px-3 text-sm"
          >
            Clear
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-3">📖</div>
            <h3 className="font-semibold text-lg">No lessons yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {rows.length === 0
                ? "Lessons are generated automatically when an admin ingests a source PDF."
                : "No lessons match your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const counts = relatedCounts(t.name);
            return (
              <Link key={t.id} href={`/dashboard/lessons/${t.id}`}>
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm leading-tight">{t.name}</h3>
                      {t.skillLevel && (
                        <span
                          className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
                            SKILL_STYLE[t.skillLevel] ?? "bg-muted"
                          }`}
                        >
                          {t.skillLevel}
                        </span>
                      )}
                    </div>
                    {t.category && (
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {t.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      {counts.numDrills > 0 && <span>🎯 {counts.numDrills} drills</span>}
                      {counts.numErrors > 0 && <span>⚠️ {counts.numErrors} errors</span>}
                      {t.sourceTitle && (
                        <span className="truncate">📚 {t.sourceTitle}</span>
                      )}
                    </div>
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {t.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
