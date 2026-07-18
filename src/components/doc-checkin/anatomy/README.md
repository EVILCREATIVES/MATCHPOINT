# Doc Check-In — Anatomy assets

The body picker renders a **procedural mannequin** by default (`body-parts.ts` →
`body-model.tsx`) so the feature works with zero external assets, and **auto-upgrades to
real GLB anatomy** the moment you provide files — no logic changes required.

Every clickable structure is expressed only as `{ regionId, side }` (canonical ids in
`src/lib/doc-checkin/regions.ts`). The AI advice pipeline, DB, and exercise library all
key off those ids, so the visual model can be swapped freely.

## How the GLB pipeline works

| File | Role |
|------|------|
| `asset-manifest.ts` | Declares which GLB exists per `gender × layer`. `null` → procedural for that combo. |
| `region-map.ts` | Maps anatomy mesh names (`Biceps_femoris_l`, `patella.R`, …) → `{ regionId, side }` via an ordered keyword table + side detection. |
| `glb-body.tsx` | `useGLTF` loader: clones + tints materials, indexes meshes by region, auto-scales/centers to the scene, wires hover/click → `onSelect`. |
| `body-canvas.tsx` | Picks GLB vs procedural per layer/gender, with `Suspense` + an error boundary that falls back to procedural if a file is missing/broken. |

## Adding real anatomy meshes — concrete sources

Run `npm run fetch:anatomy` for the same list with URLs. All viable sources are
**CC-BY-SA** (attribution **and** share-alike — a real obligation for a commercial app;
you must license your derived `.glb` files under CC-BY-SA too). All are **male models** —
the "woman" figure keeps using the procedural mannequin until a female mesh exists.

| Route | Effort | Fit with `region-map.ts` |
|-------|--------|--------------------------|
| **Z-Anatomy on Sketchfab** ([account](https://sketchfab.com/Z-Anatomy)) — download "Myology" + "Skeleton" as GLB (free login) | Lowest — no conversion | ✅ English-named meshes → clickable out of the box |
| **Z-Anatomy `.blend`** ([repo](https://github.com/Z-Anatomy/Models-of-human-anatomy), ~291 MB, Blender 3.6) — export glTF 2.0 | One Blender pass | ✅ names carry through |
| **BodyParts3D** ([STL mirror](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) / [OBJ zips](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)) — ~1,523 named parts, `obj2gltf` | Batch convert | ⚠️ named by **FMA id**, not English — rename via the FMA table or add FMA ids to `KEYWORDS` |

Then:

1. **Place** the file(s) in `public/anatomy/`, decimated to web size (< ~15 MB each;
   Draco compression is supported by drei's `useGLTF`).
2. **Flip** the matching entries in `asset-manifest.ts`, e.g.
   `"male-skeleton": "/anatomy/male-skeleton.glb"`, and set `ANATOMY_ATTRIBUTION`
   (shown under the model in the UI for CC-BY-SA compliance).

That's it — the picker uses the real mesh; any mesh whose name the keyword table
recognises becomes clickable. Unrecognised names simply aren't selectable; extend
`KEYWORDS` in `region-map.ts` to cover them.

## Orientation note

`glb-body.tsx` auto-scales and recenters, but assumes glTF's standard **Y-up, facing +Z**.
If an export comes in rotated, add a `rotation` to the `<primitive>` (or fix it in the
Blender export) — that's the only per-asset tweak that may be needed.
