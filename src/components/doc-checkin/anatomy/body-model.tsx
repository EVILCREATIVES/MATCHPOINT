"use client";

import { useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Mesh } from "three";
import { useFrame } from "@react-three/fiber";
import { BODY_PARTS, DECOR_PARTS, type BodyPart, type DecorPart } from "./body-parts";
import { regionLabel, type BodyLayer, type BodySide } from "@/lib/doc-checkin/regions";

export interface SelectedRegion {
  regionId: string;
  side: BodySide;
}

interface BodyModelProps {
  layer: BodyLayer;
  gender: "male" | "female";
  selected: SelectedRegion | null;
  onSelect: (sel: SelectedRegion) => void;
  onHover: (label: string | null) => void;
}

const MUSCLE_COLOR = "#bf6a58";
const BONE_COLOR = "#ece4d2";
const SKIN_COLOR = "#c58a6c";
const HOVER_EMISSIVE = "#f59e0b";
const SELECT_EMISSIVE = "#22c55e";

function genderX(regionId: string, x: number, gender: "male" | "female"): number {
  if (gender !== "female") return x;
  if (["shoulder", "trapezius", "scapula", "chest", "upperArm", "elbow", "forearm", "wrist"].includes(regionId)) {
    return x * 0.9;
  }
  if (["hip", "glute", "quad", "hamstring"].includes(regionId)) {
    return x * 1.12;
  }
  return x;
}

function keyOf(regionId: string, side: BodySide): string {
  return `${regionId}:${side}`;
}

function Geometry({ kind, args }: { kind: BodyPart["kind"]; args: number[] }) {
  if (kind === "capsule") return <capsuleGeometry args={[args[0], args[1], 8, 20]} />;
  if (kind === "box") return <boxGeometry args={[args[0], args[1], args[2]]} />;
  return <sphereGeometry args={[args[0], 28, 22]} />;
}

function PartMesh({
  part,
  layer,
  gender,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  part: BodyPart;
  layer: BodyLayer;
  gender: "male" | "female";
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (sel: SelectedRegion) => void;
  onHover: (label: string | null) => void;
}) {
  const ref = useRef<Mesh>(null);
  const skeleton = layer === "skeleton";
  const baseColor = skeleton ? BONE_COLOR : MUSCLE_COLOR;
  const thin = skeleton && part.kind !== "sphere" ? 0.6 : 1;

  const [sx, sy, sz] = part.scale ?? [1, 1, 1];
  const base: [number, number, number] = [sx * thin, sy, sz * thin];

  const pos: [number, number, number] = [
    genderX(part.regionId, part.position[0], gender),
    part.position[1],
    part.position[2],
  ];

  // Selected pad gently pulses so it's findable after rotating.
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mult = isSelected ? 1.12 + Math.sin(clock.elapsedTime * 4) * 0.05 : 1;
    const s = ref.current.scale;
    s.x += (base[0] * mult - s.x) * 0.2;
    s.y += (base[1] * mult - s.y) * 0.2;
    s.z += (base[2] * mult - s.z) * 0.2;
  });

  const emissive = isSelected ? SELECT_EMISSIVE : isHovered ? HOVER_EMISSIVE : "#000000";
  const emissiveIntensity = isSelected ? 0.9 : isHovered ? 0.5 : 0;

  return (
    <mesh
      ref={ref}
      position={pos}
      rotation={part.rotation}
      scale={base}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(
          `${part.side !== "center" ? (part.side === "left" ? "Left " : "Right ") : ""}${regionLabel(part.regionId, layer)}`
        );
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect({ regionId: part.regionId, side: part.side });
      }}
    >
      <Geometry kind={part.kind} args={part.args} />
      <meshStandardMaterial
        color={baseColor}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={skeleton ? 0.55 : 0.85}
        metalness={0.02}
      />
    </mesh>
  );
}

function DecorMesh({ part, layer, gender }: { part: DecorPart; layer: BodyLayer; gender: "male" | "female" }) {
  const skeleton = layer === "skeleton";
  if (part.softTissue && skeleton) return null;
  if (part.boneOnly && !skeleton) return null;

  const isHead = part.key === "head";
  const [sx, sy, sz] = part.scale ?? [1, 1, 1];
  // Female: narrower shoulders (thorax), wider hips (pelvis).
  let gx = 1;
  if (gender === "female") {
    if (part.key === "thorax") gx = 0.94;
    if (part.key === "pelvis") gx = 1.1;
    if (part.key === "waist") gx = 0.9;
  }

  return (
    <mesh position={part.position} scale={[sx * gx, sy, sz]}>
      <Geometry kind={part.kind} args={part.args} />
      <meshStandardMaterial
        color={skeleton ? BONE_COLOR : isHead ? SKIN_COLOR : MUSCLE_COLOR}
        roughness={skeleton ? 0.55 : 0.9}
        metalness={0.02}
      />
    </mesh>
  );
}

export function BodyModel({ layer, gender, selected, onSelect, onHover }: BodyModelProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const skeleton = layer === "skeleton";

  const visibleParts = useMemo(
    () => BODY_PARTS.filter((p) => !(p.softTissue && skeleton) && !(p.boneOnly && !skeleton)),
    [skeleton]
  );

  const selectedKey = selected ? keyOf(selected.regionId, selected.side) : null;

  return (
    <group position={[0, 0.05, 0]}>
      {DECOR_PARTS.map((d) => (
        <DecorMesh key={d.key} part={d} layer={layer} gender={gender} />
      ))}
      {visibleParts.map((part) => {
        const k = keyOf(part.regionId, part.side);
        return (
          <group
            key={part.key}
            onPointerOver={() => setHoverKey(k)}
            onPointerOut={() => setHoverKey((cur) => (cur === k ? null : cur))}
          >
            <PartMesh
              part={part}
              layer={layer}
              gender={gender}
              isSelected={selectedKey === k}
              isHovered={hoverKey === k}
              onSelect={onSelect}
              onHover={onHover}
            />
          </group>
        );
      })}
    </group>
  );
}
