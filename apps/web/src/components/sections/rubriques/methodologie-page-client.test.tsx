import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ACTION_POLLUTION_COLOR_STOPS } from "@/components/actions/map-marker-categories";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import {
  LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS,
} from "@/lib/actions/pollution/local-repollution-calibration";
import { buildActionPollutionProjectionMethodology } from "@/lib/actions/pollution/revisit-priority";
import {
  ActionMapMethodologySection,
  MethodologiePageClient,
} from "./methodologie-page-client";

import { RouteMethodologySection } from "./route-methodology-section";

describe("RouteMethodologySection", () => {
  it("présente les cinq étapes sans exposer les détails de calcul", () => {
    const markup = renderToStaticMarkup(
      <SitePreferencesProvider initialLocale="fr">
        <RouteMethodologySection />
      </SitePreferencesProvider>,
    );

    expect(markup).toContain('id="methodologie-itineraire"');
    expect(markup).toContain("Méthodologie de création d’itinéraire");
    for (const title of [
      "Données d’entrée",
      "Candidats",
      "Priorisation",
      "Contraintes du planner",
      "Itinéraire final et explicabilité",
    ]) {
      expect(markup).toContain(title);
    }
    expect(markup).toContain('href="/sections/route"');
    expect(markup).toContain("Créer un itinéraire");
    expect(markup).toContain('href="/docs/architecture/methodologie-creation-itineraire.md"');

    const section = markup.slice(markup.indexOf('id="methodologie-itineraire"'));
    expect(section).not.toMatch(/coefficient|pondération|formule|\b\d+\s*%/i);
  });

  it("publie le même contrat pédagogique en anglais", () => {
    const markup = renderToStaticMarkup(
      <SitePreferencesProvider initialLocale="en">
        <RouteMethodologySection />
      </SitePreferencesProvider>,
    );

    expect(markup).toContain("How an itinerary is created");
    expect(markup).toContain("Input data");
    expect(markup).toContain("Final itinerary and explainability");
    expect(markup).toContain("Create an itinerary");
  });
});

describe("ActionMapMethodologySection", () => {
  it("publishes the action history/projection distinction and methodology anchor", () => {
    const markup = renderToStaticMarkup(
      <ActionMapMethodologySection isFrench />,
    );
    const projection = buildActionPollutionProjectionMethodology();

    expect(markup).toContain('id="methodologie-carte-actions"');
    expect(markup).toContain("Le calque Actions conserve la mémoire des interventions");
    expect(markup).toContain("Trash Spotter reste la lecture opérationnelle");
    expect(markup).toContain("Pollution constatée");
    expect(markup).toContain("Pollution projetée");
    expect(markup).toContain("Dernière action");
    expect(markup).toContain("État courant par lieu");
    expect(markup).toContain("Pollution observée · niveau non quantifié");
    expect(markup).toContain("scoreKind measured|projected|unavailable");
    expect(markup).toContain("Un spot ponctuel ne recolore jamais une polyline");
    expect(markup).toContain("aucun score n’est fabriqué");
    expect(markup).toContain(projection.t80Formula);
    expect(markup).toContain(projection.projectionFormula);
    expect(markup).toContain("pas une mesure en temps réel");
    expect(markup).toContain("Heuristique versionnée");
    expect(markup).toContain("Calibration locale");
    expect(markup).toContain("Confiance de la projection");
    expect(markup).toContain("robustesse des données");
    expect(markup).toContain("ne remplace pas une mesure réelle");
    expect(markup).toContain("historique complet");
    expect(markup).toContain("derivedPlaceKey");
    expect(markup).toContain("identifiant canonique de lieu");
    expect(markup).toContain("Une source partielle");
    expect(markup).toContain("aucun score n’est fabriqué");
    expect(markup).toContain("ne remplace pas une mesure réelle");
    expect(markup).not.toContain("contrat futur");
    expect(markup).not.toContain("ledger d'erreur futur");
    expect(markup).toContain(
      `≤ ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters} m`,
    );
    expect(markup).toContain(
      `à partir de ${LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride}`,
    );
    expect(markup).toContain('href="/docs/product/methodologie-carte-actions.md"');
    expect(markup).toContain('href="#methodologie-carte-actions"');
  });

  it("uses the runtime color stops and reserves green for explicit clean places", () => {
    const markup = renderToStaticMarkup(
      <ActionMapMethodologySection isFrench />,
    );

    for (const stop of ACTION_POLLUTION_COLOR_STOPS) {
      expect(markup).toContain(stop.label);
      expect(markup).toContain(`repère ${stop.threshold}`);
    }
    expect(markup).toContain("Le vert est réservé aux lieux explicitement propres");
    expect(markup).not.toContain("Vert · faible");
  });

  it("keeps experimental and future-facing sections out of the public page", () => {
    const markup = renderToStaticMarkup(
      <SitePreferencesProvider>
        <MethodologiePageClient
          freePlanServices={[]}
          impactTotals={{
            monthlyKgCo2eProxy: null,
            annualKgCo2eProxy: null,
            totalKgCo2eProxy: null,
            generatedAt: null,
          }}
          impactSnapshots={[]}
          impactGeneratedAt={null}
          impactLaunchedAt={null}
          githubStats={null}
        />
      </SitePreferencesProvider>,
    );

    expect(markup).toContain("Méthode de calcul");
    expect(markup).toContain('id="methodologie-carte-actions"');
    expect(markup).toContain('id="methodologie-itineraire"');
    expect(markup).toContain('id="modes-affichage"');
    expect(markup).toContain("Modes d’affichage");
    expect(markup).toContain("Expérience CleanMyMap complète.");
    expect(markup).toContain("Allez droit au but sans contenu superflu");
    expect(markup).toContain("Adaptez le rendu visuel pour réduire la fatigue visuelle et cognitive sans modification du contenu.");
    expect(markup).toContain("Le mode change la présentation, jamais les fonctionnalités, permissions ou données.");
    expect(markup).toContain("Plans et quotas");
    expect(markup).toContain("Empreinte technique des services suivis");
    expect(markup).not.toContain("Terraink");
    expect(markup).not.toContain("Gamification");
    expect(markup).not.toContain("restez à l’écoute");
    expect(markup).not.toContain("COMING SOON");
  });
});
