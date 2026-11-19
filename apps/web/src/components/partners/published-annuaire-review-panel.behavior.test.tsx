// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

import { PublishedAnnuaireReviewPanel } from "./published-annuaire-review-panel";

const pendingEntry = {
  id: "onboarded-1",
  sourceRequestId: "request-1",
  publishedAt: "2026-08-26T10:00:00.000Z",
  publicationStatus: "pending_admin_review" as const,
  source: "partner_onboarding" as const,
  provenance: "published_partner" as const,
  name: "Partner record",
  legalIdentity: "Partner legal identity",
  kind: "association" as const,
  scope: "national" as const,
  types: ["social" as const],
  description: "Public description",
  location: "France",
  lat: 46.6,
  lng: 1.88,
  coveredArrondissements: [],
  contributionTypes: ["communication" as const],
  availability: "Ponctuelle",
  verificationStatus: "en_cours" as const,
  qualificationStatus: "contact_non_qualifie" as const,
  lastUpdatedAt: "2026-08-26T10:00:00.000Z",
  recentActivityAt: "2026-08-26T10:00:00.000Z",
};

describe("PublishedAnnuaireReviewPanel interactive flow", () => {
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

  it("renders empty state when no items exist", () => {
    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(PublishedAnnuaireReviewPanel, { items: [] }));
    });
    expect(container.textContent).toContain("Revue admin des fiches publiées");
    expect(container.querySelectorAll("button")).toHaveLength(0);
    act(() => {
      root.unmount();
    });
  });

  it("submits an accepted review decision when confirmation phrase and reason are valid", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const root = createRoot(container);
    act(() => {
      root.render(
        React.createElement(PublishedAnnuaireReviewPanel, {
          items: [pendingEntry],
        }),
      );
    });

    const inputs = Array.from(container.querySelectorAll("input"));
    const textareas = Array.from(container.querySelectorAll("textarea"));

    act(() => {
      for (const input of inputs) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, "CONFIRMER PARTENAIRE");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      for (const ta of textareas) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        setter?.call(ta, "Vérification administrative complète effectuée.");
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    const acceptBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Accepter"),
    );
    expect(acceptBtn).toBeDefined();

    await act(async () => {
      acceptBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it("displays an error when the review API fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Erreur serveur" }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const root = createRoot(container);
    act(() => {
      root.render(
        React.createElement(PublishedAnnuaireReviewPanel, {
          items: [pendingEntry],
        }),
      );
    });

    const inputs = Array.from(container.querySelectorAll("input"));
    const textareas = Array.from(container.querySelectorAll("textarea"));

    act(() => {
      for (const input of inputs) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, "CONFIRMER PARTENAIRE");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      for (const ta of textareas) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        setter?.call(ta, "Motif de refus valide.");
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    const rejectBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Rejeter"),
    );

    await act(async () => {
      rejectBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(container.textContent).toContain("Erreur serveur");

    act(() => {
      root.unmount();
    });
  });
});
