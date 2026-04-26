// ============================================================
// MATCHPOINT — Gemini Document Analyzer
// ============================================================
// Performs a single long-context Gemini call over the whole PDF
// (text + diagrams) and returns structured tennis knowledge:
// metadata, techniques, common errors, drills, progressions,
// and figure descriptions. Used to auto-fill source metadata
// and to power non-RAG structured queries.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DocumentAnalysis, IDocumentAnalyzer } from "./types";

export class GeminiDocumentAnalyzer implements IDocumentAnalyzer {
  private readonly model = "gemini-3.1-flash-lite-preview";
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API;
    if (!apiKey) {
      throw new Error("GEMINI_API environment variable is required for analyzer");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyze(input: {
    buffer?: Buffer;
    mimeType?: string;
    text?: string;
    filename?: string;
  }): Promise<DocumentAnalysis> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = buildPrompt(input.filename);

    // Two modes: binary (PDF) via inlineData, or plain text (website crawl).
    const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];
    if (input.buffer && input.mimeType) {
      parts.push({
        inlineData: {
          mimeType: input.mimeType,
          data: input.buffer.toString("base64"),
        },
      });
      parts.push({ text: prompt });
    } else if (input.text) {
      // Cap to ~200k chars to stay safely under model context.
      const trimmed = input.text.slice(0, 200_000);
      parts.push({
        text: `${prompt}\n\n--- DOCUMENT TEXT ---\n${trimmed}`,
      });
    } else {
      throw new Error("Analyzer requires either { buffer, mimeType } or { text }");
    }

    const result = await model.generateContent(parts);

    const text = result.response.text();
    const parsed = safeParseJson(text);
    return normalizeAnalysis(parsed);
  }
}

function buildPrompt(filename?: string): string {
  return `You are MATCHPOINT's tennis knowledge extractor. Analyze the attached document${
    filename ? ` ("${filename}")` : ""
  } end-to-end (read the full text, examine all diagrams and figures) and produce a single JSON object that captures structured tennis coaching knowledge.

Return ONLY valid JSON matching this schema (omit fields you cannot determine, but always include the listed arrays even if empty):

{
  "title": string,
  "author": string | null,
  "summary": string,                       // 3-6 sentence overview
  "language": string,                      // ISO code, e.g. "en"
  "skillLevel": "beginner" | "intermediate" | "advanced" | "elite" | null,
  "categorySlug": string | null,           // e.g. "technique", "tactics", "fitness", "mental", "footwork", "general"
  "tags": string[],                        // 3-12 short topical tags
  "techniques": [
    {
      "name": string,                      // e.g. "Topspin Forehand"
      "category": string | null,           // forehand|backhand|serve|return|volley|overhead|footwork|grip|stance
      "skillLevel": "beginner" | "intermediate" | "advanced" | "elite" | null,
      "description": string,
      "keyPoints": string[],
      "tags": string[]
    }
  ],
  "commonErrors": [
    {
      "techniqueName": string | null,
      "errorName": string,
      "description": string,
      "cause": string | null,
      "fix": string | null,
      "skillLevel": "beginner" | "intermediate" | "advanced" | "elite" | null,
      "tags": string[]
    }
  ],
  "drills": [
    {
      "name": string,
      "focus": string | null,              // technical|tactical|footwork|conditioning|serve|return|consistency
      "skillLevel": "beginner" | "intermediate" | "advanced" | "elite" | null,
      "description": string,
      "setup": string | null,
      "instructions": string[],
      "durationMinutes": number | null,
      "equipment": string[],
      "tags": string[]
    }
  ],
  "progressions": [
    {
      "name": string,
      "goal": string,
      "skillLevel": "beginner" | "intermediate" | "advanced" | "elite" | null,
      "steps": [{ "order": number, "title": string, "description": string }],
      "durationWeeks": number | null,
      "tags": string[]
    }
  ],
  "figures": [
    {
      "pageNumber": number | null,
      "caption": string,                   // a short label for the figure
      "description": string                // 1-3 sentence description of what is shown and why it matters for tennis
    }
  ]
}

Rules:
- Be concrete and tennis-specific. Do not invent content not supported by the document.
- Keep each description focused; avoid generic advice.
- Use lower-case slugs for category/focus values.
- If the document contains no drills/errors/etc., return an empty array for that field.
- Return JSON only — no markdown fences, no commentary.`;
}

function safeParseJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const cleaned = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
    : trimmed;
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    // Try to extract the first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        // fall through
      }
    }
    return {};
  }
}

function normalizeAnalysis(raw: Record<string, unknown>): DocumentAnalysis {
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;

  return {
    title: str(raw.title),
    author: str(raw.author),
    summary: str(raw.summary),
    language: str(raw.language),
    skillLevel: normalizeSkill(raw.skillLevel),
    categorySlug: str(raw.categorySlug),
    tags: arr<string>(raw.tags).filter((t) => typeof t === "string"),
    techniques: arr<Record<string, unknown>>(raw.techniques).map((t) => ({
      name: String(t.name ?? "").trim(),
      category: str(t.category),
      skillLevel: normalizeSkill(t.skillLevel),
      description: String(t.description ?? "").trim(),
      keyPoints: arr<string>(t.keyPoints),
      tags: arr<string>(t.tags),
    })).filter((t) => t.name && t.description),
    commonErrors: arr<Record<string, unknown>>(raw.commonErrors).map((e) => ({
      techniqueName: str(e.techniqueName),
      errorName: String(e.errorName ?? "").trim(),
      description: String(e.description ?? "").trim(),
      cause: str(e.cause),
      fix: str(e.fix),
      skillLevel: normalizeSkill(e.skillLevel),
      tags: arr<string>(e.tags),
    })).filter((e) => e.errorName && e.description),
    drills: arr<Record<string, unknown>>(raw.drills).map((d) => ({
      name: String(d.name ?? "").trim(),
      focus: str(d.focus),
      skillLevel: normalizeSkill(d.skillLevel),
      description: String(d.description ?? "").trim(),
      setup: str(d.setup),
      instructions: arr<string>(d.instructions),
      durationMinutes: typeof d.durationMinutes === "number" ? d.durationMinutes : undefined,
      equipment: arr<string>(d.equipment),
      tags: arr<string>(d.tags),
    })).filter((d) => d.name && d.description),
    progressions: arr<Record<string, unknown>>(raw.progressions).map((p) => ({
      name: String(p.name ?? "").trim(),
      goal: String(p.goal ?? "").trim(),
      skillLevel: normalizeSkill(p.skillLevel),
      steps: arr<Record<string, unknown>>(p.steps).map((s, i) => ({
        order: typeof s.order === "number" ? s.order : i + 1,
        title: String(s.title ?? "").trim(),
        description: String(s.description ?? "").trim(),
      })).filter((s) => s.title && s.description),
      durationWeeks: typeof p.durationWeeks === "number" ? p.durationWeeks : undefined,
      tags: arr<string>(p.tags),
    })).filter((p) => p.name && p.goal),
    figures: arr<Record<string, unknown>>(raw.figures).map((f) => ({
      pageNumber: typeof f.pageNumber === "number" ? f.pageNumber : undefined,
      caption: String(f.caption ?? "").trim(),
      description: String(f.description ?? "").trim(),
    })).filter((f) => f.caption || f.description),
  };
}

function normalizeSkill(v: unknown): DocumentAnalysis["skillLevel"] {
  if (typeof v !== "string") return undefined;
  const s = v.toLowerCase();
  if (s === "beginner" || s === "intermediate" || s === "advanced" || s === "elite") return s;
  return undefined;
}
