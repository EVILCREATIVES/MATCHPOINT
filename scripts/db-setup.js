#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================
// MATCHPOINT — Database setup script (run during Vercel build)
// ============================================================
// 1. Verifies DATABASE_URL is set.
// 2. Ensures the `vector` extension exists (required by pgvector columns).
// 3. Runs `drizzle-kit push --force` to sync schema.
// Fails loudly if anything goes wrong so the deploy aborts.
// ============================================================

const { execSync } = require("child_process");
const postgres = require("postgres");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[db:setup] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  console.log("[db:setup] Connecting to database…");
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log("[db:setup] ✓ pgvector extension ready");
  } catch (err) {
    console.error("[db:setup] Failed to ensure pgvector extension:", err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }

  console.log("[db:setup] Running drizzle-kit push --force…");
  try {
    execSync("npx drizzle-kit push --force", {
      stdio: "inherit",
      env: process.env,
    });
    console.log("[db:setup] ✓ schema synced");
  } catch {
    console.error("[db:setup] drizzle-kit push failed");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[db:setup] Unexpected error:", err);
  process.exit(1);
});
