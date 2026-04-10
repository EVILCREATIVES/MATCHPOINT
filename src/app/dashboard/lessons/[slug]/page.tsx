import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/shared/status-badges";
import { lessons, categories } from "@/lib/mock-data";

interface LessonDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LessonDetailPage({ params }: LessonDetailPageProps) {
  const { slug } = await params;
  const lesson = lessons.find((l) => l.slug === slug);

  if (!lesson) {
    notFound();
  }

  const category = categories.find((c) => c.id === lesson.categoryId);
  const relatedLessons = lessons.filter((l) =>
    lesson.content.relatedLessonIds.includes(l.id)
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/dashboard/lessons"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Lessons
          </Link>
          {category && (
            <>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs text-muted-foreground">
                {category.icon} {category.name}
              </span>
            </>
          )}
        </div>
        <PageHeader
          title={lesson.title}
          description={lesson.description}
        />
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <SkillBadge level={lesson.skillLevel} />
          <Badge variant="secondary">⏱ {lesson.estimatedMinutes} min</Badge>
          {lesson.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Main Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {lesson.content.explanation}
          </p>
        </CardContent>
      </Card>

      {/* Key Points */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Points</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {lesson.content.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Step-by-Step */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step-by-Step Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {lesson.content.steps.map((step, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <h4 className="font-semibold text-sm">{step.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground ml-10">{step.description}</p>
              {step.imageUrl && (
                <div className="ml-10 rounded-lg bg-muted/50 h-48 flex items-center justify-center text-xs text-muted-foreground border">
                  📷 Visual / Animation placeholder
                </div>
              )}
              {i < lesson.content.steps.length - 1 && <Separator className="ml-10 mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Common Mistakes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Mistakes to Avoid</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {lesson.content.commonMistakes.map((mistake, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-destructive flex-shrink-0 mt-0.5">✕</span>
                <span className="text-muted-foreground">{mistake}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Recommended Drills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Drills</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {lesson.content.recommendedDrills.map((drill, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-primary flex-shrink-0 mt-0.5">◆</span>
                <span className="text-muted-foreground">{drill}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Video Placeholder */}
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-3">🎥</div>
          <h3 className="font-semibold">Video Analysis — Coming Soon</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Visual demonstrations, technique comparisons, and video analysis for this lesson
            will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Related Lessons */}
      {relatedLessons.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold">Related Lessons</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedLessons.map((related) => (
              <Link key={related.id} href={`/dashboard/lessons/${related.slug}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm">{related.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{related.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <SkillBadge level={related.skillLevel} />
                      <span className="text-xs text-muted-foreground">
                        ⏱ {related.estimatedMinutes} min
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
