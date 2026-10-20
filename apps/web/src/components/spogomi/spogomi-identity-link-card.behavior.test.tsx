import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ isLoaded: true, isSignedIn: true }));
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({ useAuth: () => authState }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("a", props, children),
}));
vi.mock("lucide-react", () => ({ Link2: () => null, Users: () => null }));
vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, href, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    href ? React.createElement("a", { ...props, href }, children) : React.createElement("button", props, children),
}));
vi.mock("@/components/ui/cmm-card", () => ({
  CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("div", props, children),
}));
vi.mock("@/lib/spogomi/collection", () => ({
  getSpogomiBadgePresentation: () => ({ label: "Badge synthétique", roleOrRank: "Participant" }),
}));

import { SpogomiIdentityLinkCard } from "./spogomi-identity-link-card";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const eventId = "event-1";
const identityUrl = `/api/spogomi/events/${eventId}/identity-link`;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function findButton(renderer: ReactTestRenderer, text: string) {
  const button = renderer.root.findAllByType("button").find((node) => String(node.props.children).includes(text));
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

function findForm(renderer: ReactTestRenderer) {
  return renderer.root.findByType("form");
}

function findInput(renderer: ReactTestRenderer, id: string) {
  return renderer.root.findByProps({ id });
}

function findText(renderer: ReactTestRenderer, text: string) {
  const node = renderer.root.findAll((candidate) => {
    const children = candidate.props.children;
    const value = Array.isArray(children) ? children.join("") : children;
    return typeof value === "string" && value.includes(text);
  })[0];
  if (!node) throw new Error(`Text not found: ${text}`);
  return node;
}

function renderCard(nextEventId = eventId) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<SpogomiIdentityLinkCard eventId={nextEventId} signInHref={`/sign-in?event=${nextEventId}`} />);
  });
  return renderer;
}

async function settleTimers() {
  await act(async () => {
    await vi.runAllTimersAsync();
    await flushPromises();
  });
}

async function flushPromises() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

function initialState(overrides: Record<string, unknown> = {}) {
  return {
    state: "identity_unlinked",
    recognition: null,
    team: null,
    assistance: null,
    ...overrides,
  };
}

function assistance(status: "pending" | "treated" | "rejected" | "cancelled") {
  return {
    id: `request-${status}`,
    status,
    providedContext: "Contexte synthétique",
    createdAt: "2026-10-20T10:00:00.000Z",
  };
}

const richTeam = {
  publicName: "Équipe Alpha",
  teamNumber: 7,
  divisionType: "world_cup",
  attendanceStatus: "present",
  participationStatus: "confirmed",
  publishedResults: {
    sport: { rank: 2, score: 42, status: "certified" },
    butts: { rank: null, ratio: 3.5, status: "provisional" },
  },
};

describe("SpogomiIdentityLinkCard behavior", () => {
  const activeRenderers: ReactTestRenderer[] = [];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    authState.isLoaded = true;
    authState.isSignedIn = true;
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { setTimeout, clearTimeout });
  });

  afterEach(() => {
    for (const renderer of activeRenderers.splice(0)) {
      act(() => renderer.unmount());
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders Clerk loading and signed-out states without fetching", () => {
    authState.isLoaded = false;
    authState.isSignedIn = false;
    const loading = renderCard();
    activeRenderers.push(loading);
    expect(loading.root.findByProps({ children: "Vérification de la session…" })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    authState.isLoaded = true;
    act(() => {
      loading.update(<SpogomiIdentityLinkCard eventId={eventId} signInHref="/sign-in" />);
    });
    expect(loading.root.findAllByType("a").find((node) => node.props.href === "/sign-in")?.props.href).toBe("/sign-in");
    expect(loading.root.findByProps({ children: "Se connecter" })).toBeTruthy();
  });

  it("loads an anonymous identity state, blocks short codes, and sends the exact link payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(initialState()));
    const renderer = renderCard();
    activeRenderers.push(renderer);
    await settleTimers();

    const codeInput = findInput(renderer, "spogomi-identity-code");
    expect(findButton(renderer, "Relier le compte").props.disabled).toBe(true);
    act(() => codeInput.props.onChange({ target: { value: "SPOGOMI-1234567" } }));
    expect(findButton(renderer, "Relier le compte").props.disabled).toBe(true);

    act(() => codeInput.props.onChange({ target: { value: "SPOGOMI-1234567890123456" } }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ state: "identity_verified", recognition: null, team: null }));
    await act(async () => {
      findForm(renderer).props.onSubmit({ preventDefault: vi.fn() });
      await flushPromises();
    });

    expect(fetchMock).toHaveBeenLastCalledWith(identityUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "SPOGOMI-1234567890123456" }),
    });
    expect(findText(renderer, "Identité vérifiée. Votre liaison ne confirme pas votre présence")).toBeTruthy();
  });

  it("surfaces a refused initial GET and a failed link mutation", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Lecture refusée" }, 403));
    const renderer = renderCard();
    activeRenderers.push(renderer);
    await settleTimers();
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toBe("Lecture refusée");

    act(() => findInput(renderer, "spogomi-identity-code").props.onChange({ target: { value: "SPOGOMI-1234567890123456" } }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Code invalide" }, 400));
    await act(async () => {
      findForm(renderer).props.onSubmit({ preventDefault: vi.fn() });
      await flushPromises();
    });
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toBe("Code invalide");
  });

  it("covers incomplete team results, recognition states, participation errors, and safe fallbacks", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      state: "identity_verified",
      recognition: { status: "pending_certification", awards: [] },
      team: {
        publicName: "Équipe sans présence attestée",
        teamNumber: 9,
        divisionType: "casual",
        attendanceStatus: "absent",
        participationStatus: "unavailable",
        publishedResults: { sport: { rank: null, score: null, status: "provisional" }, butts: null },
      },
    }));
    const renderer = renderCard();
    activeRenderers.push(renderer);
    await settleTimers();

    expect(findText(renderer, "Division Casual")).toBeTruthy();
    expect(findText(renderer, "Absence attestée · Demande indisponible")).toBeTruthy();
    expect(findText(renderer, "rang non publié · provisoire")).toBeTruthy();
    expect(findText(renderer, "Les badges apparaîtront après certification")).toBeTruthy();

    fetchMock.mockResolvedValueOnce(new Response("not-json", { status: 503 }));
    await act(async () => {
      findButton(renderer, "Demander ma participation").props.onClick();
      await flushPromises();
    });
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toBe("La demande de participation n’a pas pu être envoyée.");

    fetchMock.mockResolvedValueOnce(jsonResponse({
      state: "participation_cancelled",
      recognition: { status: "no_awards", awards: [] },
      team: null,
    }));
    await act(async () => {
      findButton(renderer, "Demander ma participation").props.onClick();
      await flushPromises();
    });
    expect(findText(renderer, "Cette demande de participation a été refusée ou annulée")).toBeTruthy();
    expect(findText(renderer, "Aucune distinction certifiée")).toBeTruthy();
    expect(findText(renderer, "Équipe non renseignée.")).toBeTruthy();

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse(initialState()));
    const assistanceRenderer = renderCard("event-assistance-error");
    activeRenderers.push(assistanceRenderer);
    await settleTimers();
    await act(async () => {
      findButton(assistanceRenderer, "Je n’ai pas de code").props.onClick();
      await flushPromises();
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Assistance refusée" }, 400));
    await act(async () => {
      findForm(assistanceRenderer).props.onSubmit({ preventDefault: vi.fn() });
      await flushPromises();
    });
    expect(assistanceRenderer.root.findByProps({ role: "alert" }).props.children).toBe("Assistance refusée");

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse(initialState({ assistance: assistance("pending") })));
    const cancelRenderer = renderCard("event-cancel-error");
    activeRenderers.push(cancelRenderer);
    await settleTimers();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Annulation refusée" }, 409));
    await act(async () => {
      findButton(cancelRenderer, "Annuler la demande").props.onClick();
      await flushPromises();
    });
    expect(cancelRenderer.root.findByProps({ role: "alert" }).props.children).toBe("Annulation refusée");
  });

  it("keeps identity linking separate from participation and renders team and recognition data only when supplied", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(initialState()));
    const renderer = renderCard();
    activeRenderers.push(renderer);
    await settleTimers();

    act(() => findInput(renderer, "spogomi-identity-code").props.onChange({ target: { value: "SPOGOMI-1234567890123456" } }));
    fetchMock.mockResolvedValueOnce(jsonResponse({
      state: "identity_verified",
      team: richTeam,
      recognition: {
        status: "available",
        awards: [{ id: "award-1", badgeTypeId: "badge-1", eventYear: 2026, eventLocalDate: "2026-10-20", status: "active" }],
      },
    }));
    await act(async () => {
      findForm(renderer).props.onSubmit({ preventDefault: vi.fn() });
      await flushPromises();
    });

    expect(findText(renderer, "Équipe Alpha · Équipe 7")).toBeTruthy();
    expect(findText(renderer, "Division World Cup")).toBeTruthy();
    expect(findText(renderer, "Classement sportif : #2 · 42 points · certifié")).toBeTruthy();
    expect(findText(renderer, "Classement mégots/participant : rang non publié · 3.5 · provisoire")).toBeTruthy();
    expect(findText(renderer, "Badge synthétique")).toBeTruthy();

    fetchMock.mockResolvedValueOnce(jsonResponse({ state: "participation_pending", team: richTeam, recognition: null }));
    await act(async () => {
      findButton(renderer, "Demander ma participation").props.onClick();
      await flushPromises();
    });
    expect(fetchMock).toHaveBeenLastCalledWith(identityUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(findText(renderer, "Votre demande de participation CleanMyMap est en attente de validation")).toBeTruthy();
    expect(renderer.root.findAllByProps({ children: "Badge synthétique" })).toHaveLength(0);
  });

  it("offers a retry for unavailable participation and displays every assistance status", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(initialState({ state: "participation_unavailable" })))
      .mockResolvedValueOnce(jsonResponse({ state: "participation_confirmed", team: null, recognition: null }));
    const renderer = renderCard();
    activeRenderers.push(renderer);
    await settleTimers();
    expect(renderer.root.findByProps({ children: "Vérifier à nouveau" })).toBeTruthy();

    await act(async () => {
      findButton(renderer, "Vérifier à nouveau").props.onClick();
      await flushPromises();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(findText(renderer, "Votre participation CleanMyMap est confirmée")).toBeTruthy();

    for (const [status, text] of [
      ["pending", "Demande en attente de vérification par l’organisateur."],
      ["treated", "Demande traitée : attendez la remise directe du code."],
      ["rejected", "Demande refusée par l’organisateur."],
      ["cancelled", "Demande annulée."],
    ] as const) {
      fetchMock.mockReset();
      fetchMock.mockResolvedValueOnce(jsonResponse(initialState({ state: "identity_unlinked", assistance: assistance(status) })));
      const statusRenderer = renderCard(`${eventId}-${status}`);
      await settleTimers();
      expect(statusRenderer.root.findByProps({ children: text })).toBeTruthy();
      act(() => statusRenderer.unmount());
    }
  });

  it("submits assistance with its context, prevents duplicate UI submission, and cancels pending requests", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(initialState()))
      .mockResolvedValueOnce(jsonResponse({ assistance: assistance("pending") }))
      .mockResolvedValueOnce(jsonResponse({ request: assistance("cancelled") }));
    const renderer = renderCard();
    activeRenderers.push(renderer);
    await settleTimers();

    await act(async () => {
      findButton(renderer, "Je n’ai pas de code").props.onClick();
      await flushPromises();
    });
    const context = findInput(renderer, "spogomi-identity-assistance-context");
    act(() => context.props.onChange({ target: { value: "Présence confirmée par l’équipe terrain." } }));
    await act(async () => {
      findForm(renderer).props.onSubmit({ preventDefault: vi.fn() });
      await flushPromises();
    });

    expect(fetchMock).toHaveBeenLastCalledWith(identityUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assistance: true, context: "Présence confirmée par l’équipe terrain." }),
    });
    expect(renderer.root.findByProps({ children: "Demande en attente de vérification par l’organisateur." })).toBeTruthy();
    expect(findButton(renderer, "Annuler la demande").props.disabled).toBe(false);

    await act(async () => {
      findButton(renderer, "Annuler la demande").props.onClick();
      await flushPromises();
    });
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/spogomi/events/${eventId}/identity-assistance`, { method: "DELETE" });
    expect(renderer.root.findAllByProps({ children: "Demande annulée." })).not.toHaveLength(0);
  });

  it("disables the assistance submit action while the request is pending", async () => {
    const pending = deferred<Response>();
    fetchMock.mockResolvedValueOnce(jsonResponse(initialState())).mockReturnValueOnce(pending.promise);
    const renderer = renderCard("event-assistance-pending");
    activeRenderers.push(renderer);
    await settleTimers();

    await act(async () => {
      findButton(renderer, "Je n’ai pas de code").props.onClick();
      await flushPromises();
    });
    act(() => findInput(renderer, "spogomi-identity-assistance-context").props.onChange({ target: { value: "Contexte" } }));
    act(() => findForm(renderer).props.onSubmit({ preventDefault: vi.fn() }));
    await act(async () => {
      await flushPromises();
    });
    expect(findButton(renderer, "Transmission…").props.disabled).toBe(true);

    pending.resolve(jsonResponse({ assistance: assistance("pending") }));
    await act(async () => {
      await flushPromises();
    });
    expect(findButton(renderer, "Annuler la demande")).toBeTruthy();
  });

  it("ignores a late state response after an event change and after unmount", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const renderer = renderCard("event-old");
    activeRenderers.push(renderer);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      renderer.update(<SpogomiIdentityLinkCard eventId="event-new" signInHref="/sign-in" />);
    });
    await settleTimers();
    second.resolve(jsonResponse({ state: "identity_verified", team: null, recognition: null }));
    await act(async () => {
      await flushPromises();
    });
    first.resolve(jsonResponse({ state: "identity_unlinked" }));
    await act(async () => {
      await flushPromises();
    });
    expect(findText(renderer, "Identité vérifiée. Votre liaison ne confirme pas votre présence")).toBeTruthy();

    const late = deferred<Response>();
    fetchMock.mockReturnValueOnce(late.promise);
    act(() => renderer.unmount());
    late.resolve(jsonResponse({ state: "identity_unlinked" }));
    await act(async () => {
      await flushPromises();
    });
  });
});
