import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: vi.fn().mockResolvedValue({ ok: true, userId: "organizer-1" }) }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn(() => ({})) }));
vi.mock("@/lib/spogomi/division-regulation-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/spogomi/division-regulation-service")>("@/lib/spogomi/division-regulation-service");
  return { ...actual, updateSpogomiDivisionRegulation: vi.fn() };
});

import { updateSpogomiDivisionRegulation } from "@/lib/spogomi/division-regulation-service";
import { PATCH } from "./route";

const validBody = {
  expectedRevision: 2,
  regulationVersion: "casual-test-v1",
  regulationStatus: "incomplete",
  regulationSourceReference: null,
  teamSize: { casual: { minMembers: 2, maxMembers: 4 } },
  rounding: null,
  penalties: [],
  eligibility: null,
  tiebreakers: [],
  categories: [],
  environmentMappings: [],
};

describe("SPOGOMI division regulation API", () => {
  it("rejects unknown fields before the organizer mutation", async () => {
    const request = new Request("http://localhost/api/spogomi/events/event-1/divisions/division-1/regulation", { method: "PATCH", body: JSON.stringify({ ...validBody, unexpected: true }), headers: { "content-type": "application/json" } });
    const response = await PATCH(request, { params: Promise.resolve({ eventId: "event-1", divisionId: "division-1" }) });
    expect(response.status).toBe(422);
    expect(updateSpogomiDivisionRegulation).not.toHaveBeenCalled();
  });

  it("passes the path-scoped division and authenticated organizer to the mutation", async () => {
    vi.mocked(updateSpogomiDivisionRegulation).mockResolvedValueOnce({ id: "division-1" } as never);
    const request = new Request("http://localhost/api/spogomi/events/event-1/divisions/division-1/regulation", { method: "PATCH", body: JSON.stringify(validBody), headers: { "content-type": "application/json" } });
    const response = await PATCH(request, { params: Promise.resolve({ eventId: "event-1", divisionId: "division-1" }) });
    expect(response.status).toBe(200);
    expect(updateSpogomiDivisionRegulation).toHaveBeenCalledWith(expect.objectContaining({ eventId: "event-1", divisionId: "division-1", userId: "organizer-1", input: validBody }));
  });
});
