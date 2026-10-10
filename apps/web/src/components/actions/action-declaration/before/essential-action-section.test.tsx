import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
import { EssentialActionSection } from "./essential-action-section";

describe("EssentialActionSection", () => {
  it("keeps the first section focused on editable essentials", () => {
    const form = {
      ...createInitialFormState("Alice"),
      actionTitle: "Nettoyage du quai",
      shortDescription: "Ramassage local",
      plannedObjective: "nettoyage" as const,
      communeZoneLabel: "Paris 15e",
      actionDate: "2026-10-12",
      meetingTime: "09:00",
      departureTime: "09:15",
      durationMinutes: "60",
      departureLocationLabel: "Quai nord",
    };
    const markup = renderToStaticMarkup(
      React.createElement(EssentialActionSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      }),
    );

    expect(markup).toContain("Titre de l’action");
    expect(markup).toContain("Description courte");
    expect(markup).toContain("Type d’action");
    expect(markup).toContain("Commune ou secteur");
    expect(markup).toContain("Date prévue");
    expect(markup).toContain("Heure de rendez-vous");
    expect(markup).toContain("Heure de départ");
    expect(markup).toContain("Durée estimée");
    expect(markup).toContain("Point de rendez-vous");
    expect(markup).not.toContain('id="before-latitude"');
    expect(markup).not.toContain('id="before-longitude"');
    expect(markup).not.toContain('id="before-volunteers-count"');
    expect(markup).not.toContain("Difficulté");
  });
});
