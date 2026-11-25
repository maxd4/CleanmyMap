import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: supabaseMocks.getSupabaseServerClient,
}));

import {
  addPrivateInstitutionalFact,
  InstitutionalValidationError,
  listPrivateInstitutionalContacts,
  MAX_INSTITUTIONAL_CONTACTS_READ,
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
