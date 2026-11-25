import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: supabaseMocks.getSupabaseServerClient,
}));

import {
  addPrivateInstitutionalFact,
  computeInstitutionalFactIdempotencyKey,
  INSTITUTIONAL_READ_PAGE_SIZE,
  InstitutionalValidationError,
  listPrivateInstitutionalContacts,
  MAX_INSTITUTIONAL_CONTACTS_READ,
  MAX_INSTITUTIONAL_FACTS_READ,
  reviewPrivateInstitutionalFact,
} from "./relationship-store";

describe("relationship-store hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects incomplete completed_contribution rows instead of inferring participation or external_event", async () => {
    const contactsChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [
          {
            id: "person-wanda-schneider",
            institutional_node_id: null,
            display_name: "Wanda Schneider",
            role_label: null,
            is_publicly_publishable: false,
            revalidation_status: "a_revalider",
            notes: null,
            created_at: "2026-11-25T10:00:00Z",
            updated_at: "2026-11-25T10:00:00Z",
          },
        ],
        error: null,
      }),
    };
    const factsChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [
          {
            id: "fact-1",
            contact_id: "person-wanda-schneider",
            kind: "completed_contribution",
            origin: "direct",
            review_status: "verified",
            evidence_ref: "pv-2026",
            summary: "Contribution",
            occurred_at: null,
            support_target: null,
            contribution_role: null,
            activity_kind: null,
            activity_ref: null,
            created_by: "admin-1",
            created_at: "2026-11-25T10:00:00Z",
          },
        ],
        error: null,
      }),
    };
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn((table: string) => (table === "institutional_relationship_contacts" ? contactsChain : factsChain)),
    });

    await expect(listPrivateInstitutionalContacts()).rejects.toThrow(InstitutionalValidationError);
  });

  it("reports truncation when Supabase returns more than MAX_INSTITUTIONAL_CONTACTS_READ rows", async () => {
    const rows = Array.from({ length: MAX_INSTITUTIONAL_CONTACTS_READ + 1 }, (_, i) => ({
      id: `person-${i}`,
      institutional_node_id: null,
      display_name: `Person ${i}`,
      role_label: null,
      is_publicly_publishable: false,
      revalidation_status: "a_revalider",
      notes: null,
      created_at: "2026-11-25T10:00:00Z",
      updated_at: "2026-11-25T10:00:00Z",
    }));
    const contactsChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    const factsChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn((table: string) => (table === "institutional_relationship_contacts" ? contactsChain : factsChain)),
    });

    const result = await listPrivateInstitutionalContacts();
    expect(result.contacts).toHaveLength(MAX_INSTITUTIONAL_CONTACTS_READ);
    expect(result.truncated.contacts).toBe(true);
    expect(result.truncated.facts).toBe(false);
    expect(result.contacts[0]?.distinctionsIncomplete).toBe(true);
  });

  it("distinguishes facts sharing an evidenceRef when business attributes differ and deduplicates 23505 concurrent writes", async () => {
    const k1 = computeInstitutionalFactIdempotencyKey({
      contactId: "person-wanda-schneider",
      kind: "completed_contribution",
      origin: "direct",
      evidenceRef: "pv-2026",
      summary: "Action",
      contributionRole: "participation",
      activityKind: "external_event",
      activityRef: "https://example.org/event-1",
      occurredAt: "2026-11-01",
    });
    const k2 = computeInstitutionalFactIdempotencyKey({
      contactId: "person-wanda-schneider",
      kind: "completed_contribution",
      origin: "direct",
      evidenceRef: "pv-2026",
      summary: "Action",
      contributionRole: "coordination",
      activityKind: "external_event",
      activityRef: "https://example.org/event-1",
      occurredAt: "2026-11-01",
    });
    expect(k1).not.toBe(k2);

    const existingRow = {
      id: "fact-existing",
      contact_id: "person-wanda-schneider",
      kind: "note",
      origin: "direct",
      review_status: "verified",
      evidence_ref: "note-1",
      summary: "Note",
      occurred_at: null,
      support_target: null,
      contribution_role: null,
      activity_kind: null,
      activity_ref: null,
      created_by: "admin-1",
      created_at: "2026-11-25T10:00:00Z",
    };
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } }),
    };
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: existingRow, error: null }),
    };
    let callCount = 0;
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => (callCount++ === 0 ? insertChain : selectChain)),
    });

    const res = await addPrivateInstitutionalFact({
      contactId: "person-wanda-schneider",
      kind: "note",
      origin: "direct",
      evidenceRef: "note-1",
      summary: "Note",
      createdBy: "admin-1",
    });
    expect(res.deduplicated).toBe(true);
    expect(res.fact.id).toBe("fact-existing");
    expect(res.fact.reviewStatus).toBe("verified");
  });

  it.each([0, 499, 500, 501, 999, 1000, 1999, 2000, 2001])("reads bounded fact pages with an inclusive range for %i rows", async (count) => {
    const contactsChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [{ id: "c1", institutional_node_id: null, display_name: "Test", role_label: null, is_publicly_publishable: false, revalidation_status: "a_revalider", notes: null, created_at: "2026-11-25T10:00:00Z", updated_at: "2026-11-25T10:00:00Z" }], error: null }),
    };
    const allRows = Array.from({ length: count }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      contact_id: "c1",
      kind: "note",
      origin: "direct",
      review_status: "pending",
      evidence_ref: "ref",
      summary: "s",
      occurred_at: null,
      support_target: null,
      contribution_role: null,
      activity_kind: null,
      activity_ref: null,
      created_by: "admin-1",
      created_at: "2026-11-25T10:00:00Z",
    }));
    let start = 0;
    const factsChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockImplementation(function (this: unknown, filter: string) {
        const lastId = filter.match(/id\.gt\.([^)]*)\)$/)?.[1];
        start = allRows.findIndex(row => row.id === lastId) + 1;
        expect(start).toBeGreaterThan(0);
        return this;
      }),
      range: vi.fn().mockImplementation(async (from: number, to: number) => ({
        data: allRows.slice(start + from, start + to + 1), error: null,
      })),
    };
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn((table: string) => (table === "institutional_relationship_contacts" ? contactsChain : factsChain)),
    });

    const result = await listPrivateInstitutionalContacts();
    expect(result.contacts[0]?.facts.map(fact => fact.id)).toEqual(allRows.slice(0, MAX_INSTITUTIONAL_FACTS_READ).map(row => row.id));
    expect(result.truncated.facts).toBe(count > MAX_INSTITUTIONAL_FACTS_READ);
    expect(result.contacts[0]?.distinctionsIncomplete).toBe(count > MAX_INSTITUTIONAL_FACTS_READ);
    expect(factsChain.range).toHaveBeenCalledTimes(Math.max(1, Math.ceil(Math.min(count, MAX_INSTITUTIONAL_FACTS_READ) / INSTITUTIONAL_READ_PAGE_SIZE)));
    expect(factsChain.range.mock.calls.every(([from, to]) => from === 0 && to < 1000)).toBe(true);
  });

  it("verifies cleanmymap_action existence and HTTPS external_event before inserting", async () => {
    const missingActionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => missingActionChain),
    });

    await expect(
      addPrivateInstitutionalFact({
        contactId: "person-wanda-schneider",
        kind: "completed_contribution",
        origin: "direct",
        evidenceRef: "pv-2026",
        summary: "Coordination",
        contributionRole: "coordination",
        activityKind: "cleanmymap_action",
        activityRef: "non-existent-action",
        createdBy: "admin-1",
      }),
    ).rejects.toThrow("Referenced CleanMyMap action does not exist");

    await expect(
      addPrivateInstitutionalFact({
        contactId: "person-wanda-schneider",
        kind: "completed_contribution",
        origin: "direct",
        evidenceRef: "pv-2026",
        summary: "Logistique",
        contributionRole: "logistics",
        activityKind: "external_event",
        activityRef: "http://insecure.example.org/event",
        createdBy: "admin-1",
      }),
    ).rejects.toThrow("External event reference must use HTTPS");
  });

  it("reviews a fact to withdrawn", async () => {
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "fact-1",
          contact_id: "person-wanda-schneider",
          kind: "note",
          origin: "direct",
          review_status: "withdrawn",
          evidence_ref: "note-1",
          summary: "Note",
          occurred_at: null,
          support_target: null,
          contribution_role: null,
          activity_kind: null,
          activity_ref: null,
          created_by: "admin-1",
          created_at: "2026-11-25T10:00:00Z",
        },
        error: null,
      }),
    };
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => updateChain),
    });

    const fact = await reviewPrivateInstitutionalFact({ factId: "fact-1", reviewStatus: "withdrawn" });
    expect(fact.reviewStatus).toBe("withdrawn");
  });
});
