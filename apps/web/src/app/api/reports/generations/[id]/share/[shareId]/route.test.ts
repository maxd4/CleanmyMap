import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const revokeMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authMock }));
vi.mock("@/lib/reports/report-generation-pdf-share-store", () => ({ revokeReportPdfShare: revokeMock }));
vi.mock("@/lib/admin/audit/operation-audit", () => ({ appendAdminOperationAudit: auditMock }));

import { DELETE } from "./route";

const generationId = "11111111-1111-4111-8111-111111111111";
const shareId = "33333333-3333-4333-8333-333333333333";

describe("DELETE /api/reports/generations/[id]/share/[shareId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, userId: "owner-1" });
    revokeMock.mockResolvedValue({ id: shareId });
    auditMock.mockResolvedValue(undefined);
  });

  it("revokes only an owner-scoped link and audits the change", async () => {
    const response = await DELETE(new Request("https://cleanmymap.test"), { params: Promise.resolve({ id: generationId, shareId }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ revoked: true, shareId });
    expect(revokeMock).toHaveBeenCalledWith({ shareId, generationId, createdByClerkId: "owner-1" });
    expect(auditMock).toHaveBeenCalledTimes(1);
  });

  it("does not let a third party revoke a link", async () => {
    authMock.mockResolvedValueOnce({ ok: true, userId: "other-user" });
    revokeMock.mockResolvedValueOnce(null);

    const response = await DELETE(new Request("https://cleanmymap.test"), { params: Promise.resolve({ id: generationId, shareId }) });

    expect(response.status).toBe(404);
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("keeps the revocation durable when its audit is unavailable", async () => {
    auditMock.mockRejectedValueOnce(new Error("audit unavailable"));

    const response = await DELETE(new Request("https://cleanmymap.test"), { params: Promise.resolve({ id: generationId, shareId }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ revoked: true, auditWarning: true });
    expect(revokeMock).toHaveBeenCalledTimes(1);
  });
});
