"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  getConnectedActorIds,
  type ParisNetwork3DEdge,
  type ParisNetwork3DNode,
} from "./paris-network-3d.model";
import type { ParisCleanwalkRelation } from "@/lib/partners/paris-cleanwalk-network";

export interface ParisNetwork3DCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
}

interface ParisNetwork3DCanvasProps {
  nodes: ParisNetwork3DNode[];
  edges: ParisNetwork3DEdge[];
  relations: readonly ParisCleanwalkRelation[];
  selectedActorId: string | null;
  hoveredActorId: string | null;
  onSelectActor: (actorId: string) => void;
  onHoverActor: (actorId: string | null) => void;
  onAnchorChange?: (anchor: { leftPercent: number; topPercent: number } | null) => void;
  animateMotion: boolean;
  isOffscreen: boolean;
  onWebGLError?: () => void;
}

const DEFAULT_CAMERA_POS: [number, number, number] = [0, 2.2, 14.5];

function ActorSphereNode({
  node,
  isSelected,
  isHovered,
  isDimmed,
  animateMotion,
  onSelect,
  onHover,
}: {
  node: ParisNetwork3DNode;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  animateMotion: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetScale = isSelected ? 1.32 : isHovered ? 1.18 : 1.0;

  useFrame((_, delta) => {
    if (!meshRef.current?.scale) return;
    if (!animateMotion) {
      meshRef.current.scale.setScalar(targetScale);
      return;
    }
    const next = THREE.MathUtils.lerp(
      meshRef.current.scale.x,
      targetScale,
      Math.min(1, delta * 10),
    );
    meshRef.current.scale.setScalar(next);
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        scale={targetScale}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          onHover(false);
        }}
      >
        <sphereGeometry args={[node.radius, 28, 28]} />
        <meshStandardMaterial
          color={node.colorHex}
          emissive={isSelected || isHovered ? node.colorHex : "#1e1b4b"}
          emissiveIntensity={isSelected ? 0.65 : isHovered ? 0.45 : 0.15}
          roughness={0.35}
          metalness={0.2}
          transparent
          opacity={isDimmed ? 0.28 : 0.96}
        />
      </mesh>
      <Html
        position={[0, node.radius + 0.36, 0]}
        center
        distanceFactor={12}
        zIndexRange={isSelected || isHovered ? [20, 10] : [5, 0]}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
          aria-pressed={isSelected}
          aria-label={node.actor.name}
          className={`cursor-pointer whitespace-nowrap rounded-lg border px-2 py-0.5 text-xs font-black tracking-tight shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ${
            isSelected
              ? "border-violet-300 bg-violet-950/95 text-white"
              : isHovered
                ? "border-violet-300/80 bg-slate-900/95 text-white"
                : isDimmed
                  ? "border-white/10 bg-slate-950/60 text-slate-400 opacity-45"
                  : "border-violet-300/30 bg-slate-950/85 text-slate-100 hover:border-violet-300/70"
          }`}
        >
          {node.actor.name}
        </button>
      </Html>
    </group>
  );
}

function RelationLineEdge({
  edge,
  isHighlighted,
  isDimmed,
}: {
  edge: ParisNetwork3DEdge;
  isHighlighted: boolean;
  isDimmed: boolean;
}) {
  const points = useMemo<[number, number, number][]>(
    () => [edge.sourcePosition, edge.targetPosition],
    [edge.sourcePosition, edge.targetPosition],
  );

  const dashed = edge.dashPattern !== "solid";
  const dashSize = edge.dashPattern === "dotted" ? 0.14 : 0.32;
  const gapSize = edge.dashPattern === "dotted" ? 0.16 : 0.2;

  return (
    <Line
      points={points}
      color={isHighlighted ? "#f5f3ff" : edge.colorHex}
      lineWidth={isHighlighted ? edge.thickness + 1.1 : edge.thickness}
      dashed={dashed}
      dashSize={dashSize}
      gapSize={gapSize}
      transparent
      opacity={isDimmed ? 0.14 : isHighlighted ? 0.98 : 0.72}
    />
  );
}

function ActiveNodeAnchorTracker({
  activePosition,
  onAnchorChange,
}: {
  activePosition: [number, number, number] | null;
  onAnchorChange?: (anchor: { leftPercent: number; topPercent: number } | null) => void;
}) {
  const { camera } = useThree();
  const vectorRef = useRef(new THREE.Vector3());
  const lastRef = useRef<{ leftPercent: number; topPercent: number } | null>(null);

  useFrame(() => {
    if (!onAnchorChange) return;
    if (!activePosition) {
      if (lastRef.current !== null) {
        lastRef.current = null;
        onAnchorChange(null);
      }
      return;
    }

    vectorRef.current.set(activePosition[0], activePosition[1], activePosition[2]);
    vectorRef.current.project(camera);
    const leftPercent = Number((((vectorRef.current.x + 1) / 2) * 100 + 3).toFixed(1));
    const topPercent = Number((((1 - vectorRef.current.y) / 2) * 100 - 4).toFixed(1));

    const prev = lastRef.current;
    if (
      !prev ||
      Math.abs(prev.leftPercent - leftPercent) >= 0.8 ||
      Math.abs(prev.topPercent - topPercent) >= 0.8
    ) {
      const next = { leftPercent, topPercent };
      lastRef.current = next;
      onAnchorChange(next);
    }
  });

  return null;
}

const SceneCameraRig = forwardRef<
  ParisNetwork3DCanvasHandle,
  { animateMotion: boolean }
>(function SceneCameraRig({ animateMotion }, ref) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, invalidate } = useThree();

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        camera.position.multiplyScalar(0.84);
        controlsRef.current?.update();
        invalidate();
      },
      zoomOut: () => {
        camera.position.multiplyScalar(1.18);
        controlsRef.current?.update();
        invalidate();
      },
      resetCamera: () => {
        camera.position.set(...DEFAULT_CAMERA_POS);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
        invalidate();
      },
    }),
    [camera, invalidate],
  );

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={animateMotion}
      dampingFactor={0.08}
      enableRotate
      enableZoom
      enablePan
      minDistance={5}
      maxDistance={26}
    />
  );
});

export const ParisNetwork3DCanvas = forwardRef<
  ParisNetwork3DCanvasHandle,
  ParisNetwork3DCanvasProps
>(function ParisNetwork3DCanvas(
  {
    nodes,
    edges,
    relations,
    selectedActorId,
    hoveredActorId,
    onSelectActor,
    onHoverActor,
    onAnchorChange,
    animateMotion,
    isOffscreen,
    onWebGLError,
  },
  ref,
) {
  const isUnmountingRef = useRef(false);
  const activeFocusId = selectedActorId ?? hoveredActorId;
  const connectedIds = useMemo(
    () => getConnectedActorIds(activeFocusId, relations),
    [activeFocusId, relations],
  );
  const activeNodePosition = useMemo(
    () => nodes.find((n) => n.actor.id === activeFocusId)?.position ?? null,
    [nodes, activeFocusId],
  );

  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POS, fov: 46, near: 0.1, far: 100 }}
      dpr={[1, 1.75]}
      frameloop={isOffscreen || !animateMotion ? "demand" : "always"}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          if (!isUnmountingRef.current) onWebGLError?.();
        });
      }}
      className="h-full w-full"
    >
      <color attach="background" args={["#0b091d"]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[8, 12, 10]} intensity={1.1} color="#ede9fe" />
      <pointLight position={[-8, -6, 6]} intensity={0.65} color="#818cf8" />

      <SceneCameraRig ref={ref} animateMotion={animateMotion} />
      <ActiveNodeAnchorTracker
        activePosition={activeNodePosition}
        onAnchorChange={onAnchorChange}
      />

      <group>
        {edges.map((edge) => {
          const isHighlighted =
            activeFocusId !== null &&
            (edge.relation.sourceId === activeFocusId ||
              edge.relation.targetId === activeFocusId);
          const isDimmed = activeFocusId !== null && !isHighlighted;

          return (
            <RelationLineEdge
              key={edge.relation.id}
              edge={edge}
              isHighlighted={isHighlighted}
              isDimmed={isDimmed}
            />
          );
        })}

        {nodes.map((node) => {
          const isSelected = selectedActorId === node.actor.id;
          const isHovered = hoveredActorId === node.actor.id;
          const isDimmed =
            activeFocusId !== null && !connectedIds.has(node.actor.id);

          return (
            <ActorSphereNode
              key={node.actor.id}
              node={node}
              isSelected={isSelected}
              isHovered={isHovered}
              isDimmed={isDimmed}
              animateMotion={animateMotion}
              onSelect={() => onSelectActor(node.actor.id)}
              onHover={(hovered) =>
                onHoverActor(hovered ? node.actor.id : null)
              }
            />
          );
        })}
      </group>
    </Canvas>
  );
});
