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

vi.mock("@/lib/partners/institutional-relations/relationship-store", () => ({
  listPrivateInstitutionalContacts: mocks.listPrivateInstitutionalContacts,
  upsertPrivateInstitutionalContact: mocks.upsertPrivateInstitutionalContact,
  addPrivateInstitutionalFact: mocks.addPrivateInstitutionalFact,
  reviewPrivateInstitutionalFact: mocks.reviewPrivateInstitutionalFact,
}));

import { GET, PATCH, POST } from "./route";

describe("admin institutional-relations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin access on GET, POST, and PATCH", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: false, status: 403, code: "FORBIDDEN", message: "Forbidden" });

    const getRes = await GET();
    expect(getRes.status).toBe(403);

    const postRes = await POST(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "POST",
      body: JSON.stringify({ type: "contact", id: "person-wanda-schneider", displayName: "Wanda Schneider" }),
    }));
    expect(postRes.status).toBe(403);

    const patchRes = await PATCH(new Request("http://localhost/api/admin/partners/institutional-relations", {
      method: "PATCH",
      body: JSON.stringify({ factId: "11111111-1111-4111-8111-111111111111", reviewStatus: "verified", reason: "Validé" }),
    }));
    expect(patchRes.status).toBe(403);
  });

  it("creates a private fact as pending and audits the operation", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.addPrivateInstitutionalFact.mockResolvedValue({
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

    expect(res.status).toBe(200);
    expect(mocks.addPrivateInstitutionalFact).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: "person-wanda-schneider",
        createdBy: "admin-1",
      }),
    );
    expect(mocks.appendAdminOperationAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "add_institutional_fact",
        actorUserId: "admin-1",
      }),
    );
  });

  it("reviews a private fact and audits the decision", async () => {
    mocks.requireAdminAccess.mockResolvedValue({ ok: true, userId: "admin-1" });
    mocks.reviewPrivateInstitutionalFact.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      contactId: "person-wanda-schneider",
      kind: "direct_exchange",
      origin: "direct",
      reviewStatus: "verified",
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
        reviewStatus: "verified",
        reason: "Preuve vérifiée par l'équipe",
      }),
    }));

    expect(res.status).toBe(200);
    expect(mocks.appendAdminOperationAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "review_institutional_fact",
        actorUserId: "admin-1",
      }),
    );
  });
});
