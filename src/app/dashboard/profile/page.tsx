import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Profile & Preferences"
        description="Manage your tennis profile, goals, and training preferences"
      />
      <ProfileForm
        initialUser={{ name: user.name, email: user.email }}
        initialProfile={
          profile
            ? {
                age: profile.age,
                gender: profile.gender,
                country: profile.country,
                timezone: profile.timezone,
                tennisLevel: profile.tennisLevel,
                yearsPlaying: profile.yearsPlaying,
                dominantHand: profile.dominantHand as "left" | "right" | "ambidextrous",
                fitnessLevel: profile.fitnessLevel as "low" | "moderate" | "high" | "athletic",
                currentGoals: profile.currentGoals ?? [],
                availableTrainingDays: profile.availableTrainingDays,
                availableMinutesPerSession: profile.availableMinutesPerSession,
                hasCourtAccess: profile.hasCourtAccess,
                hasCoachAccess: profile.hasCoachAccess,
                hasBallMachine: profile.hasBallMachine,
                physicalLimitations: profile.physicalLimitations,
                preferredLearningStyle: profile.preferredLearningStyle as
                  | "visual"
                  | "reading"
                  | "kinesthetic"
                  | "mixed",
                preferredPlanIntensity: profile.preferredPlanIntensity as
                  | "light"
                  | "moderate"
                  | "intense"
                  | "elite",
              }
            : null
        }
      />
    </div>
  );
}

