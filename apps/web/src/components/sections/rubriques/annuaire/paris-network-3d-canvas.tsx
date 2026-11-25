"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from "react";
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
  focusSelection: () => void;
}

interface ParisNetwork3DCanvasProps {
  nodes: ParisNetwork3DNode[];
  edges: ParisNetwork3DEdge[];
  relations: readonly ParisCleanwalkRelation[];
  selectedActorId: string | null;
  focusOnly?: boolean;
  hoveredActorId: string | null;
  onSelectActor: (actorId: string) => void;
  onSelectRelation?: (relationId: string) => void;
  fr?: boolean;
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
          opacity={isDimmed ? 0.55 : 1}
        />
      </mesh>
      {isSelected || isHovered ? <Html
        position={[0, node.radius + 0.36, 0]}
        center
        zIndexRange={[20, 10]}
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
          className={`cursor-pointer max-w-[16rem] rounded-lg border px-3 py-1.5 text-sm font-semibold leading-snug shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-400 ${
            isSelected
              ? "border-violet-300 bg-violet-950/95 text-white"
              : "border-violet-300 bg-slate-900 text-white"
          }`}
        >
          {node.actor.name}
        </button>
      </Html> : null}
    </group>
  );
}

function RelationLineEdge({
  edge,
  isHighlighted,
  isDimmed,
  onSelect,
  fr,
}: {
  edge: ParisNetwork3DEdge;
  isHighlighted: boolean;
  isDimmed: boolean;
  onSelect?: () => void;
  fr: boolean;
}) {
  const points = useMemo<[number, number, number][]>(
    () => [edge.sourcePosition, edge.targetPosition],
    [edge.sourcePosition, edge.targetPosition],
  );

  const dashed = edge.dashPattern !== "solid";
  const dashSize = edge.dashPattern === "dotted" ? 0.14 : 0.32;
  const gapSize = edge.dashPattern === "dotted" ? 0.16 : 0.2;

  const scheduled = edge.relation.relationType === "collaboration_programmee";
  const midpoint: [number, number, number] = [0,1,2].map(i => (edge.sourcePosition[i] + edge.targetPosition[i]) / 2) as [number, number, number];
  return (
    <>
    <Line
      points={points}
      onClick={onSelect ? (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(); } : undefined}
      color={isHighlighted && !scheduled ? "#f5f3ff" : edge.colorHex}
      lineWidth={isHighlighted ? edge.thickness + 1.1 : edge.thickness}
      dashed={dashed}
      dashSize={dashSize}
      gapSize={gapSize}
      transparent
      opacity={isDimmed ? 0.22 : isHighlighted ? 1 : 0.65}
    />
    {scheduled && isHighlighted && onSelect ? <Html position={midpoint} center zIndexRange={[4,0]}><button type="button" aria-label={`${fr ? "Voir la collaboration programmée" : "View scheduled collaboration"} ${edge.relation.id}`} className="rounded border border-amber-400/70 bg-slate-950 px-2 py-1 text-xs font-semibold text-amber-300 focus-visible:ring-2 focus-visible:ring-amber-400" onClick={event=>{event.stopPropagation();onSelect();}}>{fr ? "Programmée" : "Scheduled"}</button></Html> : null}
    </>
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
  { animateMotion: boolean; nodes: ParisNetwork3DNode[]; focusedNodes: ParisNetwork3DNode[] }
>(function SceneCameraRig({ animateMotion, nodes, focusedNodes }, ref) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, invalidate } = useThree();
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const fit = useCallback((targets: ParisNetwork3DNode[]) => {
    const controls = controlsRef.current;
    const activeCamera = cameraRef.current;
    if (!controls || !targets.length || !(activeCamera instanceof THREE.PerspectiveCamera)) return;
    const bounds = new THREE.Box3();
    for (const node of targets) {
      const center = new THREE.Vector3(...node.position);
      const radius = node.radius * 1.32;
      const extent = new THREE.Vector3(radius, radius, radius);
      bounds.expandByPoint(center.clone().sub(extent));
      bounds.expandByPoint(center.clone().add(extent));
    }
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const verticalHalfFov = THREE.MathUtils.degToRad(activeCamera.fov / 2);
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * Math.max(0.1, activeCamera.aspect));
    const halfFov = Math.min(verticalHalfFov, horizontalHalfFov);
    const distance = Math.max(5, sphere.radius * 1.15 / Math.sin(halfFov));
    controls.maxDistance = Math.max(26, distance * 1.5);
    const direction = new THREE.Vector3(...DEFAULT_CAMERA_POS).normalize();
    controls.target.copy(sphere.center);
    activeCamera.position.copy(sphere.center).addScaledVector(direction, distance);
    activeCamera.far = Math.max(100, distance * 3);
    activeCamera.updateProjectionMatrix();
    controls.update();
    invalidate();
  }, [invalidate]);

  useEffect(() => { fit(nodes); }, [fit, nodes]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        const controls = controlsRef.current;
        if (!controls) return;
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength(Math.max(controls.minDistance || 5, offset.length() * 0.84));
        camera.position.copy(controls.target).add(offset);
        controls.update();
        invalidate();
      },
      zoomOut: () => {
        const controls = controlsRef.current;
        if (!controls) return;
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength(Math.min(controls.maxDistance || 26, offset.length() * 1.18));
        camera.position.copy(controls.target).add(offset);
        controls.update();
        invalidate();
      },
      resetCamera: () => fit(nodes),
      focusSelection: () => fit(focusedNodes),
    }),
    [camera, invalidate, fit, nodes, focusedNodes],
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

function WebGLContextLossListener({ onError }: { onError?: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (!onError) return;
    const canvas = gl.domElement;
    const handleLoss = (event: Event) => {
      event.preventDefault();
      onError();
    };
    canvas.addEventListener("webglcontextlost", handleLoss);
    return () => canvas.removeEventListener("webglcontextlost", handleLoss);
  }, [gl, onError]);
  return null;
}

export const ParisNetwork3DCanvas = forwardRef<
  ParisNetwork3DCanvasHandle,
  ParisNetwork3DCanvasProps
>(function ParisNetwork3DCanvas(
  {
    nodes,
    edges,
    relations,
    selectedActorId,
    focusOnly = false,
    hoveredActorId,
    onSelectActor,
    onSelectRelation,
    fr = true,
    onHoverActor,
    onAnchorChange,
    animateMotion,
    isOffscreen,
    onWebGLError,
  },
  ref,
) {
  const activeFocusId = selectedActorId ?? hoveredActorId;
  const connectedIds = useMemo(
    () => getConnectedActorIds(activeFocusId, relations),
    [activeFocusId, relations],
  );
  const selectedConnectedIds = useMemo(
    () => getConnectedActorIds(selectedActorId, relations),
    [selectedActorId, relations],
  );
  const focusedNodes = useMemo(
    () => nodes.filter(node => selectedConnectedIds.has(node.actor.id)),
    [nodes, selectedConnectedIds],
  );
  const isolated = focusOnly && selectedActorId !== null;
  const visibleNodes = isolated ? focusedNodes : nodes;
  const visibleEdges = isolated
    ? edges.filter(edge => selectedConnectedIds.has(edge.relation.sourceId) && selectedConnectedIds.has(edge.relation.targetId))
    : edges;
  const activeNodePosition = useMemo(
    () => nodes.find((n) => n.actor.id === activeFocusId)?.position ?? null,
    [nodes, activeFocusId],
  );

  useEffect(() => () => { document.body.style.cursor = "auto"; }, []);

  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POS, fov: 46, near: 0.1, far: 100 }}
      dpr={[1, 1.75]}
      frameloop={isOffscreen || !animateMotion ? "demand" : "always"}
      className="h-full w-full"
    >
      <color attach="background" args={["#0b091d"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[8, 12, 10]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-8, -6, 6]} intensity={0.65} color="#818cf8" />

      <WebGLContextLossListener onError={onWebGLError} />
      <SceneCameraRig ref={ref} animateMotion={animateMotion} nodes={visibleNodes} focusedNodes={focusedNodes} />
      <ActiveNodeAnchorTracker
        activePosition={activeNodePosition}
        onAnchorChange={onAnchorChange}
      />

      <group>
        {visibleEdges.map((edge) => {
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
              fr={fr}
              onSelect={onSelectRelation ? () => onSelectRelation(edge.relation.id) : undefined}
            />
          );
        })}

        {visibleNodes.map((node) => {
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
