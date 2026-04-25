import { desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { VideoUploader } from "@/components/video/video-uploader";
import { VideoActionsBar } from "@/components/video/video-actions-bar";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { videoAnalyses } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATE_STYLE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
};

function fmtSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default async function VideoAnalysisPage() {
  const user = await requireUser();
  const videos = await db
    .select()
    .from(videoAnalyses)
    .where(eq(videoAnalyses.userId, user.id))
    .orderBy(desc(videoAnalyses.createdAt))
    .limit(20);

  const hasInFlight = videos.some(
    (v) => v.status === "pending" || v.status === "processing"
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Video Analysis"
        description="Upload a stroke clip and get AI coaching feedback"
        actions={hasInFlight ? <AutoRefresh intervalMs={5000} /> : undefined}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upload a clip</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoUploader />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your clips</CardTitle>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No videos uploaded yet. Drop your first one above.
            </p>
          ) : (
            <ul className="space-y-4">
              {videos.map((v) => {
                const scores = v.rubricScores ?? {};
                const scoreKeys = Object.keys(scores);
                return (
                  <li key={v.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${STATE_STYLE[v.status] ?? "bg-muted"}`}
                          >
                            {v.status}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            {v.strokeType}
                          </span>
                          <p className="font-medium text-sm truncate">{v.fileName}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {new Date(v.createdAt).toLocaleString()} · {fmtSize(v.fileSize)}
                        </p>
                      </div>
                      <VideoActionsBar videoId={v.id} status={v.status} />
                    </div>

                    <video
                      src={v.blobUrl}
                      controls
                      preload="metadata"
                      className="w-full max-h-80 rounded-md bg-black"
                    />

                    {v.status === "processing" && (
                      <p className="text-xs text-muted-foreground">
                        Gemini is reviewing the clip…
                      </p>
                    )}

                    {v.status === "failed" && v.errorMessage && (
                      <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-md px-3 py-2">
                        {v.errorMessage}
                      </p>
                    )}

                    {v.status === "completed" && v.feedback && (
                      <div className="space-y-3">
                        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                          {v.feedback}
                        </div>

                        {scoreKeys.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Rubric (0–10)
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {scoreKeys.map((k) => {
                                const score = scores[k] ?? 0;
                                return (
                                  <div
                                    key={k}
                                    className="rounded-md border px-3 py-2 text-sm flex items-center justify-between gap-2"
                                  >
                                    <span className="capitalize text-muted-foreground">
                                      {k.replace(/_/g, " ")}
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                      {score.toFixed(1)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {v.keyTakeaways && v.keyTakeaways.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Key takeaways
                            </p>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                              {v.keyTakeaways.map((t, i) => (
                                <li key={i}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {v.drillSuggestions && v.drillSuggestions.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Drill suggestions
                            </p>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                              {v.drillSuggestions.map((d, i) => (
                                <li key={i}>{d}</li>
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
