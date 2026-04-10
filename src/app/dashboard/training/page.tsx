import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Plan"
        description="Your personalized AI-generated training program"
        actions={
          <Button variant="outline">Generate New Plan</Button>
        }
      />

      {/* Empty State */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="font-semibold text-lg">No training plan yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Once your profile is complete and the AI model is configured, you can generate
            a personalized training plan tailored to your skill level, goals, and availability.
          </p>
          <Button className="mt-4">Generate Training Plan</Button>
        </CardContent>
      </Card>
    </div>
  );
}
