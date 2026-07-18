import { desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { docCheckins, userProfiles } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import {
  DocCheckInClient,
  type CheckinHistoryItem,
} from "@/components/doc-checkin/doc-checkin-client";
import type { BodyAdvice } from "@/components/doc-checkin/advice-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DocCheckInPage() {
  const user = await requireUser();

  const [[profile], recent] = await Promise.all([
    db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1),
    db
      .select()
      .from(docCheckins)
      .where(eq(docCheckins.userId, user.id))
      .orderBy(desc(docCheckins.createdAt))
      .limit(12),
  ]);

  const defaultGender: "male" | "female" = profile?.gender === "female" ? "female" : "male";

  const history: CheckinHistoryItem[] = recent.map((r) => ({
    id: r.id,
    regionLabel: r.regionLabel,
    painLevel: r.painLevel,
    painType: r.painType,
    createdAt: r.createdAt.toISOString(),
    advice: (r.aiResponse as unknown as BodyAdvice) ?? null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="🩺 Doc Check-In"
        description="Point to where it hurts on the 3D body and get AI guidance on likely causes, self-care, and exercises. Not a substitute for a real doctor."
      />
      <DocCheckInClient defaultGender={defaultGender} history={history} />
    </div>
  );
}
