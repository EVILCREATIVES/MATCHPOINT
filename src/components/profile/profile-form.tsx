"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const LEVELS = ["beginner", "intermediate", "advanced", "elite"] as const;
const FITNESS = ["low", "moderate", "high", "athletic"] as const;
const HANDS = ["right", "left", "ambidextrous"] as const;
const STYLES = ["visual", "reading", "kinesthetic", "mixed"] as const;
const INTENSITY = ["light", "moderate", "intense", "elite"] as const;

const GOAL_OPTIONS = [
  "Improve forehand", "Improve backhand", "Better serve", "Footwork & speed",
  "Net game", "Consistency", "Match strategy", "Mental toughness",
  "Physical conditioning", "Return of serve", "Topspin technique",
  "Slice control", "Win more matches", "Tournament prep", "Doubles skills",
];

interface InitialProfile {
  age: number | null;
  gender: string | null;
  country: string | null;
  timezone: string | null;
  tennisLevel: typeof LEVELS[number];
  yearsPlaying: number;
  dominantHand: typeof HANDS[number];
  fitnessLevel: typeof FITNESS[number];
  currentGoals: string[];
  availableTrainingDays: number;
  availableMinutesPerSession: number;
  hasCourtAccess: boolean;
  hasCoachAccess: boolean;
  hasBallMachine: boolean;
  physicalLimitations: string | null;
  preferredLearningStyle: typeof STYLES[number];
  preferredPlanIntensity: typeof INTENSITY[number];
}

export interface ProfileFormProps {
  initialUser: { name: string; email: string };
  initialProfile: InitialProfile | null;
}

export function ProfileForm({ initialUser, initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialUser.name);
  const [age, setAge] = useState(initialProfile?.age?.toString() ?? "");
  const [gender, setGender] = useState(initialProfile?.gender ?? "");
  const [country, setCountry] = useState(initialProfile?.country ?? "");
  const [timezone, setTimezone] = useState(initialProfile?.timezone ?? "");
  const [tennisLevel, setTennisLevel] = useState<typeof LEVELS[number]>(
    initialProfile?.tennisLevel ?? "beginner"
  );
  const [yearsPlaying, setYearsPlaying] = useState(
    initialProfile?.yearsPlaying.toString() ?? "0"
  );
  const [dominantHand, setDominantHand] = useState<typeof HANDS[number]>(
    initialProfile?.dominantHand ?? "right"
  );
  const [fitnessLevel, setFitnessLevel] = useState<typeof FITNESS[number]>(
    initialProfile?.fitnessLevel ?? "moderate"
  );
  const [days, setDays] = useState(initialProfile?.availableTrainingDays.toString() ?? "3");
  const [minutes, setMinutes] = useState(
    initialProfile?.availableMinutesPerSession.toString() ?? "60"
  );
  const [hasCourtAccess, setHasCourtAccess] = useState(initialProfile?.hasCourtAccess ?? false);
  const [hasCoachAccess, setHasCoachAccess] = useState(initialProfile?.hasCoachAccess ?? false);
  const [hasBallMachine, setHasBallMachine] = useState(initialProfile?.hasBallMachine ?? false);
  const [limitations, setLimitations] = useState(initialProfile?.physicalLimitations ?? "");
  const [learning, setLearning] = useState<typeof STYLES[number]>(
    initialProfile?.preferredLearningStyle ?? "mixed"
  );
  const [intensity, setIntensity] = useState<typeof INTENSITY[number]>(
    initialProfile?.preferredPlanIntensity ?? "moderate"
  );
  const [goals, setGoals] = useState<Set<string>>(
    new Set(initialProfile?.currentGoals ?? [])
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function toggleGoal(g: string) {
    setGoals((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name: name.trim() || undefined,
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        country: country || null,
        timezone: timezone || null,
        tennisLevel,
        yearsPlaying: parseInt(yearsPlaying || "0", 10),
        dominantHand,
        fitnessLevel,
        currentGoals: Array.from(goals),
        availableTrainingDays: parseInt(days || "3", 10),
        availableMinutesPerSession: parseInt(minutes || "60", 10),
        hasCourtAccess,
        hasCoachAccess,
        hasBallMachine,
        physicalLimitations: limitations || null,
        preferredLearningStyle: learning,
        preferredPlanIntensity: intensity,
      };

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      setMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    } catch (err) {
      setMessage({
        kind: "err",
        text: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  }

  const initials =
    name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold">{name || "Your name"}</h2>
              <p className="text-sm text-muted-foreground">{initialUser.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Age</label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Europe/London"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Gender (optional)</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tennis Profile</CardTitle>
          <CardDescription>Your playing background and current level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tennis Level</label>
              <select
                value={tennisLevel}
                onChange={(e) => setTennisLevel(e.target.value as typeof LEVELS[number])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Years Playing</label>
              <Input
                type="number"
                value={yearsPlaying}
                onChange={(e) => setYearsPlaying(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dominant Hand</label>
              <select
                value={dominantHand}
                onChange={(e) => setDominantHand(e.target.value as typeof HANDS[number])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
              >
                {HANDS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fitness Level</label>
              <select
                value={fitnessLevel}
                onChange={(e) => setFitnessLevel(e.target.value as typeof FITNESS[number])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
              >
                {FITNESS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Physical Limitations</label>
            <Input
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
              placeholder="Any injuries or limitations…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Preferences</CardTitle>
          <CardDescription>How you want your training plans structured</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Days / Week</label>
              <Input
                type="number"
                min={1}
                max={7}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minutes / Session</label>
              <Input
                type="number"
                min={15}
                max={360}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Intensity</label>
              <select
                value={intensity}
                onChange={(e) => setIntensity(e.target.value as typeof INTENSITY[number])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
              >
                {INTENSITY.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Learning Style</label>
              <select
                value={learning}
                onChange={(e) => setLearning(e.target.value as typeof STYLES[number])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <label className="text-sm font-medium">Equipment Access</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={hasCourtAccess}
                  onChange={(e) => setHasCourtAccess(e.target.checked)}
                />
                Court access
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={hasCoachAccess}
                  onChange={(e) => setHasCoachAccess(e.target.checked)}
                />
                Coach access
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={hasBallMachine}
                  onChange={(e) => setHasBallMachine(e.target.checked)}
                />
                Ball machine
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goals</CardTitle>
          <CardDescription>Tap goals you want to focus on</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((g) => {
              const selected = goals.has(g);
              return (
                <Badge
                  key={g}
                  variant={selected ? "default" : "outline"}
                  onClick={() => toggleGoal(g)}
                  className="cursor-pointer py-1.5 px-3"
                >
                  {g}
                </Badge>
              );
            })}
          </div>
          {goals.size > 0 && (
            <p className="text-xs text-muted-foreground mt-3">{goals.size} selected</p>
          )}
        </CardContent>
      </Card>

      {message && (
        <p
          className={`text-sm rounded-md px-3 py-2 ${
            message.kind === "ok"
              ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
