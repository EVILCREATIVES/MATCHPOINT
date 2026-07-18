// ============================================================
// MATCHPOINT — Position-based region classifier
// ============================================================
// Real anatomy GLB exports (e.g. Z-Anatomy via Sketchfab) often lose
// their per-structure names (meshes come through as "Object_2"…), so a
// name matcher can't tag them. Instead we classify the *clicked 3D point*
// on the body into a canonical region by nearest anatomical anchor.
//
// Anchors are the procedural model's pad positions (body-parts.ts), which
// already sit at each region in a normalized body space (Y up, +Z front,
// height ≈ 1.8 centered on origin, model-right at −X). GlbBody normalizes
// any loaded mesh into the same space, so a world-space hit point can be
// classified directly.
// ============================================================

import { Vector3 } from "three";
import { BODY_PARTS } from "./body-parts";
import type { BodySide } from "@/lib/doc-checkin/regions";

export interface RegionAnchor {
  regionId: string;
  side: BodySide;
  pos: Vector3;
}

// Derive anchors from the procedural pads. Weight front/back separation a
// little by keeping each pad's own z, so a click on the chest (z+) resolves
// to chest while the back (z−) resolves to upperBack/lat/etc.
export const REGION_ANCHORS: RegionAnchor[] = BODY_PARTS.map((p) => ({
  regionId: p.regionId,
  side: p.side,
  pos: new Vector3(p.position[0], p.position[1], p.position[2]),
}));

/**
 * Classify a point (in normalized body/world space) to the nearest region.
 * Depth (z) is weighted up so front vs back structures separate cleanly even
 * though the body is thin front-to-back.
 */
export function classifyPoint(point: Vector3): { regionId: string; side: BodySide } {
  let best: RegionAnchor | null = null;
  let bestD = Infinity;
  for (const a of REGION_ANCHORS) {
    const dx = point.x - a.pos.x;
    const dy = point.y - a.pos.y;
    const dz = (point.z - a.pos.z) * 1.6; // emphasize front/back
    const d = dx * dx + dy * dy + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best ? { regionId: best.regionId, side: best.side } : { regionId: "abdomen", side: "center" };
}
