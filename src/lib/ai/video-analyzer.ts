// ============================================================
// MATCHPOINT — Video Analysis (Gemini multimodal)
// ============================================================
// Downloads the uploaded video bytes from Vercel Blob and asks
// Gemini for stroke-specific coaching feedback. The model used is
// the same flash-preview model — multimodal inline supports video
// up to ~20 MB, so callers MUST cap upload size before reaching here.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { UserProfile } from "@/types";

const MODEL = "gemini-3-flash-preview";

export interface VideoAnalysisInput {
  blobUrl: string;
  mimeType: string;
  strokeType: string;
  notes?: string | null;
  profile: Pick<
    UserProfile,
    "tennisLevel" | "yearsPlaying" | "dominantHand" | "currentGoals"
  > | null;
}

export interface VideoAnalysisOutput {
  feedback: string;
  rubricScores: Record<string, number>;
  keyTakeaways: string[];
  drillSuggestions: string[];
}

const RUBRIC_BY_STROKE: Record<string, string[]> = {
  forehand: ["preparation", "unit_turn", "contact_point", "follow_through", "footwork", "balance"],
  backhand: ["preparation", "unit_turn", "contact_point", "follow_through", "footwork", "balance"],
  serve: ["stance", "toss", "trophy_pose", "racquet_drop", "contact", "pronation", "follow_through"],
  volley: ["split_step", "racquet_face", "punch", "footwork", "balance"],
  return: ["split_step", "preparation", "contact_point", "follow_through", "footwork"],
  other: ["technique", "footwork", "balance", "rhythm"],
};

function rubricFor(stroke: string): string[] {
  return RUBRIC_BY_STROKE[stroke.toLowerCase()] ?? RUBRIC_BY_STROKE.other;
}

export async function analyzeVideo(
  input: VideoAnalysisInput
): Promise<VideoAnalysisOutput> {
  const apiKey = process.env.GEMINI_API;
  if (!apiKey) throw new Error("GEMINI_API is not configured");

  // 1. Fetch the blob bytes server-side.
  const res = await fetch(input.blobUrl);
  if (!res.ok) throw new Error(`Failed to fetch video blob: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const base64 = buf.toString("base64");

  const rubric = rubricFor(input.strokeType);
  const profileLine = input.profile
    ? `Player: ${input.profile.tennisLevel} level, ${input.profile.yearsPlaying} yrs playing, ${input.profile.dominantHand}-handed.`
    : "Player profile unknown.";
  const goals = input.profile?.currentGoals?.length
    ? `Player goals: ${input.profile.currentGoals.join(", ")}.`
    : "";

  const prompt = `You are MATCHPOINT, an expert AI tennis coach analyzing a single ${input.strokeType} clip.

${profileLine}
${goals}
${input.notes ? `Player notes: ${input.notes}` : ""}

Watch the clip and produce a JSON object EXACTLY matching this shape — no prose, no markdown fences:
{
  "feedback": "<2-4 paragraph coaching review focused on what is good, what is wrong, and the single highest-leverage fix>",
  "rubricScores": { ${rubric.map((k) => `"${k}": <0-10>`).join(", ")} },
  "keyTakeaways": ["<short bullet>", "<short bullet>", "<short bullet>"],
  "drillSuggestions": ["<one-line drill>", "<one-line drill>", "<one-line drill>"]
}

Be specific (cite frames / moments when possible), be honest, and prioritize one or two improvements over a long list.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  let text: string;
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: input.mimeType,
          data: base64,
        },
      },
      { text: prompt },
    ]);
    text = result.response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini call failed: ${msg}`);
  }

  // Strip optional markdown fences just in case.
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = (match?.[1] ?? text).trim();
  let parsed: {
    feedback?: unknown;
    rubricScores?: Record<string, unknown>;
    keyTakeaways?: unknown;
    drillSuggestions?: unknown;
  };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Gemini returned non-JSON output (first 200 chars): ${text.slice(0, 200)}`
    );
  }

  // Coerce + clamp rubric scores to numbers in [0,10].
  const scores: Record<string, number> = {};
  for (const k of rubric) {
    const v = Number(parsed.rubricScores?.[k]);
    scores[k] = Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
  }

  return {
    feedback: String(parsed.feedback ?? "").trim(),
    rubricScores: scores,
    keyTakeaways: Array.isArray(parsed.keyTakeaways)
      ? parsed.keyTakeaways.slice(0, 6).map(String)
      : [],
    drillSuggestions: Array.isArray(parsed.drillSuggestions)
      ? parsed.drillSuggestions.slice(0, 6).map(String)
      : [],
  };
}
