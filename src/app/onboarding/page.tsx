"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const progress = (step / TOTAL_STEPS) * 100;

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Logo size="sm" />
          <span className="text-xs text-muted-foreground">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-4">
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Welcome to MATCHPOINT</CardTitle>
                <CardDescription>
                  Let&apos;s set up your tennis profile. This helps us create personalized training
                  plans tailored to your level, goals, and schedule.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Age</label>
                    <Input type="number" placeholder="28" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender (optional)</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Input placeholder="United States" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Timezone</label>
                    <Input placeholder="America/New_York" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Tennis Background</CardTitle>
                <CardDescription>
                  Tell us about your experience and current level.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tennis Level</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "beginner", label: "Beginner", desc: "Learning the basics" },
                      { value: "intermediate", label: "Intermediate", desc: "Consistent rallying, developing game" },
                      { value: "advanced", label: "Advanced", desc: "Tournament-level, refined strokes" },
                      { value: "elite", label: "Elite", desc: "Competitive/pro-level training" },
                    ].map((level) => (
                      <div
                        key={level.value}
                        className="rounded-md border p-3 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <p className="text-sm font-medium">{level.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{level.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Years Playing</label>
                    <Input type="number" placeholder="4" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dominant Hand</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                      <option value="ambidextrous">Ambidextrous</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fitness Level</label>
                  <div className="grid grid-cols-4 gap-3">
                    {["Low", "Moderate", "High", "Athletic"].map((level) => (
                      <div
                        key={level}
                        className="rounded-md border p-2 text-center cursor-pointer hover:border-primary/50 transition-colors text-sm"
                      >
                        {level}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Goals</CardTitle>
                <CardDescription>
                  What do you want to improve? Select all that apply or write your own.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    "Improve forehand",
                    "Improve backhand",
                    "Better serve",
                    "Footwork & speed",
                    "Net game",
                    "Consistency",
                    "Match strategy",
                    "Mental toughness",
                    "Physical conditioning",
                    "Return of serve",
                    "Topspin technique",
                    "Slice control",
                    "Win more matches",
                    "Tournament prep",
                    "Doubles skills",
                  ].map((goal) => (
                    <Badge
                      key={goal}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1.5 px-3"
                    >
                      {goal}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Other Goals</label>
                  <Textarea placeholder="Describe any specific goals…" rows={3} />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Training Availability</CardTitle>
                <CardDescription>
                  How often and how long can you train?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Training Days / Week</label>
                    <Input type="number" placeholder="4" min={1} max={7} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minutes / Session</label>
                    <Input type="number" placeholder="90" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Equipment Access</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      I have court access
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      I have a coach
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      I have a ball machine
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Physical Limitations / Injuries</label>
                  <Input placeholder="e.g., shoulder tightness, knee concern…" />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Training Preferences</CardTitle>
                <CardDescription>
                  Final step — how do you like to learn and train?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Learning Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "visual", label: "Visual", desc: "Videos, diagrams, demonstrations" },
                      { value: "reading", label: "Reading", desc: "Written guides and analysis" },
                      { value: "kinesthetic", label: "Kinesthetic", desc: "Learn by doing, drills-first" },
                      { value: "mixed", label: "Mixed", desc: "Combination of all styles" },
                    ].map((style) => (
                      <div
                        key={style.value}
                        className="rounded-md border p-3 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <p className="text-sm font-medium">{style.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{style.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan Intensity</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { value: "light", label: "Light" },
                      { value: "moderate", label: "Moderate" },
                      { value: "intense", label: "Intense" },
                      { value: "elite", label: "Elite" },
                    ].map((intensity) => (
                      <div
                        key={intensity.value}
                        className="rounded-md border p-2 text-center cursor-pointer hover:border-primary/50 transition-colors text-sm"
                      >
                        {intensity.label}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={prev} disabled={step === 1}>
              ← Back
            </Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={next}>Continue →</Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard">Complete Setup →</Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
