import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SpogomiCollection } from "@/lib/spogomi/collection";

vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("lucide-react", () => ({ ArrowRight: () => null, Medal: () => null, Award: () => null }));
vi.mock("@/components/spogomi/spogomi-volunteer-share-button", () => ({ SpogomiVolunteerShareButton: ({ eventName }: { eventName: string }) => React.createElement("span", { "data-share": eventName }) }));

import { ProfileSpogomiSummary } from "./profile-spogomi-summary";

const collection = {
  awards: [{ id: "award-1", eventId: "event-1", badgeTypeId: "spogomi_collector", eventYear: 2026, eventLocalDate: "2026-06-01", awardedAt: "2026-06-02T00:00:00Z", rankingVersion: null, status: "active", eventName: "Paris", eventSlug: "paris-2026", eventState: "certified", eventPublic: true }],
  spogomiAwardCount: 1, spogomiDistinctBadgeTypes: 1, spogomiEventsParticipated: 1,
  collectorProgress: { currentValue: 1, lastThreshold: 1, nextThreshold: 3, progressPercent: 50 },
  refereeProgress: { currentValue: 0, lastThreshold: null, nextThreshold: 1, progressPercent: 0 },
} as unknown as SpogomiCollection;

describe("SPOGOMI profile summary", () => {
  it("keeps empty and certified collection states separate", () => {
    expect(renderToStaticMarkup(<ProfileSpogomiSummary collection={null} volunteerSummary={null} />)).toContain("Aucune encore");
    const markup = renderToStaticMarkup(<ProfileSpogomiSummary collection={collection} volunteerSummary={{
      confirmedEventCount: 1, certifiedMissionCount: 2, certifiedRefereeOrganizerMissionCount: 1,
      chronology: [{ eventId: "event-1", eventName: "Paris", eventSlug: "paris-2026", eventPublic: true, eventDate: "2026-06-01", locationLabel: "Paris", missions: [{ id: "mission-1", kind: "referee", status: "certified" }, { id: "mission-2", kind: "collector", status: "revoked" }] }],
      certificates: [{ certificateReference: "cert-1", eventId: "event-1", status: "active", issuedAt: "2026-06-02" }, { certificateReference: "cert-2", eventId: "event-1", status: "revoked", issuedAt: "2026-06-02" }],
    }} />);
    expect(markup).toContain("Ramasseur SPOGOMI");
    expect(markup).toContain("Chronologie des missions");
    expect(markup).toContain("Arbitrage");
    expect(markup).toContain("cert-1");
    expect(markup).toContain("Révoquée");
    expect(markup).toContain("data-share=\"Paris\"");
  });
});
