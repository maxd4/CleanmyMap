import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  assertPersistenceAvailable: vi.fn(),
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  readSupabaseRecord: async (query: PromiseLike<{ data: unknown; error: { message: string } | null }>, parse: (row: Record<string, unknown>) => unknown) => {
    const result = await query;
    if (result.error) throw new Error(result.error.message);
    return result.data ? parse(result.data as Record<string, unknown>) : null;
  },
  readSupabaseRecords: async (query: PromiseLike<{ data: readonly unknown[] | null; error: { message: string } | null }>, parse: (row: Record<string, unknown>) => unknown) => {
    const result = await query;
    if (result.error) throw new Error(result.error.message);
    return (result.data ?? [])
      .map((row) => parse(row as Record<string, unknown>))
      .filter(Boolean);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

const row = {
  id: "onboarded-entry-1",
  source_request_id: "11111111-1111-4111-8111-111111111111",
  published_at: "2026-10-22T00:00:00.000Z",
  publication_status: "accepted",
  reviewed_at: "2026-10-22T00:01:00.000Z",
  reviewed_by_user_id: "admin-1",
  public_data: {
    name: "Structure publique",
    legalIdentity: "Structure publique",
    kind: "association",
    scope: "france",
    types: ["social"],
    description: "Description publique",
    location: "France",
    lat: 46.603354,
    lng: 1.888334,
    coveredArrondissements: [],
    contributionTypes: ["communication"],
    availability: "sur demande",
    verificationStatus: "verifie",
    qualificationStatus: "partenaire_actif",
    provenance: "published_partner",
    lastUpdatedAt: "2026-10-22T00:01:00.000Z",
    recentActivityAt: "2026-10-22T00:01:00.000Z",
  },
  private_admin_contact: {
    referentName: "Contact privé",
    email: "private@example.com",
    phone: "non communiqué",
  },
};

function query(result: { data: unknown; error: { message: string } | null }) {
  const chain: Record<string, unknown> & { then: PromiseLike<unknown>["then"] } = {
    select: () => chain,
    order: () => chain,
    limit: () => chain,
    eq: () => chain,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

describe("published partner annuaire Supabase store", () => {
  beforeEach(() => {
    vi.resetModules();
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => query({ data: [row], error: null })),
      rpc: vi.fn(async () => ({ data: [row], error: null })),
    });
  });

  it("reads the canonical table and reconstructs private contact only for server consumers", async () => {
    const { listPublishedPartnerAnnuaireEntries } = await import("./published-annuaire-entries-store");

    const entries = await listPublishedPartnerAnnuaireEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: row.id,
      sourceRequestId: row.source_request_id,
      publicationStatus: "accepted",
      internalAdminContact: row.private_admin_contact,
    });
  });

  it("delegates review to the atomic RPC rather than updating the table directly", async () => {
    const client = getSupabaseServerClientMock();
    const { updatePublishedPartnerAnnuaireEntryPublicationStatus } = await import(
      "./published-annuaire-entries-store",
    );

    await updatePublishedPartnerAnnuaireEntryPublicationStatus({
      entryId: row.id,
      publicationStatus: "accepted",
      reviewedByUserId: "admin-1",
      operationId: "operation-1",
      reason: "Validation administrative",
    });

    expect(client.rpc).toHaveBeenCalledWith("review_partner_publication", {
      p_entry_id: row.id,
      p_publication_status: "accepted",
      p_reviewed_by_user_id: "admin-1",
      p_operation_id: "operation-1",
      p_reason: "Validation administrative",
    });
  });
});
