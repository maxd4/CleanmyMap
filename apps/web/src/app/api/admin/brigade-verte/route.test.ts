import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mockRequireCreatorAccess = vi.fn();
const mockAppendAdminOperationAudit = vi.fn();
const mockQualifyAction = vi.fn();
const mockRevokeQualification = vi.fn();
const mockGetQualificationWithHistory = vi.fn();
const mockSearchEligibleActions = vi.fn();

vi.mock("@/lib/authz", () => ({
  requireCreatorAccess: () => mockRequireCreatorAccess(),
}));

vi.mock("@/lib/admin/audit/operation-audit", () => ({
  appendAdminOperationAudit: (args: unknown) => mockAppendAdminOperationAudit(args),
}));

vi.mock("@/lib/brigade-verte/brigade-verte-service", () => ({
  qualifyAction: (args: unknown) => mockQualifyAction(args),
  revokeQualification: (args: unknown) => mockRevokeQualification(args),
  getQualificationWithHistory: (args: unknown) => mockGetQualificationWithHistory(args),
  searchEligibleActions: (args: unknown) => mockSearchEligibleActions(args),
}));

describe("API /api/admin/brigade-verte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("renvoie 401 si non authentifié", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });

      const req = new Request("http://localhost/api/admin/brigade-verte");
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it("renvoie 403 si utilisateur non-max (simple admin ou user)", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });

      const req = new Request("http://localhost/api/admin/brigade-verte");
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it("retourne le détail et l'historique si actionId est renseigné", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: true, userId: "user-max" });
      mockGetQualificationWithHistory.mockResolvedValue({
        qualification: { id: "q1", status: "active" },
        history: [{ id: "h1", decision: "qualified" }],
      });

      const req = new Request("http://localhost/api/admin/brigade-verte?actionId=550e8400-e29b-41d4-a716-446655440000");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.qualification?.id).toBe("q1");
      expect(data.history).toHaveLength(1);
    });

    it("recherche les actions éligibles avec pagination si pas d'actionId", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: true, userId: "user-max" });
      mockSearchEligibleActions.mockResolvedValue({
        actions: [{ id: "a1", locationLabel: "Place de la République" }],
        total: 1,
        page: 1,
        pageSize: 10,
        hasMore: false,
      });

      const req = new Request("http://localhost/api/admin/brigade-verte?query=Republique&page=1");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.actions).toHaveLength(1);
      expect(data.total).toBe(1);
    });
  });

  describe("POST", () => {
    it("renvoie 400 si JSON malformé", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: true, userId: "user-max" });

      const req = new Request("http://localhost/api/admin/brigade-verte", {
        method: "POST",
        body: "invalid-json",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(mockAppendAdminOperationAudit).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "error" }),
      );
    });

    it("renvoie 400 si le motif de qualification est manquant ou trop court", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: true, userId: "user-max" });

      const req = new Request("http://localhost/api/admin/brigade-verte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qualify",
          actionId: "550e8400-e29b-41d4-a716-446655440000",
          justificationUrl: "https://paris.fr/preuves/doc1",
          qualificationReason: "abc", // trop court (< 5)
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(mockQualifyAction).not.toHaveBeenCalled();
    });

    it("qualifie avec succès une action avec motif complet", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: true, userId: "user-max" });
      mockQualifyAction.mockResolvedValue({
        ok: true,
        qualificationId: "q-123",
        decision: "qualified",
        idempotent: false,
      });

      const req = new Request("http://localhost/api/admin/brigade-verte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qualify",
          actionId: "550e8400-e29b-41d4-a716-446655440000",
          justificationUrl: "https://paris.fr/preuves/doc1",
          qualificationReason: "Organisation conjointe validée par convention.",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.qualificationId).toBe("q-123");
      expect(mockQualifyAction).toHaveBeenCalledWith({
        actionId: "550e8400-e29b-41d4-a716-446655440000",
        justificationUrl: "https://paris.fr/preuves/doc1",
        qualificationReason: "Organisation conjointe validée par convention.",
        qualifiedBy: "user-max",
        operationId: expect.any(String),
      });
    });

    it("renvoie 409 si l'action est déjà active", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: true, userId: "user-max" });
      mockQualifyAction.mockResolvedValue({
        ok: false,
        error: "already_active",
        message: "Cette action est déjà qualifiée Brigade Verte.",
      });

      const req = new Request("http://localhost/api/admin/brigade-verte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qualify",
          actionId: "550e8400-e29b-41d4-a716-446655440000",
          justificationUrl: "https://paris.fr/preuves/doc1",
          qualificationReason: "Requalification test.",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(409);
    });

    it("révoque une qualification avec motif", async () => {
      mockRequireCreatorAccess.mockResolvedValue({ ok: true, userId: "user-max" });
      mockRevokeQualification.mockResolvedValue({ ok: true, idempotent: false });

      const req = new Request("http://localhost/api/admin/brigade-verte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          qualificationId: "550e8400-e29b-41d4-a716-446655440001",
          revocationReason: "Erreur de saisie de l'organisateur attestée.",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(mockRevokeQualification).toHaveBeenCalledWith({
        qualificationId: "550e8400-e29b-41d4-a716-446655440001",
        revocationReason: "Erreur de saisie de l'organisateur attestée.",
        revokedBy: "user-max",
        operationId: expect.any(String),
      });
    });
  });
});
