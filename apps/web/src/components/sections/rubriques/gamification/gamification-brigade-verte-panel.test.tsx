import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockSwrState = {
  data: {
    status: "available",
    count: 0,
    proofs: [] as Array<{ actionId: string; actionDate: string; locationLabel: string; qualifiedAt: string }>,
  } as unknown,
  error: undefined as unknown,
  isLoading: false,
};

vi.mock("swr", () => ({
  default: () => ({
    ...mockSwrState,
    mutate: vi.fn(),
  }),
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

import { GamificationBrigadeVertePanel } from "./gamification-brigade-verte-panel";

describe("GamificationBrigadeVertePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSwrState = {
      data: {
        status: "available",
        count: 0,
        proofs: [],
      },
      error: undefined,
      isLoading: false,
    };
  });

  it("affiche le composant de chargement quand isLoading est vrai", () => {
    mockSwrState.isLoading = true;
    mockSwrState.data = undefined;

    const html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("Chargement du Parcours Éco-Citoyen");
  });

  it("affiche l'alerte d'erreur fail-closed sans afficher 0/2 en cas d'erreur de lecture", () => {
    mockSwrState.error = new Error("Network error");
    mockSwrState.data = undefined;

    const html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("Impossible de charger votre progression actuellement");
    expect(html).toContain("Erreur Parcours Éco-Citoyen");
    // Invariant fondamental : ne jamais afficher 0/2 en cas d'erreur
    expect(html).not.toContain("0/2");
    expect(html).not.toContain("Aucune participation justificative");
  });

  it("affiche correctement l'état 0/2 et le parcours guidé", () => {
    mockSwrState.data = {
      status: "available",
      count: 0,
      proofs: [],
    };

    const html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("0/2 • Aucune participation justificative");
    expect(html).toContain("Parcours Éco-Citoyen | Brigade Verte Paris");
    // Les 3 conditions publiées
    expect(html).toContain("1. Deux opérations terrain");
    expect(html).toContain("Vérifié par CleanMyMap");
    expect(html).toContain("2. Formation &amp; Sensibilisation");
    expect(html).toContain("3. Engagement durable");
    // Parcours guidé
    expect(html).toContain("Découvrir les opérations");
    expect(html).toContain("Participer sur le terrain");
    expect(html).toContain("Faire confirmer sa présence");
    // Pas de justificatif disponible à 0/2
    expect(html).not.toContain("Ouvrir le relevé A4 imprimable");
  });

  it("affiche correctement l'état 1/2 avec la preuve enregistrée", () => {
    mockSwrState.data = {
      status: "available",
      count: 1,
      proofs: [
        {
          actionId: "act-1",
          actionDate: "2026-09-20",
          locationLabel: "Paris 10e - Canal Saint-Martin",
          qualifiedAt: "2026-09-21T10:00:00Z",
        },
      ],
    };

    const html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("1/2 • Une participation vérifiée");
    expect(html).toContain("Preuve n°1 — Opération Quartier Propre");
    expect(html).toContain("Paris 10e - Canal Saint-Martin");
    expect(html).toContain("2026-09-20");
    // Toujours pas de justificatif à 1/2
    expect(html).not.toContain("Ouvrir le relevé A4 imprimable");
  });

  it("affiche l'état 2/2 avec les 2 preuves et la section Justificatif A4", () => {
    mockSwrState.data = {
      status: "available",
      count: 2,
      proofs: [
        {
          actionId: "act-1",
          actionDate: "2026-09-20",
          locationLabel: "Paris 10e - Canal Saint-Martin",
          qualifiedAt: "2026-09-21T10:00:00Z",
        },
        {
          actionId: "act-2",
          actionDate: "2026-10-15",
          locationLabel: "Paris 18e - Montmartre",
          qualifiedAt: "2026-10-16T10:00:00Z",
        },
      ],
    };

    const html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("2/2 • Deux participations justificatives réunies");
    expect(html).toContain("Félicitations ! Vos deux preuves de participation sont réunies.");
    // Lien vers l'impression A4
    expect(html).toContain("Ouvrir le relevé A4 imprimable");
    expect(html).toContain("/prints/brigade-verte");
    // Mention obligatoire exacte
    expect(html).toContain(
      "Document informatif établi par CleanMyMap. Ne constitue ni un diplôme, ni une attestation officielle de la Brigade Verte Paris.",
    );
  });

  it("contient la foire aux questions pédagogique sur le dispositif", () => {
    const html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("Foire aux questions • Parcours Éco-Citoyen");
    expect(html).toContain("Qu&#x27;est-ce qu&#x27;une opération admissible « Quartier Propre » ?");
    expect(html).toContain("Pourquoi mon inscription seule ne suffit-elle pas ?");
    expect(html).toContain("Comment obtenir le Diplôme Éco-Citoyen officiel ?");
  });
});
