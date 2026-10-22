import { beforeEach, describe, expect, it, vi } from "vitest";

const listPublishedPartnerAnnuaireEntriesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/partners/published-annuaire-entries-store", () => ({
  listPublishedPartnerAnnuaireEntries: listPublishedPartnerAnnuaireEntriesMock,
}));

describe("GET /api/partners/published-directory", () => {
  beforeEach(() => {
    listPublishedPartnerAnnuaireEntriesMock.mockReset();
  });

  it("returns accepted public fields without private partner metadata", async () => {
    listPublishedPartnerAnnuaireEntriesMock.mockResolvedValue([
      {
        id: "partner-1",
        sourceRequestId: "request-1",
        publishedAt: "2026-10-19T10:00:00.000Z",
        publicationStatus: "accepted",
        source: "partner_onboarding",
        reviewedAt: "2026-10-19T11:00:00.000Z",
        reviewedByUserId: "admin-1",
        name: "Structure publique",
        legalIdentity: "Structure publique SAS",
        kind: "entreprise",
        types: ["environnemental"],
        description: "Description publique",
        location: "France",
        lat: 48.8566,
        lng: 2.3522,
        coveredArrondissements: [],
        contributionTypes: ["communication"],
        availability: "sur demande",
        verificationStatus: "verifie",
        qualificationStatus: "partenaire_actif",
        provenance: "published_partner",
        lastUpdatedAt: "2026-10-19T11:00:00.000Z",
        recentActivityAt: "2026-10-19T11:00:00.000Z",
        internalAdminContact: {
          referentName: "Référent privé",
          email: "private-contact",
          phone: "+33 6 00 00 00 00",
        },
      },
      {
        id: "partner-pending",
        sourceRequestId: "request-2",
        publishedAt: "2026-10-19T10:00:00.000Z",
        publicationStatus: "pending_admin_review",
        source: "partner_onboarding",
        name: "Ne doit pas sortir",
        legalIdentity: "Brouillon",
        kind: "association",
        types: ["social"],
        description: "Privé",
        location: "France",
        lat: 48.8566,
        lng: 2.3522,
        coveredArrondissements: [],
        contributionTypes: ["accueil"],
        availability: "sur demande",
        verificationStatus: "en_cours",
        qualificationStatus: "contact_non_qualifie",
        provenance: "published_partner",
        lastUpdatedAt: "2026-10-19T11:00:00.000Z",
        recentActivityAt: "2026-10-19T11:00:00.000Z",
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();
    const payload = (await response.json()) as {
      count: number;
      items: Array<Record<string, unknown>>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    );
    expect(payload.count).toBe(1);
    expect(payload.items[0]).toMatchObject({ id: "partner-1", name: "Structure publique" });
    expect(payload.items[0]).not.toHaveProperty("internalAdminContact");
    expect(payload.items[0]).not.toHaveProperty("sourceRequestId");
    expect(payload.items[0]).not.toHaveProperty("reviewedByUserId");
  });

  it("returns a real service error instead of a false empty directory", async () => {
    listPublishedPartnerAnnuaireEntriesMock.mockRejectedValue(new Error("Supabase unavailable"));

    const { GET } = await import("./route");
    const response = await GET();
    const payload = (await response.json()) as { status: string; code: string; items?: unknown[] };

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ status: "error", code: "published_directory_unavailable" });
    expect(payload).not.toHaveProperty("items");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("requests accepted rows from the canonical store before its limit", async () => {
    listPublishedPartnerAnnuaireEntriesMock.mockResolvedValue([]);

    const { GET } = await import("./route");
    await GET();

    expect(listPublishedPartnerAnnuaireEntriesMock).toHaveBeenCalledWith({
      publicationStatus: "accepted",
    });
  });
});
