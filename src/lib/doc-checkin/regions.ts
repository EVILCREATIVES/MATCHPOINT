// ============================================================
// MATCHPOINT — Doc Check-In: canonical body-region registry
// ============================================================
// Single source of truth for the interactive body map. Both the
// SVG hotspots (components/doc-checkin/anatomy/*) and the AI prompt
// (lib/ai/doc-checkin.ts) reference these region ids, so higher
// fidelity anatomy art can be swapped in later without touching logic.
// ============================================================

export type BodyView = "front" | "back";
export type BodyLayer = "muscle" | "skeleton";
export type BodySide = "left" | "right" | "center";

export interface BodyRegion {
  id: string;
  /** Muscle-oriented label (default). */
  label: string;
  /** Skeleton-oriented label, shown when the skeleton layer is active. */
  skeletonLabel?: string;
  /** Which views the region is reachable from. */
  views: BodyView[];
  /** True when the region exists on both left and right sides. */
  paired: boolean;
  /** Plain-language hints that help the AI reason about likely causes. */
  commonIssues: string[];
}

export const BODY_REGIONS: Record<string, BodyRegion> = {
  // ── Head / neck ──
  neck: {
    id: "neck",
    label: "Neck",
    skeletonLabel: "Cervical spine",
    views: ["front", "back"],
    paired: false,
    commonIssues: ["muscle strain", "poor posture / tech neck", "cervical tension"],
  },
  // ── Shoulder girdle ──
  shoulder: {
    id: "shoulder",
    label: "Shoulder (deltoid)",
    skeletonLabel: "Shoulder joint",
    views: ["front", "back"],
    paired: true,
    commonIssues: ["rotator cuff strain", "impingement", "overuse from serving"],
  },
  trapezius: {
    id: "trapezius",
    label: "Upper trapezius",
    skeletonLabel: "Clavicle / upper spine",
    views: ["back"],
    paired: true,
    commonIssues: ["tension knots", "posture overload", "stress-related tightness"],
  },
  scapula: {
    id: "scapula",
    label: "Shoulder blade (rhomboids)",
    skeletonLabel: "Scapula",
    views: ["back"],
    paired: true,
    commonIssues: ["postural strain", "scapular winging", "mid-back tightness"],
  },
  // ── Chest / back core ──
  chest: {
    id: "chest",
    label: "Chest (pectoral)",
    skeletonLabel: "Ribcage / sternum",
    views: ["front"],
    paired: true,
    commonIssues: ["muscle strain", "overtraining", "costochondritis"],
  },
  upperBack: {
    id: "upperBack",
    label: "Upper back (thoracic)",
    skeletonLabel: "Thoracic spine",
    views: ["back"],
    paired: false,
    commonIssues: ["postural strain", "thoracic stiffness", "muscle tension"],
  },
  lat: {
    id: "lat",
    label: "Lat (latissimus dorsi)",
    skeletonLabel: "Lower ribs",
    views: ["back"],
    paired: true,
    commonIssues: ["overuse from swinging", "strain", "tightness limiting reach"],
  },
  lowerBack: {
    id: "lowerBack",
    label: "Lower back (lumbar)",
    skeletonLabel: "Lumbar spine",
    views: ["back"],
    paired: false,
    commonIssues: ["muscle strain", "disc irritation", "poor core stability", "rotation overload"],
  },
  // ── Core ──
  abdomen: {
    id: "abdomen",
    label: "Abdomen (core)",
    skeletonLabel: "Lower ribcage",
    views: ["front"],
    paired: false,
    commonIssues: ["abdominal strain", "overtraining", "weak core"],
  },
  oblique: {
    id: "oblique",
    label: "Oblique (side)",
    skeletonLabel: "Floating ribs",
    views: ["front"],
    paired: true,
    commonIssues: ["side strain from serving", "rotation overload"],
  },
  // ── Arm ──
  upperArm: {
    id: "upperArm",
    label: "Upper arm (biceps/triceps)",
    skeletonLabel: "Humerus",
    views: ["front", "back"],
    paired: true,
    commonIssues: ["muscle strain", "overuse", "tendon irritation"],
  },
  elbow: {
    id: "elbow",
    label: "Elbow",
    skeletonLabel: "Elbow joint",
    views: ["front", "back"],
    paired: true,
    commonIssues: ["tennis elbow (lateral epicondylitis)", "golfer's elbow", "tendinopathy"],
  },
  forearm: {
    id: "forearm",
    label: "Forearm",
    skeletonLabel: "Radius / ulna",
    views: ["front", "back"],
    paired: true,
    commonIssues: ["grip overuse", "flexor/extensor strain", "forearm tightness"],
  },
  wrist: {
    id: "wrist",
    label: "Wrist / hand",
    skeletonLabel: "Wrist bones",
    views: ["front", "back"],
    paired: true,
    commonIssues: ["sprain", "tendonitis", "grip overload", "impact from mishits"],
  },
  // ── Hip / pelvis ──
  hip: {
    id: "hip",
    label: "Hip / groin",
    skeletonLabel: "Hip joint / pelvis",
    views: ["front"],
    paired: true,
    commonIssues: ["hip flexor strain", "adductor/groin strain", "labral irritation"],
  },
  glute: {
    id: "glute",
    label: "Glute",
    skeletonLabel: "Pelvis / sacrum",
    views: ["back"],
    paired: true,
    commonIssues: ["glute strain", "piriformis tightness", "weak hip drive"],
  },
  // ── Leg ──
  quad: {
    id: "quad",
    label: "Thigh (quadriceps)",
    skeletonLabel: "Femur",
    views: ["front"],
    paired: true,
    commonIssues: ["quad strain", "overuse", "muscle fatigue"],
  },
  hamstring: {
    id: "hamstring",
    label: "Hamstring",
    skeletonLabel: "Femur (posterior)",
    views: ["back"],
    paired: true,
    commonIssues: ["hamstring strain", "tightness", "explosive-sprint overload"],
  },
  knee: {
    id: "knee",
    label: "Knee",
    skeletonLabel: "Knee joint / patella",
    views: ["front", "back"],
    paired: true,
    commonIssues: ["patellar tendinopathy", "ligament strain", "cartilage irritation", "jumper's knee"],
  },
  shin: {
    id: "shin",
    label: "Shin",
    skeletonLabel: "Tibia",
    views: ["front"],
    paired: true,
    commonIssues: ["shin splints", "tibialis overuse", "impact stress"],
  },
  calf: {
    id: "calf",
    label: "Calf",
    skeletonLabel: "Tibia / fibula (posterior)",
    views: ["back"],
    paired: true,
    commonIssues: ["calf strain", "cramping", "tightness"],
  },
  achilles: {
    id: "achilles",
    label: "Achilles / ankle (back)",
    skeletonLabel: "Calcaneus / Achilles tendon",
    views: ["back"],
    paired: true,
    commonIssues: ["Achilles tendinopathy", "tightness", "overuse from sprinting"],
  },
  ankle: {
    id: "ankle",
    label: "Ankle / foot",
    skeletonLabel: "Ankle joint / foot bones",
    views: ["front"],
    paired: true,
    commonIssues: ["ankle sprain", "plantar fasciitis", "instability from lateral movement"],
  },
};

export function getRegion(id: string): BodyRegion | undefined {
  return BODY_REGIONS[id];
}

/** Label appropriate to the active layer (muscle vs skeleton). */
export function regionLabel(id: string, layer: BodyLayer): string {
  const r = BODY_REGIONS[id];
  if (!r) return id;
  if (layer === "skeleton" && r.skeletonLabel) return r.skeletonLabel;
  return r.label;
}

/** Human-readable side prefix, e.g. "Left ". */
export function sideLabel(side: BodySide): string {
  if (side === "center") return "";
  return side === "left" ? "Left " : "Right ";
}

/** Full display name, e.g. "Left Shoulder (deltoid)". */
export function fullRegionName(id: string, side: BodySide, layer: BodyLayer): string {
  return `${sideLabel(side)}${regionLabel(id, layer)}`.trim();
}
