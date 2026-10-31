import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionRetrospectivePanel } from "./action-retrospective-panel";

const fetchActionRetrospectiveMock = vi.hoisted(() => vi.fn());
const saveActionRetrospectiveDraftMock = vi.hoisted(() => vi.fn());
const publishActionRetrospectiveDraftMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/action-retrospective-http", () => ({
  fetchActionRetrospective: fetchActionRetrospectiveMock,
  saveActionRetrospectiveDraft: saveActionRetrospectiveDraftMock,
  publishActionRetrospectiveDraft: publishActionRetrospectiveDraftMock,
}));

const editor = {
  thanksMessage: "Merci",
  workedWell: "La coordination a bien fonctionné",
  blockers: null,
  improveNextTime: null,
  publishedAt: null,
  updatedAt: "2026-10-31T10:00:00.000Z",
};

function renderedText(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

describe("ActionRetrospectivePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchActionRetrospectiveMock.mockResolvedValue({ retrospective: editor });
  });

  it("loads the private editor and exposes the four declarative fields", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <ActionRetrospectivePanel
          actionId="action-1"
          actionPhase="post_action_complete"
          status="approved"
          fr
        />,
      );
      await Promise.resolve();
    });

    const text = renderedText(renderer);
    expect(fetchActionRetrospectiveMock).toHaveBeenCalledWith("action-1");
    expect(text).toContain("Ce qui a bien fonctionné");
    expect(text).toContain("Ce qui nous a freinés");
    expect(text).toContain("À améliorer la prochaine fois");
    expect(text).toContain("Message de remerciement");
    expect(text).toContain("Enregistrer le brouillon");
    expect(text).toContain("Publier");
    expect(text).not.toContain("Noter");
    expect(text).not.toContain("J'aime");
  });

  it("keeps a visible error state when the private read fails", async () => {
    fetchActionRetrospectiveMock.mockRejectedValue(new Error("Réseau indisponible"));
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <ActionRetrospectivePanel
          actionId="action-2"
          actionPhase="post_action_complete"
          status="approved"
          fr
        />,
      );
      await Promise.resolve();
    });

    expect(renderedText(renderer)).toContain("Réseau indisponible");
  });
});
