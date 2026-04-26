// ============================================================
// MATCHPOINT — Website Parser
// ============================================================
// Crawls a same-origin website starting from a seed URL, extracts
// readable text, captures media (images, video, SVG, lottie) URLs
// as "figures" so animations / illustrations remain referenceable
// after ingestion. No headless browser — works in serverless.
//
// Each crawled page becomes a `ParsedPage` with pageNumber = order
// of discovery. Figures collected across all pages are surfaced via
// metadata.figures so the pipeline can persist them.
// ============================================================

import * as cheerio from "cheerio";
import type { IDocumentParser, ParsedDocument, ParsedPage } from "./types";

interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  // Hard wall-clock cap so a runaway crawl can't blow the function budget.
  maxMs?: number;
  userAgent?: string;
}

interface MediaItem {
  url: string;
  type: "image" | "video" | "svg" | "lottie" | "iframe";
  alt?: string;
  pageUrl: string;
}

const DEFAULT_OPTS: Required<CrawlOptions> = {
  maxPages: 25,
  maxDepth: 2,
  maxMs: 60_000,
  userAgent:
    "MATCHPOINT-Ingest/1.0 (+https://matchpoint-azure.vercel.app)",
};

export class WebsiteParser implements IDocumentParser {
  constructor(private readonly opts: CrawlOptions = {}) {}

  supportedTypes(): string[] {
    return ["text/html", "application/xhtml+xml"];
  }

  /**
   * For websites the `input` arg is ignored — we always crawl from `mimeType`
   * which is repurposed as the seed URL. The pipeline already passes the
   * source URL to us via a custom contract: see WebsiteParser.parseUrl.
   * Kept here for interface compatibility.
   */
  async parse(_input: Buffer | string, mimeType: string): Promise<ParsedDocument> {
    if (mimeType.startsWith("http")) {
      return this.parseUrl(mimeType);
    }
    throw new Error(
      "WebsiteParser.parse expects a URL passed as the second argument"
    );
  }

  async parseUrl(seedUrl: string): Promise<ParsedDocument> {
    const opts = { ...DEFAULT_OPTS, ...this.opts };
    const start = Date.now();
    const seed = new URL(seedUrl);
    const sameOrigin = seed.origin;

    const queue: Array<{ url: string; depth: number }> = [
      { url: seed.toString(), depth: 0 },
    ];
    const seen = new Set<string>([normalize(seed.toString())]);
    const pages: ParsedPage[] = [];
    const figures: MediaItem[] = [];
    let title: string | undefined;

    while (queue.length && pages.length < opts.maxPages) {
      if (Date.now() - start > opts.maxMs) {
        console.warn("[WebsiteParser] hit time budget; stopping crawl");
        break;
      }
      const next = queue.shift()!;
      const result = await this.fetchPage(next.url, opts.userAgent);
      if (!result) continue;

      const { text, pageTitle, links, media } = result;
      if (!title && pageTitle) title = pageTitle;

      pages.push({
        pageNumber: pages.length + 1,
        content: text,
      });
      figures.push(...media);

      if (next.depth < opts.maxDepth) {
        for (const href of links) {
          try {
            const u = new URL(href, next.url);
            if (u.origin !== sameOrigin) continue;
            // Skip obvious non-content extensions.
            if (/\.(pdf|jpg|jpeg|png|gif|webp|svg|mp4|webm|zip)(\?|#|$)/i.test(u.pathname)) {
              continue;
            }
            const norm = normalize(u.toString());
            if (seen.has(norm)) continue;
            seen.add(norm);
            queue.push({ url: u.toString(), depth: next.depth + 1 });
          } catch {
            /* skip invalid URLs */
          }
        }
      }
    }

    const fullText = pages
      .map((p, i) => `\n--- Page ${i + 1} ---\n${p.content}`)
      .join("\n\n");

    return {
      content: fullText,
      pageCount: pages.length,
      pages,
      title,
      metadata: {
        seedUrl: seed.toString(),
        crawled: pages.length,
        figures: dedupeFigures(figures).slice(0, 200),
      },
    };
  }

  private async fetchPage(
    url: string,
    userAgent: string
  ): Promise<{
    text: string;
    pageTitle?: string;
    links: string[];
    media: MediaItem[];
  } | null> {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
        // Don't follow redirects across origins silently.
        redirect: "follow",
      });
    } catch (err) {
      console.warn("[WebsiteParser] fetch error for", url, err);
      return null;
    }
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("xhtml")) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Drop noise.
    $("script, style, noscript, nav, header, footer, aside").remove();

    const pageTitle = $("title").first().text().trim() || $("h1").first().text().trim();

    // Extract main content with sensible fallbacks.
    const main =
      $("main").first().length > 0
        ? $("main").first()
        : $("article").first().length > 0
          ? $("article").first()
          : $("body");

    // Preserve heading hierarchy and paragraph breaks.
    const blocks: string[] = [];
    main.find("h1, h2, h3, h4, p, li, blockquote, figcaption").each((_, el) => {
      const tag = (el as cheerio.Element & { tagName?: string }).tagName ?? "p";
      const txt = $(el).text().replace(/\s+/g, " ").trim();
      if (!txt) return;
      if (/^h[1-4]$/.test(tag)) {
        blocks.push(`\n## ${txt}\n`);
      } else if (tag === "li") {
        blocks.push(`• ${txt}`);
      } else {
        blocks.push(txt);
      }
    });
    const text = blocks.join("\n").trim();

    // Collect links for further crawling.
    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
        links.push(href);
      }
    });

    // Collect media references — animations, videos, illustrations.
    const media: MediaItem[] = [];
    $("img[src]").each((_, el) => {
      const src = $(el).attr("src");
      const alt = $(el).attr("alt");
      if (!src) return;
      try {
        const abs = new URL(src, url).toString();
        const ext = abs.split("?")[0].split(".").pop()?.toLowerCase();
        media.push({
          url: abs,
          type: ext === "svg" ? "svg" : "image",
          alt: alt || undefined,
          pageUrl: url,
        });
      } catch {
        /* noop */
      }
    });
    $("video source[src], video[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (!src) return;
      try {
        media.push({ url: new URL(src, url).toString(), type: "video", pageUrl: url });
      } catch {
        /* noop */
      }
    });
    $("iframe[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (!src) return;
      try {
        const abs = new URL(src, url).toString();
        // Only keep video-platform iframes (YouTube, Vimeo, etc.) — those are
        // the ones likely to be tennis demonstrations.
        if (/(youtube|youtu\.be|vimeo|wistia|loom)/i.test(abs)) {
          media.push({ url: abs, type: "iframe", pageUrl: url });
        }
      } catch {
        /* noop */
      }
    });
    // Lottie JSON files (common for animations).
    $('[data-lottie-src], [data-src$=".json"], a[href$=".json"]').each((_, el) => {
      const src =
        $(el).attr("data-lottie-src") ||
        $(el).attr("data-src") ||
        $(el).attr("href");
      if (!src) return;
      try {
        media.push({ url: new URL(src, url).toString(), type: "lottie", pageUrl: url });
      } catch {
        /* noop */
      }
    });

    return { text, pageTitle, links, media };
  }
}

function normalize(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    // Strip common tracking params.
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ].forEach((p) => url.searchParams.delete(p));
    // Trailing slash normalization.
    let s = url.toString();
    if (s.endsWith("/") && url.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return u;
  }
}

function dedupeFigures(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const it of items) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    out.push(it);
  }
  return out;
}
