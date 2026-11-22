import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import { ActionBeforeVerificationSection } from "./action-before-verification-section";

describe("ActionBeforeVerificationSection", () => {
  it("groups review items and keeps private logistics out of the volunteer projection", () => {
    const form = createInitialFormState("Organisateur");
    form.actionTitle = "Cleanwalk du samedi";
    form.departureLocationLabel = "Place de rendez-vous";
    form.actionDate = "2026-10-17";
    form.participantMessage = "Prévoyez une tenue adaptée.";
    form.safetyInstructions = "Restez en binôme.";
    form.logisticsNotes = "NOTE INTERNE NE PAS PUBLIER";

    const markup = renderToStaticMarkup(
      React.createElement(ActionBeforeVerificationSection, {
        form,
        validationIssues: ["Le créneau doit être confirmé."],
        validationIssueFields: ["eventStartTime"],
        onEditDefinition: () => undefined,
        errorMessage: "Le créneau doit être confirmé.",
        guidedReadiness: "unknown",
        updateField: () => undefined,
      }),
    );

    expect(markup).toContain('data-testid="action-publication-review-groups"');
    expect(markup).toContain("À traiter avant de continuer");
    expect(markup).toContain("À vérifier");
    expect(markup).toContain("Suggestion ·");
    const preview = markup.match(/data-testid="action-volunteer-preview"[\s\S]*?<\/div>\s*<div class="flex flex-wrap items-center/)?.[0] ?? "";
    expect(preview).not.toContain("NOTE INTERNE NE PAS PUBLIER");
    expect(markup).toContain("Informations pratiques publiques");
    expect(markup).toContain("Début");
    expect(markup).toContain("Formalités locales");
    expect(markup).toContain("Comment interpréter la qualification");
    expect(markup.match(/Le créneau doit être confirmé\./g)).toHaveLength(1);
    expect(markup).not.toContain(">Complet<");
  });
});
