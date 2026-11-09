import { describe, expect, it } from "vitest";
import { buildSpogomiPublicPracticalInformation } from "./public-practical-information";

const divisions = [
  { id: "division-casual", type: "casual" as const },
  { id: "division-world", type: "world_cup" as const },
];

describe("SPOGOMI public practical information", () => {
  it("projects published preparation and only explicitly verified policy fields", () => {
    const result = buildSpogomiPublicPracticalInformation({
      actionPreparationData: {
        pointDeRendezVous: "Entrée nord du parc",
        zoneCiblePrevue: "Berges délimitées par l’organisation",
        participantMessage: "Briefing à l’arrivée, puis collecte et tri.",
        recommendedMaterials: "Gants adaptés",
        materialsProvided: "Pinces sur place",
        suggestedMaterials: ["grabbers"],
        expectedWasteCategories: ["battery"],
        logisticsNotes: "Note interne non publiée.",
      },
      registrationConfig: {
        registrationPolicy: {
          safetyInstructions: "Rester en binôme et suivre le périmètre.",
          safetyInstructionsVerified: true,
          organizationContact: "Contact public vérifié",
          organizationContactVerified: true,
          assistanceProcedure: "Signaler tout incident au point d’accueil.",
          assistanceProcedureVerified: true,
          privatePhone: "Ne jamais publier",
          privatePhoneVerified: true,
        },
      },
      divisions,
      operations: [],
    });

    expect(result).toMatchObject({
      meetingPoint: "Entrée nord du parc",
      collectionZone: "Berges délimitées par l’organisation",
      unfoldingMessage: "Briefing à l’arrivée, puis collecte et tri.",
      safetyInstructions: "Rester en binôme et suivre le périmètre.",
      organizationContact: "Contact public vérifié",
      assistanceProcedure: "Signaler tout incident au point d’accueil.",
    });
    expect(result.recommendedMaterials).toContain("Gants adaptés");
    expect(result.recommendedMaterials).toContain("Pinces");
    expect(result.materialsProvided).toContain("Pinces sur place");
    expect(JSON.stringify(result)).not.toContain("Note interne");
    expect(JSON.stringify(result)).not.toContain("Ne jamais publier");
  });

  it("does not expose unverified contacts or assistance details", () => {
    const result = buildSpogomiPublicPracticalInformation({
      registrationConfig: {
        registrationPolicy: {
          safetyInstructions: "Texte non vérifié",
          safetyInstructionsVerified: false,
          organizationContact: "Contact non vérifié",
          organizationContactVerified: false,
          assistanceProcedure: "Assistance non vérifiée",
          assistanceProcedureVerified: false,
        },
      },
      divisions,
      operations: [],
    });

    expect(result.organizationContact).toBeNull();
    expect(result.assistanceProcedure).toBeNull();
    expect(result.safetyInstructions).toBeNull();
  });

  it("keeps complete official schedules by division and drops partial or unknown divisions", () => {
    const result = buildSpogomiPublicPracticalInformation({
      divisions,
      operations: [
        {
          division_id: "division-casual",
          timezone_name: "Europe/Paris",
          official_start_at: "2027-05-01T08:00:00.000Z",
          collection_limit_at: "2027-05-01T08:40:00.000Z",
          sorting_limit_at: "2027-05-01T09:00:00.000Z",
          weighing_start_at: "2027-05-01T09:00:00.000Z",
          weighing_end_at: "2027-05-01T09:20:00.000Z",
        },
        {
          division_id: "division-world",
          timezone_name: "Europe/Paris",
          official_start_at: "2027-05-01T08:00:00.000Z",
          collection_limit_at: null,
          sorting_limit_at: "2027-05-01T09:00:00.000Z",
          weighing_start_at: "2027-05-01T09:00:00.000Z",
          weighing_end_at: "2027-05-01T09:20:00.000Z",
        },
        {
          division_id: "unknown",
          timezone_name: "Europe/Paris",
          official_start_at: "2027-05-01T08:00:00.000Z",
          collection_limit_at: "2027-05-01T08:40:00.000Z",
          sorting_limit_at: "2027-05-01T09:00:00.000Z",
          weighing_start_at: "2027-05-01T09:00:00.000Z",
          weighing_end_at: "2027-05-01T09:20:00.000Z",
        },
      ],
    });

    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0]).toMatchObject({ divisionId: "division-casual", divisionType: "casual", timezoneName: "Europe/Paris" });
  });
});
