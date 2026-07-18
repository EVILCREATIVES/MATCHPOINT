"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Box3, Vector3, type Object3D, type Mesh } from "three";
import { classifyPoint } from "./spatial-map";
import { fullRegionName, type BodyLayer } from "@/lib/doc-checkin/regions";
import type { SelectedRegion } from "./body-model";

const TARGET_HEIGHT = 1.85; // match the procedural model's framing

interface GlbBodyProps {
  url: string;
  layer: BodyLayer;
  rotationY?: number;
  selected: SelectedRegion | null;
  onSelect: (sel: SelectedRegion) => void;
  onHover: (label: string | null) => void;
}

export function GlbBody({ url, layer, rotationY = 0, selected, onSelect, onHover }: GlbBodyProps) {
  const { scene } = useGLTF(url);
  const [selectedPoint, setSelectedPoint] = useState<Vector3 | null>(null);
  const markerRef = useRef<Mesh>(null);

  // Clone once and normalize scale + recenter so any source asset fills the
  // same view box the procedural model (and the click anchors) assume.
  const root = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new Box3().setFromObject(cloned);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = TARGET_HEIGHT / (size.y || 1);
    cloned.scale.setScalar(scale);
    cloned.position.set(
      -center.x * scale,
      -box.min.y * scale - TARGET_HEIGHT / 2,
      -center.z * scale
    );
    // Keep meshes from disappearing when viewed from behind.
    cloned.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh && mesh.material && !Array.isArray(mesh.material)) {
        (mesh.material as { side?: number }).side = 2; // THREE.DoubleSide
      }
    });
    return cloned;
  }, [scene]);

  // Clear the marker if the selection is cleared upstream.
  useEffect(() => {
    if (!selected) setSelectedPoint(null);
  }, [selected]);

  useFrame(({ clock }) => {
    if (markerRef.current) {
      markerRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.15);
    }
  });

  return (
    <>
      <group rotation={[0, rotationY, 0]}>
        <primitive
          object={root}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            const r = classifyPoint(e.point);
            onHover(fullRegionName(r.regionId, r.side, layer));
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            onHover(null);
            document.body.style.cursor = "auto";
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            const r = classifyPoint(e.point);
            setSelectedPoint(e.point.clone());
            onSelect(r);
          }}
        />
      </group>

      {selectedPoint && (
        <mesh ref={markerRef} position={selectedPoint}>
          <sphereGeometry args={[0.04, 20, 16]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </>
  );
}
