// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstitutionalRelationsAdminClient } from "./institutional-relations-admin-client";

describe("InstitutionalRelationsAdminClient", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it("renders additive public/private projection, relational facts, 3 independent indicators, and PATCH review with custom reason", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        contacts: [
          {
            id: "contact-1",
            institutionalNodeId: "town-hall-05",
            displayName: "Interlocuteur Mairie 5e",
            roleLabel: "Chargé de mission",
            isPubliclyPublishable: false,
            revalidationStatus: "a_revalider",
            notes: null,
            createdAt: "2026-11-25T10:00:00Z",
            updatedAt: "2026-11-25T10:00:00Z",
            facts: [
              {
                id: "fact-1",
                contactId: "contact-1",
                kind: "explicit_support",
                origin: "direct_email",
                reviewStatus: "pending",
                evidenceRef: "https://mairie05.paris.fr/soutien",
                summary: "Soutien explicite à l'action locale",
                occurredAt: "2026-11-20T10:00:00Z",
                target: "cleanmymap",
                createdBy: "admin-1",
                createdAt: "2026-11-25T10:00:00Z",
              },
            ],
            distinctions: {
              directContact: true,
              explicitSupport: false,
              effectiveContribution: false,
            },
            distinctionsIncomplete: true,
          },
        ],
        truncated: { contacts: false, facts: true },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("prompt", vi.fn().mockReturnValue("Courrier officiel vérifié"));

    const root = createRoot(container);
    await act(async () => {
      root.render(<InstitutionalRelationsAdminClient />);
    });

    expect(container.textContent).toContain("Interlocuteur Mairie 5e");
    expect(container.textContent).toContain("Mairie du 5e arrondissement");
    expect(container.textContent).toContain("Soutien explicite à l'action locale");
    expect(container.textContent).toContain("https://mairie05.paris.fr/soutien");
    expect(container.textContent).toContain("Contact direct : Établi");
    expect(container.textContent).toContain("Soutien explicite : Indéterminé : données incomplètes");
    expect(container.textContent).toContain("Historique partiellement tronqué");

    const verifyButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Vérifier",
    );
    expect(verifyButton).toBeDefined();

    await act(async () => {
      verifyButton?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/partners/institutional-relations",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          factId: "fact-1",
          reviewStatus: "verified",
          reason: "Courrier officiel vérifié",
        }),
      }),
    );

    await act(async () => {
      root.unmount();
    });
  });
});
