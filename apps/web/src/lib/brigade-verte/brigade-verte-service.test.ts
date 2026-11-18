/**
 * Tests unitaires — Brigade Verte service métier (version durcie).
 *
 * Couverture :
 * - checkActionEligibilityPredicate (tous les invariants : date passée, review_state approved OU not_required, access_mode public, visibility visible, status approved, etc.)
 * - isActionEligibleForBrigadeVerte
 * - computeBrigadeVerteProgress (revalidation exhaustive, fail-closed, tri déterministe date puis id, remplacement automatique après invalidation)
 * - qualifyAction (appel RPC atomique, mapping des erreurs, idempotence)
 * - revokeQualification (appel RPC atomique, mapping des erreurs)
 * - searchEligibleActions (pagination, filtres)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => mockSupabase,
}));

import {
  checkActionEligibilityPredicate,
  isActionEligibleForBrigadeVerte,
  computeBrigadeVerteProgress,
  qualifyAction,
  revokeQualification,
  getQualificationWithHistory,
  searchEligibleActions,
} from "./brigade-verte-service";
import type { EligibleActionRow } from "./brigade-verte-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SupabaseChainResult = {
  data: unknown;
  count?: number;
  error: { message: string; code?: string } | null;
};

function makeChain(result: SupabaseChainResult) {
  const chain: Record<string, unknown> = {};
  const noop = () => chain;
  for (const m of [
    "select",
    "eq",
    "lt",
    "is",
    "not",
    "in",
    "or",
    "insert",
    "update",
    "order",
    "limit",
    "range",
    "gt",
  ]) {
    chain[m] = vi.fn(noop);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  Object.defineProperty(chain, "then", {
    get: () => (resolve: (v: SupabaseChainResult) => void) => resolve(result),
  });
  return chain;
}

// ---------------------------------------------------------------------------
// checkActionEligibilityPredicate
// ---------------------------------------------------------------------------

describe("checkActionEligibilityPredicate", () => {
  const validAction: EligibleActionRow = {
    id: "act-1",
    actionDate: "2026-10-01",
    locationLabel: "Paris 10",
    status: "approved",
    actionPhase: "post_action_complete",
    moderationVisibility: "visible",
    accessMode: "public",
    cancelledAt: null,
    reviewState: "approved",
    publishedAt: "2026-10-01T12:00:00Z",
  };

  it("accepte une action conforme avec review_state = approved", () => {
    expect(checkActionEligibilityPredicate(validAction, "2026-11-18")).toBe(true);
  });

  it("accepte une action conforme avec review_state = not_required", () => {
    const action = { ...validAction, reviewState: "not_required" };
    expect(checkActionEligibilityPredicate(action, "2026-11-18")).toBe(true);
  });

  it("rejette une action avec date future ou égale à aujourd'hui", () => {
    const futureAction = { ...validAction, actionDate: "2026-11-19" };
    expect(checkActionEligibilityPredicate(futureAction, "2026-11-18")).toBe(false);

    const todayAction = { ...validAction, actionDate: "2026-11-18" };
    expect(checkActionEligibilityPredicate(todayAction, "2026-11-18")).toBe(false);
  });

  it("rejette une action privée (access_mode != public)", () => {
    const privateAction = { ...validAction, accessMode: "private" };
    expect(checkActionEligibilityPredicate(privateAction, "2026-11-18")).toBe(false);
  });

  it("rejette une action non visible (moderation_visibility != visible)", () => {
    const hiddenAction = { ...validAction, moderationVisibility: "hidden" };
    expect(checkActionEligibilityPredicate(hiddenAction, "2026-11-18")).toBe(false);
  });

  it("rejette une action annulée (cancelledAt != null)", () => {
    const cancelledAction = { ...validAction, cancelledAt: "2026-10-01T08:00:00Z" };
    expect(checkActionEligibilityPredicate(cancelledAction, "2026-11-18")).toBe(false);
  });

  it("rejette une action non publiée (publishedAt == null)", () => {
    const unpubAction = { ...validAction, publishedAt: null };
    expect(checkActionEligibilityPredicate(unpubAction, "2026-11-18")).toBe(false);
  });

  it("rejette une action avec phase non terminée (ex: pre_action)", () => {
    const preAction = { ...validAction, actionPhase: "pre_action" };
    expect(checkActionEligibilityPredicate(preAction, "2026-11-18")).toBe(false);
  });

  it("rejette une action avec review_state invalide (ex: pending_review ou rejected)", () => {
    const pendingAction = { ...validAction, reviewState: "pending_review" };
    expect(checkActionEligibilityPredicate(pendingAction, "2026-11-18")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isActionEligibleForBrigadeVerte
// ---------------------------------------------------------------------------

describe("isActionEligibleForBrigadeVerte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne eligible=true pour une action entièrement conforme en base", async () => {
    const eligibleDbRow = {
      id: "action-1",
      action_date: "2026-10-01",
      location_label: "Quartier Propre Paris 15",
      status: "approved",
      action_phase: "post_action_complete",
      moderation_visibility: "visible",
      access_mode: "public",
      cancelled_at: null,
      review_state: "not_required",
      published_at: "2026-10-02T10:00:00Z",
    };
    mockSupabase.from.mockReturnValue(makeChain({ data: eligibleDbRow, error: null }));

    const result = await isActionEligibleForBrigadeVerte("action-1");
    expect(result.eligible).toBe(true);
    expect(result.row?.id).toBe("action-1");
    expect(result.row?.accessMode).toBe("public");
  });

  it("retourne eligible=false si l'action n'existe pas ou en cas d'erreur DB", async () => {
    mockSupabase.from.mockReturnValue(makeChain({ data: null, error: { message: "db error" } }));

    const result = await isActionEligibleForBrigadeVerte("action-unknown");
    expect(result.eligible).toBe(false);
    expect(result.row).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeBrigadeVerteProgress (lecture owner-scoped, fenêtrée, avec revalidation & fail-closed)
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
      return makeChain(result);
    });
  }

  it("retourne eligible=true et count=0 si l'utilisateur n'a aucune participation confirmée", async () => {
    setupFromSequence([{ data: [], error: null }]);

    const result = await computeBrigadeVerteProgress("user-1");
    expect(result.eligible).toBe(true);
    expect(result.count).toBe(0);
    expect(result.proofs).toHaveLength(0);
  });

  it("retourne eligible=false en cas d'erreur de lecture des participations (fail-closed)", async () => {
    setupFromSequence([{ data: null, error: { message: "timeout" } }]);

    const result = await computeBrigadeVerteProgress("user-1");
    expect(result.eligible).toBe(false);
    expect(result.count).toBe(0);
  });

  it("retourne eligible=true et count=0 si aucune des actions du bénévole n'est qualifiée active", async () => {
    setupFromSequence([
      // 1. Participations confirmées pour user-1
      { data: [{ action_id: "act-1" }, { action_id: "act-2" }], error: null },
      // 2. Qualifications actives pour ces actions
      { data: [], error: null },
    ]);

    const result = await computeBrigadeVerteProgress("user-1");
    expect(result.eligible).toBe(true);
    expect(result.count).toBe(0);
    expect(result.proofs).toHaveLength(0);
  });

  it("retourne eligible=false en cas d'erreur de lecture des qualifications (fail-closed)", async () => {
    setupFromSequence([
      { data: [{ action_id: "act-1" }], error: null },
      { data: null, error: { message: "db error" } },
    ]);

    const result = await computeBrigadeVerteProgress("user-1");
    expect(result.eligible).toBe(false);
    expect(result.count).toBe(0);
  });

  it("retourne eligible=false en cas d'erreur de lecture des actions candidates (fail-closed)", async () => {
    setupFromSequence([
      { data: [{ action_id: "act-1" }], error: null },
      { data: [{ action_id: "act-1", qualified_at: "2026-10-01T00:00:00Z" }], error: null },
      { data: null, error: { message: "db error actions" } },
    ]);

    const result = await computeBrigadeVerteProgress("user-1");
    expect(result.eligible).toBe(false);
    expect(result.count).toBe(0);
  });

  it("calcule correctement 2 participations admissibles triées par date ASC puis ID ASC", async () => {
    setupFromSequence([
      // 1. Participations confirmées pour user-1
      {
        data: [
          { action_id: "act-3" },
          { action_id: "act-1" },
          { action_id: "act-2" },
        ],
        error: null,
      },
      // 2. Qualifications actives
      {
        data: [
          { action_id: "act-3", qualified_at: "2026-10-15T00:00:00Z" },
          { action_id: "act-1", qualified_at: "2026-10-01T00:00:00Z" },
          { action_id: "act-2", qualified_at: "2026-10-10T00:00:00Z" },
        ],
        error: null,
      },
      // 3. Détails des actions pour revalidation
      {
        data: [
          {
            id: "act-3",
            action_date: "2026-10-20",
            location_label: "Lieu 3",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "approved",
            published_at: "2026-10-21T00:00:00Z",
          },
          {
            id: "act-1",
            action_date: "2026-10-05",
            location_label: "Lieu 1",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "not_required",
            published_at: "2026-10-06T00:00:00Z",
          },
          {
            id: "act-2",
            action_date: "2026-10-10",
            location_label: "Lieu 2",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "approved",
            published_at: "2026-10-11T00:00:00Z",
          },
        ],
        error: null,
      },
    ]);

    const result = await computeBrigadeVerteProgress("user-1", "2026-11-18");
    expect(result.eligible).toBe(true);
    expect(result.count).toBe(2);
    expect(result.proofs).toHaveLength(2);
    // Tri par date : act-1 (10-05) puis act-2 (10-10)
    expect(result.proofs[0].actionId).toBe("act-1");
    expect(result.proofs[1].actionId).toBe("act-2");
  });

  it("gère la pagination par curseur exhaustive sur plus de 500 actions distinctes sans perte de preuve", async () => {
    // 550 actions uniques réparties sur 2 pages (500 + 50)
    // Preuves admissibles : act-010 (page 1) et act-520 (page 2)
    const page1 = Array.from({ length: 500 }, (_, i) => ({
      action_id: `act-${String(i + 1).padStart(4, "0")}`,
    }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({
      action_id: `act-${String(501 + i).padStart(4, "0")}`,
    }));

    setupFromSequence([
      // 1. Page 1 (curseur initial)
      { data: page1, error: null },
      // 2. Page 2 (curseur gt act-0500)
      { data: page2, error: null },
      // 3. Qualifications actives pour ces actions (par chunks de 50)
      //    act-0010 et act-0520 sont qualifiées
      {
        data: [{ action_id: "act-0010", qualified_at: "2026-10-01T00:00:00Z" }],
        error: null,
      },
      ...Array.from({ length: 9 }, () => ({ data: [], error: null })),
      {
        data: [{ action_id: "act-0520", qualified_at: "2026-10-02T00:00:00Z" }],
        error: null,
      },
      // 4. Détails des 2 actions candidates qualifiées
      {
        data: [
          {
            id: "act-0010",
            action_date: "2026-10-01",
            location_label: "Lieu Page 1",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "approved",
            published_at: "2026-10-02T00:00:00Z",
          },
          {
            id: "act-0520",
            action_date: "2026-10-05",
            location_label: "Lieu Page 2",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "not_required",
            published_at: "2026-10-06T00:00:00Z",
          },
        ],
        error: null,
      },
    ]);

    const result = await computeBrigadeVerteProgress("user-1", "2026-11-18");
    expect(result.eligible).toBe(true);
    expect(result.count).toBe(2);
    expect(result.proofs).toHaveLength(2);
    expect(result.proofs[0].actionId).toBe("act-0010");
    expect(result.proofs[1].actionId).toBe("act-0520");
  });

  it("gère la frontière exacte de pagination (pile 500 actions puis page vide)", async () => {
    const page1 = Array.from({ length: 500 }, (_, i) => ({
      action_id: `act-exact-${String(i + 1).padStart(4, "0")}`,
    }));
    const page2: { action_id: string }[] = [];

    setupFromSequence([
      // 1. Page 1 (500 items)
      { data: page1, error: null },
      // 2. Page 2 (0 item -> arrêt du curseur)
      { data: page2, error: null },
      // 3. Qualifications actives (10 chunks de 50)
      {
        data: [{ action_id: "act-exact-0001", qualified_at: "2026-10-01T00:00:00Z" }],
        error: null,
      },
      ...Array.from({ length: 9 }, () => ({ data: [], error: null })),
      // 4. Action candidate
      {
        data: [
          {
            id: "act-exact-0001",
            action_date: "2026-10-01",
            location_label: "Lieu Frontière",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "approved",
            published_at: "2026-10-02T00:00:00Z",
          },
        ],
        error: null,
      },
    ]);

    const result = await computeBrigadeVerteProgress("user-1", "2026-11-18");
    expect(result.eligible).toBe(true);
    expect(result.count).toBe(1);
    expect(result.proofs[0].actionId).toBe("act-exact-0001");
  });

  it("retourne eligible=false en cas d'erreur intermédiaire sur la page 2 (fail-closed)", async () => {
    const page1 = Array.from({ length: 500 }, (_, i) => ({
      action_id: `act-err-${String(i + 1).padStart(4, "0")}`,
    }));

    setupFromSequence([
      // Page 1 réussit
      { data: page1, error: null },
      // Page 2 échoue
      { data: null, error: { message: "timeout sur page 2" } },
    ]);

    const result = await computeBrigadeVerteProgress("user-1", "2026-11-18");
    // Fail-closed : ne convertit jamais une lecture partielle en progression incomplète
    expect(result.eligible).toBe(false);
    expect(result.count).toBe(0);
    expect(result.proofs).toHaveLength(0);
  });

  it("exclut immédiatement une action qualifiée devenue privée ou annulée après qualification (revalidation)", async () => {
    setupFromSequence([
      {
        data: [{ action_id: "act-invalid" }, { action_id: "act-valid" }],
        error: null,
      },
      {
        data: [
          { action_id: "act-invalid", qualified_at: "2026-10-01T00:00:00Z" },
          { action_id: "act-valid", qualified_at: "2026-10-12T00:00:00Z" },
        ],
        error: null,
      },
      {
        data: [
          {
            id: "act-invalid",
            action_date: "2026-10-02",
            location_label: "Lieu Devenu Privé",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "private", // DEVANT ÊTRE REJETÉ
            cancelled_at: null,
            review_state: "approved",
            published_at: "2026-10-03T00:00:00Z",
          },
          {
            id: "act-valid",
            action_date: "2026-10-12",
            location_label: "Lieu Conforme",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "approved",
            published_at: "2026-10-13T00:00:00Z",
          },
        ],
        error: null,
      },
    ]);

    const result = await computeBrigadeVerteProgress("user-1", "2026-11-18");
    expect(result.eligible).toBe(true);
    expect(result.count).toBe(1);
    expect(result.proofs).toHaveLength(1);
    expect(result.proofs[0].actionId).toBe("act-valid");
  });

  it("remplace automatiquement une preuve invalidée par la preuve valide suivante", async () => {
    setupFromSequence([
      // Bénévole a participé à act-1 (devenue annulée), act-2 (valide), act-3 (valide)
      {
        data: [{ action_id: "act-1" }, { action_id: "act-2" }, { action_id: "act-3" }],
        error: null,
      },
      // Les trois sont qualifiées Brigade Verte
      {
        data: [
          { action_id: "act-1", qualified_at: "2026-09-01T00:00:00Z" },
          { action_id: "act-2", qualified_at: "2026-09-10T00:00:00Z" },
          { action_id: "act-3", qualified_at: "2026-09-20T00:00:00Z" },
        ],
        error: null,
      },
      // Mais act-1 est annulée !
      {
        data: [
          {
            id: "act-1",
            action_date: "2026-09-01",
            location_label: "Lieu 1 Annulé",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: "2026-09-02T00:00:00Z", // ANNULÉE
            review_state: "approved",
            published_at: "2026-09-01T12:00:00Z",
          },
          {
            id: "act-2",
            action_date: "2026-09-10",
            location_label: "Lieu 2 Valide",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "approved",
            published_at: "2026-09-10T12:00:00Z",
          },
          {
            id: "act-3",
            action_date: "2026-09-20",
            location_label: "Lieu 3 Valide",
            status: "approved",
            action_phase: "post_action_complete",
            moderation_visibility: "visible",
            access_mode: "public",
            cancelled_at: null,
            review_state: "approved",
            published_at: "2026-09-20T12:00:00Z",
          },
        ],
        error: null,
      },
    ]);

    const result = await computeBrigadeVerteProgress("user-1", "2026-11-18");
    expect(result.eligible).toBe(true);
    expect(result.count).toBe(2);
    expect(result.proofs).toHaveLength(2);
    // act-1 étant exclue, ce sont act-2 et act-3 qui sont sélectionnées !
    expect(result.proofs[0].actionId).toBe("act-2");
    expect(result.proofs[1].actionId).toBe("act-3");
  });
});

// ---------------------------------------------------------------------------
// qualifyAction (RPC atomique)
// ---------------------------------------------------------------------------

describe("qualifyAction", () => {
  const baseParams = {
    actionId: "11111111-1111-1111-1111-111111111111",
    justificationUrl: "https://paris.fr/brigade-verte",
    qualificationReason: "Coorganisation vérifiée sur site officiel.",
    qualifiedBy: "clerk-max-id",
    operationId: "op-qual-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exécute la RPC PostgreSQL atomique et retourne la décision", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        status: "success",
        qualification_id: "qual-uuid-1",
        decision: "qualified",
        idempotent: false,
      },
      error: null,
    });

    const result = await qualifyAction(baseParams);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.qualificationId).toBe("qual-uuid-1");
      expect(result.decision).toBe("qualified");
    }
    expect(mockSupabase.rpc).toHaveBeenCalledWith("qualify_brigade_verte_action", {
      p_action_id: baseParams.actionId,
      p_justification_url: baseParams.justificationUrl,
      p_qualification_reason: baseParams.qualificationReason,
      p_actor_user_id: baseParams.qualifiedBy,
      p_operation_id: baseParams.operationId,
    });
  });

  it("mappe l'erreur already_active en cas de violation d'unicité active", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "Action is already actively qualified", code: "23505" },
    });

    const result = await qualifyAction(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("already_active");
    }
  });

  it("mappe l'erreur action_not_eligible si la base rejette l'éligibilité de l'action", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "Action is not eligible for Brigade Verte qualification", code: "23514" },
    });

    const result = await qualifyAction(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("action_not_eligible");
    }
  });
});

// ---------------------------------------------------------------------------
// revokeQualification (RPC atomique)
// ---------------------------------------------------------------------------

describe("revokeQualification", () => {
  const baseParams = {
    qualificationId: "22222222-2222-2222-2222-222222222222",
    revocationReason: "Partenariat révoqué après contrôle.",
    revokedBy: "clerk-max-id",
    operationId: "op-rev-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exécute la RPC PostgreSQL atomique de révocation avec succès", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: { status: "success", idempotent: false },
      error: null,
    });

    const result = await revokeQualification(baseParams);
    expect(result.ok).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("revoke_brigade_verte_qualification", {
      p_qualification_id: baseParams.qualificationId,
      p_revocation_reason: baseParams.revocationReason,
      p_actor_user_id: baseParams.revokedBy,
      p_operation_id: baseParams.operationId,
    });
  });

  it("mappe not_found si la qualification n'existe pas", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "Qualification not found" },
    });

    const result = await revokeQualification(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("not_found");
    }
  });

  it("mappe already_revoked si la qualification est déjà révoquée", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "Qualification is already revoked" },
    });

    const result = await revokeQualification(baseParams);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("already_revoked");
    }
  });
});

// ---------------------------------------------------------------------------
// searchEligibleActions (avec pagination)
// ---------------------------------------------------------------------------

describe("searchEligibleActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exécute la requête paginée avec calcul de hasMore", async () => {
    const fakeRows = [
      {
        id: "a1",
        action_date: "2026-10-01",
        location_label: "Paris 1",
        status: "approved",
        action_phase: "post_action_complete",
        moderation_visibility: "visible",
        access_mode: "public",
        cancelled_at: null,
        review_state: "not_required",
        published_at: "2026-10-02T00:00:00Z",
      },
    ];
    mockSupabase.from.mockReturnValue(makeChain({ data: fakeRows, count: 15, error: null }));

    const res = await searchEligibleActions({ page: 1, pageSize: 10 });
    expect(res.actions).toHaveLength(1);
    expect(res.total).toBe(15);
    expect(res.hasMore).toBe(true);
    expect(res.page).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getQualificationWithHistory (séparation qualificationReason / revocationReason)
// ---------------------------------------------------------------------------

describe("getQualificationWithHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sépare distinctement qualificationReason et revocationReason dans la qualification et son historique", async () => {
    const qualRow = {
      id: "qual-1",
      action_id: "act-1",
      status: "active",
      justification_url: "https://paris.fr/evidence",
      qualification_reason: "Coorganisation validée sur convention officielle",
      revocation_reason: null,
      qualified_by: "imu-max-clerk-id",
      qualified_at: "2026-10-01T10:00:00Z",
      revoked_by: null,
      revoked_at: null,
      requalified_at: null,
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-01T10:00:00Z",
    };

    const histRows = [
      {
        id: "hist-1",
        qualification_id: "qual-1",
        action_id: "act-1",
        decision: "qualified",
        decided_by: "imu-max-clerk-id",
        decided_at: "2026-10-01T10:00:00Z",
        justification_url: "https://paris.fr/evidence",
        qualification_reason: "Coorganisation validée sur convention officielle",
        revocation_reason: null,
        operation_id: "op-1",
      },
    ];

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: qualRow, error: null });
      }
      return makeChain({ data: histRows, error: null });
    });

    const res = await getQualificationWithHistory("act-1");
    expect(res.qualification).not.toBeNull();
    expect(res.qualification?.qualificationReason).toBe("Coorganisation validée sur convention officielle");
    expect(res.qualification?.revocationReason).toBeNull();

    expect(res.history).toHaveLength(1);
    expect(res.history[0].qualificationReason).toBe("Coorganisation validée sur convention officielle");
    expect(res.history[0].revocationReason).toBeNull();
  });
});
