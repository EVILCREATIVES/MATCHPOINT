// ============================================================
// MATCHPOINT — Doc Check-In AI advice service
// ============================================================
// Turns a body-region pain report + user profile into structured,
// non-diagnostic guidance. Exercises are matched against the curated
// exercise_library; anything unmatched falls back to a safe YouTube
// search link so we never surface a dead or hallucinated URL.
//
// A disclaimer is ALWAYS attached server-side — we never rely on the
// model to include it.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import { fullRegionName, getRegion, type BodyLayer, type BodySide } from "@/lib/doc-checkin/regions";

const MODEL = "gemini-3.1-flash-lite-preview";

export const AI_DISCLAIMER =
  "This is AI-generated educational information, not a medical diagnosis. " +
  "It is not a substitute for a real doctor or physiotherapist. If pain is " +
  "severe, worsening, or persists, please consult a qualified healthcare professional.";

export interface CheckinProfile {
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  physicalLimitations?: string | null;
  fitnessLevel?: string | null;
  tennisLevel?: string | null;
  dominantHand?: string | null;
  yearsPlaying?: number | null;
}

export interface CuratedExercise {
  id: string;
  name: string;
  description: string;
  category: string;
  bodyRegions: string[];
  mediaUrl: string | null;
  mediaType: string | null;
}

export interface ExerciseRec {
  name: string;
  why: string;
  url: string;
  source: "curated" | "youtube";
  mediaType: "video" | "image" | "search";
}

export interface BodyAdvice {
  summary: string;
  potentialCauses: string[];
  selfCare: string[];
  exercises: ExerciseRec[];
  whenToSeeDoctor: string[];
  disclaimer: string;
}

export interface GenerateAdviceInput {
  regionId: string;
  side: BodySide;
  layer: BodyLayer;
  painLevel: number; // 0–10
  painType?: string | null;
  notes?: string | null;
  profile: CheckinProfile;
  curated: CuratedExercise[];
}

function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function stripJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

/** Baseline "see a doctor" guidance that always applies, merged with the model's. */
function baselineRedFlags(painLevel: number): string[] {
  const flags = [
    "Numbness, tingling, or weakness that spreads or does not go away",
    "Pain following a specific injury with swelling, bruising, or inability to bear weight",
    "Pain that keeps getting worse or does not improve after 1–2 weeks of self-care",
  ];
  if (painLevel >= 8) {
    flags.unshift("Your reported pain is high — if it is severe or limits normal movement, get it assessed promptly");
  }
  return flags;
}

export async function generateBodyAdvice(input: GenerateAdviceInput): Promise<BodyAdvice> {
  const apiKey = process.env.GEMINI_API;
  const region = getRegion(input.regionId);
  const displayName = fullRegionName(input.regionId, input.side, input.layer);
  const commonIssues = region?.commonIssues ?? [];

  // If the model is unavailable, still return a safe, useful response.
  if (!apiKey) {
    return {
      summary: `You reported ${input.painType || "discomfort"} in the ${displayName.toLowerCase()} (pain ${input.painLevel}/10).`,
      potentialCauses: commonIssues,
      selfCare: [
        "Relative rest — avoid movements that reproduce the pain",
        "Gentle mobility within a pain-free range",
        "Ice for acute pain or heat for chronic tightness, 10–15 min",
      ],
      exercises: input.curated.slice(0, 3).map((e) => ({
        name: e.name,
        why: e.description,
        url: e.mediaUrl || youtubeSearchUrl(e.name),
        source: e.mediaUrl ? "curated" : "youtube",
        mediaType: e.mediaUrl ? ((e.mediaType as "video" | "image") || "video") : "search",
      })),
      whenToSeeDoctor: baselineRedFlags(input.painLevel),
      disclaimer: AI_DISCLAIMER,
    };
  }

  const profileLines = [
    input.profile.age != null ? `Age: ${input.profile.age}` : null,
    input.profile.gender ? `Sex/gender: ${input.profile.gender}` : null,
    input.profile.fitnessLevel ? `Fitness level: ${input.profile.fitnessLevel}` : null,
    input.profile.tennisLevel ? `Tennis level: ${input.profile.tennisLevel}` : null,
    input.profile.dominantHand ? `Dominant hand: ${input.profile.dominantHand}` : null,
    input.profile.yearsPlaying != null ? `Years playing: ${input.profile.yearsPlaying}` : null,
    input.profile.physicalLimitations
      ? `Known limitations / history: ${input.profile.physicalLimitations}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const curatedList = input.curated.length
    ? input.curated
        .map((e) => `- id:${e.id} | ${e.name} (${e.category}) — ${e.description}`)
        .join("\n")
    : "None available for this region.";

  const prompt = `You are a knowledgeable sports-physiotherapy assistant inside MATCHPOINT, a tennis training app.
A player has pointed to a body area on an interactive anatomy model and reported pain. Give safe, practical, encouraging guidance. You are NOT diagnosing.

## Reported area
- Body region: ${displayName}
- View layer active: ${input.layer}
- Pain intensity: ${input.painLevel}/10
- Pain type: ${input.painType || "unspecified"}
- Player's own notes: ${input.notes || "none"}
- Commonly associated issues for this area (for your reasoning): ${commonIssues.join(", ") || "n/a"}

## Player profile (personalise to this)
${profileLines || "No profile details provided."}

## Curated exercises available in our library (prefer these when relevant; reference by id)
${curatedList}

## Respond with ONLY valid JSON, no markdown:
{
  "summary": "1–2 sentence empathetic plain-language summary of what they're likely feeling and the general approach",
  "potentialCauses": ["3–5 plausible, non-alarming explanations, tailored to their age/history/tennis load"],
  "selfCare": ["3–5 concrete self-care / load-management steps"],
  "exercises": [
    { "curatedId": "<id from the list above if it fits, else omit>", "name": "exercise name", "why": "why it helps this area", "youtubeQuery": "<only if not a curated id: a good search phrase>" }
  ],
  "whenToSeeDoctor": ["specific red-flag signs that mean they should see a real professional"]
}

Rules:
- Recommend 2–4 exercises. Use curatedId whenever a listed exercise fits; only invent a youtubeQuery when nothing curated fits.
- Adapt to the profile: respect any stated limitations/history, and scale intensity to age and fitness level.
- Never claim certainty, never name a single definitive diagnosis, never prescribe medication or dosages.
- Keep language warm, clear, and non-alarming.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", temperature: 0.5 },
  });

  const result = await model.generateContent(prompt);
  const raw = stripJson(result.response.text());

  let parsed: {
    summary?: string;
    potentialCauses?: string[];
    selfCare?: string[];
    exercises?: Array<{ curatedId?: string; name?: string; why?: string; youtubeQuery?: string }>;
    whenToSeeDoctor?: string[];
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const curatedById = new Map(input.curated.map((e) => [e.id, e]));

  const exercises: ExerciseRec[] = (parsed.exercises ?? [])
    .map((ex): ExerciseRec | null => {
      const curated = ex.curatedId ? curatedById.get(ex.curatedId) : undefined;
      if (curated) {
        return {
          name: curated.name,
          why: ex.why || curated.description,
          url: curated.mediaUrl || youtubeSearchUrl(curated.name),
          source: curated.mediaUrl ? "curated" : "youtube",
          mediaType: curated.mediaUrl ? ((curated.mediaType as "video" | "image") || "video") : "search",
        };
      }
      const name = (ex.name || "").trim();
      if (!name) return null;
      const query = ex.youtubeQuery?.trim() || `${name} exercise tutorial`;
      return {
        name,
        why: ex.why || "",
        url: youtubeSearchUrl(query),
        source: "youtube",
        mediaType: "search",
      };
    })
    .filter((x): x is ExerciseRec => x !== null)
    .slice(0, 4);

  // Merge model red-flags with our always-on baseline (deduped).
  const redFlags = Array.from(
    new Set([...(parsed.whenToSeeDoctor ?? []), ...baselineRedFlags(input.painLevel)])
  ).slice(0, 6);

  return {
    summary:
      parsed.summary ||
      `You reported ${input.painType || "discomfort"} in the ${displayName.toLowerCase()} (${input.painLevel}/10).`,
    potentialCauses: (parsed.potentialCauses ?? commonIssues).slice(0, 6),
    selfCare: (parsed.selfCare ?? []).slice(0, 6),
    exercises,
    whenToSeeDoctor: redFlags,
    disclaimer: AI_DISCLAIMER,
  };
}
