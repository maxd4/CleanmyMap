import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateActionInvitePage } from "./private-action-invite-page";
import { jsonResponse as response, rendererText as text } from "@/__tests__/support/action-behavior-test-helpers";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

const baseAction = {
  title: "Action privée",
  shortDescription: "Description",
  actionDate: "2099-01-01",
  meetingTime: null,
  pointDeRendezVous: "Place publique",
  zoneCiblePrevue: null,
  organizerLabel: "Organisateur",
  actionPhase: "pre_action",
  invitationState: "pre_action",
  expiresAt: "2099-02-01T00:00:00Z",
  registrationStatus: null,
  registrationSource: null,
  registrationCancellationReason: null,
  participationStatus: null,
  participationSource: null,
} as const;

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => { vi.unstubAllGlobals(); push.mockReset(); });

function actionButton(renderer: ReactTestRenderer, label: string) {
  const button = renderer.root.findAllByType("button").find((candidate) => candidate.props.children === label);
  if (!button) throw new Error(`Missing invite action button: ${label}`);
  return button;
}

describe("PrivateActionInvitePage behavior", () => {
  it("confirms pre-action registration without claiming field presence", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ action: baseAction }))
      .mockResolvedValueOnce(response({ flow: "pre_action", registrationStatus: "confirmed", registrationSource: "invite_link" }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<PrivateActionInvitePage token="token/1" />); await Promise.resolve(); });
    const button = renderer.root.findAllByType("button").find((candidate) => candidate.props.children === "Rejoindre l’action");
    await act(async () => { await button?.props.onClick(); });
    expect(text(renderer)).toContain("Cette confirmation ne vaut pas présence");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/actions/invite/token%2F1", { method: "POST" });
  });

  it("redirects unauthenticated requests and preserves post-action pending state", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ action: { ...baseAction, invitationState: "post_action_claim" } }))
      .mockResolvedValueOnce(response({ error: "Connexion requise" }, 401));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<PrivateActionInvitePage token="secure-token" />); await Promise.resolve(); await Promise.resolve(); });
    const button = renderer.root.findAllByType("button").find((candidate) => candidate.props.children === "Demander à être ajouté aux participants");
    await act(async () => { await button?.props.onClick(); });
    expect(push).toHaveBeenCalledWith("/sign-in?redirect_url=%2Factions%2Finvite%2Fsecure-token");
    expect(actionButton(renderer, "Demander à être ajouté aux participants").props.disabled).toBe(false);

    renderer.unmount();
    const secondFetch = vi.fn()
      .mockResolvedValueOnce(response({ action: { ...baseAction, invitationState: "post_action_claim" } }))
      .mockResolvedValueOnce(response({ flow: "post_action_claim", participationStatus: "pending", participationSource: "post_action_claim" }));
    vi.stubGlobal("fetch", secondFetch);
    await act(async () => { renderer = create(<PrivateActionInvitePage token="secure-token-2" />); await Promise.resolve(); await Promise.resolve(); });
    const postActionButton = renderer.root.findAllByType("button").find((candidate) => candidate.props.children === "Demander à être ajouté aux participants");
    await act(async () => { await postActionButton?.props.onClick(); });
    expect(text(renderer)).toContain("en attente de décision");
  });

  it("releases busy after a transport error, prevents a double submit and allows retry", async () => {
    let rejectPost!: (cause: unknown) => void;
    const pendingFailure = new Promise<Response>((_resolve, reject) => {
      rejectPost = reject;
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ action: baseAction }))
      .mockReturnValueOnce(pendingFailure)
      .mockResolvedValueOnce(response({
        flow: "pre_action",
        registrationStatus: "confirmed",
        registrationSource: "invite_link",
      }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<PrivateActionInvitePage token="retry-token" />); await Promise.resolve(); await Promise.resolve(); });

    let button = actionButton(renderer, "Rejoindre l’action");
    await act(async () => {
      button.props.onClick();
      await Promise.resolve();
    });
    expect(actionButton(renderer, "Envoi…").props.disabled).toBe(true);

    await act(async () => {
      actionButton(renderer, "Envoi…").props.onClick({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      });
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      rejectPost(new TypeError("Failed to fetch"));
      await Promise.resolve();
    });
    button = actionButton(renderer, "Rejoindre l’action");
    expect(button.props.disabled).toBe(false);
    expect(text(renderer)).toContain("Vérifiez votre connexion et réessayez");

    await act(async () => {
      button.props.onClick();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(text(renderer)).toContain("Cette confirmation ne vaut pas présence");
  });

  it("releases busy and exposes a retryable error for an HTTP refusal", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ action: baseAction }))
      .mockResolvedValueOnce(response({ error: "Lien expiré" }, 410));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<PrivateActionInvitePage token="expired-token" />); await Promise.resolve(); await Promise.resolve(); });

    await act(async () => { actionButton(renderer, "Rejoindre l’action").props.onClick(); await Promise.resolve(); });
    expect(text(renderer)).toContain("Lien expiré");
    expect(actionButton(renderer, "Rejoindre l’action").props.disabled).toBe(false);
  });

  it("releases busy when a successful response contains invalid JSON", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ action: baseAction }))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<PrivateActionInvitePage token="invalid-response-token" />); await Promise.resolve(); await Promise.resolve(); });

    await act(async () => { actionButton(renderer, "Rejoindre l’action").props.onClick(); await Promise.resolve(); });
    expect(text(renderer)).toContain("La réponse du serveur est invalide");
    expect(actionButton(renderer, "Rejoindre l’action").props.disabled).toBe(false);
  });
});
