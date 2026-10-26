import { act, create, type ReactTestInstance } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionParticipationReviewItem } from "@/lib/actions/participation/group-participation";
import type { IndividualImpactMeasurement } from "@/lib/actions/participation/individual-impact";
import { ActionParticipantImpactEditor } from "./action-participant-impact-editor";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type ButtonProps = { children?: React.ReactNode; disabled?: boolean; onClick?: () => void };
type InputProps = { onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void; value?: string };
type AlertProps = { children?: React.ReactNode };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

function measurement(
  overrides: Partial<IndividualImpactMeasurement> = {},
): IndividualImpactMeasurement {
  return {
    wasteKg: 2,
    wasteCondition: "sec",
    wasteMeasurementMethod: "balance_au_sol",
    wasteNormalizationVersion: "impact-terrain-2026-waste-moisture-v1",
    cigaretteButtsCount: 12,
    cigaretteButtsMassKg: null,
    cigaretteButtsCondition: "propre",
    cigaretteButtsProvenance: "counted",
    cigaretteButtsConversionVersion: null,
    measuredBy: "user-1",
    measuredAt: "2026-10-20T10:00:00.000Z",
    equivalentSecKg: 2,
    comparableButtsCount: 12,
    comparableButtsProvenance: "counted",
    ...overrides,
  };
}

function participant(
  overrides: Partial<ActionParticipationReviewItem> = {},
): ActionParticipationReviewItem {
  return {
    id: "participant-1",
    actionId: "action-1",
    userId: "user-1",
    displayName: "Alice Test",
    handle: "alice",
    joinedAt: "2026-10-19T10:00:00.000Z",
    updatedAt: null,
    participationStatus: "confirmed",
    participationSource: "group_form",
    wasRegisteredBeforeAction: false,
    individualImpact: null,
    ...overrides,
  };
}

function findButton(renderer: ReturnType<typeof create>, label: string) {
  return renderer.root.findAllByType("button").find((button) => button.children.includes(label));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ActionParticipantImpactEditor behavior", () => {
  it("distinguishes empty, unknown and explicit zero measurements", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ActionParticipantImpactEditor
          actionId="action-1"
          participants={[]}
          fr
          onSaved={vi.fn()}
        />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Aucune participation confirmée.");
    renderer.unmount();

    act(() => {
      renderer = create(
        <ActionParticipantImpactEditor
          actionId="action-1"
          participants={[participant()]}
          fr
          onSaved={vi.fn()}
        />,
      );
    });
    expect(JSON.stringify(renderer.toJSON())).toContain("Quote-part automatique");
    renderer.unmount();

    act(() => {
      renderer = create(
        <ActionParticipantImpactEditor
          actionId="action-1"
          participants={[participant({ individualImpact: measurement({ wasteKg: 0, cigaretteButtsCount: 0, equivalentSecKg: 0, comparableButtsCount: 0 }) })]}
          fr
          onSaved={vi.fn()}
        />,
      );
    });
    const markup = JSON.stringify(renderer.toJSON());
    expect(markup).toContain("Mesure individuelle");
    expect(markup).toContain("Déchets : ");
    expect(markup).toContain(" kg équivalent sec");
    expect(markup).toContain(" comparables");
    renderer.unmount();
  });

  it("rejects invalid input before any persistence request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ActionParticipantImpactEditor
          actionId="action-1"
          participants={[participant()]}
          fr
          onSaved={vi.fn()}
        />,
      );
    });

    await act(async () => { propsOf<ButtonProps>(findButton(renderer, "Saisir une mesure")!).onClick?.(); });
    const wasteInput = renderer.root.findAllByType("input")[0];
    await act(async () => { propsOf<InputProps>(wasteInput!).onChange?.({ target: { value: "not-a-number" } } as React.ChangeEvent<HTMLInputElement>); });
    await act(async () => { propsOf<ButtonProps>(findButton(renderer, "Enregistrer la mesure")!).onClick?.(); });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(propsOf<AlertProps>(renderer.root.findByProps({ role: "alert" })).children).toContain("numériques");
    renderer.unmount();
  });

  it("sends confirmed measurements and disables the save while pending", async () => {
    let resolveResponse!: (response: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => { resolveResponse = resolve; });
    const fetchMock = vi.fn<typeof fetch>(() => pendingResponse);
    const onSaved = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ActionParticipantImpactEditor
          actionId="action-1"
          participants={[participant()]}
          fr
          onSaved={onSaved}
        />,
      );
    });

    await act(async () => { propsOf<ButtonProps>(findButton(renderer, "Saisir une mesure")!).onClick?.(); });
    const inputs = renderer.root.findAllByType("input");
    await act(async () => {
      propsOf<InputProps>(inputs[0]!).onChange?.({ target: { value: "2.5" } } as React.ChangeEvent<HTMLInputElement>);
      propsOf<InputProps>(inputs[1]!).onChange?.({ target: { value: "17" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      propsOf<ButtonProps>(findButton(renderer, "Enregistrer la mesure")!).onClick?.();
      await Promise.resolve();
    });

    const saveButton = findButton(renderer, "Enregistrer la mesure");
    expect(propsOf<ButtonProps>(saveButton!).disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/actions/action-1/participant-impact",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      participantId: "participant-1",
      waste: { kg: 2.5, condition: "sec", measurementMethod: "balance_au_sol" },
      butts: { count: 17, massKg: null, condition: "propre" },
    });

    resolveResponse(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    await act(async () => {
      await pendingResponse;
      await Promise.resolve();
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(propsOf<ButtonProps>(findButton(renderer, "Enregistrer la mesure")!).disabled).toBe(false);
    renderer.unmount();
  });

  it("keeps the draft and exposes a server refusal without claiming persistence", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ error: "Mesure refusée." }), { status: 422 }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ActionParticipantImpactEditor
          actionId="action-1"
          participants={[participant()]}
          fr
          onSaved={vi.fn()}
        />,
      );
    });

    await act(async () => { propsOf<ButtonProps>(findButton(renderer, "Saisir une mesure")!).onClick?.(); });
    const wasteInput = renderer.root.findAllByType("input")[0];
    await act(async () => { propsOf<InputProps>(wasteInput!).onChange?.({ target: { value: "1.5" } } as React.ChangeEvent<HTMLInputElement>); });
    await act(async () => { propsOf<ButtonProps>(findButton(renderer, "Enregistrer la mesure")!).onClick?.(); });

    expect(propsOf<AlertProps>(renderer.root.findByProps({ role: "alert" })).children).toBe("Mesure refusée.");
    expect(propsOf<InputProps>(renderer.root.findAllByType("input")[0]!).value).toBe("1.5");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });

  it("restores the automatic share only after the clear request succeeds", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    const onSaved = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ActionParticipantImpactEditor
          actionId="action-1"
          participants={[participant({ individualImpact: measurement() })]}
          fr
          onSaved={onSaved}
        />,
      );
    });

    await act(async () => { propsOf<ButtonProps>(findButton(renderer, "Repasser en quote-part")!).onClick?.(); });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      participantId: "participant-1",
      waste: null,
      butts: null,
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(findButton(renderer, "Saisir une mesure")).toBeTruthy();
    renderer.unmount();
  });
});
