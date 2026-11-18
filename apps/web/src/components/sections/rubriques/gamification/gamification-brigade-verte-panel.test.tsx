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

import {
  GamificationBrigadeVertePanel,
  validateBrigadeVerteApiResponse,
} from "./gamification-brigade-verte-panel";

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

  it("bascule en état fail-closed si la réponse DTO est incohérente (count invalide, mismatch cardinalité, doublons)", () => {
    // Cas 1 : count !== proofs.length
    mockSwrState.data = {
      status: "available",
      count: 2,
      proofs: [
        {
          actionId: "act-1",
          actionDate: "2026-09-20",
          locationLabel: "Paris 10e",
          qualifiedAt: "2026-09-21T10:00:00Z",
        },
      ],
    };

    let html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("Impossible de charger votre progression actuellement");
    expect(html).not.toContain("2/2");

    // Cas 2 : count hors bornes [0, 2]
    mockSwrState.data = {
      status: "available",
      count: 3,
      proofs: [],
    };
    html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("Impossible de charger votre progression actuellement");

    // Cas 3 : preuves dupliquées (même actionId)
    mockSwrState.data = {
      status: "available",
      count: 2,
      proofs: [
        {
          actionId: "same-act-id",
          actionDate: "2026-09-20",
          locationLabel: "Paris 10e",
          qualifiedAt: "2026-09-21T10:00:00Z",
        },
        {
          actionId: "same-act-id",
          actionDate: "2026-09-20",
          locationLabel: "Paris 10e",
          qualifiedAt: "2026-09-21T10:00:00Z",
        },
      ],
    };
    html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("Impossible de charger votre progression actuellement");
    expect(html).not.toContain("2/2");
  });

  it("affiche correctement l'état 0/2 avec mention d'attribution CleanMyMap et sans mention de partenariat Ville de Paris", () => {
    mockSwrState.data = {
      status: "available",
      count: 0,
      proofs: [],
    };

    const html = renderToStaticMarkup(<GamificationBrigadeVertePanel />);
    expect(html).toContain("0/2 • Aucune participation justificative");
    expect(html).toContain("Parcours Éco-Citoyen | Brigade Verte Paris");

    // Attribution factuelle CleanMyMap
    expect(html).toContain("Progression de preuves vérifiées par CleanMyMap");
    expect(html).not.toContain("Dispositif Partenaire • Ville de Paris");

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

  it("affiche l'état 2/2 avec lien d'impression pur sans query param name dans l'URL", () => {
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

    // Lien vers l'impression A4 strict sans query param ?name=
    expect(html).toContain('href="/prints/brigade-verte"');
    expect(html).not.toContain("?name=");

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

  it("valide les structures conformes via validateBrigadeVerteApiResponse", () => {
    const valid = validateBrigadeVerteApiResponse({
      status: "available",
      count: 1,
      proofs: [
        {
          actionId: "a1",
          actionDate: "2026-05-01",
          locationLabel: "Paris",
          qualifiedAt: "2026-05-02T00:00:00Z",
        },
      ],
    });
    expect(valid.status).toBe("available");

    const invalidNull = validateBrigadeVerteApiResponse(null);
    expect(invalidNull.status).toBe("error");

    const invalidCount = validateBrigadeVerteApiResponse({
      status: "available",
      count: 1.5,
      proofs: [],
    });
    expect(invalidCount.status).toBe("error");
  });
});
