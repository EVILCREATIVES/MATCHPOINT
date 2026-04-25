"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const TOTAL_STEPS = 5;

const LEVELS = [
  { value: "beginner", label: "Beginner", desc: "Learning the basics" },
  { value: "intermediate", label: "Intermediate", desc: "Consistent rallying, developing game" },
  { value: "advanced", label: "Advanced", desc: "Tournament-level, refined strokes" },
  { value: "elite", label: "Elite", desc: "Competitive/pro-level training" },
] as const;

const FITNESS = ["low", "moderate", "high", "athletic"] as const;
const STYLES = [
  { value: "visual", label: "Visual", desc: "Videos, diagrams, demonstrations" },
  { value: "reading", label: "Reading", desc: "Written guides and analysis" },
  { value: "kinesthetic", label: "Kinesthetic", desc: "Learn by doing, drills-first" },
  { value: "mixed", label: "Mixed", desc: "Combination of all styles" },
] as const;
const INTENSITY = ["light", "moderate", "intense", "elite"] as const;

const GOAL_OPTIONS = [
  "Improve forehand", "Improve backhand", "Better serve", "Footwork & speed",
  "Net game", "Consistency", "Match strategy", "Mental toughness",
  "Physical conditioning", "Return of serve", "Topspin technique",
  "Slice control", "Win more matches", "Tournament prep", "Doubles skills",
];

interface FormState {
  age: string;
  gender: string;
  country: string;
  timezone: string;
  tennisLevel: typeof LEVELS[number]["value"];
  yearsPlaying: string;
  dominantHand: "left" | "right" | "ambidextrous";
  fitnessLevel: typeof FITNESS[number];
  goalsSelected: Set<string>;
  otherGoals: string;
  availableTrainingDays: string;
  availableMinutesPerSession: string;
  hasCourtAccess: boolean;
  hasCoachAccess: boolean;
  hasBallMachine: boolean;
  physicalLimitations: string;
  preferredLearningStyle: typeof STYLES[number]["value"];
  preferredPlanIntensity: typeof INTENSITY[number];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    age: "",
    gender: "",
    country: "",
    timezone: typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "",
    tennisLevel: "intermediate",
    yearsPlaying: "2",
    dominantHand: "right",
    fitnessLevel: "moderate",
    goalsSelected: new Set<string>(),
    otherGoals: "",
    availableTrainingDays: "3",
    availableMinutesPerSession: "60",
    hasCourtAccess: false,
    hasCoachAccess: false,
    hasBallMachine: false,
    physicalLimitations: "",
    preferredLearningStyle: "mixed",
    preferredPlanIntensity: "moderate",
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleGoal = (g: string) => {
    setForm((f) => {
      const next = new Set(f.goalsSelected);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return { ...f, goalsSelected: next };
    });
  };

  const progress = (step / TOTAL_STEPS) * 100;
  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const goals = Array.from(form.goalsSelected);
      if (form.otherGoals.trim()) goals.push(form.otherGoals.trim());

      const payload = {
        age: form.age ? parseInt(form.age, 10) : undefined,
        gender: form.gender || undefined,
        country: form.country || undefined,
        timezone: form.timezone || undefined,
        tennisLevel: form.tennisLevel,
        yearsPlaying: parseInt(form.yearsPlaying || "0", 10),
        dominantHand: form.dominantHand,
        fitnessLevel: form.fitnessLevel,
        currentGoals: goals,
        availableTrainingDays: parseInt(form.availableTrainingDays || "3", 10),
        availableMinutesPerSession: parseInt(form.availableMinutesPerSession || "60", 10),
        hasCourtAccess: form.hasCourtAccess,
        hasCoachAccess: form.hasCoachAccess,
        hasBallMachine: form.hasBallMachine,
        physicalLimitations: form.physicalLimitations || undefined,
        preferredLearningStyle: form.preferredLearningStyle,
        preferredPlanIntensity: form.preferredPlanIntensity,
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      router.push(json.redirect || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Logo size="sm" />
          <span className="text-xs text-muted-foreground">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-6 pt-4">
        <Progress value={progress} className="h-1.5" />
      </div>

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
                    <Input
                      type="number"
                      placeholder="28"
                      value={form.age}
                      onChange={(e) => update("age", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender (optional)</label>
                    <select
                      value={form.gender}
                      onChange={(e) => update("gender", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country</label>
                    <Input
                      placeholder="United States"
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Timezone</label>
                    <Input
                      placeholder="America/New_York"
                      value={form.timezone}
                      onChange={(e) => update("timezone", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Tennis Background</CardTitle>
                <CardDescription>Tell us about your experience and current level.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tennis Level</label>
                  <div className="grid grid-cols-2 gap-3">
                    {LEVELS.map((level) => {
                      const selected = form.tennisLevel === level.value;
                      return (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => update("tennisLevel", level.value)}
                          className={`text-left rounded-md border p-3 transition-colors ${
                            selected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                          }`}
                        >
                          <p className="text-sm font-medium">{level.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{level.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Years Playing</label>
                    <Input
                      type="number"
                      placeholder="4"
                      value={form.yearsPlaying}
                      onChange={(e) => update("yearsPlaying", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dominant Hand</label>
                    <select
                      value={form.dominantHand}
                      onChange={(e) => update("dominantHand", e.target.value as FormState["dominantHand"])}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="right">Right</option>
                      <option value="left">Left</option>
                      <option value="ambidextrous">Ambidextrous</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fitness Level</label>
                  <div className="grid grid-cols-4 gap-3">
                    {FITNESS.map((level) => {
                      const selected = form.fitnessLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => update("fitnessLevel", level)}
                          className={`rounded-md border p-2 text-center text-sm capitalize transition-colors ${
                            selected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
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
                  {GOAL_OPTIONS.map((goal) => {
                    const selected = form.goalsSelected.has(goal);
                    return (
                      <Badge
                        key={goal}
                        variant={selected ? "default" : "outline"}
                        onClick={() => toggleGoal(goal)}
                        className="cursor-pointer py-1.5 px-3"
                      >
                        {goal}
                      </Badge>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Other Goals</label>
                  <Textarea
                    placeholder="Describe any specific goals…"
                    rows={3}
                    value={form.otherGoals}
                    onChange={(e) => update("otherGoals", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Training Availability</CardTitle>
                <CardDescription>How often and how long can you train?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Training Days / Week</label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={form.availableTrainingDays}
                      onChange={(e) => update("availableTrainingDays", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minutes / Session</label>
                    <Input
                      type="number"
                      min={15}
                      max={360}
                      value={form.availableMinutesPerSession}
                      onChange={(e) => update("availableMinutesPerSession", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Equipment Access</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={form.hasCourtAccess}
                        onChange={(e) => update("hasCourtAccess", e.target.checked)}
                      />
                      I have court access
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={form.hasCoachAccess}
                        onChange={(e) => update("hasCoachAccess", e.target.checked)}
                      />
                      I have a coach
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={form.hasBallMachine}
                        onChange={(e) => update("hasBallMachine", e.target.checked)}
                      />
                      I have a ball machine
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Physical Limitations / Injuries</label>
                  <Input
                    placeholder="e.g., shoulder tightness, knee concern…"
                    value={form.physicalLimitations}
                    onChange={(e) => update("physicalLimitations", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Training Preferences</CardTitle>
                <CardDescription>Final step — how do you like to learn and train?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred Learning Style</label>
                  <div className="grid grid-cols-2 gap-3">
                    {STYLES.map((style) => {
                      const selected = form.preferredLearningStyle === style.value;
                      return (
                        <button
                          key={style.value}
                          type="button"
                          onClick={() => update("preferredLearningStyle", style.value)}
                          className={`text-left rounded-md border p-3 transition-colors ${
                            selected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                          }`}
                        >
                          <p className="text-sm font-medium">{style.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{style.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan Intensity</label>
                  <div className="grid grid-cols-4 gap-3">
                    {INTENSITY.map((intensity) => {
                      const selected = form.preferredPlanIntensity === intensity;
                      return (
                        <button
                          key={intensity}
                          type="button"
                          onClick={() => update("preferredPlanIntensity", intensity)}
                          className={`rounded-md border p-2 text-center text-sm capitalize transition-colors ${
                            selected ? "border-primary bg-primary/5" : "hover:border-primary/50"
                          }`}
                        >
                          {intensity}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <p className="mt-4 text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" onClick={prev} disabled={step === 1 || submitting}>
              ← Back
            </Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={next}>Continue →</Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? "Saving…" : "Complete Setup →"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
