import { and, desc, eq, gt, count } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GeneratePlanButton } from "@/components/training/generate-plan-button";
import { db } from "@/lib/db";
import { trainingPlans, trainingSessions, sources, techniques } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SESSION_ICON: Record<string, string> = {
  technical: "🎯",
  footwork: "🦶",
  conditioning: "💪",
  tactical: "🧠",
  match_prep: "🏆",
  recovery: "🧘",
  drill: "🎾",
  serve_practice: "🚀",
};

interface ExerciseShape {
  title?: string;
  description?: string;
  durationMinutes?: number;
  sets?: number | null;
  reps?: number | null;
}

export default async function TrainingPage() {
  const user = await getCurrentUser();

  const [active] = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.userId, user.id), eq(trainingPlans.isActive, true)))
    .orderBy(desc(trainingPlans.createdAt))
    .limit(1);

  const sessions = active
    ? await db
        .select()
        .from(trainingSessions)
        .where(eq(trainingSessions.planId, active.id))
        .orderBy(trainingSessions.dayOfWeek, trainingSessions.sortOrder)
    : [];

  // "Stale" detection: have new sources been ingested since the plan was made?
  const [{ value: techniqueCount } = { value: 0 }] = await db
    .select({ value: count() })
    .from(techniques);

  let newSourcesSince = 0;
  if (active) {
    const [{ value } = { value: 0 }] = await db
      .select({ value: count() })
      .from(sources)
      .where(
        and(eq(sources.ingestionState, "completed"), gt(sources.updatedAt, active.createdAt))
      );
    newSourcesSince = value;
  }

  const hasKnowledge = techniqueCount > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Plan"
        description={
          active
            ? `Active ${active.period} plan generated ${new Date(active.createdAt).toLocaleString()}`
            : "Your personalized AI-generated training program"
        }
        actions={<GeneratePlanButton variant={active ? "outline" : "default"} />}
      />

      {!hasKnowledge && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 text-sm">
            ⚠️ The knowledge base is empty. Ask an admin to ingest at least one source PDF
            so the AI has tennis content to draw on when generating your plan.
          </CardContent>
        </Card>
      )}

      {active && newSourcesSince > 0 && (
        <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-4 text-sm flex items-center justify-between gap-4">
            <span>
              📚 {newSourcesSince} new source{newSourcesSince === 1 ? "" : "s"} have been
              ingested since this plan was generated. Regenerate to incorporate them.
            </span>
            <GeneratePlanButton label="Regenerate" />
          </CardContent>
        </Card>
      )}

      {!active ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div className="text-4xl">🎯</div>
            <div>
              <h3 className="font-semibold text-lg">No training plan yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Generate a personalized weekly plan based on your profile and the ingested
                tennis knowledge base.
              </p>
            </div>
            <GeneratePlanButton />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{active.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{active.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{active.skillLevel}</Badge>
                <Badge variant="outline" className="capitalize">{active.intensity} intensity</Badge>
                {active.focusAreas?.map((f) => (
                  <Badge key={f} variant="outline">{f}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {sessions.map((s) => {
              const exercises = (s.exercises as ExerciseShape[] | null) ?? [];
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <span>{SESSION_ICON[s.sessionType] ?? "🎾"}</span>
                          {DAYS[s.dayOfWeek] ?? `Day ${s.dayOfWeek + 1}`} — {s.title}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {s.sessionType.replace(/_/g, " ")} · {s.durationMinutes} min
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {s.description && (
                      <p className="text-muted-foreground">{s.description}</p>
                    )}
                    {s.warmup && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Warmup</p>
                        <p>{s.warmup}</p>
                      </div>
                    )}
                    {exercises.length > 0 && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Exercises</p>
                        <ul className="space-y-2">
                          {exercises.map((ex, i) => (
                            <li key={i} className="border-l-2 border-primary/30 pl-3">
                              <p className="font-medium text-sm">{ex.title ?? `Exercise ${i + 1}`}</p>
                              {ex.description && (
                                <p className="text-xs text-muted-foreground">{ex.description}</p>
                              )}
                              <p className="text-[11px] text-muted-foreground">
                                {[ex.durationMinutes ? `${ex.durationMinutes} min` : null,
                                  ex.sets ? `${ex.sets} sets` : null,
                                  ex.reps ? `${ex.reps} reps` : null]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.cooldown && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cooldown</p>
                        <p>{s.cooldown}</p>
                      </div>
                    )}
                    {s.coachNotes && (
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Coach notes</p>
                        <p className="text-sm">{s.coachNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
