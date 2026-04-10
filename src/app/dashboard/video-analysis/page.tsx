import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function VideoAnalysisPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Video Analysis"
        description="AI-powered technique analysis for your tennis game"
      />

      <Card className="border-dashed">
        <CardContent className="p-12 text-center space-y-6">
          <div className="text-6xl">🎥</div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Coming Soon</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Upload videos of your strokes and get AI-powered analysis of your technique,
              posture, movement patterns, and comparison against ideal form.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto text-left">
            {[
              { icon: "🏋️", title: "Posture Analysis", desc: "Body alignment and stance evaluation" },
              { icon: "🦶", title: "Movement Tracking", desc: "Footwork pattern and court coverage" },
              { icon: "🎾", title: "Stroke Comparison", desc: "Compare against pro technique models" },
              { icon: "📊", title: "Improvement Tracking", desc: "Track technique changes over time" },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3 rounded-md border p-3">
                <span className="text-xl">{feature.icon}</span>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Placeholder */}
          <div className="border-2 border-dashed rounded-lg p-8 max-w-md mx-auto">
            <div className="text-3xl mb-2">📤</div>
            <p className="text-sm font-medium">Upload a swing video</p>
            <p className="text-xs text-muted-foreground mt-1">MP4, MOV · Max 100 MB</p>
            <Button className="mt-4" disabled>
              Upload Video
            </Button>
          </div>

          <Badge variant="secondary" className="text-xs">
            Available in Phase 2
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
