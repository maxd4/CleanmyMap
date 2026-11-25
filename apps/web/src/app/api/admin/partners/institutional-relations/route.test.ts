import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminAccess: vi.fn(),
  appendAdminOperationAudit: vi.fn(),
  listPrivateInstitutionalContacts: vi.fn(),
  upsertPrivateInstitutionalContact: vi.fn(),
  addPrivateInstitutionalFact: vi.fn(),
  reviewPrivateInstitutionalFact: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: mocks.requireAdminAccess,
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: mocks.appendAdminOperationAudit,
}));

vi.mock("@/lib/partners/institutional-relations/relationship-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/partners/institutional-relations/relationship-store")>(
    "@/lib/partners/institutional-relations/relationship-store",
  );
  return {
    InstitutionalValidationError: actual.InstitutionalValidationError,
    listPrivateInstitutionalContacts: mocks.listPrivateInstitutionalContacts,
    upsertPrivateInstitutionalContact: mocks.upsertPrivateInstitutionalContact,
    addPrivateInstitutionalFact: mocks.addPrivateInstitutionalFact,
    reviewPrivateInstitutionalFact: mocks.reviewPrivateInstitutionalFact,
  };
});

import { InstitutionalValidationError } from "@/lib/partners/institutional-relations/relationship-store";
import { GET, PATCH, POST } from "./route";

describe("admin institutional-relations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appendAdminOperationAudit.mockResolvedValue(undefined);
  });

  it("rejects 401/403 non-admin access on GET, POST, and PATCH with zero mutations", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 401, code: "UNAUTHORIZED", message: "Unauthorized" });
    const unauthGet = await GET();
    expect(unauthGet.status).toBe(401);
    expect(unauthGet.headers.get("Cache-Control")).toBe("private, no-store");

    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 403, code: "FORBIDDEN", message: "Forbidden" });
    const getRes = await GET();
    expect(getRes.status).toBe(403);
    expect(getRes.headers.get("Cache-Control")).toBe("private, no-store");

    const postRes = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({ type: "contact", id: "person-wanda-schneider", displayName: "Wanda Schneider" }),
    }));
    expect(postRes.status).toBe(403);
    expect(postRes.headers.get("Cache-Control")).toBe("private, no-store");

    const patchRes = await PATCH(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "PATCH",
      body: JSON.stringify({ factId: "11111111-1111-4111-8111-111111111111", reviewStatus: "verified", reason: "Validé" }),
    }));
    expect(patchRes.status).toBe(403);
    expect(patchRes.headers.get("Cache-Control")).toBe("private, no-store");

    expect(mocks.listPrivateInstitutionalContacts).not.toHaveBeenCalled();
    expect(mocks.upsertPrivateInstitutionalContact).not.toHaveBeenCalled();
    expect(mocks.addPrivateInstitutionalFact).not.toHaveBeenCalled();
    expect(mocks.reviewPrivateInstitutionalFact).not.toHaveBeenCalled();
    expect(mocks.appendAdminOperationAudit).not.toHaveBeenCalled();
  });

  it("returns contacts and truncation status on GET and hides raw Supabase errors", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.listPrivateInstitutionalContacts.mockResolvedValue({
      contacts: [{ id: "person-wanda-schneider", displayName: "Wanda Schneider", facts: [], distinctions: { directContact: false, explicitSupport: false, effectiveContribution: false } }],
      truncated: { contacts: false, facts: false },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const json = await res.json();
    expect(json.contacts).toHaveLength(1);
    expect(json.truncated).toEqual({ contacts: false, facts: false });

    mocks.listPrivateInstitutionalContacts.mockRejectedValueOnce(new Error("relation institutional_relationship_contacts does not exist"));
    const errRes = await GET();
    expect(errRes.status).toBe(500);
    expect(errRes.headers.get("Cache-Control")).toBe("private, no-store");
    const errJson = await errRes.json();
    expect(errJson.message).not.toContain("institutional_relationship_contacts");
  });

  it("rejects invalid payloads on POST and PATCH with 400", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });

    const badPost = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({ type: "contact", id: "" }),
    }));
    expect(badPost.status).toBe(400);

    const badPatch = await PATCH(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "PATCH",
      body: JSON.stringify({ factId: "not-a-uuid", reviewStatus: "verified", reason: "ok" }),
    }));
    expect(badPatch.status).toBe(400);
  });

  it("upserts a contact and records details.operation = upsert_institutional_contact", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.upsertPrivateInstitutionalContact.mockResolvedValue({
      id: "person-wanda-schneider",
      institutionalNodeId: null,
      displayName: "Wanda Schneider",
      roleLabel: "Référente",
      isPubliclyPublishable: false,
      revalidationStatus: "a_revalider",
      notes: null,
      createdAt: "2026-11-25T10:00:00Z",
      updatedAt: "2026-11-25T10:00:00Z",
    });

    const res = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({ type: "contact", id: "person-wanda-schneider", displayName: "Wanda Schneider" }),
    }));
    expect(res.status).toBe(201);
    expect(mocks.appendAdminOperationAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "admin_operation",
        outcome: "success",
        actorUserId: "admin-1",
        targetId: "person-wanda-schneider",
        details: expect.objectContaining({ operation: "upsert_institutional_contact" }),
      }),
    );
  });

  it("creates a private fact as pending, handles deduplication, and records details.operation = add_institutional_fact", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.addPrivateInstitutionalFact.mockResolvedValue({
      fact: {
        id: "fact-1",
        contactId: "person-wanda-schneider",
        kind: "direct_exchange",
        origin: "direct",
        reviewStatus: "pending",
        evidenceRef: "mail-2026-11-25",
        summary: "Échange direct",
        occurredAt: null,
        createdBy: "admin-1",
        createdAt: "2026-11-25T10:00:00Z",
      },
      deduplicated: false,
    });

    const res = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({
        type: "fact",
        contactId: "person-wanda-schneider",
        kind: "direct_exchange",
        origin: "direct",
        reviewStatus: "verified", // must be ignored by server
        evidenceRef: "mail-2026-11-25",
        summary: "Échange direct",
      }),
    }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.auditRecorded).toBe(true);
    expect(mocks.appendAdminOperationAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "admin_operation",
        outcome: "success",
        targetId: "fact-1",
        actorUserId: "admin-1",
        details: expect.objectContaining({ operation: "add_institutional_fact", reviewStatus: "pending" }),
      }),
    );

    // Retry returns 200 with deduplicated: true
    mocks.addPrivateInstitutionalFact.mockResolvedValueOnce({
      fact: {
        id: "fact-1",
        contactId: "person-wanda-schneider",
        kind: "direct_exchange",
        origin: "direct",
        reviewStatus: "pending",
        evidenceRef: "mail-2026-11-25",
        summary: "Échange direct",
        occurredAt: null,
        createdBy: "admin-1",
        createdAt: "2026-11-25T10:00:00Z",
      },
      deduplicated: true,
    });
    const retryRes = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({
        type: "fact",
        contactId: "person-wanda-schneider",
        kind: "direct_exchange",
        origin: "direct",
        evidenceRef: "mail-2026-11-25",
        summary: "Échange direct",
      }),
    }));
    expect(retryRes.status).toBe(200);
    expect((await retryRes.json()).deduplicated).toBe(true);
  });

  it("does not report a successful write as rolled back when post-write audit fails", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.upsertPrivateInstitutionalContact.mockResolvedValue({
      id: "person-wanda-schneider",
      institutionalNodeId: null,
      displayName: "Wanda Schneider",
      roleLabel: null,
      isPubliclyPublishable: false,
      revalidationStatus: "a_revalider",
      notes: null,
      createdAt: "2026-11-25T10:00:00Z",
      updatedAt: "2026-11-25T10:00:00Z",
    });
    mocks.appendAdminOperationAudit.mockRejectedValueOnce(new Error("audit table unavailable"));

    const res = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({ type: "contact", id: "person-wanda-schneider", displayName: "Wanda Schneider" }),
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.contact.id).toBe("person-wanda-schneider");
    expect(json.auditRecorded).toBe(false);
    expect(json.auditWarning).toBeTruthy();
  });

  it("handles validation and persistence errors on POST without leaking raw DB errors", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.addPrivateInstitutionalFact.mockRejectedValueOnce(
      new InstitutionalValidationError("Referenced CleanMyMap action does not exist"),
    );

    const valRes = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({
        type: "fact",
        contactId: "person-wanda-schneider",
        kind: "completed_contribution",
        origin: "direct",
        evidenceRef: "pv-2026",
        summary: "Action",
        contributionRole: "coordination",
        activityKind: "cleanmymap_action",
        activityRef: "missing-action",
      }),
    }));
    expect(valRes.status).toBe(400);
    expect(mocks.appendAdminOperationAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        details: expect.objectContaining({ operation: "add_institutional_fact", stage: "validation" }),
      }),
    );

    mocks.addPrivateInstitutionalFact.mockRejectedValueOnce(new Error("PGHOST=secret internal timeout"));
    const dbRes = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({
        type: "fact",
        contactId: "person-wanda-schneider",
        kind: "note",
        origin: "direct",
        evidenceRef: "note-1",
        summary: "Note",
      }),
    }));
    expect(dbRes.status).toBe(500);
    const dbJson = await dbRes.json();
    expect(dbJson.message).not.toContain("PGHOST");
    expect(mocks.appendAdminOperationAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "error",
        details: expect.objectContaining({ operation: "add_institutional_fact", stage: "persistence" }),
      }),
    );
  });

  it("reviews a private fact and records details.operation = review_institutional_fact", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.reviewPrivateInstitutionalFact.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      contactId: "person-wanda-schneider",
      kind: "direct_exchange",
      origin: "direct",
      reviewStatus: "withdrawn",
      evidenceRef: "mail-2026-11-25",
      summary: "Échange direct",
      occurredAt: null,
      createdBy: "admin-1",
      createdAt: "2026-11-25T10:00:00Z",
    });

    const res = await PATCH(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "PATCH",
      body: JSON.stringify({
        factId: "11111111-1111-4111-8111-111111111111",
        reviewStatus: "withdrawn",
        reason: "Preuve retirée après vérification",
      }),
    }));

    expect(res.status).toBe(200);
    expect(mocks.appendAdminOperationAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "admin_operation",
        outcome: "success",
        targetId: "11111111-1111-4111-8111-111111111111",
        actorUserId: "admin-1",
        details: expect.objectContaining({ operation: "review_institutional_fact", reviewStatus: "withdrawn" }),
      }),
    );
  });
});
