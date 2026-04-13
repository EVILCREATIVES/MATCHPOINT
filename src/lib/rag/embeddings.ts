// ============================================================
// MATCHPOINT — Gemini Embedding Provider
// ============================================================
// Uses Google AI text-embedding-004 model to generate real
// embedding vectors for RAG retrieval.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IEmbeddingProvider } from "./types";

export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  private readonly model = "text-embedding-004";
  private readonly dims = 768;
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API;
    if (!apiKey) {
      throw new Error("GEMINI_API environment variable is required for embeddings");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async embed(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const model = this.genAI.getGenerativeModel({ model: this.model });
    const results: number[][] = [];

    // Process in batches of 100 (API limit)
    const batchSize = 100;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const result = await model.embedContent(text);
          return result.embedding.values;
        })
      );
      results.push(...batchResults);
    }

    return results;
  }

  modelName(): string {
    return this.model;
  }

  dimensions(): number {
    return this.dims;
  }
}

// Keep placeholder for local development without API key
export class PlaceholderEmbeddingProvider implements IEmbeddingProvider {
  private readonly model = "text-embedding-004";
  private readonly dims = 768;

  async embed(text: string): Promise<number[]> {
    return this.mockEmbed(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  modelName(): string {
    return this.model;
  }

  dimensions(): number {
    return this.dims;
  }

  private mockEmbed(_text: string): number[] {
    const hash = this.simpleHash(_text);
    return Array.from({ length: this.dims }, (_, i) =>
      Math.sin(hash + i * 0.1) * 0.5
    );
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }
}
