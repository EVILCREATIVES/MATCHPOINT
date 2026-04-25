import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

const createSourceSchema = z.object({
  title: z.string().min(1).max(500),
  sourceType: z.enum(["pdf", "website", "youtube", "manual"]),
  author: z.string().max(255).optional(),
  description: z.string().optional(),
  sourceUrl: z.string().optional(),
  fileSize: z.number().optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  trustLevel: z.enum(["trusted", "untrusted", "unreviewed"]).optional(),
  content: z.string().optional(), // For manual entry type
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const data = createSourceSchema.parse(body);

    const [source] = await db
      .insert(sources)
      .values({
        title: data.title,
        sourceType: data.sourceType,
        author: data.author || null,
        description: data.description || null,
        sourceUrl: data.sourceUrl || null,
        fileSize: data.fileSize || null,
        skillLevel: data.skillLevel || null,
        tags: data.tags || [],
        visibility: data.visibility || "public",
        trustLevel: data.trustLevel || "unreviewed",
        ingestionState: "pending",
      })
      .returning();

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create source:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}
