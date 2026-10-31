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
});
