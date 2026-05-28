import { describe, expect, it } from "vitest";
import {
  normalizeThirtySecondsSummaryProps,
  type ThirtySecondsSummaryProps,
} from "./thirty-seconds-summary";
import { ADMIN_ROUTE } from "@/lib/accueil-pilotage-routes";

describe("normalizeThirtySecondsSummaryProps", () => {
  it("falls back to flat props when summary is undefined", () => {
    const props: ThirtySecondsSummaryProps = {
      kpis: [
        {
          label: "Impact terrain",
          value: "12.0 kg",
          previousValue: "10.0 kg",
          deltaPercent: "+20.0%",
          interpretation: "positive",
        },
      ],
      alert: {
        severity: "low",
        title: "Aucune alerte",
        detail: "Rien à signaler.",
      },
      recommendedAction: {
        href: "/reports",
        label: "Ouvrir reporting",
      },
      recommendedReason: "Accéder au reporting détaillé.",
    };

    const normalized = normalizeThirtySecondsSummaryProps(props);

    expect(normalized.kpis).toHaveLength(1);
    expect(normalized.alert?.title).toBe("Aucune alerte");
    expect(normalized.recommendedAction?.href).toBe("/reports");
    expect(normalized.recommendedReason).toBe("Accéder au reporting détaillé.");
  });

  it("prefers values from summary when both forms are provided", () => {
    const props: ThirtySecondsSummaryProps = {
      summary: {
        kpis: [
          {
            label: "Synthèse",
            value: "1",
            previousValue: "0",
            deltaPercent: "+100.0%",
            interpretation: "positive",
          },
        ],
        alert: {
          severity: "medium",
          title: "Résumé prioritaire",
          detail: "Une alerte est disponible.",
        },
        recommendedAction: {
          href: ADMIN_ROUTE,
          label: "Traiter",
          reason: "Action prioritaire.",
        },
      },
      kpis: [],
      alert: {
        severity: "low",
        title: "Ne pas utiliser",
        detail: "Ce contenu doit être ignoré.",
      },
      recommendedAction: {
        href: "/reports",
        label: "Ignorer",
      },
      recommendedReason: "Ignorer aussi.",
    };

    const normalized = normalizeThirtySecondsSummaryProps(props);

    expect(normalized.kpis).toHaveLength(1);
    expect(normalized.alert?.title).toBe("Résumé prioritaire");
    expect(normalized.recommendedAction?.href).toBe(ADMIN_ROUTE);
    expect(normalized.recommendedReason).toBe("Action prioritaire.");
  });
});
