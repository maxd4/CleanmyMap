import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mockRequireAuthenticatedAccess = vi.fn();
const mockComputeBrigadeVerteProgress = vi.fn();

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: () => mockRequireAuthenticatedAccess(),
}));

vi.mock("@/lib/brigade-verte/brigade-verte-service", () => ({
  computeBrigadeVerteProgress: (userId: string) => mockComputeBrigadeVerteProgress(userId),
}));

describe("API /api/parcours/brigade-verte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renvoie 401 si non authentifié", async () => {
    mockRequireAuthenticatedAccess.mockResolvedValue({ ok: false, status: 401 });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("renvoie status: error si échec fermé (fail-closed, pas de faux 0/2)", async () => {
    mockRequireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-123" });
    mockComputeBrigadeVerteProgress.mockResolvedValue({
      eligible: false,
      count: 0,
      proofs: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");

    const data = await res.json();
    expect(data.status).toBe("error");
  });

  it("renvoie status: available avec 0 participation", async () => {
    mockRequireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-123" });
    mockComputeBrigadeVerteProgress.mockResolvedValue({
      eligible: true,
      count: 0,
      proofs: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");

    const data = await res.json();
    expect(data.status).toBe("available");
    expect(data.count).toBe(0);
    expect(data.proofs).toEqual([]);
  });

  it("renvoie les preuves sélectionnées (max 2)", async () => {
    mockRequireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-123" });
    mockComputeBrigadeVerteProgress.mockResolvedValue({
      eligible: true,
      count: 2,
      proofs: [
        { actionId: "a1", actionDate: "2026-05-10", locationLabel: "Paris 11", qualifiedAt: "2026-05-12T10:00:00Z" },
        { actionId: "a2", actionDate: "2026-06-15", locationLabel: "Paris 12", qualifiedAt: "2026-06-16T10:00:00Z" },
      ],
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("available");
    expect(data.count).toBe(2);
    expect(data.proofs).toHaveLength(2);
    expect(data.proofs[0].locationLabel).toBe("Paris 11");
  });
});
