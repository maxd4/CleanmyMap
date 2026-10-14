import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({
        data: [{ id: "event-1", title: "Nettoyage des berges", event_date: "2026-10-01" }],
        error: null,
      }).then(resolve, reject),
  };

  return {
    query,
    supabase: { from: vi.fn(() => query) },
    requireAdminAccess: vi.fn(),
    summaries: vi.fn(),
    toEventItem: vi.fn(),
    fetchActions: vi.fn(),
    toActionItem: vi.fn(),
    conversions: vi.fn(),
    filename: vi.fn(),
  };
});

vi.mock("@/lib/authz", () => ({ requireAdminAccess: mocks.requireAdminAccess }));
vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: (access: unknown) => new Response(JSON.stringify(access), { status: 403 }),
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn(() => mocks.supabase) }));
vi.mock("@/lib/community/event-rsvp-summaries", () => ({ loadCommunityEventRsvpSummaries: mocks.summaries }));
vi.mock("@/lib/community/event-item", () => ({ toCommunityEventItem: mocks.toEventItem }));
vi.mock("@/lib/actions/unified-source", () => ({ fetchUnifiedActionContracts: mocks.fetchActions }));
vi.mock("@/lib/actions/data-contract", () => ({ toActionListItem: mocks.toActionItem }));
vi.mock("@/lib/community/engagement", () => ({ computeEventConversions: mocks.conversions }));
vi.mock("@/lib/reports/deliverable-name", () => ({ buildDeliverableFilename: mocks.filename }));

import { GET } from "./route";

describe("/api/community/funnel.csv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.summaries.mockResolvedValue([{ eventId: "event-1", eventTitle: "Nettoyage des berges" }]);
    mocks.toEventItem.mockReturnValue({ id: "event-1", title: "Nettoyage des berges" });
    mocks.fetchActions.mockResolvedValue({ items: [], isTruncated: false });
    mocks.toActionItem.mockImplementation((value: unknown) => value);
    mocks.conversions.mockReturnValue({
      rows: [{
        eventId: "event-1",
        title: "Nettoyage des berges",
        eventDate: "2026-10-01",
        locationLabel: "Paris",
        capacityTarget: 20,
        rsvpYes: 5,
        rsvpMaybe: 1,
        rsvpNo: 0,
        attendanceCount: 4,
        cleanupObjective: "Berges",
        cleanupZone: "Quai",
        cleanupLogisticsNeeds: "Gants",
        cleanupSupportLevel: "standard",
        cleanupWasteTypesExpected: ["plastic"],
        linkedActions: 1,
        fillRate: 25,
        rsvpToAttendanceRate: 80,
        attendanceToActionRate: 25,
        rsvpToActionRate: 20,
      }],
    });
    mocks.filename.mockReturnValue("analytics-funnel-community.csv");
  });

  it("returns the bounded CSV projection for an administrator", async () => {
    const response = await GET(new Request("https://cleanmymap.test/api/community/funnel.csv?days=30&limit=1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("analytics-funnel-community.csv");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Export-Warning")).toBe("Event dataset truncated to limit");
    await expect(response.text()).resolves.toContain("event_id");
    expect(mocks.summaries).toHaveBeenCalledWith(expect.anything(), { eventIds: ["event-1"], userId: null });
    expect(mocks.fetchActions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ limit: 2500 }));
  });

  it("rejects non-admin access before reading the event data", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });

    expect((await GET(new Request("https://cleanmymap.test/api/community/funnel.csv"))).status).toBe(403);
    expect(mocks.supabase.from).not.toHaveBeenCalled();
  });
});
