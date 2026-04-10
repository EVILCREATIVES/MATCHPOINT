import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { categories } from "@/lib/mock-data";
import { sources } from "@/lib/mock-data";

export default function TaxonomyPage() {
  const getCategorySourceCount = (catId: string) =>
    sources.filter((s) => s.categoryId === catId).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taxonomy"
        description="Manage categories, subcategories, and tags for the knowledge base"
        actions={<Button>+ Add Category</Button>}
      />

      {/* Search */}
      <Input placeholder="Search categories…" className="max-w-sm" />

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const count = getCategorySourceCount(category.id);
          return (
            <Card key={category.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{category.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {category.slug}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {count} {count === 1 ? "source" : "sources"}
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {category.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(sources.flatMap((s) => s.tags))).map((tag) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-accent">
                {tag}
                <span className="ml-1.5 text-muted-foreground">
                  {sources.filter((s) => s.tags.includes(tag)).length}
                </span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
