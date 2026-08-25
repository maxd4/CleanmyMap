import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ACTION_PRIORITY_COLOR_STOPS } from "@/components/actions/map-marker-categories";
import {
  LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS,
} from "@/lib/actions/local-repollution-calibration";
import { buildActionPollutionProjectionMethodology } from "@/lib/actions/revisit-priority";
import { ActionMapMethodologySection } from "./methodologie-page-client";

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
    expect(markup).toContain("le read path actuel ne fabrique aucune donnée");
    expect(markup).toContain(projection.t80Formula);
    expect(markup).toContain(projection.projectionFormula);
    expect(markup).toContain("pas une mesure en temps réel");
    expect(markup).toContain("Heuristique versionnée");
    expect(markup).toContain("Calibration locale");
    expect(markup).toContain("Confiance de la projection");
    expect(markup).toContain("robustesse des données");
    expect(markup).toContain("ledger d&#x27;erreur futur");
    expect(markup).toContain("historique complet");
    expect(markup).toContain("derivedPlaceKey");
    expect(markup).toContain("Aucune place_id");
    expect(markup).toContain("Une source partielle");
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

    for (const stop of ACTION_PRIORITY_COLOR_STOPS) {
      expect(markup).toContain(stop.label);
      expect(markup).toContain(`repère ${stop.threshold}`);
    }
    expect(markup).toContain("Le vert est réservé aux lieux explicitement propres");
    expect(markup).not.toContain("Vert · faible");
  });
});
