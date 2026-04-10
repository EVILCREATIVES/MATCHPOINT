import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function SourcesListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Sources"
        description="0 sources in the knowledge base"
        actions={
          <Button asChild>
            <Link href="/admin/sources/new">+ Add Source</Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search sources…" className="w-64" />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">All</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">📄 PDF</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">🌐 Web</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">▶️ YouTube</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent">✏️ Manual</Badge>
        </div>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="font-semibold">No sources yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Add your first knowledge source — PDFs, websites, YouTube videos, or manual entries.
            Sources are processed and indexed for AI-powered training plan generation.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/admin/sources/new">+ Add First Source</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

