import { describe, expect, it } from "vitest";
import type { ActionFormality } from "./qualification";
import { buildReviewableFormalityEmailDraft } from "./email-draft";

const formality: ActionFormality = {
  id: "paris-participatory-cleaning-contact-cleanliness-service",
  requirementStatus: "recommended",
  procedureKind: "information_only",
  competentAuthority: { kind: "paris_city", label: "Division de propreté 7e/8e" },
  recipient: "Division de propreté 7e/8e",
  source: null,
  supportingSources: [],
  scope: "Coordination du nettoyage participatif.",
  justification: "Contact pratique recommandé.",
  deadline: null,
  officialChannel: { kind: "official_page", label: "Formulaire Paris.fr", url: "https://www.paris.fr/" },
  requestedInformation: [],
  requestedDocuments: [],
};

describe("reviewable formalities email draft", () => {
  it("does not create an email action without a verified recipient", () => {
    expect(buildReviewableFormalityEmailDraft({ formality, action: {} })).toBeNull();
  });

  it("uses available canonical action values and requests material loan and waste collection", () => {
    const draft = buildReviewableFormalityEmailDraft({
      formality,
      verifiedRecipientEmail: "DPE-STPP-7/8e-Exploitation7e@paris.fr",
      purpose: "participatory_cleaning",
      action: {
        title: "Nettoyage des quais",
        organizerName: "Association Test",
        date: "2026-12-02",
        location: "Quai de Valmy",
        participantCount: 12,
      },
    });

    expect(draft).toMatchObject({ sent: false, requiresReview: true, to: "DPE-STPP-7/8e-Exploitation7e@paris.fr" });
    expect(draft?.subject).toContain("Nettoyage des quais");
    expect(draft?.body).toContain("Titre : Nettoyage des quais");
    expect(draft?.body).toContain("Organisateur : Association Test");
    expect(draft?.body).toContain("Participants prévus : 12");
    expect(draft?.body).toContain("gants et des sacs");
    expect(draft?.body).toContain("prise en charge des déchets");
    expect(draft?.body).toContain("Point de reprise souhaité : [à préciser");
    expect(draft?.body).toContain("Horaire de reprise souhaité : [à préciser");
    expect(draft?.body).toContain("flux acceptés");
    expect(draft?.body).not.toContain("Début :");
  });

  it("builds an invitation without claiming collaboration or sending", () => {
    const draft = buildReviewableFormalityEmailDraft({ formality, action: {title:"Action",location:"Paris"}, purpose:"collaboration", contactScope:"17e", verifiedRecipientEmail:"association@example.test" });
    expect(draft).toMatchObject({sent:false,requiresReview:true,to:"association@example.test"});
    expect(draft?.subject).toContain("Proposition de collaboration");
    expect(draft?.body).toContain("coorganisation");
    expect(draft?.body).toContain("17e");
    expect(draft?.body).not.toContain("Point de reprise souhaité");
    expect(draft?.body).not.toContain("Date :");
  });

  it("keeps the generic official-email draft behavior for other procedures", () => {
    const draft = buildReviewableFormalityEmailDraft({
      formality: {
        ...formality,
        officialChannel: { kind: "official_email", label: "Service", url: null, emailAddress: "service@example.com" },
      },
      action: { title: "Action" },
    });
    expect(draft?.body).toContain("procédure et les pièces complémentaires");
    expect(draft?.body).not.toContain("gants et des sacs");
  });
});
