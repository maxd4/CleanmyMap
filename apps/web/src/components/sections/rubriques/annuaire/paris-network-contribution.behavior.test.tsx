// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
} from "@/lib/partners/paris-cleanwalk-network";
import {
  PARIS_NETWORK_CONTRIBUTION_PAGE_PATH,
  PARIS_NETWORK_CONTRIBUTION_PREFIX,
  validateAndBuildContributionPayload,
} from "./paris-network-contribution.model";

const useUserMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useUser: useUserMock,
}));

import { ParisNetworkContributionCard } from "./paris-network-contribution-card";

describe("paris-network-contribution payload contract", () => {
  it("builds a valid bug-reports payload with the canonical prefix and pagePath", () => {
    const built = validateAndBuildContributionPayload({
      message: "Nouvelle collaboration vérifiée entre deux collectifs du 12e arrondissement.",
      infoType: "collaboration",
      proofUrl: "https://example.org/action-commune",
      honeypot: "",
      submittedAt: 1700000000000,
      fr: true,
    });

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.payload.reportType).toBe("idea");
    expect(built.payload.source).toBe("feedback_section");
    expect(built.payload.title.startsWith(PARIS_NETWORK_CONTRIBUTION_PREFIX)).toBe(true);
    expect(built.payload.pagePath).toBe(PARIS_NETWORK_CONTRIBUTION_PAGE_PATH);
    expect(built.payload.description).toContain("https://example.org/action-commune");
  });

  it("rejects short descriptions, invalid URLs and oversized payloads", () => {
    const tooShort = validateAndBuildContributionPayload({
      message: "court",
      infoType: "",
      proofUrl: "",
      honeypot: "",
      submittedAt: 1700000000000,
      fr: true,
    });
    expect(tooShort.ok).toBe(false);

    const badUrl = validateAndBuildContributionPayload({
      message: "Une proposition suffisamment longue pour passer la longueur minimale.",
      infoType: "structure",
      proofUrl: "javascript:alert(1)",
      honeypot: "",
      submittedAt: 1700000000000,
      fr: true,
    });
    expect(badUrl.ok).toBe(false);

    const tooLong = validateAndBuildContributionPayload({
      message: "a".repeat(3005),
      infoType: "",
      proofUrl: "",
      honeypot: "",
      submittedAt: 1700000000000,
      fr: true,
    });
    expect(tooLong.ok).toBe(false);
  });
});

describe("ParisNetworkContributionCard behavior", () => {
  let container: HTMLDivElement;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("prompts anonymous users to sign in with a visible link and blocks submission", () => {
    useUserMock.mockReturnValue({ isLoaded: true, isSignedIn: false });
    const root = createRoot(container);

    act(() => {
      root.render(React.createElement(ParisNetworkContributionCard, { fr: true }));
    });

    expect(container.textContent).toContain("Aidez-nous à compléter ce réseau");
    expect(container.textContent).toContain("Se connecter pour contribuer");
    const signInLink = container.querySelector('a[href*="/sign-in"]');
    expect(signInLink).not.toBeNull();
    expect(container.querySelector("textarea")).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("submits authenticated contributions to POST /api/community/bug-reports without mutating the public graph", async () => {
    useUserMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ status: "queued", requestId: "req-cleanwalk-123" }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const initialActorsCount = PARIS_CLEANWALK_ACTORS.length;
    const initialRelationsCount = PARIS_CLEANWALK_RELATIONS.length;

    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(ParisNetworkContributionCard, { fr: true }));
    });

    const select = container.querySelector(
      'select[aria-label="Type d\'information"]',
    ) as HTMLSelectElement;
    const urlInput = container.querySelector(
      'input[aria-label="URL justificative"]',
    ) as HTMLInputElement;
    const textarea = container.querySelector(
      'textarea[aria-label="Description de la proposition"]',
    ) as HTMLTextAreaElement;
    const form = container.querySelector("form") as HTMLFormElement;

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(
        textarea,
        "Action commune observée le 10/10/2026 avec source publique vérifiable.",
      );
      textarea.dispatchEvent(new Event("input", { bubbles: true }));

      const urlSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      urlSetter?.call(urlInput, "https://example.org/cleanwalk-paris");
      urlInput.dispatchEvent(new Event("input", { bubbles: true }));

      select.value = "action_commune";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("/api/community/bug-reports");
    const sent = JSON.parse(String(init.body));
    expect(sent.reportType).toBe("idea");
    expect(sent.source).toBe("feedback_section");
    expect(sent.title).toContain("Réseau cleanwalks Paris");
    expect(sent.pagePath).toBe("/sections/annuaire#reseau-cleanwalks");

    expect(container.textContent).toContain("Contribution enregistrée");
    expect(container.textContent).toContain("req-cleanwalk-123");
    expect(PARIS_CLEANWALK_ACTORS).toHaveLength(initialActorsCount);
    expect(PARIS_CLEANWALK_RELATIONS).toHaveLength(initialRelationsCount);

    act(() => {
      root.unmount();
    });
  });

  it("displays explicit error state on network failure or anonymous server refusal", async () => {
    useUserMock.mockReturnValue({ isLoaded: true, isSignedIn: true });
    const fetchMock = vi.fn().mockRejectedValue(new Error("Erreur réseau simulée"));
    globalThis.fetch = fetchMock as typeof fetch;

    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(ParisNetworkContributionCard, { fr: true }));
    });

    const textarea = container.querySelector(
      'textarea[aria-label="Description de la proposition"]',
    ) as HTMLTextAreaElement;
    const form = container.querySelector("form") as HTMLFormElement;

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(textarea, "Proposition valide testant le cas d'échec réseau.");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain("Envoi impossible");
    expect(container.textContent).toContain("Erreur réseau simulée");

    act(() => {
      root.unmount();
    });
  });
});
