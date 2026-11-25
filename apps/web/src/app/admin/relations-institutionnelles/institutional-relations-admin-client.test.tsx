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

  it("renders additive public/private projection, 3 independent indicators, and truncation warning", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          contacts: [
            {
              id: "contact-1",
              institutionalNodeId: null,
              displayName: "Interlocuteur Privé",
              roleLabel: "Chargé de mission",
              isPubliclyPublishable: false,
              revalidationStatus: "a_revalider",
              notes: null,
              createdAt: "2026-11-25T10:00:00Z",
              updatedAt: "2026-11-25T10:00:00Z",
              facts: [],
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
      }),
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(<InstitutionalRelationsAdminClient />);
    });

    expect(container.textContent).toContain("Interlocuteur Privé");
    expect(container.textContent).toContain("Prospect privé uniquement");
    expect(container.textContent).toContain("Contact direct : Établi");
    expect(container.textContent).toContain("Soutien explicite : Indéterminé : données incomplètes");
    expect(container.textContent).toContain("Historique partiellement tronqué");

    await act(async () => {
      root.unmount();
    });
  });
});
