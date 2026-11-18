/**
 * Service métier Brigade Verte — Parcours Éco-Citoyen Quartier Propre.
 *
 * OWNER : apps/web/src/lib/brigade-verte/
 *
 * INVARIANTS :
 * - Toutes les mutations passent par service_role (getSupabaseAdminClient) via RPC atomiques PostgreSQL.
 * - Atomicité garantie : qualification, historique immuable et audit sont validés ou rollback ensemble.
 * - Aucun XP, badge ou gamification n'est créé ici.
 * - computeBrigadeVerteProgress est fail-closed : toute erreur retourne eligible=false.
 * - L'éligibilité d'une action NE se déduit pas du titre, des notes ou de l'organizer_id.
 * - Le prédicat d'éligibilité complet (action passée, finalisée, approuvée, publiée, visible, publique, non annulée, review_state not_required/approved)
 *   est revalidé dynamiquement à la lecture personnelle.
 * - Les deux preuves retenues sont sélectionnées par date d'action ASC puis id ASC avec remplacement automatique.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  BrigadeVerteHistoryEntry,
  BrigadeVerteProgress,
  BrigadeVerteQualification,
  EligibleActionRow,
  QualifyActionResult,
  RevokeActionResult,
  SearchEligibleActionsParams,
  SearchEligibleActionsResult,
} from "./brigade-verte-types";

// ---------------------------------------------------------------------------
// Critères d'éligibilité d'une action Quartier Propre Brigade Verte
// ---------------------------------------------------------------------------

/**
 * Helper pur vérifiant si les champs d'une action respectent le prédicat d'éligibilité canonique :
 * 1. Date passée (< aujourd'hui en UTC/local YYYY-MM-DD)
 * 2. Phase finalisée (action_phase = 'post_action_complete')
 * 3. Statut approuvé (status = 'approved')
 * 4. Publiée (published_at IS NOT NULL)
 * 5. Visible (moderation_visibility = 'visible')
 * 6. Publique (access_mode = 'public')
 * 7. Non annulée (cancelled_at IS NULL)
 * 8. Revue not_required ou approved (review_state IN ('not_required', 'approved'))
 */
export function checkActionEligibilityPredicate(row: EligibleActionRow, referenceDate?: string): boolean {
  const today = referenceDate ?? new Date().toISOString().slice(0, 10);
  const isPast = row.actionDate < today;
  const isApproved = row.status === "approved";
  const isComplete = row.actionPhase === "post_action_complete";
  const isVisible = row.moderationVisibility === "visible";
  const isPublic = (row.accessMode ?? "public") === "public";
  const isNotCancelled = row.cancelledAt === null;
  const isReviewValid = row.reviewState === "approved" || row.reviewState === "not_required";
  const isPublished = row.publishedAt !== null;

  return (
    isPast &&
    isApproved &&
    isComplete &&
    isVisible &&
    isPublic &&
    isNotCancelled &&
    isReviewValid &&
    isPublished
  );
}

/**
 * Vérifie qu'une action est éligible pour une qualification Brigade Verte.
 * L'éligibilité NE se déduit pas du titre, des notes ou de l'organizer_id.
 */
export async function isActionEligibleForBrigadeVerte(
  actionId: string,
): Promise<{ eligible: boolean; row: EligibleActionRow | null }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("actions")
    .select(
      "id, action_date, location_label, status, action_phase, moderation_visibility, access_mode, cancelled_at, review_state, published_at",
    )
    .eq("id", actionId)
    .maybeSingle();

  if (error || !data) {
    return { eligible: false, row: null };
  }

  const row: EligibleActionRow = {
    id: data.id,
    actionDate: data.action_date,
    locationLabel: data.location_label,
    status: data.status,
    actionPhase: data.action_phase,
    moderationVisibility: data.moderation_visibility,
    accessMode: data.access_mode ?? "public",
    cancelledAt: data.cancelled_at ?? null,
    reviewState: data.review_state ?? "not_required",
    publishedAt: data.published_at ?? null,
  };

  const eligible = checkActionEligibilityPredicate(row);

  return { eligible, row };
}

// ---------------------------------------------------------------------------
// Qualification (RPC PostgreSQL atomique)
// ---------------------------------------------------------------------------

/**
 * Qualifie une action comme "Quartier Propre Brigade Verte" via RPC atomique.
 * - Idempotent sur operationId.
 * - Vérifie l'éligibilité sous verrou.
 * - Gère nouvelle qualification et requalification après révocation.
 * - Enregistre qualification, décision historique et audit de manière atomique.
 */
export async function qualifyAction(params: {
  actionId: string;
  justificationUrl: string;
  qualificationReason: string;
  qualifiedBy: string;
  operationId: string;
}): Promise<QualifyActionResult> {
  const { actionId, justificationUrl, qualificationReason, qualifiedBy, operationId } = params;
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc("qualify_brigade_verte_action", {
    p_action_id: actionId,
    p_justification_url: justificationUrl,
    p_qualification_reason: qualificationReason,
    p_actor_user_id: qualifiedBy,
    p_operation_id: operationId,
  });

  if (error) {
    // Parser les codes d'erreur PostgreSQL renvoyés par la RPC
    const msg = error.message || "";
    if (msg.includes("already actively qualified") || error.code === "23505") {
      return {
        ok: false,
        error: "already_active",
        message: "Cette action est déjà qualifiée Brigade Verte.",
      };
    }
    if (msg.includes("not eligible") || error.code === "23514") {
      return {
        ok: false,
        error: "action_not_eligible",
        message:
          "L'action n'est pas éligible (date future, non finalisée, non approuvée, privée, annulée ou non publiée).",
      };
    }
    return {
      ok: false,
      error: "db_error",
      message: error.message,
    };
  }

  const result = data as {
    status: string;
    qualification_id: string;
    decision: "qualified" | "requalified" | "idempotent_replay";
    idempotent?: boolean;
  };

  const decision = result.decision === "idempotent_replay" ? "qualified" : result.decision;

  return {
    ok: true,
    qualificationId: result.qualification_id,
    decision,
    idempotent: Boolean(result.idempotent),
  };
}

// ---------------------------------------------------------------------------
// Révocation (RPC PostgreSQL atomique)
// ---------------------------------------------------------------------------

/**
 * Révoque une qualification active via RPC atomique.
 * - Idempotent sur operationId.
 * - Enregistre révocation, décision historique et audit de manière atomique.
 */
export async function revokeQualification(params: {
  qualificationId: string;
  revocationReason: string;
  revokedBy: string;
  operationId: string;
}): Promise<RevokeActionResult> {
  const { qualificationId, revocationReason, revokedBy, operationId } = params;
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc("revoke_brigade_verte_qualification", {
    p_qualification_id: qualificationId,
    p_revocation_reason: revocationReason,
    p_actor_user_id: revokedBy,
    p_operation_id: operationId,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("Qualification not found")) {
      return {
        ok: false,
        error: "not_found",
        message: "Qualification introuvable.",
      };
    }
    if (msg.includes("already revoked")) {
      return {
        ok: false,
        error: "already_revoked",
        message: "Cette qualification est déjà révoquée.",
      };
    }
    return {
      ok: false,
      error: "db_error",
      message: error.message,
    };
  }

  const result = data as {
    status: string;
    idempotent?: boolean;
  };

  return {
    ok: true,
    idempotent: Boolean(result.idempotent),
  };
}

// ---------------------------------------------------------------------------
// Lecture admin
// ---------------------------------------------------------------------------

/** Retourne la qualification + historique d'une action donnée. */
export async function getQualificationWithHistory(actionId: string): Promise<{
  qualification: BrigadeVerteQualification | null;
  history: BrigadeVerteHistoryEntry[];
}> {
  const supabase = getSupabaseAdminClient();

  const { data: qual, error: qualError } = await supabase
    .from("brigade_verte_qualifications")
    .select("*")
    .eq("action_id", actionId)
    .maybeSingle();

  if (qualError || !qual) {
    return { qualification: null, history: [] };
  }

  const qualification: BrigadeVerteQualification = {
    id: qual.id,
    actionId: qual.action_id,
    status: qual.status,
    justificationUrl: qual.justification_url,
    revocationReason: qual.revocation_reason ?? null,
    qualifiedBy: qual.qualified_by,
    qualifiedAt: qual.qualified_at,
    revokedBy: qual.revoked_by ?? null,
    revokedAt: qual.revoked_at ?? null,
    requalifiedAt: qual.requalified_at ?? null,
    createdAt: qual.created_at,
    updatedAt: qual.updated_at,
  };

  const { data: histRows, error: histError } = await supabase
    .from("brigade_verte_qualification_history")
    .select("*")
    .eq("qualification_id", qual.id)
    .order("decided_at", { ascending: false });

  if (histError || !histRows) {
    return { qualification, history: [] };
  }

  const history: BrigadeVerteHistoryEntry[] = histRows.map((h) => ({
    id: h.id,
    qualificationId: h.qualification_id,
    actionId: h.action_id,
    decision: h.decision,
    decidedBy: h.decided_by,
    decidedAt: h.decided_at,
    justificationUrl: h.justification_url ?? null,
    revocationReason: h.revocation_reason ?? null,
    operationId: h.operation_id ?? null,
  }));

  return { qualification, history };
}

/**
 * Recherche paginée d'actions éligibles pour l'administration IMU max.
 * Filtre sur le prédicat d'éligibilité complet :
 * - action_date < CURRENT_DATE
 * - status = 'approved'
 * - action_phase = 'post_action_complete'
 * - moderation_visibility = 'visible'
 * - access_mode = 'public'
 * - cancelled_at IS NULL
 * - review_state IN ('approved', 'not_required')
 * - published_at IS NOT NULL
 */
export async function searchEligibleActions(
  params: SearchEligibleActionsParams,
): Promise<SearchEligibleActionsResult> {
  const supabase = getSupabaseAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize ?? 10));
  const offset = (page - 1) * pageSize;
  const today = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from("actions")
    .select(
      "id, action_date, location_label, status, action_phase, moderation_visibility, access_mode, cancelled_at, review_state, published_at",
      { count: "exact" },
    )
    .lt("action_date", today)
    .eq("status", "approved")
    .eq("action_phase", "post_action_complete")
    .eq("moderation_visibility", "visible")
    .or("access_mode.is.null,access_mode.eq.public")
    .is("cancelled_at", null)
    .in("review_state", ["approved", "not_required"])
    .not("published_at", "is", null);

  if (params.date) {
    q = q.eq("action_date", params.date);
  }

  if (params.query) {
    const trimmed = params.query.trim();
    if (trimmed) {
      q = q.or(`id.eq.${trimmed},location_label.ilike.%${trimmed}%`);
    }
  }

  q = q.order("action_date", { ascending: false }).order("id", { ascending: true }).range(offset, offset + pageSize - 1);

  const { data, count, error } = await q;

  if (error) {
    return {
      actions: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: error.message,
    };
  }

  const total = count ?? (data ? data.length : 0);
  const actions: EligibleActionRow[] = (data ?? []).map((row) => ({
    id: row.id,
    actionDate: row.action_date,
    locationLabel: row.location_label,
    status: row.status,
    actionPhase: row.action_phase,
    moderationVisibility: row.moderation_visibility,
    accessMode: row.access_mode ?? "public",
    cancelledAt: row.cancelled_at ?? null,
    reviewState: row.review_state ?? "not_required",
    publishedAt: row.published_at ?? null,
  }));

  return {
    actions,
    total,
    page,
    pageSize,
    hasMore: offset + actions.length < total,
  };
}

// ---------------------------------------------------------------------------
// Projection personnelle (fail-closed avec revalidation exhaustive)
// ---------------------------------------------------------------------------

/**
 * Calcule les participations Brigade Verte admissibles pour un userId.
 *
 * FAIL-CLOSED : toute erreur Supabase retourne { eligible: false, count: 0, proofs: [] }.
 * INVARIANTS :
 * - Aucune pagination tronquée silencieusement : lecture exhaustive de toutes les qualifications actives.
 * - Revalidation systématique du prédicat d'éligibilité complet de chaque action associée.
 * - Une action devenue privée, invalidée, annulée ou avec date future est immédiatement rejetée.
 * - Remplacement automatique et déterministe : tri par action_date ASC puis id ASC, sélection des 2 premières.
 * - Ne divulgue jamais les identités d'autres participants ni les motifs administratifs.
 */
export async function computeBrigadeVerteProgress(
  userId: string,
  referenceDate?: string,
): Promise<BrigadeVerteProgress> {
  const supabase = getSupabaseAdminClient();

  try {
    // 1. Récupérer toutes les qualifications actives
    const { data: qualData, error: qualError } = await supabase
      .from("brigade_verte_qualifications")
      .select("action_id, qualified_at")
      .eq("status", "active");

    if (qualError) {
      return { eligible: false, count: 0, proofs: [] };
    }

    if (!qualData || qualData.length === 0) {
      return { eligible: true, count: 0, proofs: [] };
    }

    const qualifiedActionIds = Array.from(new Set(qualData.map((q) => q.action_id)));
    const qualifiedAtMap = new Map<string, string>(
      qualData.map((q) => [q.action_id, q.qualified_at]),
    );

    // 2. Participations confirmées du userId dans ces actions
    const { data: participations, error: partError } = await supabase
      .from("action_participants")
      .select("action_id")
      .eq("user_id", userId)
      .eq("participation_status", "confirmed")
      .in("action_id", qualifiedActionIds);

    if (partError) {
      return { eligible: false, count: 0, proofs: [] };
    }

    if (!participations || participations.length === 0) {
      return { eligible: true, count: 0, proofs: [] };
    }

    const candidateActionIds = Array.from(
      new Set(participations.map((p) => p.action_id)),
    );

    // 3. Récupérer les détails complets des actions candidates pour réévaluer rigoureusement leur éligibilité
    const { data: actionsData, error: actionsError } = await supabase
      .from("actions")
      .select(
        "id, action_date, location_label, status, action_phase, moderation_visibility, access_mode, cancelled_at, review_state, published_at",
      )
      .in("id", candidateActionIds);

    if (actionsError || !actionsData) {
      return { eligible: false, count: 0, proofs: [] };
    }

    // 4. Filtrer uniquement les actions qui satisfont TOUS les critères d'éligibilité actuels
    const eligibleActions = actionsData.filter((a) => {
      const row: EligibleActionRow = {
        id: a.id,
        actionDate: a.action_date,
        locationLabel: a.location_label,
        status: a.status,
        actionPhase: a.action_phase,
        moderationVisibility: a.moderation_visibility,
        accessMode: a.access_mode ?? "public",
        cancelledAt: a.cancelled_at ?? null,
        reviewState: a.review_state ?? "not_required",
        publishedAt: a.published_at ?? null,
      };
      return checkActionEligibilityPredicate(row, referenceDate);
    });

    if (eligibleActions.length === 0) {
      return { eligible: true, count: 0, proofs: [] };
    }

    // 5. Tri déterministe : date d'action ASC puis ID ASC
    eligibleActions.sort((a, b) => {
      if (a.action_date !== b.action_date) {
        return a.action_date.localeCompare(b.action_date);
      }
      return a.id.localeCompare(b.id);
    });

    // 6. Sélectionner les deux premières preuves admissibles
    const top2 = eligibleActions.slice(0, 2);

    const proofs = top2.map((a) => ({
      actionId: a.id,
      actionDate: a.action_date,
      locationLabel: a.location_label,
      qualifiedAt: qualifiedAtMap.get(a.id) ?? "",
    }));

    return {
      eligible: true,
      count: top2.length,
      proofs,
    };
  } catch {
    // Fail-closed sur toute exception imprévue
    return { eligible: false, count: 0, proofs: [] };
  }
}
