// ============================================================
// MATCHPOINT — GLB mesh-name → canonical region matcher
// ============================================================
// Real anatomy GLBs (Z-Anatomy, BodyParts3D, Sketchfab exports) name
// their meshes after anatomical structures, e.g. "Biceps_brachii_l",
// "Gluteus_maximus.R", "patella_left". This maps those names onto the
// canonical region ids in lib/doc-checkin/regions.ts so the loaded model
// becomes clickable with zero per-asset hand-tuning.
//
// If an asset uses unusual names, extend KEYWORDS below — order matters,
// most specific first (e.g. "biceps femoris" before "biceps").
// ============================================================

import type { BodySide } from "@/lib/doc-checkin/regions";

export interface MappedRegion {
  regionId: string;
  side: BodySide;
}

// Ordered [regionId, keyword] pairs. First substring match wins, so
// multi-word / more-specific anatomical terms come before generic ones.
const KEYWORDS: Array<[string, string]> = [
  // — specific arm vs leg disambiguation first —
  ["hamstring", "biceps femoris"],
  ["hamstring", "semitendinosus"],
  ["hamstring", "semimembranosus"],
  ["hamstring", "hamstring"],
  ["upperArm", "biceps brachii"],
  ["upperArm", "triceps brachii"],
  ["upperArm", "brachialis"],
  ["upperArm", "coracobrachialis"],

  // — neck —
  ["neck", "cervical"],
  ["neck", "sternocleidomastoid"],
  ["neck", "scalene"],
  ["neck", "splenius"],
  ["neck", "longus colli"],
  ["neck", "neck"],

  // — shoulder / rotator cuff —
  ["shoulder", "deltoid"],
  ["shoulder", "rotator"],
  ["shoulder", "supraspinatus"],
  ["shoulder", "infraspinatus"],
  ["shoulder", "subscapularis"],
  ["shoulder", "teres minor"],
  ["shoulder", "teres major"],
  ["shoulder", "glenohumeral"],
  ["shoulder", "glenoid"],
  ["shoulder", "clavicle"],
  ["shoulder", "acromion"],
  ["shoulder", "shoulder"],
  ["shoulder", "humeral head"],

  // — scapula / rhomboids —
  ["scapula", "rhomboid"],
  ["scapula", "scapula"],
  ["scapula", "levator scapulae"],
  ["scapula", "serratus"],

  // — trapezius —
  ["trapezius", "trapezius"],
  ["trapezius", "upper trap"],

  // — chest —
  ["chest", "pectoralis"],
  ["chest", "pectoral"],
  ["chest", "sternum"],
  ["chest", "sternal"],

  // — lat —
  ["lat", "latissimus"],

  // — abdomen / core —
  ["abdomen", "rectus abdominis"],
  ["abdomen", "transversus abdominis"],
  ["abdomen", "abdominal"],
  ["abdomen", "linea alba"],

  // — oblique —
  ["oblique", "oblique"],

  // — lower back —
  ["lowerBack", "lumbar"],
  ["lowerBack", "quadratus lumborum"],
  ["lowerBack", "multifidus"],
  ["lowerBack", "erector spinae"],
  ["lowerBack", "iliocostalis"],

  // — upper back / thoracic —
  ["upperBack", "thoracic"],
  ["upperBack", "spinalis"],

  // — hip / groin / pelvis —
  ["hip", "iliopsoas"],
  ["hip", "psoas"],
  ["hip", "iliacus"],
  ["hip", "adductor"],
  ["hip", "pectineus"],
  ["hip", "gracilis"],
  ["hip", "tensor fasciae"],
  ["hip", "pubis"],
  ["hip", "pubic"],
  ["hip", "ilium"],
  ["hip", "iliac"],
  ["hip", "inguinal"],
  ["hip", "groin"],
  ["hip", "hip"],

  // — glute —
  ["glute", "gluteus"],
  ["glute", "gluteal"],
  ["glute", "piriformis"],
  ["glute", "sacrum"],
  ["glute", "sacral"],
  ["glute", "glute"],

  // — quad / thigh front —
  ["quad", "quadriceps"],
  ["quad", "rectus femoris"],
  ["quad", "vastus"],
  ["quad", "sartorius"],
  ["quad", "quad"],

  // — knee —
  ["knee", "patella"],
  ["knee", "meniscus"],
  ["knee", "cruciate"],
  ["knee", "patellar"],
  ["knee", "knee"],

  // — elbow —
  ["elbow", "olecranon"],
  ["elbow", "epicondyle"],
  ["elbow", "cubital"],
  ["elbow", "elbow"],

  // — forearm —
  ["forearm", "brachioradialis"],
  ["forearm", "flexor carpi"],
  ["forearm", "extensor carpi"],
  ["forearm", "flexor digitorum"],
  ["forearm", "extensor digitorum"],
  ["forearm", "pronator"],
  ["forearm", "supinator"],
  ["forearm", "radius"],
  ["forearm", "ulna"],
  ["forearm", "forearm"],

  // — wrist / hand —
  ["wrist", "carpal"],
  ["wrist", "carpus"],
  ["wrist", "metacarpal"],
  ["wrist", "phalan"],
  ["wrist", "wrist"],
  ["wrist", "hand"],

  // — shin —
  ["shin", "tibialis anterior"],
  ["shin", "tibia"],
  ["shin", "fibula"],
  ["shin", "shin"],
  ["shin", "peroneus"],
  ["shin", "fibularis"],

  // — calf —
  ["calf", "gastrocnemius"],
  ["calf", "soleus"],
  ["calf", "triceps surae"],
  ["calf", "calf"],

  // — achilles —
  ["achilles", "achilles"],
  ["achilles", "calcaneal tendon"],

  // — ankle / foot —
  ["ankle", "calcaneus"],
  ["ankle", "talus"],
  ["ankle", "tarsal"],
  ["ankle", "malleolus"],
  ["ankle", "plantar"],
  ["ankle", "ankle"],
  ["ankle", "foot"],

  // — arm fallback (after femoris handled above) —
  ["upperArm", "humerus"],
  ["upperArm", "biceps"],
  ["upperArm", "triceps"],
  ["upperArm", "upper arm"],

  // — leg fallback —
  ["quad", "femur"],
  ["quad", "thigh"],
];

// Detect anatomical side from tokens like _l / -R / .left / _right.
export function detectSide(name: string): BodySide {
  const n = name.toLowerCase();
  // Bounded left/right words or single-letter side suffixes.
  if (/(^|[_\-. ])(left|lt|l)([_\-. 0-9]|$)/.test(n)) return "left";
  if (/(^|[_\-. ])(right|rt|r)([_\-. 0-9]|$)/.test(n)) return "right";
  if (/left/.test(n)) return "left";
  if (/right/.test(n)) return "right";
  return "center";
}

/** Map an arbitrary anatomy mesh/node name → region + side, or null if unknown. */
export function mapMeshNameToRegion(rawName: string): MappedRegion | null {
  if (!rawName) return null;
  const name = rawName.toLowerCase().replace(/[_\-.]+/g, " ");
  for (const [regionId, keyword] of KEYWORDS) {
    if (name.includes(keyword)) {
      return { regionId, side: detectSide(rawName) };
    }
  }
  return null;
}
