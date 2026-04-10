"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Profile & Preferences"
        description="Manage your tennis profile, goals, and training preferences"
      />

      {/* Player Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              ?
            </div>
            <div>
              <h2 className="text-lg font-bold text-muted-foreground">Set up your profile</h2>
              <p className="text-sm text-muted-foreground">Fill in your details below to get started</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input placeholder="you@example.com" type="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Age</label>
              <Input placeholder="Age" type="number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Input placeholder="Country" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tennis Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tennis Profile</CardTitle>
          <CardDescription>Your playing background and current level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tennis Level</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="beginner">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Years Playing</label>
              <Input placeholder="0" type="number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dominant Hand</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="right">
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="ambidextrous">Ambidextrous</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fitness Level</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="moderate">
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="athletic">Athletic</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Physical Limitations</label>
            <Input placeholder="Any injuries or limitations…" />
          </div>
        </CardContent>
      </Card>

      {/* Training Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Preferences</CardTitle>
          <CardDescription>How you want your training plans structured</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Days / Week</label>
              <Input defaultValue="3" type="number" min={1} max={7} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minutes / Session</label>
              <Input defaultValue="60" type="number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Intensity</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="moderate">
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="intense">Intense</option>
                <option value="elite">Elite</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Learning Style</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="mixed">
                <option value="visual">Visual</option>
                <option value="reading">Reading</option>
                <option value="kinesthetic">Kinesthetic / Hands-on</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <label className="text-sm font-medium">Equipment Access</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                Court access
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                Coach access
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                Ball machine
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Goals</CardTitle>
            <Button variant="outline" size="sm">+ Add Goal</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No goals yet. Add your first training goal.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Profile</Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const profile = demoProfile;
  const user = demoUser;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Profile & Preferences"
        description="Manage your tennis profile, goals, and training preferences"
      />

      {/* Player Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {user.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h2 className="text-lg font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="court" className="capitalize">{profile.tennisLevel}</Badge>
                <span className="text-xs text-muted-foreground">
                  {profile.yearsPlaying} years playing · {profile.dominantHand} hand
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input defaultValue={user.name} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input defaultValue={user.email} type="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Age</label>
              <Input defaultValue={profile.age?.toString()} type="number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Input defaultValue={profile.country || ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tennis Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tennis Profile</CardTitle>
          <CardDescription>Your playing background and current level</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tennis Level</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={profile.tennisLevel}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Years Playing</label>
              <Input defaultValue={profile.yearsPlaying.toString()} type="number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dominant Hand</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={profile.dominantHand}>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="ambidextrous">Ambidextrous</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fitness Level</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={profile.fitnessLevel}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="athletic">Athletic</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Physical Limitations</label>
            <Input defaultValue={profile.physicalLimitations || ""} placeholder="Any injuries or limitations…" />
          </div>
        </CardContent>
      </Card>

      {/* Training Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Training Preferences</CardTitle>
          <CardDescription>How you want your training plans structured</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Days / Week</label>
              <Input defaultValue={profile.availableTrainingDays.toString()} type="number" min={1} max={7} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Minutes / Session</label>
              <Input defaultValue={profile.availableMinutesPerSession.toString()} type="number" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Intensity</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={profile.preferredPlanIntensity}>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="intense">Intense</option>
                <option value="elite">Elite</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Learning Style</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue={profile.preferredLearningStyle}>
                <option value="visual">Visual</option>
                <option value="reading">Reading</option>
                <option value="kinesthetic">Kinesthetic / Hands-on</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <label className="text-sm font-medium">Equipment Access</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={profile.hasCourtAccess} className="rounded" />
                Court access
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={profile.hasCoachAccess} className="rounded" />
                Coach access
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={profile.hasBallMachine} className="rounded" />
                Ball machine
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Goals</CardTitle>
            <Button variant="outline" size="sm">+ Add Goal</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userGoals.map((goal) => (
              <div key={goal.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{goal.title}</p>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                  )}
                  {goal.targetDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: {new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
                <Badge variant={goal.isCompleted ? "success" : "outline"}>
                  {goal.isCompleted ? "Done" : "Active"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Goals Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Focus Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {profile.currentGoals.map((goal) => (
              <Badge key={goal} variant="court">
                {goal}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save Profile</Button>
      </div>
    </div>
  );
}
