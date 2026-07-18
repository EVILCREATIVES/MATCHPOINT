"use client";

export interface ExerciseRec {
  name: string;
  why: string;
  url: string;
  source: "curated" | "youtube";
  mediaType: "video" | "image" | "search";
}

export interface BodyAdvice {
  summary: string;
  potentialCauses: string[];
  selfCare: string[];
  exercises: ExerciseRec[];
  whenToSeeDoctor: string[];
  disclaimer: string;
}

function Section({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </h3>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-primary">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MEDIA_ICON: Record<ExerciseRec["mediaType"], string> = {
  video: "▶️",
  image: "🖼️",
  search: "🔎",
};

export function AdviceView({ advice }: { advice: BodyAdvice }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">{advice.summary}</p>

      <Section icon="🧭" title="Potential causes" items={advice.potentialCauses} />
      <Section icon="🩹" title="Self-care" items={advice.selfCare} />

      {advice.exercises?.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            🏋️ Suggested exercises
          </h3>
          <div className="space-y-2">
            {advice.exercises.map((ex, i) => (
              <a
                key={i}
                href={ex.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-md border p-2.5 transition-colors hover:bg-accent"
              >
                <span className="text-base">{MEDIA_ICON[ex.mediaType]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{ex.name}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {ex.source === "curated" ? "curated" : "video search"}
                    </span>
                  </div>
                  {ex.why && <p className="text-xs text-muted-foreground">{ex.why}</p>}
                </div>
                <span className="text-xs text-muted-foreground">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {advice.whenToSeeDoctor?.length > 0 && (
        <div className="rounded-md border border-rose-300/60 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
            🚨 See a professional if…
          </h3>
          <ul className="space-y-1">
            {advice.whenToSeeDoctor.map((it, i) => (
              <li key={i} className="flex gap-2 text-sm text-rose-800 dark:text-rose-200">
                <span>•</span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t pt-3 text-[11px] italic leading-relaxed text-muted-foreground">
        {advice.disclaimer}
      </p>
    </div>
  );
}
