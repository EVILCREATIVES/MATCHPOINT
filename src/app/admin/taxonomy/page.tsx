import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function TaxonomyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxonomy"
        description="Manage categories, subcategories, and tags for the knowledge base"
        actions={<Button>+ Add Category</Button>}
      />

      {/* Search */}
      <Input placeholder="Search categories…" className="max-w-sm" />

      {/* Empty State */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-4xl mb-3">📂</div>
          <h3 className="font-semibold">No categories yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Create categories to organize your knowledge base. Categories help structure sources
            and make content easier to find.
          </p>
          <Button className="mt-4">+ Add Category</Button>
        </CardContent>
      </Card>

      {/* Tag Cloud */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tags</CardTitle>
            <Button variant="outline" size="sm">
              + Add Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No tags yet. Tags will appear here as you add them to sources.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
