// ============================================================
// MATCHPOINT — Text Chunker Implementation
// ============================================================

import type { ITextChunker, TextChunk } from "./types";

const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_OVERLAP = 50;

export class SimpleTextChunker implements ITextChunker {
  chunk(
    text: string,
    options?: { chunkSize?: number; overlap?: number }
  ): TextChunk[] {
    const chunkSize = options?.chunkSize || DEFAULT_CHUNK_SIZE;
    const overlap = options?.overlap || DEFAULT_OVERLAP;

    const words = text.split(/\s+/).filter(Boolean);
    const chunks: TextChunk[] = [];
    let index = 0;
    let wordStart = 0;

    while (wordStart < words.length) {
      const chunkWords = words.slice(wordStart, wordStart + chunkSize);
      const content = chunkWords.join(" ");

      chunks.push({
        content,
        index,
        tokenCount: chunkWords.length, // Approximate: 1 word ≈ 1.3 tokens
        metadata: {
          wordStart,
          wordEnd: wordStart + chunkWords.length,
        },
      });

      wordStart += chunkSize - overlap;
      index++;
    }

    return chunks;
  }
}
