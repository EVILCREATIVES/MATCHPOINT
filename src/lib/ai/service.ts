// ============================================================
// MATCHPOINT — AI Service Abstraction
// ============================================================
// Wraps the Gemini API for training plan generation and
// content processing. Uses environment variable GEMINI_API.
// ============================================================

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

// Placeholder implementation — wire to real Gemini API when ready
export class GeminiAIService implements AIService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    this.model = "gemini-3.1-pro-preview";
  }

  async generateTrainingPlan(_input: GeneratePlanInput): Promise<TrainingPlan> {
    // In production:
    // 1. Build prompt from user profile + retrieved context
    // 2. Call Gemini API
    // 3. Parse structured response into TrainingPlan type
    // 4. Return validated plan

    // For now, return a placeholder indicating the service is configured
    throw new Error(
      "Training plan generation not yet connected. " +
      "Set GEMINI_API_KEY and implement the Gemini API call."
    );
  }

  async generateSummary(_text: string): Promise<string> {
    // In production: call Gemini to summarize source content
    throw new Error("Summary generation not yet connected.");
  }

  async generateLessonContent(_topic: string, _level: SkillLevel): Promise<string> {
    // In production: call Gemini to generate lesson content from RAG context
    throw new Error("Lesson content generation not yet connected.");
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
