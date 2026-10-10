import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
import type { FormState } from "../model";
import { EssentialActionSection } from "./essential-action-section";

function renderEssential(form: FormState) {
  return renderToStaticMarkup(
    React.createElement(EssentialActionSection, {
      form,
      updateField: vi.fn(),
      updateFields: vi.fn(),
      hasAttemptedSubmit: false,
      validationIssueFields: [],
    }),
  );
}

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
    const markup = renderEssential(form);

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

  it("keeps the persisted global window and point-to-point arrival editable", () => {
    const form = {
      ...createInitialFormState("Alice"),
      actionTitle: "Nettoyage du quai",
      actionDate: "2026-10-12",
      meetingTime: "09:00",
      departureTime: "09:15",
      durationMinutes: "60",
      eventStartTime: "08:30",
      eventEndTime: "11:00",
      departureLocationLabel: "Quai nord",
      routeTopology: "point_to_point" as const,
      arrivalLocationLabel: "Place de la République",
    };
    const markup = renderEssential(form);

    expect(markup).toMatch(/id="before-action-event-start"[^>]*value="08:30"/);
    expect(markup).toMatch(/id="before-action-event-end"[^>]*value="11:00"/);
    expect(markup).toMatch(/id="before-arrival-location"[^>]*value="Place de la République"/);
    expect(markup).not.toContain("aucune arrivée pour une boucle");
  });
});
