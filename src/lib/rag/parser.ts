// ============================================================
// MATCHPOINT — PDF Document Parser
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import type { IDocumentParser, ParsedDocument, ParsedPage } from "./types";

export class PdfDocumentParser implements IDocumentParser {
  async parse(input: Buffer | string, mimeType: string): Promise<ParsedDocument> {
    if (!this.supportedTypes().includes(mimeType)) {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }

    const buffer = typeof input === "string" ? Buffer.from(input, "base64") : input;

    const pages: ParsedPage[] = [];
    const result = await pdfParse(buffer, {
      pagerender: (pageData: {
        getTextContent: (opts: { normalizeWhitespace: boolean; disableCombineTextItems: boolean }) => Promise<{
          items: Array<{ str: string; transform?: number[] }>;
        }>;
        pageIndex: number;
      }) => {
        return pageData
          .getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false })
          .then((textContent) => {
            let lastY: number | null = null;
            const lines: string[] = [];
            let current = "";
            for (const item of textContent.items) {
              const y = item.transform?.[5];
              if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 1) {
                lines.push(current);
                current = item.str;
              } else {
                current += (current ? " " : "") + item.str;
              }
              if (y !== undefined) lastY = y;
            }
            if (current) lines.push(current);
            const text = lines.join("\n");
            pages.push({ pageNumber: pageData.pageIndex + 1, content: text });
            return text;
          });
      },
    });

    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    return {
      content: result.text,
      metadata: {
        pageCount: result.numpages,
        info: result.info,
      },
      pageCount: result.numpages,
      title: result.info?.Title || undefined,
      pages,
    };
  }

  supportedTypes(): string[] {
    return ["application/pdf"];
  }
}
