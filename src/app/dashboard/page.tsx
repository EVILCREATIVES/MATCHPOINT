import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UserDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome to MATCHPOINT"
        description="Your AI-powered tennis training platform"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Sessions Done" value={0} description="No sessions yet" />
        <StatCard title="Completion" value="—" description="Complete sessions to track" />
        <StatCard title="Current Streak" value="0 days" description="Start training!" />
        <StatCard title="Level" value="—" description="Complete your profile" />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* No Session */}
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">🎾</div>
              <h3 className="font-semibold text-lg">No training plan yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Complete your profile and generate your first AI-powered training plan
                to start seeing sessions here.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                <Button asChild>
                  <Link href="/dashboard/profile">Complete Profile</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/training">View Training</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">This Week</CardTitle>
                <Link
                  href="/dashboard/progress"
                  className="text-xs text-primary font-medium hover:underline"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-6">
                No activity this week. Start a training session to track progress.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Goals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                No goals set yet. Add goals in your profile.
              </p>
            </CardContent>
          </Card>

          {/* Recommended */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                Lesson recommendations will appear once you have an active training plan.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
