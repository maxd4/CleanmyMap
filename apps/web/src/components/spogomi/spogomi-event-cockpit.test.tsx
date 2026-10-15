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
    for (const section of ["presentation", "teams", "results", "arbitration", "bilan", "settings"]) {
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
});
