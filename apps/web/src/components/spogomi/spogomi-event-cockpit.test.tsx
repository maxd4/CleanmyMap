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

function navigationSections(markup: string): string[] {
  return [...markup.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
}

describe("SpogomiEventCockpit", () => {
  it("keeps a persistent direct-link navigation and exposes all organizer sections", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="organizer" capabilities={["manage", "observe", "arbitrate", "assign_event_access"]} />);
    for (const section of ["presentation", "teams", "attendance", "results", "arbitration", "bilan", "settings", "help_proposals"]) {
      expect(markup).toContain(`href="#${section}"`);
      expect(markup).toContain(`id="${section}"`);
    }
    expect(markup).toContain('aria-current="page"');
  });

  it("keeps help proposals organizer-only and separate from sports admissions", () => {
    const organizer = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="organizer" capabilities={["manage"]} />);
    const referee = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="referee" capabilities={["observe", "arbitrate"]} reviewerRoles={["referee"]} />);
    expect(organizer).toContain('href="#help_proposals"');
    expect(organizer).toContain("Propositions d’aide");
    expect(referee).not.toContain('href="#help_proposals"');
  });

  it("keeps referee arbitration in the read/write section and does not expose organizer-only sections", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="referee" capabilities={["observe", "arbitrate"]} />);
    expect(markup).toContain('href="#results"');
    expect(markup).toContain('href="#arbitration"');
    expect(markup).not.toContain('href="#bilan"');
    expect(markup).not.toContain('href="#settings"');
    expect(markup).toContain('id="arbitration"');
  });

  it("cumulates check-in and referee sections from independently verified roles", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="referee" capabilities={["observe", "arbitrate", "checkin"]} reviewerRoles={["checkin", "referee"]} />);
    expect(markup).toContain('href="#attendance"');
    expect(markup).toContain('href="#results"');
    expect(markup).toContain('href="#arbitration"');
    expect(markup).toContain('id="attendance"');
    expect(markup).toContain('id="results"');
    expect(markup).toContain('id="arbitration"');
    expect(markup).not.toContain('href="#bilan"');
    expect(markup).not.toContain('href="#settings"');
  });

  it("cumulates check-in and observer sections without exposing arbitration", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="checkin" capabilities={["observe", "checkin"]} reviewerRoles={["checkin", "observer"]} />);
    expect(markup).toContain('href="#attendance"');
    expect(markup).toContain('href="#teams"');
    expect(markup).toContain('href="#results"');
    expect(markup).not.toContain('href="#arbitration"');
    expect(markup).not.toContain('href="#bilan"');
    expect(markup).not.toContain('href="#settings"');
  });

  it("cumulates referee and observer sections without duplicating shared results", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="referee" capabilities={["observe", "arbitrate"]} reviewerRoles={["referee", "observer"]} />);
    expect(navigationSections(markup)).toEqual(["presentation", "results", "arbitration", "teams"]);
    expect(markup.match(/href="#results"/g)).toHaveLength(1);
    expect(markup.match(/id="results"/g)).toHaveLength(1);
    expect(markup).not.toContain('href="#attendance"');
    expect(markup).not.toContain('href="#bilan"');
    expect(markup).not.toContain('href="#settings"');
  });

  it("cumulates check-in, referee and observer sections with one navigation entry per section", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role="referee" capabilities={["observe", "arbitrate", "checkin"]} reviewerRoles={["checkin", "referee", "observer"]} />);
    expect(navigationSections(markup)).toEqual(["presentation", "attendance", "results", "arbitration", "teams"]);
    for (const section of ["presentation", "attendance", "results", "arbitration", "teams"]) {
      expect(markup.match(new RegExp(`href="#${section}"`, "g"))).toHaveLength(1);
      expect(markup.match(new RegExp(`id="${section}"`, "g"))).toHaveLength(1);
    }
    expect(markup).not.toContain('href="#bilan"');
    expect(markup).not.toContain('href="#settings"');
  });

  it("does not infer an observer role from the observe capability alone", () => {
    const markup = renderToStaticMarkup(<SpogomiEventCockpit event={event} role={null} capabilities={["observe"]} />);
    expect(navigationSections(markup)).toEqual(["presentation"]);
    expect(markup).not.toContain('href="#teams"');
    expect(markup).not.toContain('href="#results"');
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
