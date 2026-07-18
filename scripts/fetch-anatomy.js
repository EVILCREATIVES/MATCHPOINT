#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================
// MATCHPOINT — Fetch anatomy GLB assets into public/anatomy/
// ============================================================
// Downloads any direct GLB/glTF URLs listed in SOURCES below into
// public/anatomy/, then reminds you to flip the matching entry in
// src/components/doc-checkin/anatomy/asset-manifest.ts.
//
// NOTE: Z-Anatomy / BodyParts3D ship as .blend / OBJ, not GLB. Those
// need a one-time Blender export (see the "MANUAL" note at the bottom).
// This script only handles assets that already have a direct GLB URL.
//
// Run:  node scripts/fetch-anatomy.js
// ============================================================

const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT_DIR = path.join(__dirname, "..", "public", "anatomy");

// Fill in { url, file } for each directly-downloadable GLB you have the
// rights to use. `file` becomes public/anatomy/<file>.
const SOURCES = [
  // { url: "https://example.com/male-skeleton.glb", file: "male-skeleton.glb" },
  // { url: "https://example.com/male-muscle.glb",   file: "male-muscle.glb" },
  // { url: "https://example.com/female-skeleton.glb", file: "female-skeleton.glb" },
  // { url: "https://example.com/female-muscle.glb",   file: "female-muscle.glb" },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    });
    req.on("error", (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (SOURCES.length === 0) {
    console.log("[anatomy] No direct GLB URLs configured in SOURCES.\n");
    console.log("Concrete sourcing options (all CC-BY-SA — attribution + share-alike required):\n");
    console.log("  FASTEST — Z-Anatomy per-system GLB (English-named meshes, matches region-map.ts):");
    console.log("    • https://sketchfab.com/Z-Anatomy  (free login → download 'Myology' + 'Skeleton' as glTF/GLB)");
    console.log("      e.g. Myology: https://sketchfab.com/3d-models/myology-31b40fd809b14665b93773936d67c52c");
    console.log("    → save as public/anatomy/male-muscle.glb and male-skeleton.glb\n");
    console.log("  RICHEST — Z-Anatomy source (.blend, ~291 MB, Blender 3.6):");
    console.log("    • https://github.com/Z-Anatomy/Models-of-human-anatomy");
    console.log("      Open Startup.blend → select a system → File > Export > glTF 2.0 (.glb).");
    console.log("      Object names carry through, so meshes stay clickable.\n");
    console.log("  MOST SEGMENTED — BodyParts3D (per-part files, but named by FMA id, NOT English):");
    console.log("    • https://github.com/Kevin-Mattheus-Moerman/BodyParts3D  (STL + FMA→name table)");
    console.log("    • https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html  (OBJ zips)");
    console.log("      Convert with `npx obj2gltf`. NOTE: rename meshes via the FMA table OR extend");
    console.log("      region-map.ts with FMA ids, else the keyword matcher won't tag them.\n");
    console.log("  Caveats: all three are MALE models (female stays procedural); CC-BY-SA obliges you");
    console.log("  to attribute + share-alike your derived .glb files. Set ANATOMY_ATTRIBUTION in");
    console.log("  asset-manifest.ts, then flip the matching path there. Then re-run is not needed.");
    return;
  }

  for (const s of SOURCES) {
    const dest = path.join(OUT_DIR, s.file);
    process.stdout.write(`[anatomy] downloading ${s.file}… `);
    try {
      await download(s.url, dest);
      const kb = Math.round(fs.statSync(dest).size / 1024);
      console.log(`ok (${kb} KB)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  console.log("[anatomy] Done. Now set the paths in asset-manifest.ts.");
}

main().catch((err) => {
  console.error("[anatomy] unexpected error:", err);
  process.exit(1);
});
