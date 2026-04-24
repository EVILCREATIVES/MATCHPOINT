#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================
// MATCHPOINT — Migrate Vercel Blobs to `access: "public"`
// ============================================================
// Why: @vercel/blob v2 stores all blobs as public. Anything previously
// uploaded with `access: "private"` returns 403 on direct fetch, which
// breaks ingestion. This script:
//   1. Downloads each existing blob using the SDK (which auths via
//      BLOB_READ_WRITE_TOKEN).
//   2. Re-uploads it as `public`.
//   3. Updates `sources.sourceUrl` / `sources.filePath` to the new blob.
//   4. Deletes the old blob.
//
// Usage:
//   node scripts/migrate-blobs-to-public.js          # dry run
//   node scripts/migrate-blobs-to-public.js --apply  # actually migrate
//
// Requires: DATABASE_URL and BLOB_READ_WRITE_TOKEN in env.
// ============================================================

require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const postgres = require("postgres");
const { put, del, head } = require("@vercel/blob");

const APPLY = process.argv.includes("--apply");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!dbUrl) throw new Error("DATABASE_URL is not set");
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is not set");

  const sql = postgres(dbUrl, { prepare: false, max: 1 });

  try {
    const rows = await sql`
      SELECT id, title, source_url, file_path
      FROM sources
      WHERE source_url IS NOT NULL
      ORDER BY created_at ASC
    `;

    console.log(`[migrate] Found ${rows.length} source(s) with a blob URL`);
    if (!APPLY) {
      console.log("[migrate] Dry run — pass --apply to perform migration\n");
    }

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
      const oldUrl = row.source_url;
      const oldPath = row.file_path || extractPathname(oldUrl);
      console.log(`\n[migrate] ${row.id}  ${row.title}`);
      console.log(`          old: ${oldUrl}`);

      // Probe with a HEAD via the SDK (auth'd) to confirm the blob exists
      // and discover its content type.
      let meta;
      try {
        meta = await head(oldUrl, { token });
      } catch (err) {
        console.warn(`          ! head() failed: ${err.message} — skipping`);
        skipped++;
        continue;
      }

      // Quick public-fetch check: if it already works, nothing to do.
      const publicCheck = await fetch(oldUrl, { method: "HEAD" }).catch(() => null);
      if (publicCheck && publicCheck.ok) {
        console.log("          ✓ already publicly accessible — skipping");
        skipped++;
        continue;
      }

      if (!APPLY) {
        console.log("          would migrate (dry run)");
        continue;
      }

      try {
        // Download via SDK-auth'd URL. `head()` returns a downloadUrl that
        // works for both public and private blobs when auth is implicit.
        const downloadResp = await fetch(meta.downloadUrl || oldUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!downloadResp.ok) {
          throw new Error(`download ${downloadResp.status} ${downloadResp.statusText}`);
        }
        const buffer = Buffer.from(await downloadResp.arrayBuffer());

        // Re-upload as public, preserving the pathname.
        const newBlob = await put(oldPath, buffer, {
          access: "public",
          addRandomSuffix: true,
          contentType: meta.contentType || "application/pdf",
          token,
        });
        console.log(`          new: ${newBlob.url}`);

        await sql`
          UPDATE sources
          SET source_url = ${newBlob.url}, file_path = ${newBlob.pathname}
          WHERE id = ${row.id}
        `;

        // Delete the old blob last, after the DB is updated.
        await del(oldUrl, { token });
        console.log("          ✓ migrated");
        migrated++;
      } catch (err) {
        console.error(`          ✗ failed: ${err.message}`);
        failed++;
      }
    }

    console.log(
      `\n[migrate] Done. migrated=${migrated} skipped=${skipped} failed=${failed}`
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function extractPathname(url) {
  try {
    return new URL(url).pathname.replace(/^\/+/, "");
  } catch {
    return url;
  }
}

main().catch((err) => {
  console.error("[migrate] Fatal:", err);
  process.exit(1);
});
