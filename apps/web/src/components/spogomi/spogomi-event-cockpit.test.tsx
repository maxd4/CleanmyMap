import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./spogomi-preparation-workspace", () => ({
  SpogomiPreparationWorkspace: ({ section }: { section: string }) => <div data-workspace-section={section} />,
}));
vi.mock("./spogomi-observer-cockpit-panel", () => ({
  SpogomiObserverCockpitPanel: ({ view }: { view: string }) => <div data-observer-view={view} />,
}));
vi.mock("./spogomi-result-review-panel", () => ({
  SpogomiResultReviewPanel: ({ allowMutations }: { allowMutations?: boolean }) => <div data-arbitration={String(allowMutations)} />,
}));

import { SpogomiEventCockpit } from "./spogomi-event-cockpit";

const event = {
  id: "event-1",
  name: "SPOGOMI Paris",
  eventSlug: "paris-2026",
  mode: "casual",
  state: "draft",
  startsAt: "2026-06-01T10:00:00.000Z",
  endsAt: null,
  publicVisibility: "private",
};

describe("SpogomiEventCockpit", () => {
  it("keeps a persistent direct-link navigation and exposes all organizer sections", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="organizer" capabilities={["manage", "observe", "arbitrate", "assign_event_access"]} />);
    for (const section of ["presentation", "teams", "attendance", "results", "arbitration", "bilan", "settings"]) {
      expect(markup).toContain(`href="#${section}"`);
      expect(markup).toContain(`id="${section}"`);
    }
    expect(markup).toContain('aria-current="page"');
  });

  it("keeps referee arbitration in the read/write section and does not expose organizer-only sections", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="referee" capabilities={["observe", "arbitrate"]} />);
    expect(markup).toContain('href="#results"');
    expect(markup).toContain('href="#arbitration"');
    expect(markup).not.toContain('href="#bilan"');
    expect(markup).not.toContain('href="#settings"');
    expect(markup).toContain('id="arbitration"');
  });

  it("renders observer views without mutation affordances", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="observer" capabilities={["observe"]} />);
    expect(markup).toContain('href="#teams"');
    expect(markup).toContain('href="#results"');
    expect(markup).not.toContain('href="#arbitration"');
    expect(markup).not.toContain("Certifier");
  });

  it("limits check-in staff to the private attendance section", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="checkin" capabilities={["checkin"]} />);
    expect(markup).toContain('href="#attendance"');
    expect(markup).not.toContain('href="#teams"');
    expect(markup).not.toContain('href="#results"');
    expect(markup).not.toContain('href="#arbitration"');
    expect(markup).not.toContain('href="#bilan"');
    expect(markup).not.toContain('href="#settings"');
    expect(markup).not.toContain("Équipes");
    expect(markup).not.toContain("Arbitrage");
    expect(markup).not.toContain("Bilan");
    expect(markup).not.toContain("Paramètres");
  });

  it("describes a field capability when the event role is null", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role={null} capabilities={[]} fieldCapabilities={["weighing"]} />);
    expect(markup).toContain("Habilitation terrain : pesée");
    expect(markup).not.toContain("Observateur habilité");
    expect(markup).toContain('href="#operations"');
  });

  it("combines an observer role with verified weighing capability", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="observer" capabilities={["observe"]} fieldCapabilities={["weighing"]} />);
    expect(markup).toContain("Observateur habilité · Habilitation terrain : pesée");
    expect(markup).toContain('href="#operations"');
  });

  it("lists every verified referee capability without inventing another one", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="referee" capabilities={["observe", "arbitrate"]} fieldCapabilities={["timing", "measurement_entry"]} />);
    expect(markup).toContain("Arbitre habilité · Habilitation terrain : chronométrage, saisie des mesures");
    expect(markup).not.toContain("pesée");
  });

  it("combines an accueil role with its additional operational capability", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="checkin" capabilities={["checkin"]} fieldCapabilities={["arrival", "measurement_entry"]} />);
    expect(markup).toContain("Accueil habilité · Habilitation terrain : accueil et arrivée, saisie des mesures");
  });

  it("keeps the terrain-only badge limited to the verified capabilities", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role={null} capabilities={[]} fieldCapabilities={["timing", "certification"]} />);
    expect(markup).toContain("Habilitation terrain : chronométrage, certification");
    expect(markup).not.toContain("pesée");
    expect(markup).not.toContain("Arbitre habilité");
  });

  it("keeps the observer label unchanged without field capabilities", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="observer" capabilities={["observe"]} />);
    expect(markup).toContain("Observateur habilité");
    expect(markup).not.toContain("Habilitation terrain");
  });

  it("marks the synthetic mixed edition without changing the existing cockpit route", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={{ ...event, name: "SPOGOMI Cachan, démonstration CleanMyMap — DEMONSTRATION / NON OFFICIEL", mode: "mixed" }} role="organizer" capabilities={["manage"]} />);
    expect(markup).toContain("Démonstration fictive, données synthétiques, règlement non officiel");
    expect(markup).toContain("Casual et World Cup restent séparées");
    expect(markup).toContain('href="#teams"');
    expect(markup).toContain('href="#results"');
  });
});
