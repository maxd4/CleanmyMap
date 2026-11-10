import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpogomiClosureSummary } from "@/lib/spogomi/closure";
import { SpogomiEventLifecycleControls } from "./spogomi-event-lifecycle-controls";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const summary = { blockers: ["division-a:certification_remaining"] } as SpogomiClosureSummary;

function render(overrides: Partial<Parameters<typeof SpogomiEventLifecycleControls>[0]> = {}) {
  return create(<SpogomiEventLifecycleControls eventId="event-a" eventState="in_progress" expectedRevision={4} canManage summary={summary} hasSnapshot={false} onCompleted={vi.fn().mockResolvedValue(undefined)} {...overrides} />);
}

describe("SpogomiEventLifecycleControls", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("keeps lifecycle controls absent without the privileged event-management contract", () => {
    const renderer = render({ canManage: false });
    expect(renderer.toJSON()).toBeNull();
  });

  it("requires confirmation and submits a versioned close without certifying results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "transitioned" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<SpogomiEventLifecycleControls eventId="event-a" eventState="in_progress" expectedRevision={4} canManage summary={summary} hasSnapshot={false} onCompleted={onCompleted} />); });
    const buttons = renderer.root.findAllByType("button");
    expect(buttons[0]?.props.children).toContain("Clôturer l’événement");
    act(() => { buttons[0]?.props.onClick(); });
    expect(JSON.stringify(renderer.toJSON())).toContain("ne certifie, ne consolide et ne publie aucun résultat");
    const confirm = renderer.root.findAllByType("button").find((button) => button.props.children === "Confirmer");
    await act(async () => { await confirm?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-a/closure", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "close", expectedRevision: 4 }) }));
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });
});
