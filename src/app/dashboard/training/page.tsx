import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoTrainingPlan } from "@/lib/mock-data";

export default function TrainingPage() {
  const plan = demoTrainingPlan;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Plan"
        description={plan.description}
        actions={
          <Button variant="outline">Generate New Plan</Button>
        }
      />

      {/* Plan Meta */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="court">{plan.period}</Badge>
        <Badge variant="secondary">{plan.skillLevel}</Badge>
        <Badge variant="secondary">{plan.intensity} intensity</Badge>
        {plan.focusAreas.map((area) => (
          <Badge key={area} variant="outline">{area}</Badge>
        ))}
      </div>

      {/* Sessions */}
      <Tabs defaultValue={plan.sessions[0]?.id} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          {plan.sessions.map((session) => {
            const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][session.dayOfWeek];
            return (
              <TabsTrigger key={session.id} value={session.id} className="min-w-fit">
                <span className="mr-1.5">{dayName}</span>
                <span className="hidden sm:inline text-muted-foreground">·</span>
                <span className="hidden sm:inline ml-1.5 text-xs text-muted-foreground">
                  {session.sessionType.replace("_", " ")}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {plan.sessions.map((session) => (
          <TabsContent key={session.id} value={session.id}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary">⏱ {session.durationMinutes} min</Badge>
                    <Badge variant="court">{session.sessionType.replace("_", " ")}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Warmup */}
                {session.warmup && (
                  <div className="rounded-md bg-muted/30 p-4 border-l-2 border-warning">
                    <p className="text-xs font-semibold uppercase tracking-wider text-warning mb-1">
                      Warm-Up
                    </p>
                    <p className="text-sm text-muted-foreground">{session.warmup}</p>
                  </div>
                )}

                {/* Exercises */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Exercises
                  </h4>
                  {session.exercises.map((exercise, i) => (
                    <div key={exercise.id} className="rounded-md border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              {i + 1}
                            </span>
                            <h5 className="font-semibold text-sm">{exercise.title}</h5>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-8">
                            {exercise.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 ml-8 text-xs text-muted-foreground">
                        {exercise.durationMinutes && <span>⏱ {exercise.durationMinutes} min</span>}
                        {exercise.sets && <span>Sets: {exercise.sets}</span>}
                        {exercise.reps && <span>Reps: {exercise.reps}</span>}
                        {exercise.restSeconds && <span>Rest: {exercise.restSeconds}s</span>}
                        <Badge variant="secondary" className="text-[10px]">{exercise.category}</Badge>
                      </div>

                      {exercise.tips.length > 0 && (
                        <div className="ml-8 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Tips:</p>
                          <ul className="space-y-0.5">
                            {exercise.tips.map((tip, j) => (
                              <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">·</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cooldown */}
                {session.cooldown && (
                  <div className="rounded-md bg-muted/30 p-4 border-l-2 border-blue-400">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
                      Cool-Down
                    </p>
                    <p className="text-sm text-muted-foreground">{session.cooldown}</p>
                  </div>
                )}

                {/* Coach Notes */}
                {session.coachNotes && (
                  <div className="rounded-md bg-muted/30 p-4 border-l-2 border-primary">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                      Coach Notes
                    </p>
                    <p className="text-sm text-muted-foreground">{session.coachNotes}</p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm">
                    Log as Skipped
                  </Button>
                  <Button size="sm">Mark Completed ✓</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
