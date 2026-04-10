import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SkillBadge } from "@/components/shared/status-badges";
import { lessons, categories } from "@/lib/mock-data";

export default function LessonsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons"
        description="Structured tennis knowledge modules to develop your game"
      />

      {/* Search and Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search lessons…" className="w-64" />
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <Badge variant="outline" className="cursor-pointer hover:bg-accent whitespace-nowrap">
            All
          </Badge>
          {categories.slice(0, 8).map((cat) => (
            <Badge
              key={cat.id}
              variant="outline"
              className="cursor-pointer hover:bg-accent whitespace-nowrap"
            >
              {cat.icon} {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((lesson) => {
          const category = categories.find((c) => c.id === lesson.categoryId);
          return (
            <Link key={lesson.id} href={`/dashboard/lessons/${lesson.slug}`}>
              <Card className="h-full hover:border-primary/30 transition-colors cursor-pointer group">
                <CardContent className="p-5 flex flex-col h-full">
                  {/* Category & Level */}
                  <div className="flex items-center justify-between mb-3">
                    {category && (
                      <span className="text-xs text-muted-foreground">
                        {category.icon} {category.name}
                      </span>
                    )}
                    <SkillBadge level={lesson.skillLevel} />
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 flex-1 line-clamp-2">
                    {lesson.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      ⏱ {lesson.estimatedMinutes} min
                    </span>
                    <div className="flex gap-1">
                      {lesson.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
