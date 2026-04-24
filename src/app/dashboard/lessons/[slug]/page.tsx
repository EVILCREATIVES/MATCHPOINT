import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, sql, or, ilike } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { techniques, drills, commonErrors, sources } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LessonDetailPageProps {
  params: Promise<{ slug: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LessonDetailPage({ params }: LessonDetailPageProps) {
  const { slug } = await params;

  if (!UUID_RE.test(slug)) notFound();

  const [technique] = await db
    .select({
      id: techniques.id,
      name: techniques.name,
      category: techniques.category,
      skillLevel: techniques.skillLevel,
      description: techniques.description,
      keyPoints: techniques.keyPoints,
      tags: techniques.tags,
      createdAt: techniques.createdAt,
      sourceId: techniques.sourceId,
      sourceTitle: sources.title,
      sourceAuthor: sources.author,
    })
    .from(techniques)
    .leftJoin(sources, sql`${techniques.sourceId} = ${sources.id}`)
    .where(eq(techniques.id, slug))
    .limit(1);

  if (!technique) notFound();

  const lower = `%${technique.name.toLowerCase()}%`;

  const [relatedDrills, relatedErrors] = await Promise.all([
    db
      .select()
      .from(drills)
      .where(or(ilike(drills.focus, lower), ilike(drills.name, lower)))
      .limit(20),
    db
      .select()
      .from(commonErrors)
      .where(ilike(commonErrors.techniqueName, technique.name))
      .limit(20),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/lessons"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Lessons
        </Link>
      </div>

      <PageHeader
        title={technique.name}
        description={technique.category || "Tennis technique"}
      />

      <div className="flex flex-wrap items-center gap-2">
        {technique.skillLevel && (
          <Badge variant="outline" className="capitalize">{technique.skillLevel}</Badge>
        )}
        {technique.tags?.map((t) => (
          <Badge key={t} variant="outline">{t}</Badge>
        ))}
        {technique.sourceTitle && (
          <span className="text-xs text-muted-foreground">
            From <em>{technique.sourceTitle}</em>
            {technique.sourceAuthor ? ` by ${technique.sourceAuthor}` : ""}
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {technique.description}
          </p>
        </CardContent>
      </Card>

      {technique.keyPoints && technique.keyPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Points</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              {technique.keyPoints.map((kp, i) => (
                <li key={i}>{kp}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {relatedErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Common Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {relatedErrors.map((e) => (
              <div key={e.id} className="space-y-1.5">
                <h4 className="text-sm font-semibold">⚠️ {e.errorName}</h4>
                <p className="text-sm text-muted-foreground">{e.description}</p>
                {e.cause && (
                  <p className="text-xs"><span className="font-medium">Cause:</span> {e.cause}</p>
                )}
                {e.fix && (
                  <p className="text-xs"><span className="font-medium">Fix:</span> {e.fix}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {relatedDrills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Drills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {relatedDrills.map((d) => (
              <div key={d.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">🎯 {d.name}</h4>
                  {d.skillLevel && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {d.skillLevel}
                    </Badge>
                  )}
                  {d.durationMinutes && (
                    <span className="text-xs text-muted-foreground">
                      {d.durationMinutes} min
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{d.description}</p>
                {d.setup && (
                  <p className="text-xs"><span className="font-medium">Setup:</span> {d.setup}</p>
                )}
                {d.instructions && d.instructions.length > 0 && (
                  <ol className="list-decimal pl-5 text-xs space-y-0.5">
                    {d.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
                {d.equipment && d.equipment.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Equipment: {d.equipment.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
