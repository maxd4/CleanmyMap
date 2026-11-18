import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProgress = {
  eligible: true,
  count: 2,
  proofs: [
    {
      actionId: "00000000-0000-0000-0000-000000000001",
      actionDate: "2026-09-15",
      locationLabel: "Paris 10e - Canal Saint-Martin",
      qualifiedAt: "2026-09-16T10:00:00Z",
    },
    {
      actionId: "00000000-0000-0000-0000-000000000002",
      actionDate: "2026-10-10",
      locationLabel: "Paris 18e - Montmartre",
      qualifiedAt: "2026-10-11T12:00:00Z",
    },
  ],
};

let mockAuthUserId: string | null = "user-123";

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: () => Promise.resolve({ userId: mockAuthUserId }),
}));

vi.mock("@/lib/brigade-verte/brigade-verte-service", () => ({
  computeBrigadeVerteProgress: () => Promise.resolve(mockProgress),
}));

vi.mock("@/components/brand/brand-logo", () => ({
  BrandLogo: () => <span data-testid="brand-logo">CleanMyMap</span>,
}));

vi.mock("@/components/ui/clerk-required-gate", () => ({
  ClerkRequiredGate: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clerk-gate">{children}</div>
  ),
}));

import PrintBrigadeVertePage from "./page";

describe("PrintBrigadeVertePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUserId = "user-123";
    mockProgress.eligible = true;
    mockProgress.count = 2;
  });

  it("affiche une invite de connexion si l'utilisateur est anonyme", async () => {
    mockAuthUserId = null;
    const page = await PrintBrigadeVertePage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Connexion requise");
    expect(html).toContain("Vous devez être connecté à votre compte");
  });

  it("refuse la génération si l'utilisateur a moins de 2 preuves (1/2 ou 0/2)", async () => {
    mockProgress.count = 1;
    const page = await PrintBrigadeVertePage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Justificatif non disponible (2 participations requises)");
    expect(html).toContain("deux participations vérifiées et actives");
    expect(html).toContain("Progression actuelle : <strong>1/2</strong>");
  });

  it("refuse la génération si la base de données retourne une erreur (fail-closed)", async () => {
    mockProgress.eligible = false;
    mockProgress.count = 0;
    const page = await PrintBrigadeVertePage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Justificatif non disponible (2 participations requises)");
    expect(html).toContain("Indisponible");
  });

  it("génère le récapitulatif A4 complet avec mention obligatoire exacte et 2 preuves", async () => {
    const page = await PrintBrigadeVertePage({
      searchParams: Promise.resolve({ name: "Camille Dupont" }),
    });
    const html = renderToStaticMarkup(page);

    // Identité déclarée
    expect(html).toContain("Camille Dupont");
    // Mention obligatoire exacte
    expect(html).toContain(
      "Document informatif établi par CleanMyMap. Ne constitue ni un diplôme, ni une attestation officielle de la Brigade Verte Paris.",
    );
    // Deux preuves vérifiées
    expect(html).toContain("Paris 10e - Canal Saint-Martin");
    expect(html).toContain("Paris 18e - Montmartre");
    expect(html).toContain("00000000-0000-0000-0000-000000000001");
    expect(html).toContain("00000000-0000-0000-0000-000000000002");
    // Conditions externes et lien officiel
    expect(html).toContain("https://www.brigadeverteparis.fr/");
    expect(html).toContain("Formation et sensibilisation");
    expect(html).toContain("Engagement durable");
  });
});
