/**
 * Types du contrat Brigade Verte — Parcours Éco-Citoyen Quartier Propre.
 *
 * INVARIANTS :
 * - Aucun XP, badge, droit, diplôme ou certification n'est créé par ce contrat.
 * - Les qualifications sont portées par IMU max uniquement, sur preuve explicite.
 * - Aucune déduction automatique depuis le titre, les notes ou l'organizer_id.
 */

export type BrigadeVerteStatus = "active" | "revoked";
export type BrigadeVerteDecision = "qualified" | "revoked" | "requalified";

export type BrigadeVerteQualification = {
  id: string;
  actionId: string;
  status: BrigadeVerteStatus;
  justificationUrl: string;
  revocationReason: string | null;
  qualifiedBy: string;
  qualifiedAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  requalifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrigadeVerteHistoryEntry = {
  id: string;
  qualificationId: string;
  actionId: string;
  decision: BrigadeVerteDecision;
  decidedBy: string;
  decidedAt: string;
  justificationUrl: string | null;
  revocationReason: string | null;
  operationId: string | null;
};

/**
 * Colonnes d'une action vérifiées côté base pour l'éligibilité.
 * L'éligibilité NE se déduit PAS du titre, des notes ou de l'organizer_id.
 */
export type EligibleActionRow = {
  id: string;
  actionDate: string;
  locationLabel: string;
  status: string;
  actionPhase: string;
  moderationVisibility: string;
  cancelledAt: string | null;
  reviewState: string;
  publishedAt: string | null;
};

/** Résultat de l'opération de qualification d'une action. */
export type QualifyActionResult =
  | { ok: true; qualificationId: string; decision: BrigadeVerteDecision }
  | {
      ok: false;
      error: "already_active" | "action_not_eligible" | "db_error";
      message: string;
    };

/** Résultat de l'opération de révocation d'une qualification. */
export type RevokeActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_found" | "already_revoked" | "db_error";
      message: string;
    };

/**
 * Preuve publique retournée dans la projection personnelle.
 * Ne contient jamais les identités d'autres participants
 * ni les commentaires administratifs.
 */
export type BrigadeVertePublicProof = {
  actionId: string;
  actionDate: string;
  locationLabel: string;
  qualifiedAt: string;
};

/** Résultat du calcul de progression personnelle Brigade Verte. */
export type BrigadeVerteProgress = {
  /** false si erreur Supabase (fail-closed) — ne jamais afficher count=0 sur erreur */
  eligible: boolean;
  count: number;
  proofs: BrigadeVertePublicProof[];
};
