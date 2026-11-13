import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  getSummaryInterpretationStyles,
  localizeSummaryKpi,
  localizeSummaryText,
  normalizeThirtySecondsSummaryProps,
  ThirtySecondsSummary,
  type ThirtySecondsSummaryProps,
} from "./thirty-seconds-summary";
import { ADMIN_ROUTE } from "@/lib/accueil-pilotage-routes";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildSummary } from "@/lib/pilotage/overview.summary";
import { buildZones } from "@/lib/pilotage/overview.zones";
import { computePilotageComparison } from "@/lib/pilotage/metrics";
import { buildOperationalPriorities } from "@/lib/pilotage/prioritization";

const kpis = [
  {
    id: "positive",
    label: "Impact terrain",
    value: "12.0 kg (100% renseigné)",
    previousValue: "10.0 kg (100% renseigné)",
    deltaPercent: "+20.0%",
    interpretation: "positive" as const,
  },
  {
    id: "negative",
    label: "Qualite data",
    value: "72.0%",
    previousValue: "80.0%",
    deltaPercent: "-10.0%",
    interpretation: "negative" as const,
  },
  {
    id: "neutral",
    label: "IUR (Sobriété)",
    value: "Indisponible",
    previousValue: "Indisponible",
    deltaPercent: "Non comparable",
    interpretation: "neutral" as const,
  },
];

function buildProducerSummary() {
  const now = new Date("2026-04-10T00:00:00.000Z");
  const contracts = [
    buildActionDataContract({
      id: "producer-approved",
      type: "action",
      status: "approved",
      source: "test",
      observedAt: "2026-04-09",
      createdAt: "2026-04-08T10:00:00.000Z",
      locationLabel: "Paris 10e",
      latitude: 48.87,
      longitude: 2.35,
      wasteKg: 10,
      volunteersCount: 4,
    }),
  ];
  const comparison = computePilotageComparison(contracts, 30, now, {
    moderationAvailability: "unavailable",
  });
  const zones = buildZones(contracts, 30, now, "unavailable");
  const priorities = buildOperationalPriorities({ comparison, zones });
  return { summary: buildSummary(comparison, priorities), priorities };
}

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

describe("ThirtySecondsSummary rendering", () => {
  it.each([
    ["positive", "text-emerald-300", "bg-emerald-500/10"],
    ["negative", "text-rose-300", "bg-rose-500/10"],
    ["neutral", "text-slate-200", "bg-slate-500/15"],
  ] as const)("renders the %s interpretation with a distinct presentation", (interpretation, color, background) => {
    const markup = renderToStaticMarkup(
      React.createElement(ThirtySecondsSummary, {
        locale: "fr",
        kpis: [kpis.find((kpi) => kpi.interpretation === interpretation)!],
      }),
    );
    const styles = getSummaryInterpretationStyles(interpretation);

    expect(markup).toContain(color);
    expect(markup).toContain(background);
    expect(styles.icon).toBe(
      interpretation === "positive"
        ? TrendingUp
        : interpretation === "negative"
          ? TrendingDown
          : Minus,
    );
    if (interpretation === "neutral") {
      expect(markup).not.toContain("text-rose-300");
      expect(markup).not.toContain("TrendingDown");
    }
  });

  it("localizes the shared KPI presentation in French and English", () => {
    const french = renderToStaticMarkup(
      React.createElement(ThirtySecondsSummary, {
        locale: "fr",
        kpis,
        recommendedAction: {
          href: "/reports",
          label: "Renforcer geo-couverture",
          reason: "Qualite data en baisse (-2.0 pt, score actuel 72.0%).",
        },
      }),
    );
    const english = renderToStaticMarkup(
      React.createElement(ThirtySecondsSummary, {
        locale: "en",
        kpis,
        recommendedAction: {
          href: "/reports",
          label: "Renforcer geo-couverture",
          reason: "Qualite data en baisse (-2.0 pt, score actuel 72.0%).",
        },
      }),
    );

    expect(french).toContain("Qualité des données");
    expect(french).toContain("vs période précédente");
    expect(french).toContain("Renforcer la géocouverture");
    expect(english).toContain("Data quality");
    expect(english).toContain("vs previous period");
    expect(english).toContain("Strengthen geographic coverage");
    expect(english).toContain("Data quality is down");
    expect(english).toContain("reported");
  });

  it("localizes alert titles and details without changing their severity", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ThirtySecondsSummary, {
        locale: "en",
        kpis: [kpis[0]],
        alert: {
          severity: "high",
          title: "Resorber le backlog de moderation",
          detail: "Le delai de moderation et le volume pending degradent la fiabilite de publication.",
        },
      }),
    );

    expect(markup).toContain("Urgent");
    expect(markup).toContain("Clear the moderation backlog");
    expect(markup).toContain("Moderation delay and pending volume reduce publication reliability.");
    expect(markup).not.toContain("Résorber le backlog de modération");
  });

  it("localizes complete producer messages without fragment replacement corruption", () => {
    const { summary, priorities } = buildProducerSummary();
    const territorial = priorities.find((priority) => priority.id.startsWith("territorial-"));

    expect(territorial).toBeDefined();
    expect(localizeSummaryText(territorial?.reason, "en")).toBe(
      "The area combines high impact with recurring pressure over the recent period.",
    );

    const markup = renderToStaticMarkup(
      React.createElement(ThirtySecondsSummary, {
        locale: "en",
        summary: {
          ...summary,
          alert: {
            severity: territorial!.severity,
            title: territorial!.title,
            detail: territorial!.reason,
          },
        },
      }),
    );

    expect(markup).toContain("Prioritize 10e");
    expect(markup).toContain("The area combines high impact with recurring pressure over the recent period.");
    expect(markup).toContain("reported");
    expect(markup).not.toContain("impact eleve");
  });

  it.each([
    [
      "Delai moderation en degradation (+4.0 j, 9.0 j actuels).",
      "Délai de modération en dégradation (+4.0 j, 9.0 j actuels).",
      "Moderation delay is worsening (+4.0 d, 9.0 d currently).",
    ],
    [
      "Qualite data en baisse (-2.0 pt, score actuel 75.0%).",
      "Qualité des données en baisse (-2.0 pt, score actuel 75.0%).",
      "Data quality is down (-2.0 pt, current score 75.0%).",
    ],
    [
      "Couverture geoloc en degradation (-12.0 pt, couverture actuelle 58.0%).",
      "Couverture géoloc en dégradation (-12.0 pt, couverture actuelle 58.0%).",
      "Geographic coverage is worsening (-12.0 pt, current coverage 58.0%).",
    ],
    [
      "L'IUR est indisponible pour une décision métier : seulement 75.0% des actions ont une masse renseignée.",
      "L'IUR est indisponible pour une décision métier : seulement 75.0% des actions ont une masse renseignée.",
      "The IUR is unavailable for a business decision: only 75.0% of actions have reported mass.",
    ],
    [
      "Détection de 3 anomalies de saisie (Impact suspect ou date manquante).",
      "Détection de 3 anomalies de saisie (Impact suspect ou date manquante).",
      "Detected 3 data-entry anomalies (suspected impact or missing date).",
    ],
  ])("localizes the full dynamic producer message: %s", (source, french, english) => {
    expect(localizeSummaryText(source, "en")).toBe(english);
    expect(localizeSummaryText(source, "fr")).toBe(french);
  });

  it("leaves unknown messages intact instead of translating fragments", () => {
    const unknown = "Un message non référencé renseigné et renseignée.";

    expect(localizeSummaryText(unknown, "en")).toBe(unknown);
    expect(localizeSummaryText("75.0% des actions ont une masse renseignée.", "en")).toBe(
      "75.0% des actions ont une masse renseignée.",
    );
    expect(localizeSummaryText("75.0% des actions ont une masse renseigné.", "en")).toBe(
      "75.0% des actions ont une masse renseigné.",
    );
  });

  it("renders the honest empty state in both locales", () => {
    const french = renderToStaticMarkup(
      React.createElement(ThirtySecondsSummary, { locale: "fr" }),
    );
    const english = renderToStaticMarkup(
      React.createElement(ThirtySecondsSummary, { locale: "en" }),
    );

    expect(french).toContain("Aucun KPI à afficher");
    expect(english).toContain("No KPIs to display");
    expect(english).not.toContain("Synthèse indisponible");
  });

  it("keeps KPI content readable when the grid reflows and does not depend on motion", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ThirtySecondsSummary, { locale: "en", kpis }),
    );
    const source = readFileSync(new URL("./thirty-seconds-summary.tsx", import.meta.url), "utf8");

    expect(markup).toContain("grid-cols-1 gap-4 md:grid-cols-3");
    expect(markup).toContain("break-words");
    expect(markup).toContain("tabular-nums");
    expect(source).not.toContain("framer-motion");
    expect(source).not.toContain("animate-pulse");
    expect(source).not.toContain("replaceAll");
  });
});

describe("summary presentation helpers", () => {
  it("keeps units and interpretation while translating display text", () => {
    const localized = localizeSummaryKpi(kpis[0], "en");

    expect(localized.interpretation).toBe("positive");
    expect(localized.value).toBe("12.0 kg (100% reported)");
    expect(localized.previousValue).toBe("10.0 kg (100% reported)");
  });
});
