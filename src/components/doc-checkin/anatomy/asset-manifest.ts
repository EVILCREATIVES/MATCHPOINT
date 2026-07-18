// ============================================================
// MATCHPOINT — Doc Check-In anatomy asset manifest
// ============================================================
// Declares which real GLB anatomy files exist, per gender × layer.
// When a value is null the body picker renders the procedural
// mannequin for that combination; set it to a path under /public
// (e.g. "/anatomy/male-muscle.glb") and it switches to the real mesh
// automatically — no other code changes needed.
//
// Drop files in public/anatomy/ (see scripts/fetch-anatomy.js) then
// flip the matching entry below.
// ============================================================

import type { BodyLayer } from "@/lib/doc-checkin/regions";

export type Gender = "male" | "female";

type AssetKey = `${Gender}-${BodyLayer}`;

export const ANATOMY_ASSETS: Record<AssetKey, string | null> = {
  // Z-Anatomy "Myology" (muscles), decimated + meshopt-compressed to ~14 MB.
  "male-muscle": "/anatomy/muscle.glb",
  // Z-Anatomy "Arthrology" (bones + joints) as the skeleton layer, ~3 MB.
  "male-skeleton": "/anatomy/skeleton.glb",
  // Z-Anatomy models are male-only; female uses the procedural mannequin.
  "female-muscle": null,
  "female-skeleton": null,
};

// Y-rotation (radians) applied to loaded GLBs so the model faces the camera
// and front/back region classification is correct. If clicks feel front/back
// swapped, set this to Math.PI.
export const ANATOMY_ROTATION_Y = 0;

/** Attribution shown under the model (CC-BY-SA requires it). */
export const ANATOMY_ATTRIBUTION: string | null =
  "3D anatomy models: Z-Anatomy (z-anatomy.com), CC BY-SA 4.0.";

export function anatomyAssetUrl(gender: Gender, layer: BodyLayer): string | null {
  return ANATOMY_ASSETS[`${gender}-${layer}`] ?? null;
}

export function hasAnyAnatomyAsset(): boolean {
  return Object.values(ANATOMY_ASSETS).some((v) => v != null);
}
