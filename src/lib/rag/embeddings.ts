// ============================================================
// MATCHPOINT — Placeholder Embedding Provider
// ============================================================
// This is a mock implementation. Replace with a real provider
// (Google AI, OpenAI, Cohere) when ready to deploy.
// ============================================================

import type { IEmbeddingProvider } from "./types";

export class PlaceholderEmbeddingProvider implements IEmbeddingProvider {
  private readonly model = "text-embedding-004";
  private readonly dims = 768;

  async embed(text: string): Promise<number[]> {
    // In production, call Google AI embeddings API:
    // const result = await genAI.getGenerativeModel({ model: this.model }).embedContent(text);
    // return result.embedding.values;
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
    // Generate deterministic mock vector based on text hash
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
