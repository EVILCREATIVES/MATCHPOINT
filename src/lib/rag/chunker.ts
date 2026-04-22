// ============================================================
// MATCHPOINT — Semantic Text Chunker
// ============================================================
// Splits text on paragraph / heading boundaries when possible
// and falls back to a sliding window over words, preserving
// optional page numbers and heading context for later retrieval.
// ============================================================

import type { ITextChunker, TextChunk, ParsedPage } from "./types";

const DEFAULT_TARGET_TOKENS = 400;
const DEFAULT_MAX_TOKENS = 600;
const DEFAULT_OVERLAP_TOKENS = 60;
const WORDS_PER_TOKEN = 0.75; // ~1 word ≈ 1.3 tokens

const HEADING_RE = /^(#{1,6}\s+.+|[A-Z][A-Z0-9 \-:]{4,}|\d+(\.\d+)*\s+[A-Z].{3,})$/;

interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
  targetTokens?: number;
  maxTokens?: number;
  pages?: ParsedPage[];
}

export class SimpleTextChunker implements ITextChunker {
  chunk(text: string, options?: ChunkOptions): TextChunk[] {
    const target = options?.targetTokens ?? options?.chunkSize ?? DEFAULT_TARGET_TOKENS;
    const max = options?.maxTokens ?? Math.max(target * 1.5, DEFAULT_MAX_TOKENS);
    const overlap = options?.overlap ?? DEFAULT_OVERLAP_TOKENS;

    const segments = options?.pages?.length
      ? options.pages.flatMap((p) =>
          this.splitIntoBlocks(p.content).map((b) => ({ ...b, pageNumber: p.pageNumber }))
        )
      : this.splitIntoBlocks(text).map((b) => ({ ...b, pageNumber: undefined as number | undefined }));

    const chunks: TextChunk[] = [];
    const headingStack: string[] = [];
    let buffer: string[] = [];
    let bufferTokens = 0;
    let bufferStartPage: number | undefined;
    let chunkIndex = 0;

    const flush = () => {
      if (buffer.length === 0) return;
      const content = buffer.join("\n").trim();
      if (!content) {
        buffer = [];
        bufferTokens = 0;
        return;
      }
      chunks.push({
        content,
        index: chunkIndex++,
        tokenCount: estimateTokens(content),
        kind: "text",
        pageNumber: bufferStartPage,
        headingPath: [...headingStack],
        metadata: {
          headingPath: [...headingStack],
          startPage: bufferStartPage,
        },
      });
      // overlap: keep tail words for the next chunk
      if (overlap > 0) {
        const tailWords = Math.floor(overlap / WORDS_PER_TOKEN);
        const tail = content.split(/\s+/).slice(-tailWords).join(" ");
        buffer = tail ? [tail] : [];
        bufferTokens = estimateTokens(tail);
      } else {
        buffer = [];
        bufferTokens = 0;
      }
      bufferStartPage = undefined;
    };

    for (const seg of segments) {
      if (seg.kind === "heading") {
        flush();
        const level = headingLevel(seg.text);
        headingStack.length = Math.max(0, level - 1);
        headingStack.push(stripHeading(seg.text));
        continue;
      }

      const segTokens = estimateTokens(seg.text);
      if (segTokens > max) {
        // split a long paragraph by sentences
        for (const sentence of splitSentences(seg.text)) {
          const sentTokens = estimateTokens(sentence);
          if (bufferTokens + sentTokens > max) flush();
          if (bufferStartPage === undefined) bufferStartPage = seg.pageNumber;
          buffer.push(sentence);
          bufferTokens += sentTokens;
          if (bufferTokens >= target) flush();
        }
      } else {
        if (bufferTokens + segTokens > max) flush();
        if (bufferStartPage === undefined) bufferStartPage = seg.pageNumber;
        buffer.push(seg.text);
        bufferTokens += segTokens;
        if (bufferTokens >= target) flush();
      }
    }

    flush();
    return chunks;
  }

  private splitIntoBlocks(text: string): Array<{ text: string; kind: "text" | "heading" }> {
    const blocks: Array<{ text: string; kind: "text" | "heading" }> = [];
    const paragraphs = text
      .split(/\n{2,}|\r\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const para of paragraphs) {
      const lines = para.split(/\n+/);
      let buf: string[] = [];
      const flushBuf = () => {
        if (buf.length) {
          blocks.push({ text: buf.join(" ").trim(), kind: "text" });
          buf = [];
        }
      };
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (HEADING_RE.test(trimmed) && trimmed.length < 120) {
          flushBuf();
          blocks.push({ text: trimmed, kind: "heading" });
        } else {
          buf.push(trimmed);
        }
      }
      flushBuf();
    }
    return blocks;
  }
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / WORDS_PER_TOKEN);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function headingLevel(line: string): number {
  const md = line.match(/^(#{1,6})\s+/);
  if (md) return md[1].length;
  const numbered = line.match(/^(\d+(?:\.\d+)*)\s+/);
  if (numbered) return numbered[1].split(".").length;
  return 1;
}

function stripHeading(line: string): string {
  return line.replace(/^#{1,6}\s+/, "").replace(/^\d+(?:\.\d+)*\s+/, "").trim();
}
