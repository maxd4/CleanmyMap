import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import {
  ORGANIZER_DIRECTORY,
} from "@/lib/actions/association-options";
import { getStaticOrganizerSuggestions } from "@/lib/actions/organizer-directory-registry";
import { ORGANIZER_TYPE_VALUES } from "@/lib/actions/organizer-type";
import { createInitialFormState } from "../payload";
import { ActionStepIdentity } from "./ActionStepIdentity";

function readableMarkup(html: string): string {
  return html.replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
}

function renderIdentity(
  form: ComponentProps<typeof ActionStepIdentity>["form"],
  userMetadata: ComponentProps<typeof ActionStepIdentity>["userMetadata"] = {
    userId: "preview-local",
  },
  mode: ComponentProps<typeof ActionStepIdentity>["mode"] = "all",
): string {
  return readableMarkup(renderToStaticMarkup(
    React.createElement(ActionStepIdentity, {
      form,
      updateField: () => undefined,
      updateFields: () => undefined,
      userMetadata,
      recordType: "action",
      hasAttemptedSubmit: false,
      mode,
    } as ComponentProps<typeof ActionStepIdentity>),
  ));
}

describe("ActionStepIdentity", () => {
  it("shows manual members without exposing the publication control in the complete form", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.associationName = "Action spontanée";
    form.participantAccounts = ["user-manual-1"];

    const html = renderIdentity(form, {
      userId: "preview-local",
      username: "preview-local",
      displayName: "Aperçu local",
    });

    expect(html).toContain("Membres de l");
    expect(html).toContain("Type de structure");
    expect(html).toContain("Association étudiante");
    expect(html).toContain("user-manual-1");
    expect(html).not.toContain("Ouvrir le formulaire de groupe");
    expect(html).not.toContain("Publier en tant que formulaire de groupe");
  });

  it("keeps clean-place out of the action entry form", () => {
    const form = createInitialFormState("Aperçu local", "action");
    const html = renderIdentity(form);

    expect(html).not.toContain("Type d&#x27;action");
    expect(html).not.toContain("Action terrain");
    expect(html).not.toContain("Lieu propre");
  });

  it("does not visually select a collection place before an explicit choice", () => {
    const form = createInitialFormState("Aperçu local", "action");
    const blankHtml = renderIdentity(form);

    expect(blankHtml).toContain('aria-pressed="false"');
    expect(blankHtml).not.toContain('aria-pressed="true"');

    form.placeType = "Bois/Parc/Jardin/Square/Sentier";
    const selectedHtml = renderIdentity(form);
    expect(selectedHtml).toContain('aria-pressed="true"');
  });

  it("explains the unified action time and event window", () => {
    const form = createInitialFormState("Aperçu local", "action");
    const html = renderIdentity(form);

    expect(html).toContain("Participants & temps d’action");
    expect(html).toContain("marche, le ramassage, le tri et la pesée");
    expect(html).toContain("Début de l’événement");
    expect(html).toContain("Fin de l’événement");
  });

  it("renders one accessible organizer combobox per organizer type", () => {
    for (const organizerType of ORGANIZER_TYPE_VALUES) {
      const form = createInitialFormState("Aperçu local", "action");
      form.organizerType = organizerType;
      form.associationName = organizerType === "spontaneous" ? "Action spontanée" : "";
      form.organizerName = organizerType === "spontaneous" ? "Aperçu local" : "";

       const html = renderIdentity(form);

      expect(html).toContain('role="combobox"');
      if (organizerType === "spontaneous") {
        expect(html).toContain("Nom ou pseudo du référent");
      } else {
        expect(getStaticOrganizerSuggestions(organizerType).every((entry) => entry.organizerType === organizerType)).toBe(true);
        expect(html).not.toContain("World Cleanup Day France");
      }
    }
  });

  it("shows national structures without a false Paris location and keeps a legacy value readable", () => {
    const nationalEntry = ORGANIZER_DIRECTORY.find(
      (entry) => entry.organizerType === "association" && entry.geographicScope === "national",
    );
    expect(nationalEntry).toBeDefined();

    const nationalForm = createInitialFormState("Aperçu local", "action");
    nationalForm.organizerType = "association";
    nationalForm.associationName = nationalEntry!.value;
    nationalForm.organizerName = nationalEntry!.name;
    const nationalHtml = renderIdentity(nationalForm);

    expect(nationalHtml).toContain(nationalEntry!.name);

    const legacyForm = createInitialFormState("Aperçu local", "action");
    legacyForm.organizerType = "association";
    legacyForm.associationName = "Paris Clean Walk";
    legacyForm.organizerName = "Paris Clean Walk";
    const legacyHtml = renderIdentity(legacyForm);

    expect(legacyHtml).toContain('value="Paris Clean Walk"');
  });

  it("uses the same combobox for companies and free names", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.organizerType = "company";
    form.associationName = "Entreprise";
    form.organizerName = "Entreprise - ACME";

    const html = renderIdentity(form);

    expect(html).toContain('role="combobox"');
    expect(html).toContain('value="Entreprise - ACME"');
    expect(html).not.toContain("World Cleanup Day France");
  });

  it("does not expose a Solo/Duo/Trio selector for spontaneous actions", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.organizerType = "spontaneous";
    form.associationName = "Action spontanée";
    form.organizerName = "Aperçu local";
    form.volunteersCount = "3";

    const html = renderIdentity(form);

    expect(html).toContain('role="combobox"');
    expect(html).not.toContain("Solo");
    expect(html).not.toContain("Duo");
    expect(html).not.toContain("Trio");
    expect(html).not.toContain("Quintet");
  });

  it("keeps each compact mode limited to its responsibility", () => {
    const form = createInitialFormState("Aperçu local", "action");

    const actionHtml = renderIdentity(form, undefined, "action");
    expect(actionHtml).toContain("Date de l’action");
    expect(actionHtml).toContain("Type de structure");
    expect(actionHtml).not.toContain("Enfants");

    const participantsHtml = renderIdentity(form, undefined, "participants");
    expect(participantsHtml).toContain("Enfants");
    expect(participantsHtml).toContain("Total calculé");
    expect(participantsHtml).not.toContain("Date de l’action");

    const durationHtml = renderIdentity(form, undefined, "duration");
    expect(durationHtml).toContain("Durée d’action (min)");
    expect(durationHtml).not.toContain("Rendez-vous · début");

    const timeHtml = renderIdentity(form, undefined, "time");
    expect(timeHtml).toContain("Rendez-vous · début");
    expect(timeHtml).not.toContain("Durée d’action (min)");
  });

  it("composes organizer, participants and collection modes without cross-rendering", () => {
    const form = createInitialFormState("Aperçu local", "action");

    const organizationHtml = renderIdentity(form, undefined, "organization");
    expect(organizationHtml).toContain("Organisateurs associés");
    expect(organizationHtml).toContain("Ajoutez les participants connus");
    expect(organizationHtml).not.toContain("Environnement de collecte");

    const collectionHtml = renderIdentity(form, undefined, "collection");
    expect(collectionHtml).toContain("Environnement de collecte");
    expect(collectionHtml).not.toContain("Organisateurs associés");
    expect(collectionHtml).not.toContain("Ajoutez les participants connus");

    const detailsHtml = renderIdentity(form, undefined, "details");
    expect(detailsHtml).toContain("Organisateurs associés");
    expect(detailsHtml).toContain("Environnement de collecte");
  });
});
