import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

interface LessonDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LessonDetailPage({ params }: LessonDetailPageProps) {
  const { slug } = await params;

  // TODO: Fetch lesson from database by slug
  // For now, no lessons exist so always show not found
  if (slug) {
    notFound();
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-3">
        <Link
          href="/dashboard/lessons"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Lessons
        </Link>
      </div>
      <PageHeader title="Lesson" description="Lesson not found" />
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">This lesson does not exist.</p>
        </CardContent>
      </Card>
    </div>
  );
}
