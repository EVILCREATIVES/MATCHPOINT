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
  "male-muscle": null,
  "male-skeleton": null,
  "female-muscle": null,
  "female-skeleton": null,
};

/** Optional per-file attribution shown in the UI (CC-BY / CC-BY-SA compliance). */
export const ANATOMY_ATTRIBUTION: string | null = null;

export function anatomyAssetUrl(gender: Gender, layer: BodyLayer): string | null {
  return ANATOMY_ASSETS[`${gender}-${layer}`] ?? null;
}

export function hasAnyAnatomyAsset(): boolean {
  return Object.values(ANATOMY_ASSETS).some((v) => v != null);
}
