import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { VideoActionsBar } from "@/components/video/video-actions-bar";
import { AnalysisThinking } from "@/components/video/analysis-thinking";
import { DeleteSessionButton } from "@/components/video/delete-session-button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { practiceSessions, videoAnalyses } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATE_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

function avgScore(scores: Record<string, number>): number | null {
  const vals = Object.values(scores ?? {});
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 10); // 0-10 → 0-100
}

export default async function PracticeSessionPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await requireUser();

  const [session] = await db
    .select()
    .from(practiceSessions)
    .where(
      and(eq(practiceSessions.id, id), eq(practiceSessions.userId, user.id))
    )
    .limit(1);

  if (!session) notFound();

  const takes = await db
    .select()
    .from(videoAnalyses)
    .where(eq(videoAnalyses.sessionId, id))
    .orderBy(asc(videoAnalyses.takeNumber), asc(videoAnalyses.createdAt));

  const hasInFlight = takes.some(
    (t) => t.status === "pending" || t.status === "processing"
  );

  const scoredTakes = takes
    .map((t) => avgScore(t.rubricScores ?? {}))
    .filter((n): n is number => n !== null);
  const sessionAvg =
    scoredTakes.length > 0
      ? Math.round(
          scoredTakes.reduce((a, b) => a + b, 0) / scoredTakes.length
        )
      : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href="/dashboard/practice"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← All sessions
        </Link>
        <div className="flex items-center gap-2">
          {hasInFlight && <AutoRefresh intervalMs={5000} />}
          <DeleteSessionButton sessionId={session.id} />
        </div>
      </div>

      <PageHeader
        title={`${session.strokeType.charAt(0).toUpperCase()}${session.strokeType.slice(1)} · ${session.plannedReps} ${session.plannedReps === 1 ? "rep" : "reps"}`}
        description={`${new Date(session.createdAt).toLocaleString()}${session.notes ? ` · ${session.notes}` : ""}`}
      />

      {sessionAvg !== null && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Session average
              </p>
              <p className="text-3xl font-bold">{sessionAvg}%</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{scoredTakes.length} of {takes.length} analyzed</p>
              {scoredTakes.length > 1 && (
                <p>
                  Best take: {Math.max(...scoredTakes)}% · Lowest:{" "}
                  {Math.min(...scoredTakes)}%
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Takes</CardTitle>
        </CardHeader>
        <CardContent>
          {takes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No takes uploaded yet for this session.
            </p>
          ) : (
            <ul className="space-y-4">
              {takes.map((v) => {
                const score = avgScore(v.rubricScores ?? {});
                const scoreKeys = Object.keys(v.rubricScores ?? {});
                return (
                  <li key={v.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold tabular-nums">
                            #{v.takeNumber ?? "?"}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${STATE_STYLE[v.status] ?? "bg-muted"}`}
                          >
                            {v.status}
                          </span>
                          {score !== null && (
                            <span className="text-[10px] font-bold tabular-nums bg-foreground text-background px-2 py-0.5 rounded">
                              {score}%
                            </span>
                          )}
                        </div>
                      </div>
                      <VideoActionsBar videoId={v.id} status={v.status} />
                    </div>

                    <video
                      src={v.blobUrl}
                      controls
                      preload="metadata"
                      className="w-full max-h-72 rounded-md bg-black"
                    />
                    <a
                      href={v.blobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-muted-foreground hover:underline break-all block"
                    >
                      Open raw video: {v.blobUrl}
                    </a>

                    {(v.status === "processing" || v.status === "pending") && (
                      <AnalysisThinking startedAt={v.createdAt} />
                    )}

                    {v.status === "failed" && (
                      <div className="rounded-md border border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30 p-3 space-y-2">
                        <p className="text-xs text-rose-700 dark:text-rose-300 whitespace-pre-wrap break-words">
                          {v.errorMessage ||
                            "Analysis failed but no error message was captured. Check Vercel function logs (search for [runVideoAnalysis])."}
                        </p>
                        <VideoActionsBar videoId={v.id} status={v.status} />
                      </div>
                    )}

                    {v.status === "completed" && v.feedback && (
                      <div className="space-y-3">
                        <div className="text-sm whitespace-pre-wrap">
                          {v.feedback}
                        </div>
                        {scoreKeys.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {scoreKeys.map((k) => {
                              const sc = (v.rubricScores ?? {})[k] ?? 0;
                              return (
                                <div
                                  key={k}
                                  className="rounded-md border px-3 py-2 text-sm flex items-center justify-between gap-2"
                                >
                                  <span className="capitalize text-muted-foreground">
                                    {k.replace(/_/g, " ")}
                                  </span>
                                  <span className="font-semibold tabular-nums">
                                    {Math.round(sc * 10)}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {v.keyTakeaways && v.keyTakeaways.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Key fixes
                            </p>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                              {v.keyTakeaways.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
