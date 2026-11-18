/**
 * Tests unitaires — Brigade Verte service métier.
 *
 * Couverture : isActionEligibleForBrigadeVerte, computeBrigadeVerteProgress,
 * qualifyAction, revokeQualification.
 *
 * Les mocks Supabase suivent le pattern existant du projet.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => mockSupabase,
}));

import {
  isActionEligibleForBrigadeVerte,
  computeBrigadeVerteProgress,
  qualifyAction,
  revokeQualification,
} from "./brigade-verte-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SupabaseChainResult = {
  data: unknown;
  error: { message: string } | null;
};

function makeChain(result: SupabaseChainResult) {
  const chain: Record<string, unknown> = {};
  const noop = () => chain;
  for (const m of ["select","eq","is","not","in","or","insert","update","order","limit"]) {
    chain[m] = vi.fn(noop);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  return chain;
}

// ---------------------------------------------------------------------------
// isActionEligibleForBrigadeVerte
// ---------------------------------------------------------------------------

describe("isActionEligibleForBrigadeVerte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne eligible=true pour une action entièrement conforme", async () => {
    const eligibleRow = {
      id: "action-1",
      action_date: "2026-10-01",
      location_label: "Quartier Propre Paris 15",
      status: "approved",
      action_phase: "post_action_complete",
      moderation_visibility: "visible",
      cancelled_at: null,
      review_state: "approved",
      published_at: "2026-10-02T10:00:00Z",
    };
    const chain = makeChain({ data: eligibleRow, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const result = await isActionEligibleForBrigadeVerte("action-1");
    expect(result.eligible).toBe(true);
    expect(result.row?.id).toBe("action-1");
  });

  it("retourne eligible=false pour une action non publiée", async () => {
    const chain = makeChain({
      data: {
        id: "action-2",
        action_date: "2026-10-01",
        location_label: "Quartier Test",
        status: "approved",
        action_phase: "post_action_complete",
        moderation_visibility: "visible",
        cancelled_at: null,
        review_state: "approved",
        published_at: null,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const result = await isActionEligibleForBrigadeVerte("action-2");
    expect(result.eligible).toBe(false);
  });

  it("retourne eligible=false pour une action annulée", async () => {
    const chain = makeChain({
      data: {
        id: "action-3",
        action_date: "2026-10-01",
        location_label: "Quartier Test",
        status: "approved",
        action_phase: "post_action_complete",
        moderation_visibility: "visible",
        cancelled_at: "2026-10-01T08:00:00Z",
        review_state: "approved",
        published_at: "2026-10-01T09:00:00Z",
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const result = await isActionEligibleForBrigadeVerte("action-3");
    expect(result.eligible).toBe(false);
  });

  it("retourne eligible=false pour une action non approuvée", async () => {
    const chain = makeChain({
      data: {
        id: "action-4",
        action_date: "2026-10-01",
        location_label: "Quartier Test",
        status: "pending",
        action_phase: "post_action_complete",
        moderation_visibility: "visible",
        cancelled_at: null,
        review_state: "pending",
        published_at: null,
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const result = await isActionEligibleForBrigadeVerte("action-4");
    expect(result.eligible).toBe(false);
  });

  it("retourne eligible=false si Supabase retourne une erreur", async () => {
    const chain = makeChain({ data: null, error: { message: "db error" } });
    mockSupabase.from.mockReturnValue(chain);

    const result = await isActionEligibleForBrigadeVerte("action-err");
    expect(result.eligible).toBe(false);
    expect(result.row).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeBrigadeVerteProgress
// ---------------------------------------------------------------------------

describe("computeBrigadeVerteProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupFromSequence(calls: SupabaseChainResult[]) {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      const result = calls[callCount] ?? { data: null, error: null };
      callCount++;
      const chain: Record<string, unknown> = {};
      const noop = () => chain;
      for (const m of ["select","eq","is","not","in","or","insert","update","order","limit"]) {
        chain[m] = vi.fn(noop);
      }
      chain.maybeSingle = vi.fn().mockResolvedValue(result);
      chain.single = vi.fn().mockResolvedValue(result);
      // simulate promise resolution for queries without terminal
      Object.defineProperty(chain, "then", {
        get: () => (resolve: (v: SupabaseChainResult) => void) => resolve(result),
      });
      return chain;
    });
  }

  it("retourne count=0 et eligible=true si aucune action qualifiée", async () => {
    setupFromSequence([{ data: [], error: null }]);
    const result = await computeBrigadeVerteProgress("user-1");
    expect(result.eligible).toBe(true);
    expect(result.count).toBe(0);
    expect(result.proofs).toHaveLength(0);
  });

  it("retourne eligible=false en cas d'erreur Supabase (fail-closed)", async () => {
    setupFromSequence([{ data: null, error: { message: "network error" } }]);
    const result = await computeBrigadeVerteProgress("user-1");
    expect(result.eligible).toBe(false);
    expect(result.count).toBe(0);
  });

  it("exclut les participations avec statut pending", async () => {
    // qualifications actives
    setupFromSequence([
      { data: [{ action_id: "a1", qualified_at: "2026-10-01T00:00:00Z" }], error: null },
      // participations : aucune confirmed pour user
      { data: [], error: null },
    ]);
    const result = await computeBrigadeVerteProgress("user-pending");
    expect(result.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// qualifyAction
// ---------------------------------------------------------------------------

describe("qualifyAction", () => {
  const baseParams = {
    actionId: "action-uuid",
    justificationUrl: "https://example.com/proof",
    qualifiedBy: "clerk-imu-id",
    operationId: "op-id",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne already_active si la qualification existe déjà en statut active", async () => {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const noop = () => chain;
      for (const m of ["select","eq","is","not","in","or","insert","update","order","limit"]) {
        chain[m] = vi.fn(noop);
      }
      callCount++;
      if (callCount === 1) {
        // isActionEligibleForBrigadeVerte
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: "action-uuid", action_date: "2026-10-01", location_label: "Test",
            status: "approved", action_phase: "post_action_complete",
            moderation_visibility: "visible", cancelled_at: null,
            review_state: "approved", published_at: "2026-10-01T10:00:00Z",
          },
          error: null,
        });
      } else {
        // existing qualification lookup
        chain.maybeSingle = vi.fn().mockResolvedValue({
          data: { id: "qual-id", status: "active" },
          error: null,
        });
      }
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const result = await qualifyAction(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("already_active");
    }
  });

  it("retourne action_not_eligible si l'action n'est pas éligible", async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const noop = () => chain;
      for (const m of ["select","eq","is","not","in","or","insert","update","order","limit"]) {
        chain[m] = vi.fn(noop);
      }
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const result = await qualifyAction(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("action_not_eligible");
    }
  });
});

// ---------------------------------------------------------------------------
// revokeQualification
// ---------------------------------------------------------------------------

describe("revokeQualification", () => {
  const baseParams = {
    qualificationId: "qual-uuid",
    revocationReason: "Organisation non vérifiée.",
    revokedBy: "clerk-imu-id",
    operationId: "op-id",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne not_found si la qualification est introuvable", async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const noop = () => chain;
      for (const m of ["select","eq","is","not","in","or","insert","update","order","limit"]) {
        chain[m] = vi.fn(noop);
      }
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const result = await revokeQualification(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("not_found");
  });

  it("retourne already_revoked si la qualification est déjà révoquée", async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const noop = () => chain;
      for (const m of ["select","eq","is","not","in","or","insert","update","order","limit"]) {
        chain[m] = vi.fn(noop);
      }
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: "qual-uuid", action_id: "action-uuid", status: "revoked" },
        error: null,
      });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const result = await revokeQualification(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("already_revoked");
  });

  it("retourne db_error si Supabase retourne une erreur", async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const noop = () => chain;
      for (const m of ["select","eq","is","not","in","or","insert","update","order","limit"]) {
        chain[m] = vi.fn(noop);
      }
      chain.maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "connection refused" },
      });
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    });

    const result = await revokeQualification(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("db_error");
  });
});
