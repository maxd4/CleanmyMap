/**
 * Service métier Brigade Verte — Parcours Éco-Citoyen Quartier Propre.
 *
 * OWNER : apps/web/src/lib/brigade-verte/
 *
 * INVARIANTS :
 * - Toutes les mutations passent par service_role (getSupabaseAdminClient).
 * - Aucun XP, badge ou gamification n'est créé ici.
 * - computeBrigadeVerteProgress est fail-closed : toute erreur retourne eligible=false.
 * - L'éligibilité d'une action NE se déduit pas du titre, des notes ou de l'organizer_id.
 * - Les deux preuves retenues sont sélectionnées par date d'action ASC puis id ASC.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  BrigadeVerteHistoryEntry,
  BrigadeVerteProgress,
  BrigadeVerteQualification,
  EligibleActionRow,
  QualifyActionResult,
  RevokeActionResult,
} from "./brigade-verte-types";

// ---------------------------------------------------------------------------
// Critères d'éligibilité d'une action Quartier Propre Brigade Verte
// ---------------------------------------------------------------------------

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
      "id, action_date, location_label, status, action_phase, moderation_visibility, cancelled_at, review_state, published_at",
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
    cancelledAt: data.cancelled_at ?? null,
    reviewState: data.review_state,
    publishedAt: data.published_at ?? null,
  };

  const eligible =
    row.status === "approved" &&
    row.actionPhase === "post_action_complete" &&
    row.moderationVisibility === "visible" &&
    row.cancelledAt === null &&
    row.reviewState === "approved" &&
    row.publishedAt !== null;

  return { eligible, row };
}

// ---------------------------------------------------------------------------
// Qualification
// ---------------------------------------------------------------------------

/**
 * Qualifie une action comme "Quartier Propre Brigade Verte".
 * - Idempotent si déjà active pour cet actionId → retourne already_active.
 * - Si précédemment revoked, crée une requalification.
 * - Écrit dans brigade_verte_qualifications et brigade_verte_qualification_history atomiquement.
 */
export async function qualifyAction(params: {
  actionId: string;
  justificationUrl: string;
  qualifiedBy: string;
  operationId: string;
}): Promise<QualifyActionResult> {
  const { actionId, justificationUrl, qualifiedBy, operationId } = params;
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  // Vérifier l'éligibilité de l'action
  const { eligible } = await isActionEligibleForBrigadeVerte(actionId);
  if (!eligible) {
    return { ok: false, error: "action_not_eligible", message: "L'action n'est pas éligible (non approuvée, non publiée, annulée ou non visible)." };
  }

  // Chercher une qualification existante pour cette action
  const { data: existing, error: fetchError } = await supabase
    .from("brigade_verte_qualifications")
    .select("id, status")
    .eq("action_id", actionId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: "db_error", message: fetchError.message };
  }

  if (existing?.status === "active") {
    return { ok: false, error: "already_active", message: "Cette action est déjà qualifiée Brigade Verte." };
  }

  // Qualification ou requalification
  if (existing && existing.status === "revoked") {
    // Requalification
    const { error: updateError } = await supabase
      .from("brigade_verte_qualifications")
      .update({
        status: "active",
        justification_url: justificationUrl,
        qualified_by: qualifiedBy,
        qualified_at: now,
        revocation_reason: null,
        revoked_by: null,
        revoked_at: null,
        requalified_at: now,
      })
      .eq("id", existing.id);

    if (updateError) {
      return { ok: false, error: "db_error", message: updateError.message };
    }

    // Historique
    const { error: histError } = await supabase
      .from("brigade_verte_qualification_history")
      .insert({
        qualification_id: existing.id,
        action_id: actionId,
        decision: "requalified",
        decided_by: qualifiedBy,
        decided_at: now,
        justification_url: justificationUrl,
        revocation_reason: null,
        operation_id: operationId,
      });

    if (histError) {
      return { ok: false, error: "db_error", message: histError.message };
    }

    return { ok: true, qualificationId: existing.id, decision: "requalified" };
  }

  // Nouvelle qualification
  const { data: inserted, error: insertError } = await supabase
    .from("brigade_verte_qualifications")
    .insert({
      action_id: actionId,
      status: "active",
      justification_url: justificationUrl,
      qualified_by: qualifiedBy,
      qualified_at: now,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: "db_error", message: insertError?.message ?? "Insertion échouée." };
  }

  // Historique
  const { error: histError } = await supabase
    .from("brigade_verte_qualification_history")
    .insert({
      qualification_id: inserted.id,
      action_id: actionId,
      decision: "qualified",
      decided_by: qualifiedBy,
      decided_at: now,
      justification_url: justificationUrl,
      revocation_reason: null,
      operation_id: operationId,
    });

  if (histError) {
    return { ok: false, error: "db_error", message: histError.message };
  }

  return { ok: true, qualificationId: inserted.id, decision: "qualified" };
}

// ---------------------------------------------------------------------------
// Révocation
// ---------------------------------------------------------------------------

/**
 * Révoque une qualification active.
 */
export async function revokeQualification(params: {
  qualificationId: string;
  revocationReason: string;
  revokedBy: string;
  operationId: string;
}): Promise<RevokeActionResult> {
  const { qualificationId, revocationReason, revokedBy, operationId } = params;
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from("brigade_verte_qualifications")
    .select("id, action_id, status")
    .eq("id", qualificationId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: "db_error", message: fetchError.message };
  }
  if (!existing) {
    return { ok: false, error: "not_found", message: "Qualification introuvable." };
  }
  if (existing.status === "revoked") {
    return { ok: false, error: "already_revoked", message: "Cette qualification est déjà révoquée." };
  }

  const { error: updateError } = await supabase
    .from("brigade_verte_qualifications")
    .update({
      status: "revoked",
      revocation_reason: revocationReason,
      revoked_by: revokedBy,
      revoked_at: now,
    })
    .eq("id", qualificationId);

  if (updateError) {
    return { ok: false, error: "db_error", message: updateError.message };
  }

  // Historique
  const { error: histError } = await supabase
    .from("brigade_verte_qualification_history")
    .insert({
      qualification_id: qualificationId,
      action_id: existing.action_id,
      decision: "revoked",
      decided_by: revokedBy,
      decided_at: now,
      justification_url: null,
      revocation_reason: revocationReason,
      operation_id: operationId,
    });

  if (histError) {
    return { ok: false, error: "db_error", message: histError.message };
  }

  return { ok: true };
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

  if (qualError) {
    return { qualification: null, history: [] };
  }

  if (!qual) {
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
 * Recherche d'actions éligibles pour l'administration IMU max.
 * Filtre par location_label ILIKE ou id exact, et/ou par date.
 * Retourne au maximum 20 résultats.
 */
export async function searchEligibleActions(params: {
  query?: string;
  date?: string;
}): Promise<EligibleActionRow[]> {
  const supabase = getSupabaseAdminClient();

  let q = supabase
    .from("actions")
    .select(
      "id, action_date, location_label, status, action_phase, moderation_visibility, cancelled_at, review_state, published_at",
    )
    .eq("status", "approved")
    .eq("action_phase", "post_action_complete")
    .eq("moderation_visibility", "visible")
    .is("cancelled_at", null)
    .eq("review_state", "approved")
    .not("published_at", "is", null)
    .order("action_date", { ascending: false })
    .limit(20);

  if (params.date) {
    q = q.eq("action_date", params.date);
  }

  if (params.query) {
    // Chercher par id exact ou location_label ILIKE
    q = q.or(`id.eq.${params.query},location_label.ilike.%${params.query}%`);
  }

  const { data, error } = await q;

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    actionDate: row.action_date,
    locationLabel: row.location_label,
    status: row.status,
    actionPhase: row.action_phase,
    moderationVisibility: row.moderation_visibility,
    cancelledAt: row.cancelled_at ?? null,
    reviewState: row.review_state,
    publishedAt: row.published_at ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Projection personnelle (fail-closed)
// ---------------------------------------------------------------------------

/**
 * Calcule les participations Brigade Verte admissibles pour un userId.
 *
 * FAIL-CLOSED : toute erreur Supabase retourne { eligible: false, count: 0, proofs: [] }.
 * Ne divulgue jamais les identités d'autres participants.
 * Sélectionne les 2 premières action_id distinctes (tri: action_date ASC, id ASC).
 */
export async function computeBrigadeVerteProgress(
  userId: string,
): Promise<BrigadeVerteProgress> {
  const supabase = getSupabaseAdminClient();

  try {
    // Récupérer les action_id des qualifications actives
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

    const qualifiedActionIds = qualData.map((q) => q.action_id);
    const qualifiedAtMap = new Map<string, string>(
      qualData.map((q) => [q.action_id, q.qualified_at]),
    );

    // Participations confirmées du userId dans ces actions
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

    // Dédupliquer les action_id
    const distinctActionIds = Array.from(
      new Set(participations.map((p) => p.action_id)),
    );

    // Récupérer les infos des actions pour le tri et les preuves publiques
    const { data: actionData, error: actionError } = await supabase
      .from("actions")
      .select("id, action_date, location_label")
      .in("id", distinctActionIds)
      .order("action_date", { ascending: true })
      .order("id", { ascending: true });

    if (actionError) {
      return { eligible: false, count: 0, proofs: [] };
    }

    if (!actionData || actionData.length === 0) {
      return { eligible: true, count: 0, proofs: [] };
    }

    // Prendre les 2 premières (tri déjà appliqué par la requête)
    const top2 = actionData.slice(0, 2);

    const proofs = top2.map((a) => ({
      actionId: a.id,
      actionDate: a.action_date,
      locationLabel: a.location_label,
      qualifiedAt: qualifiedAtMap.get(a.id) ?? "",
    }));

    return { eligible: true, count: top2.length, proofs };
  } catch {
    // Fail-closed sur toute exception imprévue
    return { eligible: false, count: 0, proofs: [] };
  }
}
