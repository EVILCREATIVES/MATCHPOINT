"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
import { BodyModel, type SelectedRegion } from "./body-model";
import { GlbBody } from "./glb-body";
import { ANATOMY_ASSETS, ANATOMY_ROTATION_Y, anatomyAssetUrl } from "./asset-manifest";
import type { BodyLayer } from "@/lib/doc-checkin/regions";

interface BodyCanvasProps {
  layer: BodyLayer;
  gender: "male" | "female";
  selected: SelectedRegion | null;
  onSelect: (sel: SelectedRegion) => void;
  onHover: (label: string | null) => void;
}

// Preload any configured GLBs so switching layer/gender is instant.
for (const url of Object.values(ANATOMY_ASSETS)) {
  if (url) useGLTF.preload(url);
}

// If a real GLB fails to load (missing file, parse error), quietly fall
// back to the procedural mannequin instead of blanking the scene.
class AssetBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev: { children: ReactNode }) {
    // Reset when the child (i.e. the asset url) changes.
    if (prev.children !== this.props.children && this.state.failed) {
      this.setState({ failed: false });
    }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function AnatomyLayer(props: BodyCanvasProps) {
  const { layer, gender, selected, onSelect, onHover } = props;
  const url = anatomyAssetUrl(gender, layer);

  const procedural = (
    <BodyModel
      layer={layer}
      gender={gender}
      selected={selected}
      onSelect={onSelect}
      onHover={onHover}
    />
  );

  if (!url) return procedural;

  return (
    <AssetBoundary key={url} fallback={procedural}>
      <Suspense fallback={procedural}>
        <GlbBody
          url={url}
          layer={layer}
          rotationY={ANATOMY_ROTATION_Y}
          selected={selected}
          onSelect={onSelect}
          onHover={onHover}
        />
      </Suspense>
    </AssetBoundary>
  );
}

export default function BodyCanvas(props: BodyCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.15, 2.4], fov: 42 }}
      dpr={[1, 2]}
      onPointerMissed={() => props.onHover(null)}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 2, -4]} intensity={0.5} />
      <hemisphereLight args={["#ffffff", "#8899aa", 0.4]} />

      <AnatomyLayer {...props} />

      <ContactShadows position={[0, -0.95, 0]} opacity={0.35} scale={3} blur={2.4} far={1.5} />

      <OrbitControls
        enablePan={false}
        minDistance={1.4}
        maxDistance={3.6}
        target={[0, 0.05, 0]}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
      />
    </Canvas>
  );
}
