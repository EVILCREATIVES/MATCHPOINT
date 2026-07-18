#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================
// MATCHPOINT — Seed the curated exercise_library
// ============================================================
// Populates vetted exercise selections mapped to body-region ids
// (src/lib/doc-checkin/regions.ts). media_url is left null so the
// Doc Check-In runtime generates a safe YouTube-search link; fill in
// real direct URLs later and they'll surface as "curated".
//
// Run with:  DATABASE_URL=... node scripts/seed-exercises.js
// ============================================================

const postgres = require("postgres");

const EXERCISES = [
  // Neck
  { slug: "neck-chin-tucks", name: "Chin Tucks", category: "mobility", regions: ["neck"], difficulty: "beginner",
    description: "Gentle cervical retraction to reduce forward-head posture and neck tension." },
  { slug: "neck-upper-trap-stretch", name: "Upper Trap Stretch", category: "stretch", regions: ["neck", "trapezius"], difficulty: "beginner",
    description: "Ear-to-shoulder stretch that eases neck and upper-trap tightness." },
  // Shoulder / rotator cuff
  { slug: "shoulder-band-external-rotation", name: "Band External Rotation", category: "strengthen", regions: ["shoulder"], difficulty: "beginner",
    description: "Rotator-cuff strengthening to support the serving shoulder." },
  { slug: "shoulder-wall-slides", name: "Wall Slides", category: "mobility", regions: ["shoulder", "scapula"], difficulty: "beginner",
    description: "Improves scapular control and overhead shoulder mobility." },
  { slug: "shoulder-sleeper-stretch", name: "Sleeper Stretch", category: "stretch", regions: ["shoulder"], difficulty: "intermediate",
    description: "Restores internal rotation commonly lost in racquet-sport shoulders." },
  // Scapula / upper back / trapezius
  { slug: "scapula-rows", name: "Scapular Rows", category: "strengthen", regions: ["scapula", "upperBack", "lat"], difficulty: "beginner",
    description: "Strengthens rhomboids and mid-traps for better posture and pulling." },
  { slug: "thoracic-extension-foam-roller", name: "Foam Roller Thoracic Extension", category: "mobility", regions: ["upperBack"], difficulty: "beginner",
    description: "Mobilizes a stiff mid-back to unload the neck and lower back." },
  // Chest
  { slug: "chest-doorway-stretch", name: "Doorway Pec Stretch", category: "stretch", regions: ["chest"], difficulty: "beginner",
    description: "Opens tight chest muscles that pull the shoulders forward." },
  // Lower back / core
  { slug: "core-dead-bug", name: "Dead Bug", category: "stability", regions: ["lowerBack", "abdomen"], difficulty: "beginner",
    description: "Builds anti-extension core control to protect the lower back." },
  { slug: "lowerback-cat-cow", name: "Cat–Cow", category: "mobility", regions: ["lowerBack", "upperBack"], difficulty: "beginner",
    description: "Gentle spinal mobility drill to ease back stiffness." },
  { slug: "core-plank", name: "Front Plank", category: "stability", regions: ["abdomen", "lowerBack"], difficulty: "beginner",
    description: "Foundational core-bracing exercise for trunk stability." },
  { slug: "oblique-pallof-press", name: "Pallof Press", category: "stability", regions: ["oblique", "abdomen"], difficulty: "intermediate",
    description: "Anti-rotation core work that transfers directly to groundstrokes." },
  { slug: "lowerback-birddog", name: "Bird Dog", category: "stability", regions: ["lowerBack", "glute"], difficulty: "beginner",
    description: "Trains coordinated core and hip control to stabilize the spine." },
  // Elbow / forearm / wrist
  { slug: "elbow-eccentric-wrist-extension", name: "Eccentric Wrist Extension", category: "strengthen", regions: ["elbow", "forearm"], difficulty: "intermediate",
    description: "Evidence-based loading for tennis elbow (lateral epicondylitis)." },
  { slug: "forearm-wrist-flexor-stretch", name: "Wrist Flexor & Extensor Stretch", category: "stretch", regions: ["forearm", "wrist", "elbow"], difficulty: "beginner",
    description: "Relieves grip-related forearm tightness." },
  { slug: "wrist-radial-ulnar-deviation", name: "Wrist Deviation Strengthening", category: "strengthen", regions: ["wrist", "forearm"], difficulty: "beginner",
    description: "Builds wrist stability for racquet control and impact." },
  // Hip / glute
  { slug: "hip-flexor-stretch", name: "Half-Kneeling Hip Flexor Stretch", category: "stretch", regions: ["hip"], difficulty: "beginner",
    description: "Lengthens tight hip flexors from repetitive lunging and sprinting." },
  { slug: "glute-bridge", name: "Glute Bridge", category: "strengthen", regions: ["glute", "lowerBack"], difficulty: "beginner",
    description: "Activates and strengthens glutes to power movement and protect the back." },
  { slug: "hip-90-90", name: "90/90 Hip Rotations", category: "mobility", regions: ["hip", "glute"], difficulty: "beginner",
    description: "Improves hip internal/external rotation for wider court coverage." },
  // Thigh / hamstring / knee
  { slug: "quad-stretch", name: "Standing Quad Stretch", category: "stretch", regions: ["quad"], difficulty: "beginner",
    description: "Eases quad tightness and fatigue after court sessions." },
  { slug: "hamstring-nordic-curl", name: "Nordic Hamstring Curl", category: "strengthen", regions: ["hamstring"], difficulty: "advanced",
    description: "Reduces hamstring-strain risk in sprint-heavy athletes." },
  { slug: "knee-spanish-squat", name: "Spanish Squat", category: "strengthen", regions: ["knee", "quad"], difficulty: "intermediate",
    description: "Loads the patellar tendon to manage jumper's/runner's knee." },
  { slug: "knee-terminal-extension", name: "Terminal Knee Extension", category: "strengthen", regions: ["knee"], difficulty: "beginner",
    description: "Gentle quad activation to support an irritable knee." },
  // Shin / calf / ankle / achilles
  { slug: "shin-heel-walks", name: "Heel Walks", category: "strengthen", regions: ["shin"], difficulty: "beginner",
    description: "Strengthens the tibialis to manage shin splints." },
  { slug: "calf-heel-raises", name: "Calf Heel Raises", category: "strengthen", regions: ["calf", "achilles", "ankle"], difficulty: "beginner",
    description: "Builds calf and Achilles capacity for push-off and landing." },
  { slug: "achilles-eccentric-heel-drop", name: "Eccentric Heel Drops", category: "strengthen", regions: ["achilles", "calf"], difficulty: "intermediate",
    description: "Classic loading protocol for Achilles tendinopathy." },
  { slug: "ankle-alphabet", name: "Ankle Alphabet & Balance", category: "mobility", regions: ["ankle"], difficulty: "beginner",
    description: "Restores range and proprioception after ankle sprains." },
  // Upper arm
  { slug: "upperarm-biceps-triceps-stretch", name: "Biceps & Triceps Stretch", category: "stretch", regions: ["upperArm"], difficulty: "beginner",
    description: "Loosens the upper arm after repetitive swinging." },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[seed] DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    let count = 0;
    for (const e of EXERCISES) {
      await sql`
        INSERT INTO exercise_library
          (name, slug, description, category, body_regions, difficulty, media_url, media_type, is_active)
        VALUES
          (${e.name}, ${e.slug}, ${e.description}, ${e.category},
           ${JSON.stringify(e.regions)}::jsonb, ${e.difficulty}, NULL, NULL, true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          body_regions = EXCLUDED.body_regions,
          difficulty = EXCLUDED.difficulty,
          is_active = true
      `;
      count++;
    }
    console.log(`[seed] ✓ upserted ${count} curated exercises`);
  } catch (err) {
    console.error("[seed] failed:", err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[seed] unexpected error:", err);
  process.exit(1);
});
