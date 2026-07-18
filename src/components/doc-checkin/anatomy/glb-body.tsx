"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import {
  Box3,
  Vector3,
  Color,
  type Object3D,
  type Mesh,
  type Material,
} from "three";
import { mapMeshNameToRegion } from "./region-map";
import { fullRegionName, type BodyLayer, type BodySide } from "@/lib/doc-checkin/regions";
import type { SelectedRegion } from "./body-model";

const HOVER_EMISSIVE = new Color("#f59e0b");
const SELECT_EMISSIVE = new Color("#22c55e");
const BASE_EMISSIVE = new Color("#000000");
const TARGET_HEIGHT = 1.85; // match the procedural model's framing

interface GlbBodyProps {
  url: string;
  layer: BodyLayer;
  selected: SelectedRegion | null;
  onSelect: (sel: SelectedRegion) => void;
  onHover: (label: string | null) => void;
}

interface MatWithEmissive extends Material {
  emissive: Color;
  emissiveIntensity: number;
}

function hasEmissive(m: Material): m is MatWithEmissive {
  return "emissive" in m && (m as MatWithEmissive).emissive instanceof Color;
}

function eachMaterial(mesh: Mesh, fn: (m: Material) => void) {
  const mat = mesh.material;
  if (Array.isArray(mat)) mat.forEach(fn);
  else if (mat) fn(mat);
}

function keyOf(regionId: string, side: BodySide): string {
  return `${regionId}:${side}`;
}

export function GlbBody({ url, layer, selected, onSelect, onHover }: GlbBodyProps) {
  const { scene } = useGLTF(url);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  // Clone so material tinting never leaks into the cached original, then
  // clone materials per-mesh so each structure highlights independently.
  const { root, meshesByKey } = useMemo(() => {
    const cloned = scene.clone(true);
    const byKey = new Map<string, Mesh[]>();

    cloned.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;

      // Independent, tintable materials.
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }

      const mapped = mapMeshNameToRegion(mesh.name);
      if (mapped) {
        mesh.userData.region = mapped;
        const k = keyOf(mapped.regionId, mapped.side);
        const list = byKey.get(k) ?? [];
        list.push(mesh);
        byKey.set(k, list);
      }
    });

    // Normalize scale & center regardless of the source asset's units.
    const box = new Box3().setFromObject(cloned);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const height = size.y || 1;
    const scale = TARGET_HEIGHT / height;
    cloned.scale.setScalar(scale);
    // Recenter X/Z on origin, sit feet near the procedural floor (y ≈ -0.95).
    cloned.position.set(
      -center.x * scale,
      -box.min.y * scale - TARGET_HEIGHT / 2,
      -center.z * scale
    );

    return { root: cloned, meshesByKey: byKey };
  }, [scene]);

  const selectedKey = selected ? keyOf(selected.regionId, selected.side) : null;

  // Recompute emissive whenever hover/selection changes.
  useEffect(() => {
    for (const [k, meshes] of meshesByKey) {
      const isSel = k === selectedKey;
      const isHov = k === hoverKey;
      const color = isSel ? SELECT_EMISSIVE : isHov ? HOVER_EMISSIVE : BASE_EMISSIVE;
      const intensity = isSel ? 0.9 : isHov ? 0.55 : 0;
      for (const mesh of meshes) {
        eachMaterial(mesh, (m) => {
          if (hasEmissive(m)) {
            m.emissive.copy(color);
            m.emissiveIntensity = intensity;
          }
        });
      }
    }
  }, [meshesByKey, hoverKey, selectedKey]);

  const lastHoverRef = useRef<string | null>(null);

  function regionOf(obj: Object3D): SelectedRegion | null {
    let cur: Object3D | null = obj;
    while (cur) {
      const r = cur.userData?.region as SelectedRegion | undefined;
      if (r) return r;
      cur = cur.parent;
    }
    return null;
  }

  return (
    <primitive
      object={root}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const r = regionOf(e.object);
        const k = r ? keyOf(r.regionId, r.side) : null;
        if (k !== lastHoverRef.current) {
          lastHoverRef.current = k;
          setHoverKey(k);
          onHover(r ? fullRegionName(r.regionId, r.side, layer) : null);
          document.body.style.cursor = r ? "pointer" : "auto";
        }
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        lastHoverRef.current = null;
        setHoverKey(null);
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const r = regionOf(e.object);
        if (r) onSelect(r);
      }}
    />
  );
}
