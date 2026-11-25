// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
} from "@/lib/partners/paris-cleanwalk-network";
import { computeParisNetwork3DLayout } from "./paris-network-3d.model";

const invalidateMock = vi.hoisted(() => vi.fn());
const cameraState = vi.hoisted(() => ({ position: null as THREE.Vector3 | null, target: null as THREE.Vector3 | null, canvas: null as HTMLCanvasElement | null }));
const cameraSetMock = vi.hoisted(() => vi.fn());
const frameCallbacks = vi.hoisted(() => [] as Array<(state: unknown, delta: number) => void>);

vi.mock("@react-three/fiber", () => {
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(2, 1, 10);
  cameraState.position = camera.position;
  const gl = { domElement: document.createElement("canvas") };
  cameraState.canvas = gl.domElement;
  const setPosition = camera.position.set.bind(camera.position);
  camera.position.set = (...args: Parameters<typeof setPosition>) => { cameraSetMock(...args); return setPosition(...args); };
  return {
    Canvas: ({
      children,
      onCreated,
    }: {
      children: React.ReactNode;
      onCreated?: (ctx: { gl: { domElement: HTMLCanvasElement } }) => void;
    }) => {
      React.useEffect(() => {
        const canvas = document.createElement("canvas");
        onCreated?.({ gl: { domElement: canvas } });
      }, [onCreated]);
      return React.createElement("div", { "data-testid": "r3f-canvas" }, children);
    },
    useThree: () => ({ camera, gl, invalidate: invalidateMock }),
    useFrame: (cb: (state: unknown, delta: number) => void) => {
      frameCallbacks.push(cb);
    },
  };
});

vi.mock("@react-three/drei", () => ({
  Html: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "drei-html" }, children),
  Line: (props: Record<string, unknown>) =>
    React.createElement("div", {
      "data-testid": "drei-line",
      "data-color": String(props.color ?? ""),
    }),
  OrbitControls: React.forwardRef((_props: Record<string, unknown>, ref) => {
    React.useImperativeHandle(ref, () => ({
      target: (cameraState.target = new THREE.Vector3(2, 1, 0)),
      update: vi.fn(),
    }));
    return React.createElement("div", { "data-testid": "drei-orbit-controls" });
  }),
}));

import {
  ParisNetwork3DCanvas,
  type ParisNetwork3DCanvasHandle,
} from "./paris-network-3d-canvas";

describe("ParisNetwork3DCanvas R3F behavior", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    frameCallbacks.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  it("keeps labels selective and exposes scheduled edges in a focused neighborhood", () => {
    const scheduled = PARIS_CLEANWALK_RELATIONS.find(r => r.relationType === "collaboration_programmee")!;
    const layout = computeParisNetwork3DLayout(PARIS_CLEANWALK_ACTORS, PARIS_CLEANWALK_RELATIONS);
    const onSelectRelation = vi.fn();
    const root = createRoot(container);
    const props = { nodes: layout.nodes, edges: layout.edges, relations: PARIS_CLEANWALK_RELATIONS, selectedActorId: scheduled.sourceId, hoveredActorId: null, onSelectActor: vi.fn(), onSelectRelation, onHoverActor: vi.fn(), animateMotion: false, isOffscreen: false };
    act(() => root.render(React.createElement(ParisNetwork3DCanvas, { ...props, focusOnly: true })));
    const neighborIds = new Set([scheduled.sourceId]);
    for (const edge of PARIS_CLEANWALK_RELATIONS) {
      if (edge.sourceId === scheduled.sourceId) neighborIds.add(edge.targetId);
      if (edge.targetId === scheduled.sourceId) neighborIds.add(edge.sourceId);
    }
    expect(container.querySelectorAll('[data-testid="drei-line"]')).toHaveLength(layout.edges.filter(edge => neighborIds.has(edge.relation.sourceId) && neighborIds.has(edge.relation.targetId)).length);
    expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(1);
    const operationButton = [...container.querySelectorAll("button")].find(button => button.getAttribute("aria-label")?.endsWith(scheduled.id));
    expect(operationButton).toBeDefined();
    act(() => operationButton?.click());
    expect(onSelectRelation).toHaveBeenCalledWith(scheduled.id);
    act(() => root.render(React.createElement(ParisNetwork3DCanvas, { ...props, selectedActorId: null, focusOnly: false })));
    expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="drei-line"]')).toHaveLength(layout.edges.length);
    act(() => root.unmount());
  });

  it("renders nodes, edges, handles selection/hover, camera controls and frame updates", () => {
    const layout = computeParisNetwork3DLayout(
      PARIS_CLEANWALK_ACTORS,
      PARIS_CLEANWALK_RELATIONS,
      "2026-11-19",
    );
    const onSelectActor = vi.fn();
    const onSelectRelation = vi.fn();
    const onHoverActor = vi.fn();
    const onAnchorChange = vi.fn();
    const onWebGLError = vi.fn();
    const handleRef = React.createRef<ParisNetwork3DCanvasHandle>();

    const root = createRoot(container);
    act(() => {
      root.render(
        React.createElement(ParisNetwork3DCanvas, {
          ref: handleRef,
          nodes: layout.nodes,
          edges: layout.edges,
          relations: PARIS_CLEANWALK_RELATIONS,
          selectedActorId: "asso-featured-1",
          hoveredActorId: null,
          onSelectActor,
          onSelectRelation,
          onHoverActor,
          onAnchorChange,
          animateMotion: true,
          isOffscreen: false,
          onWebGLError,
        }),
      );
    });

    expect(container.querySelector('[data-testid="r3f-canvas"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="drei-line"]')).toHaveLength(
      layout.edges.length,
    );

    const buttons = Array.from(container.querySelectorAll("button")).filter(b => b.getAttribute("aria-label")?.startsWith("Voir la collaboration programmée"));
    const incidentScheduled = PARIS_CLEANWALK_RELATIONS.filter(r => r.relationType === "collaboration_programmee" && (r.sourceId === "asso-featured-1" || r.targetId === "asso-featured-1"));
    expect(buttons).toHaveLength(incidentScheduled.length);
    expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(1);

    // Click and hover node label button
    const brigadeBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Brigade Verte Paris"),
    );
    expect(brigadeBtn).toBeDefined();

    act(() => {
      brigadeBtn?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      brigadeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      brigadeBtn?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    expect(onSelectActor).toHaveBeenCalledWith("asso-featured-1");
    expect(onHoverActor).toHaveBeenCalledWith("asso-featured-1");
    expect(onHoverActor).toHaveBeenCalledWith(null);

    // Camera controls via imperative ref
    cameraState.target!.set(2, 1, 0);
    cameraState.position!.set(2, 1, 10);
    act(() => handleRef.current?.zoomIn());
    expect(cameraState.position!.toArray()).toEqual([2, 1, 8.4]);
    act(() => handleRef.current?.zoomOut());
    expect(cameraState.position!.x).toBe(2);
    expect(cameraState.position!.y).toBe(1);
    expect(cameraState.position!.z).toBeCloseTo(9.912);
    act(() => handleRef.current?.focusSelection());
    expect(cameraState.position!.distanceTo(cameraState.target!)).toBeGreaterThanOrEqual(5);
    act(() => handleRef.current?.resetCamera());
    const lost = new Event("webglcontextlost", { cancelable: true });
    act(() => cameraState.canvas!.dispatchEvent(lost));
    expect(lost.defaultPrevented).toBe(true);
    expect(onWebGLError).toHaveBeenCalledTimes(1);
    expect(cameraSetMock).toHaveBeenCalled();
    expect(invalidateMock).toHaveBeenCalled();

    // Run useFrame callbacks (sphere scale lerp + anchor projection)
    act(() => {
      for (const cb of frameCallbacks) {
        cb({}, 0.016);
      }
    });

    expect(onAnchorChange).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    cameraState.canvas!.dispatchEvent(new Event("webglcontextlost"));
    expect(onWebGLError).toHaveBeenCalledTimes(1);
  });
});
