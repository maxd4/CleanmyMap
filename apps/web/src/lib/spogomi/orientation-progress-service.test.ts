import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  listSpogomiEventsForUser: vi.fn(),
  loadSpogomiVolunteerSummaryForUser: vi.fn(),
  loadSpogomiOperationalCertificationProofsForUser: vi.fn(),
  loadPublishedSpogomiEventResultsBySlug: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("./personal-events-service", () => ({ listSpogomiEventsForUser: mocks.listSpogomiEventsForUser }));
vi.mock("./volunteer", () => ({ loadSpogomiVolunteerSummaryForUser: mocks.loadSpogomiVolunteerSummaryForUser }));
vi.mock("./field-operations-service", () => ({ loadSpogomiOperationalCertificationProofsForUser: mocks.loadSpogomiOperationalCertificationProofsForUser }));
vi.mock("./public-service", () => ({ loadPublishedSpogomiEventResultsBySlug: mocks.loadPublishedSpogomiEventResultsBySlug }));

import { loadSpogomiOrientationProgressForCurrentUser } from "./orientation-progress-service";

const supabase = {};

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "event-1", name: "Paris", eventSlug: "paris", state: "certified", relations: ["organizer"], publicVisibility: "published", publicResultsVisibility: "certified", ...overrides,
  };
}

describe("loadSpogomiOrientationProgressForCurrentUser", () => {
  it("uses the canonical public results projection only for public organizer events", async () => {
    mocks.getSupabaseServerClient.mockReturnValue(supabase);
    mocks.listSpogomiEventsForUser.mockResolvedValue([
      event(),
      event({ id: "event-2", name: "Lille", eventSlug: "lille", relations: ["field_operator"] }),
      event({ id: "event-3", name: "Nice", eventSlug: "nice", publicVisibility: "private" }),
    ]);
    mocks.loadSpogomiVolunteerSummaryForUser.mockResolvedValue({ chronology: [], certificates: [] });
    mocks.loadSpogomiOperationalCertificationProofsForUser.mockResolvedValue([]);
    mocks.loadPublishedSpogomiEventResultsBySlug.mockResolvedValue({
      visibility: "certified",
      sport: { status: "certified" },
      divisions: [
        { id: "casual", type: "casual", sport: { status: "certified" } },
        { id: "world", type: "world_cup", sport: { status: "certified" } },
      ],
    });

    const proofs = await loadSpogomiOrientationProgressForCurrentUser("user-1");

    expect(mocks.loadPublishedSpogomiEventResultsBySlug).toHaveBeenCalledTimes(1);
    expect(mocks.loadPublishedSpogomiEventResultsBySlug).toHaveBeenCalledWith("paris", supabase);
    expect(proofs).toContainEqual({ key: "organizer.results_publication", eventId: "event-1", eventName: "Paris", evidence: "results_published" });
    expect(proofs.some((proof) => proof.eventId === "event-2" || proof.eventId === "event-3")).toBe(false);
  });

  it("keeps certified visibility neutral when the canonical public projection has no published ranking", async () => {
    mocks.getSupabaseServerClient.mockReturnValue(supabase);
    mocks.listSpogomiEventsForUser.mockResolvedValue([event()]);
    mocks.loadSpogomiVolunteerSummaryForUser.mockResolvedValue({ chronology: [], certificates: [] });
    mocks.loadSpogomiOperationalCertificationProofsForUser.mockResolvedValue([]);
    mocks.loadPublishedSpogomiEventResultsBySlug.mockResolvedValue({ visibility: "certified", sport: { status: "unavailable" } });

    const proofs = await loadSpogomiOrientationProgressForCurrentUser("user-1");

    expect(proofs.some((proof) => proof.key === "organizer.results_publication")).toBe(false);
  });
});
