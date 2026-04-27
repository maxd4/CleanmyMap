import { afterEach, beforeEach, describe, expect, it, vi } from"vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const updatePublishedPartnerAnnuaireEntryPublicationStatusMock = vi.hoisted(
 () => vi.fn(),
);

vi.mock("@/lib/authz", () => ({
 requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/admin/operation-audit", () => ({
 appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/partners/published-annuaire-entries-store", () => ({
 updatePublishedPartnerAnnuaireEntryPublicationStatus:
 updatePublishedPartnerAnnuaireEntryPublicationStatusMock,
}));

describe("POST /api/admin/partners/published-directory", () => {
 beforeEach(() => {
 requireAdminAccessMock.mockResolvedValue({ ok: true, userId:"admin-1" });
 appendAdminOperationAuditMock.mockResolvedValue(undefined);
 updatePublishedPartnerAnnuaireEntryPublicationStatusMock.mockResolvedValue({
 id:"onboarded-1",
 publicationStatus:"accepted",
 });
 });

 afterEach(() => {
 vi.clearAllMocks();
 });

 it("accepts a published partner record after confirmation", async () => {
 const { POST } = await import("./route");
 const response = await POST(
 new Request("http://localhost/api/admin/partners/published-directory", {
 method:"POST",
 body: JSON.stringify({
 id:"onboarded-1",
 publicationStatus:"accepted",
 confirmPhrase:"CONFIRMER PARTENAIRE",
 }),
 }),
 );

 const body = (await response.json()) as {
 status?: string;
 id?: string;
 publicationStatus?: string;
 };

 expect(response.status).toBe(200);
 expect(body.status).toBe("ok");
 expect(body.id).toBe("onboarded-1");
 expect(body.publicationStatus).toBe("accepted");
 expect(
 updatePublishedPartnerAnnuaireEntryPublicationStatusMock,
 ).toHaveBeenCalledWith({
 entryId:"onboarded-1",
 publicationStatus:"accepted",
 reviewedByUserId:"admin-1",
 });
 }, 15000);

 it("rejects invalid confirmation phrases", async () => {
 const { POST } = await import("./route");
 const response = await POST(
 new Request("http://localhost/api/admin/partners/published-directory", {
 method:"POST",
 body: JSON.stringify({
 id:"onboarded-1",
 publicationStatus:"rejected",
 confirmPhrase:"NON",
 }),
 }),
 );

 const body = (await response.json()) as { error?: string };

 expect(response.status).toBe(409);
 expect(body.error).toBe("Explicit confirmation phrase required");
 }, 15000);
});
