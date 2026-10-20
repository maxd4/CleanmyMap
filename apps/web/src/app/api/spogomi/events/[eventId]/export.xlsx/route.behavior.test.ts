import { describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  getSupabase: vi.fn(),
  loadAuthorized: vi.fn(),
  loadProjection: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabase }));
vi.mock("@/lib/spogomi/route-auth", () => ({ loadAuthorizedSpogomiEvent: mocks.loadAuthorized }));
vi.mock("@/lib/spogomi/results-projection-service", () => ({ loadSpogomiResultsProjection: mocks.loadProjection }));

import { GET } from "./route";

const context = { params: Promise.resolve({ eventId: "event-1" }) };

describe("GET /api/spogomi/events/[eventId]/export.xlsx", () => {
  it("builds the four canonical sheets from certified data only and keeps identities private", async () => {
    const supabase = {};
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "organizer-1" });
    mocks.getSupabase.mockReturnValue(supabase);
    mocks.loadAuthorized.mockResolvedValue({
      supabase,
      authorized: { event: { id: "event-1" } },
    });
    mocks.loadProjection.mockResolvedValue({
      event: { name: "SPOGOMI Paris", mode: "mixed", startsAt: "2026-06-01T23:30:00Z", endsAt: null, officialTimezone: "Europe/Paris", state: "certified", privateClerkId: "private-clerk-sentinel", privateEmail: "private-email-sentinel", privatePhone: "+33100000000" },
      regulation: { version: "rules-v1", status: "complete", sourceReference: "rules:1" },
      teams: [
        { divisionId: "casual", teamNumber: 1, publicName: "Alpha", closureStatus: "present_measured", sportEligible: true, environmentalEligibility: "eligible", registeredParticipants: 3, presentParticipants: 2, submissionStatus: "certified", submissionVersion: 2, sportRank: 1, sportStatus: "certified", sportScore: 90, buttsRank: 2, buttsStatus: "certified", buttsCount: 4, buttsPerParticipant: 2, privateRosterReference: "roster-private-sentinel", categories: [{ code: "plastic", label: "Plastique", measurementKind: "mass", unit: "g", quantity: null, massGrams: 1200, objectCount: null, environmentalCategorySlug: "plastic", provenance: "scale:1", measurementMethod: "balance" }] },
        { divisionId: "world_cup", teamNumber: 2, publicName: "Draft team", closureStatus: "result_missing", sportEligible: false, environmentalEligibility: "unknown", registeredParticipants: 3, presentParticipants: 0, submissionStatus: "draft", submissionVersion: 1, sportRank: null, sportStatus: "unavailable", sportScore: null, buttsRank: null, buttsStatus: "unavailable", buttsCount: null, buttsPerParticipant: null, privateRosterReference: "draft-roster-private-sentinel", categories: [{ code: "private-draft", label: "Brouillon", measurementKind: "mass", unit: "g", quantity: null, massGrams: 9999, objectCount: null, environmentalCategorySlug: null, provenance: "private-draft-measurement-sentinel", measurementMethod: "draft" }] },
      ],
      results: {
        visibility: "certified",
        sport: { status: "available" },
        butts: { status: "available" },
        environmental: { projectionVersion: "v1", sourceHash: "hash-1", participantsPresent: 2, totalWasteMassGrams: 1200, cigaretteButtsCount: 4, cigaretteButtsMassGrams: 100 },
        privateIdentity: "private-identity-sentinel",
        uncertifiedScore: "uncertified-score-sentinel",
      },
      sourceSubmissionIds: ["submission-1"],
      privateRosterReference: "roster-reference-sentinel",
    });

    const response = await GET(new Request("http://localhost"), context);
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const workbook = strFromU8(files["xl/workbook.xml"]);
    const categorySheet = strFromU8(files["xl/worksheets/sheet3.xml"]);
    const sheetXml = Object.keys(files)
      .filter((name) => name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml"))
      .map((name) => strFromU8(files[name]))
      .join("\n");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(Object.keys(files).filter((name) => name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml"))).toHaveLength(4);
    expect(workbook).toContain("Synthèse");
    expect(workbook).toContain("Équipes");
    expect(workbook).toContain("Catégories");
    expect(workbook).toContain("Traçabilité");
    expect(categorySheet).toContain("plastic");
    expect(categorySheet).not.toContain("private-draft");
    expect(categorySheet).not.toContain("9999");
    expect(sheetXml).not.toContain("private-clerk-sentinel");
    expect(sheetXml).not.toContain("private-email-sentinel");
    expect(sheetXml).not.toContain("+33100000000");
    expect(sheetXml).not.toContain("roster-private-sentinel");
    expect(sheetXml).not.toContain("draft-roster-private-sentinel");
    expect(sheetXml).not.toContain("private-draft-measurement-sentinel");
    expect(sheetXml).not.toContain("uncertified-score-sentinel");
    expect(sheetXml).not.toContain("private-identity-sentinel");
    expect(workbook).not.toContain("clerk_id");
    expect(workbook).not.toContain("email");
  });
});
