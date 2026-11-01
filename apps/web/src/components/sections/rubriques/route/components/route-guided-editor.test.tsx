import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultRouteTerritorialGuidedMode } from "@/lib/route/route-planning-mode";
import { RouteGuidedEditor } from "./route-guided-editor";

vi.mock("next/dynamic", () => ({
  default: () => function MockRouteMap({
    onSelectGuidedPoint,
  }: {
    onSelectGuidedPoint?: (coordinate: { latitude: number; longitude: number }) => void;
  }) {
    return (
      <button
        type="button"
        data-testid="guided-map-probe"
        onClick={() => onSelectGuidedPoint?.({ latitude: 48.857, longitude: 2.353 })}
      >
        Mock map
      </button>
    );
  },
}));

function textOf(node: ReactTestInstance): string {
  return node.children.map((child) => typeof child === "string" ? child : textOf(child)).join("");
}

function buttons(renderer: ReactTestRenderer): ReactTestInstance[] {
  return renderer.root.findAllByType("button");
}

function buttonWithText(renderer: ReactTestRenderer, text: string): ReactTestInstance {
  const button = buttons(renderer).find((candidate) => textOf(candidate) === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

function buttonWithLabel(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  const button = buttons(renderer).find((candidate) => candidate.props["aria-label"] === label);
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

function GuidedEditorHarness({
  initialMode,
  onMode,
}: {
  initialMode: ReturnType<typeof createDefaultRouteTerritorialGuidedMode>;
  onMode: (mode: ReturnType<typeof createDefaultRouteTerritorialGuidedMode>) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  return (
    <RouteGuidedEditor
      mode={mode}
      options={{ priorityVsTravel: 50, travelBudgetMinutes: 90, maxStops: 12, volunteers: 10, groupCount: mode.groups.length, pickupPreference: "balanced" }}
      origin={{ latitude: 48.8566, longitude: 2.3522, source: "map" }}
      fr
      onChange={(next) => { onMode(next); setMode(next); }}
      onSelectOrigin={vi.fn()}
    />
  );
}

describe("RouteGuidedEditor", () => {
  it("expose deux groupes 5/5, les secteurs, les passages, le départ commun et le budget", () => {
    const mode = createDefaultRouteTerritorialGuidedMode(10, 2);
    const markup = renderToStaticMarkup(
      <RouteGuidedEditor
        mode={mode}
        options={{
          priorityVsTravel: 50,
          travelBudgetMinutes: 90,
          maxStops: 12,
          volunteers: 10,
          groupCount: 2,
          pickupPreference: "balanced",
        }}
        origin={{ latitude: 48.8566, longitude: 2.3522, source: "map" }}
        fr
        onChange={vi.fn()}
        onSelectOrigin={vi.fn()}
      />,
    );

    expect(markup).toContain("Mode territorial guidé");
    expect(markup).toContain("Groupe 1");
    expect(markup).toContain("Groupe 2");
    expect(markup).toContain("10 bénévoles · 2 groupes");
    expect(markup).toContain("Départ commun");
    expect(markup).toContain("Points de passage ordonnés");
    expect(markup).toContain("Créneau total");
    expect(markup).toContain("15 + 30 + 45 = 90 min");
  });

  it("keeps waypoint ids unique through add/delete/add, rename, reorder and group removal", () => {
    const initialMode = createDefaultRouteTerritorialGuidedMode(10, 2);
    let currentMode = initialMode;
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <GuidedEditorHarness
          initialMode={initialMode}
          onMode={(next) => { currentMode = next; }}
        />,
      );
    });

    const originalIds = currentMode.groups.flatMap(({ waypoints }) => waypoints.map(({ id }) => id));
    act(() => { buttonWithText(renderer, "Ajouter depuis la carte").props.onClick(); });
    act(() => { renderer.root.findByProps({ "data-testid": "guided-map-probe" }).props.onClick(); });
    const afterAddIds = currentMode.groups.flatMap(({ waypoints }) => waypoints.map(({ id }) => id));
    expect(new Set(afterAddIds).size).toBe(afterAddIds.length);

    act(() => { buttonWithLabel(renderer, "Descendre le passage").props.onClick(); });
    expect(currentMode.groups[0]?.waypoints.map(({ id }) => id)).toEqual(afterAddIds.slice(0, 2).reverse());

    const deletedWaypointId = currentMode.groups[0]?.waypoints[0]?.id;
    act(() => {
      const deleteButtons = buttons(renderer).filter((button) => button.props["aria-label"] === "Supprimer le passage");
      deleteButtons[0]?.props.onClick();
    });
    act(() => { buttonWithText(renderer, "Ajouter depuis la carte").props.onClick(); });
    act(() => { renderer.root.findByProps({ "data-testid": "guided-map-probe" }).props.onClick(); });
    const afterReAddIds = currentMode.groups.flatMap(({ waypoints }) => waypoints.map(({ id }) => id));
    expect(new Set(afterReAddIds).size).toBe(afterReAddIds.length);
    expect(afterReAddIds).toEqual(expect.arrayContaining(originalIds));
    expect(afterReAddIds).not.toContain(deletedWaypointId);

    const renamedGroupInput = renderer.root.findAllByType("input").find((input) => input.props.value === "Groupe 1");
    if (!renamedGroupInput) throw new Error("Group name input not found");
    act(() => { renamedGroupInput.props.onChange({ target: { value: "Secteur renommé" } }); });
    expect(currentMode.groups[0]?.label).toBe("Secteur renommé");
    expect(currentMode.groups.flatMap(({ waypoints }) => waypoints.map(({ id }) => id))).toEqual(afterReAddIds);

    act(() => { buttonWithText(renderer, "Ajouter").props.onClick(); });
    const addedGroupId = currentMode.groups.at(-1)?.waypoints[0]?.id;
    expect(addedGroupId).toBeTruthy();
    const idsAfterGroupAdd = currentMode.groups.flatMap(({ waypoints }) => waypoints.map(({ id }) => id));
    expect(new Set(idsAfterGroupAdd).size).toBe(idsAfterGroupAdd.length);

    act(() => {
      const removeButtons = buttons(renderer).filter((button) => textOf(button) === "Supprimer ce groupe");
      removeButtons.at(-1)?.props.onClick();
    });
    expect(currentMode.groups).toHaveLength(2);
    act(() => { buttonWithText(renderer, "Ajouter").props.onClick(); });
    const replacementGroupId = currentMode.groups.at(-1)?.waypoints[0]?.id;
    expect(replacementGroupId).toBeTruthy();
    expect(replacementGroupId).not.toBe(addedGroupId);
    const finalIds = currentMode.groups.flatMap(({ waypoints }) => waypoints.map(({ id }) => id));
    expect(new Set(finalIds).size).toBe(finalIds.length);
  });

  it("clamps a group effectif to the remaining contract capacity", () => {
    const initialMode = createDefaultRouteTerritorialGuidedMode(10, 2);
    let currentMode = initialMode;
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <GuidedEditorHarness
          initialMode={initialMode}
          onMode={(next) => { currentMode = next; }}
        />,
      );
    });

    const volunteerInput = renderer.root.findAllByType("input").find(
      (input) => input.props.type === "number" && input.props.value === 5,
    );
    if (!volunteerInput) throw new Error("Volunteer input not found");
    act(() => { volunteerInput.props.onChange({ target: { value: "101" } }); });

    expect(currentMode.groups.map(({ volunteerCount }) => volunteerCount)).toEqual([95, 5]);
    expect(currentMode.groups.reduce((total, group) => total + (group.volunteerCount ?? 0), 0)).toBe(100);
  });
});
