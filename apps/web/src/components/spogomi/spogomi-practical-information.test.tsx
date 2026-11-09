import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpogomiPracticalInformation } from "./spogomi-practical-information";

describe("SpogomiPracticalInformation", () => {
  it("labels action guidance separately from missing verified SPOGOMI instructions", () => {
    const markup = renderToStaticMarkup(
      <SpogomiPracticalInformation
        startsAt="2027-05-01T08:00:00.000Z"
        endsAt={null}
        officialTimezone="Europe/Paris"
        locationLabel="Parc"
        lifecycleLabel="À venir"
        registrationLabel="Ouvert"
        resultsLabel="Indisponibles"
        practicalInformation={{
          meetingPoint: null,
          collectionZone: null,
          unfoldingMessage: null,
          recommendedMaterials: [],
          materialsProvided: [],
          safetyInstructions: null,
          actionSafetyInstructions: "Consigne publique de l’action associée.",
          organizationContact: null,
          assistanceProcedure: null,
          schedules: [],
        }}
      />,
    );

    expect(markup).toContain("Consignes de sécurité SPOGOMI");
    expect(markup).toContain("Consignes détaillées non communiquées");
    expect(markup).toContain("Consignes de l’action associée");
    expect(markup).toContain("Provenance : action associée");
    expect(markup).toContain("Consigne publique de l’action associée.");
  });
});
