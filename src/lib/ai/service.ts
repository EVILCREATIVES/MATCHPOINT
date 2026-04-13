// ============================================================
// MATCHPOINT — AI Service Abstraction
// ============================================================
// Wraps the Gemini API for training plan generation and
// content processing. Uses environment variable GEMINI_API.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { UserProfile, TrainingPlan, SkillLevel } from "@/types";
import type { RetrievalResult } from "@/lib/rag/types";

export interface GeneratePlanInput {
  profile: UserProfile;
  focusAreas: string[];
  context: RetrievalResult[];
  period: "daily" | "weekly";
}

export interface AIService {
  generateTrainingPlan(input: GeneratePlanInput): Promise<TrainingPlan>;
  generateSummary(text: string): Promise<string>;
  generateLessonContent(topic: string, level: SkillLevel): Promise<string>;
}

export class GeminiAIService implements AIService {
  private apiKey: string;
  private model: string;
  private genAI: GoogleGenerativeAI | null;

  constructor() {
    this.apiKey = process.env.GEMINI_API || "";
    this.model = "gemini-2.5-flash-preview-04-17";
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  async generateTrainingPlan(input: GeneratePlanInput): Promise<TrainingPlan> {
    if (!this.genAI) {
      throw new Error("GEMINI_API is not configured");
    }

    const model = this.genAI.getGenerativeModel({ model: this.model });

    // Build context from RAG retrieval results
    const ragContext = input.context.length > 0
      ? input.context
          .map((c, i) => `[Source: ${c.sourceTitle}]\n${c.content}`)
          .join("\n\n---\n\n")
      : "No specific tennis knowledge sources available.";

    const prompt = `You are MATCHPOINT, an expert AI tennis coach. Generate a personalized ${input.period} training plan.

## Player Profile
- Tennis Level: ${input.profile.tennisLevel}
- Years Playing: ${input.profile.yearsPlaying}
- Dominant Hand: ${input.profile.dominantHand}
- Available Training Days: ${input.profile.availableTrainingDays}/week
- Minutes Per Session: ${input.profile.availableMinutesPerSession}
- Fitness Level: ${input.profile.fitnessLevel}
- Has Court Access: ${input.profile.hasCourtAccess}
- Has Coach Access: ${input.profile.hasCoachAccess}
- Has Ball Machine: ${input.profile.hasBallMachine}
- Physical Limitations: ${input.profile.physicalLimitations || "None"}
- Current Goals: ${input.profile.currentGoals.join(", ") || "General improvement"}
- Preferred Intensity: ${input.profile.preferredPlanIntensity}
- Learning Style: ${input.profile.preferredLearningStyle}

## Focus Areas
${input.focusAreas.join(", ")}

## Tennis Knowledge Base (use this to inform your recommendations)
${ragContext}

## Instructions
Generate a structured training plan as JSON with the following format:
{
  "title": "Plan title",
  "description": "Brief description",
  "sessions": [
    {
      "title": "Session title",
      "description": "Session description",
      "sessionType": "technical|footwork|conditioning|tactical|match_prep|recovery|drill|serve_practice",
      "dayOfWeek": 0-6,
      "durationMinutes": number,
      "exercises": [
        {
          "title": "Exercise name",
          "description": "Detailed instructions",
          "durationMinutes": number,
          "sets": number or null,
          "reps": number or null
        }
      ],
      "warmup": "Warmup description",
      "cooldown": "Cooldown description",
      "coachNotes": "Tips and coaching cues"
    }
  ]
}

Only respond with valid JSON. Use the knowledge base to provide specific, evidence-based drills and techniques.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const jsonStr = (jsonMatch[1] || text).trim();
    const plan = JSON.parse(jsonStr);

    // Build the full TrainingPlan object
    const now = new Date().toISOString();
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (input.period === "weekly" ? 7 : 1));

    return {
      id: "",
      userId: input.profile.userId,
      title: plan.title,
      description: plan.description,
      period: input.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      focusAreas: input.focusAreas,
      skillLevel: input.profile.tennisLevel,
      intensity: input.profile.preferredPlanIntensity,
      sessions: (plan.sessions || []).map((s: Record<string, unknown>, i: number) => ({
        id: "",
        planId: "",
        title: s.title as string,
        description: (s.description as string) || "",
        sessionType: s.sessionType as string,
        dayOfWeek: (s.dayOfWeek as number) ?? i,
        durationMinutes: (s.durationMinutes as number) || input.profile.availableMinutesPerSession,
        exercises: s.exercises || [],
        warmup: s.warmup as string,
        cooldown: s.cooldown as string,
        coachNotes: s.coachNotes as string,
        sortOrder: i,
        createdAt: now,
      })),
      isActive: true,
      generatedBy: "ai",
      createdAt: now,
      updatedAt: now,
    } as TrainingPlan;
  }

  async generateSummary(text: string): Promise<string> {
    if (!this.genAI) {
      throw new Error("GEMINI_API is not configured");
    }

    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(
      `Summarize the following tennis-related content in 2-3 concise paragraphs:\n\n${text}`
    );
    return result.response.text();
  }

  async generateLessonContent(topic: string, level: SkillLevel): Promise<string> {
    if (!this.genAI) {
      throw new Error("GEMINI_API is not configured");
    }

    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(
      `You are MATCHPOINT, an expert AI tennis coach. Create a detailed tennis lesson for a ${level} player on the topic: "${topic}".

Include:
1. Overview and learning objectives
2. Key concepts and techniques
3. Step-by-step instructions
4. Common mistakes to avoid
5. Practice drills
6. Tips for improvement

Format the response in Markdown.`
    );
    return result.response.text();
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  getModel(): string {
    return this.model;
  }
}

// Singleton instance
let aiServiceInstance: GeminiAIService | null = null;

export function getAIService(): GeminiAIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new GeminiAIService();
  }
  return aiServiceInstance;
}
