// ============================================================
// MATCHPOINT — Gemini Reranker
// ============================================================
// Re-scores a candidate set of retrieved chunks against the
// user query using Gemini, returning the top-N most relevant.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IReranker, RetrievalResult } from "./types";

export class GeminiReranker implements IReranker {
  private readonly model = "gemini-2.5-flash-preview-04-17";
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API;
    if (!apiKey) {
      throw new Error("GEMINI_API environment variable is required for reranker");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async rerank(query: string, results: RetrievalResult[], topN: number): Promise<RetrievalResult[]> {
    if (results.length === 0) return [];
    if (results.length <= topN) return results;

    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: "application/json" },
    });

    const candidates = results.slice(0, 50).map((r, i) => ({
      i,
      text: truncate(r.content, 700),
    }));

    const prompt = `You rank tennis-knowledge passages by their relevance to a user query.

Query: "${query.replace(/"/g, '\\"')}"

Passages (as JSON):
${JSON.stringify(candidates)}

Return ONLY a JSON object of the form { "ranking": [<indices in best-to-worst order>] } including every index from the input exactly once. No commentary.`;

    try {
      const out = await model.generateContent(prompt);
      const text = out.response.text();
      const parsed = JSON.parse(stripFences(text)) as { ranking?: number[] };
      const order = Array.isArray(parsed.ranking) ? parsed.ranking : [];

      const reranked: RetrievalResult[] = [];
      const seen = new Set<number>();
      for (const idx of order) {
        if (typeof idx === "number" && results[idx] && !seen.has(idx)) {
          reranked.push(results[idx]);
          seen.add(idx);
        }
      }
      // append any candidates the model omitted to preserve total
      for (let i = 0; i < results.length; i++) {
        if (!seen.has(i)) reranked.push(results[i]);
      }
      return reranked.slice(0, topN);
    } catch {
      // On any failure fall back to original order
      return results.slice(0, topN);
    }
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function stripFences(s: string): string {
  const t = s.trim();
  return t.startsWith("```") ? t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "") : t;
}
