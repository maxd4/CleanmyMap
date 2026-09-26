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

describe("ActionStepIdentity", () => {
  it("shows manual members without exposing the publication control in the complete form", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.associationName = "Action spontanée";
    form.participantAccounts = ["user-manual-1"];

    const html = renderToStaticMarkup(
      React.createElement(ActionStepIdentity, {
        form,
        updateField: () => undefined,
        updateFields: () => undefined,
        userMetadata: {
          userId: "preview-local",
          username: "preview-local",
          displayName: "Aperçu local",
        },
        recordType: "action",
        hasAttemptedSubmit: false,
      } as ComponentProps<typeof ActionStepIdentity>),
    );

    expect(html).toContain("Membres de l");
    expect(html).toContain("Type de structure");
    expect(html).toContain("Association étudiante");
    expect(html).toContain("user-manual-1");
    expect(html).not.toContain("Ouvrir le formulaire de groupe");
    expect(html).not.toContain("Publier en tant que formulaire de groupe");
  });

  it("keeps clean-place out of the action entry form", () => {
    const form = createInitialFormState("Aperçu local", "action");
    const html = renderToStaticMarkup(
      React.createElement(ActionStepIdentity, {
        form,
        updateField: () => undefined,
        updateFields: () => undefined,
        userMetadata: { userId: "preview-local" },
        recordType: "action",
        hasAttemptedSubmit: false,
      } as ComponentProps<typeof ActionStepIdentity>),
    );

    expect(html).not.toContain("Type d&#x27;action");
    expect(html).not.toContain("Action terrain");
    expect(html).not.toContain("Lieu propre");
  });

  it("explains the unified action time and event window", () => {
    const form = createInitialFormState("Aperçu local", "action");
    const html = readableMarkup(renderToStaticMarkup(
      React.createElement(ActionStepIdentity, {
        form,
        updateField: () => undefined,
        updateFields: () => undefined,
        userMetadata: { userId: "preview-local" },
        recordType: "action",
        hasAttemptedSubmit: false,
      } as ComponentProps<typeof ActionStepIdentity>),
    ));

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

      const html = readableMarkup(renderToStaticMarkup(
        React.createElement(ActionStepIdentity, {
          form,
          updateField: () => undefined,
          updateFields: () => undefined,
          userMetadata: { userId: "preview-local" },
          recordType: "action",
          hasAttemptedSubmit: false,
        } as ComponentProps<typeof ActionStepIdentity>),
      ));

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
    const nationalHtml = readableMarkup(renderToStaticMarkup(
      React.createElement(ActionStepIdentity, {
        form: nationalForm,
        updateField: () => undefined,
        updateFields: () => undefined,
        userMetadata: { userId: "preview-local" },
        recordType: "action",
        hasAttemptedSubmit: false,
      } as ComponentProps<typeof ActionStepIdentity>),
    ));

    expect(nationalHtml).toContain(nationalEntry!.name);

    const legacyForm = createInitialFormState("Aperçu local", "action");
    legacyForm.organizerType = "association";
    legacyForm.associationName = "Paris Clean Walk";
    legacyForm.organizerName = "Paris Clean Walk";
    const legacyHtml = readableMarkup(renderToStaticMarkup(
      React.createElement(ActionStepIdentity, {
        form: legacyForm,
        updateField: () => undefined,
        updateFields: () => undefined,
        userMetadata: { userId: "preview-local" },
        recordType: "action",
        hasAttemptedSubmit: false,
      } as ComponentProps<typeof ActionStepIdentity>),
    ));

    expect(legacyHtml).toContain('value="Paris Clean Walk"');
  });

  it("uses the same combobox for companies and free names", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.organizerType = "company";
    form.associationName = "Entreprise";
    form.organizerName = "Entreprise - ACME";

    const html = readableMarkup(renderToStaticMarkup(
      React.createElement(ActionStepIdentity, {
        form,
        updateField: () => undefined,
        updateFields: () => undefined,
        userMetadata: { userId: "preview-local" },
        recordType: "action",
        hasAttemptedSubmit: false,
      } as ComponentProps<typeof ActionStepIdentity>),
    ));

    expect(html).toContain('role="combobox"');
    expect(html).toContain('value="Entreprise - ACME"');
    expect(html).not.toContain("World Cleanup Day France");
  });
});
