import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LessonsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons"
        description="Structured tennis knowledge modules to develop your game"
      />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search lessons…" className="w-64" />
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-4xl mb-3">📖</div>
          <h3 className="font-semibold text-lg">No lessons available yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Lessons will be generated from the knowledge base once sources are ingested
            by an admin. Check back soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
