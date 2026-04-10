import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

interface SourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SourceDetailPage({ params }: SourceDetailPageProps) {
  const { id } = await params;

  // TODO: Fetch source from database by id
  // For now, no sources exist so always show not found
  if (id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Source Detail" description="Source not found" />
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-sm text-muted-foreground">This source does not exist.</p>
        </CardContent>
      </Card>
    </div>
  );
}
