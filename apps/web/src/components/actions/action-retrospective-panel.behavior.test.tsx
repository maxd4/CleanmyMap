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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

function findButton(renderer: ReactTestRenderer, label: string) {
  return renderer.root.findAllByType("button").find((button) => button.children.includes(label));
}

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
    expect(renderedText(renderer)).toContain("Réessayer");
    expect(renderedText(renderer)).not.toContain("Enregistrer le brouillon");
    expect(renderedText(renderer)).not.toContain("Publier");
    expect(renderer.root.findAllByType("textarea")).toHaveLength(0);
    expect(saveActionRetrospectiveDraftMock).not.toHaveBeenCalled();
    expect(publishActionRetrospectiveDraftMock).not.toHaveBeenCalled();
  });

  it("retries a failed private read before exposing the server values", async () => {
    fetchActionRetrospectiveMock
      .mockRejectedValueOnce(new Error("Réseau indisponible"))
      .mockResolvedValueOnce({ retrospective: editor });
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <ActionRetrospectivePanel
          actionId="action-retry"
          actionPhase="post_action_complete"
          status="approved"
          fr
        />,
      );
      await settle();
    });

    await act(async () => {
      findButton(renderer, "Réessayer")?.props.onClick();
      await settle();
    });

    expect(fetchActionRetrospectiveMock).toHaveBeenCalledTimes(2);
    expect(renderedText(renderer)).toContain(editor.workedWell);
    expect(renderedText(renderer)).toContain("Enregistrer le brouillon");
  });

  it("ignores a late response from the previous action after a fast selection change", async () => {
    const actionA = deferred<{ retrospective: typeof editor }>();
    const actionB = deferred<{ retrospective: typeof editor }>();
    fetchActionRetrospectiveMock
      .mockReturnValueOnce(actionA.promise)
      .mockReturnValueOnce(actionB.promise);

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <ActionRetrospectivePanel
          actionId="action-a"
          actionPhase="post_action_complete"
          status="approved"
          fr
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      renderer.update(
        <ActionRetrospectivePanel
          actionId="action-b"
          actionPhase="post_action_complete"
          status="approved"
          fr
        />,
      );
      await settle();
    });

    await act(async () => {
      actionB.resolve({ retrospective: { ...editor, thanksMessage: "Retour B", workedWell: "Valeur B" } });
      await settle();
    });
    await act(async () => {
      actionA.resolve({ retrospective: { ...editor, thanksMessage: "Retour A", workedWell: "Valeur A" } });
      await settle();
    });

    expect(renderedText(renderer)).toContain("Valeur B");
    expect(renderedText(renderer)).not.toContain("Valeur A");
    saveActionRetrospectiveDraftMock.mockResolvedValueOnce({
      ...editor,
      thanksMessage: "Retour B",
      workedWell: "Valeur B",
    });
    await act(async () => {
      findButton(renderer, "Enregistrer le brouillon")?.props.onClick();
      await settle();
    });
    expect(saveActionRetrospectiveDraftMock).toHaveBeenCalledWith(
      "action-b",
      expect.objectContaining({ thanksMessage: "Retour B", workedWell: "Valeur B" }),
    );
    expect(saveActionRetrospectiveDraftMock).not.toHaveBeenCalledWith(
      "action-b",
      expect.objectContaining({ thanksMessage: "Retour A", workedWell: "Valeur A" }),
    );
  });

  it("preserves an intentional edit of a published retrospective", async () => {
    const published = { ...editor, publishedAt: "2026-10-31T12:00:00.000Z" };
    const saved = { ...published, workedWell: "Coordination améliorée" };
    fetchActionRetrospectiveMock.mockResolvedValueOnce({ retrospective: published });
    saveActionRetrospectiveDraftMock.mockResolvedValueOnce(saved);

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <ActionRetrospectivePanel
          actionId="action-published"
          actionPhase="post_action_complete"
          status="approved"
          fr
        />,
      );
      await settle();
    });

    await act(async () => {
      findButton(renderer, "Modifier")?.props.onClick();
      const field = renderer.root.findAllByType("textarea").find((textarea) => textarea.props["aria-label"] === "Ce qui a bien fonctionné");
      field?.props.onChange({ target: { value: saved.workedWell } });
      await settle();
    });
    await act(async () => {
      findButton(renderer, "Enregistrer le brouillon")?.props.onClick();
      await settle();
    });

    expect(saveActionRetrospectiveDraftMock).toHaveBeenCalledWith(
      "action-published",
      expect.objectContaining({ workedWell: saved.workedWell }),
    );
    expect(renderedText(renderer)).toContain(saved.workedWell);
    expect(renderedText(renderer)).toContain("Publié — vous pouvez modifier puis enregistrer.");
  });
});
