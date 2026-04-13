// ============================================================
// MATCHPOINT — PDF Document Parser
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import type { IDocumentParser, ParsedDocument } from "./types";

export class PdfDocumentParser implements IDocumentParser {
  async parse(input: Buffer | string, mimeType: string): Promise<ParsedDocument> {
    if (!this.supportedTypes().includes(mimeType)) {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }

    const buffer = typeof input === "string" ? Buffer.from(input, "base64") : input;
    const result = await pdfParse(buffer);

    return {
      content: result.text,
      metadata: {
        pageCount: result.numpages,
        info: result.info,
      },
      pageCount: result.numpages,
      title: result.info?.Title || undefined,
    };
  }

  supportedTypes(): string[] {
    return ["application/pdf"];
  }
}
