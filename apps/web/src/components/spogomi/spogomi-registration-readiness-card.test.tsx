import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpogomiRegistrationReadinessCard } from "./spogomi-registration-readiness-card";

const readiness = {
  eventId: "event-1",
  ready: false,
  policy: { minorsApplicable: false },
  editionItems: [{ id: "safety", label: "Consignes de sécurité", status: "not_verified" as const, required: true, href: "#spogomi-registration-readiness" }],
  divisions: [{ divisionId: "casual", divisionType: "casual" as const, ready: false, items: [{ id: "schedule", label: "Horaires officiels", status: "incomplete" as const, required: true, href: "#operations" }] }],
};

describe("SpogomiRegistrationReadinessCard", () => {
  it("shows actionable statuses and keeps opening disabled for an incomplete checklist", () => {
    const markup = renderToStaticMarkup(<SpogomiRegistrationReadinessCard eventId="event-1" state="draft" publicVisibility="published" readiness={readiness} busy={false} action={vi.fn()} />);
    expect(markup).toContain("Préparation à l’ouverture des inscriptions");
    expect(markup).toContain("Non vérifié");
    expect(markup).toContain("Horaires officiels");
    expect(markup).toContain('href="#operations"');
    expect(markup).toMatch(/disabled/);
  });
});
