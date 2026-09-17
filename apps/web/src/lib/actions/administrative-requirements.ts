import type { ActionPhase, ActionPreparationData } from "./types";
import { sanitizeFormalitiesWorkflowForCreation } from "./formalities-workflow";

export const ADMINISTRATIVE_REQUIREMENT_STATUSES = ["pending", "validated"] as const;
export type AdministrativeRequirementsStatus =
  (typeof ADMINISTRATIVE_REQUIREMENT_STATUSES)[number];

export type AdministrativeRequirements = {
  status: AdministrativeRequirementsStatus;
  validatedAt?: string | null;
  validatedByUserId?: string | null;
};

export type AdministrativeRequirementsRead = {
  status: AdministrativeRequirementsStatus;
  validatedAt: string | null;
};

export const PENDING_ADMINISTRATIVE_REQUIREMENTS: AdministrativeRequirements = {
  status: "pending",
  validatedAt: null,
  validatedByUserId: null,
};

/**
 * The generic create payload may carry this key for backwards compatibility,
 * but it never gets to choose the server-managed state.
 */
export function sanitizeAdministrativeRequirementsForCreation(
  actionPhase: ActionPhase | undefined,
  preparationData: ActionPreparationData,
): ActionPreparationData {
  const clientPreparationData = { ...preparationData };
  delete clientPreparationData.administrativeRequirements;
  const sanitizedPreparationData = sanitizeFormalitiesWorkflowForCreation(
    clientPreparationData,
  );

  return actionPhase === "pre_action"
    ? {
        ...sanitizedPreparationData,
        administrativeRequirements: { ...PENDING_ADMINISTRATIVE_REQUIREMENTS },
      }
    : sanitizedPreparationData;
}

/**
 * Preserve the canonical server value whenever a generic PATCH writes the
 * preparation JSON. A PATCH can add ordinary preparation fields, but cannot
 * create, reset, validate, or forge this protected sub-state.
 */
export function preserveCanonicalAdministrativeRequirements(
  currentPreparationData: ActionPreparationData | null | undefined,
  incomingPreparationData: ActionPreparationData | null | undefined,
): ActionPreparationData {
  const current = currentPreparationData ?? {};
  const incoming = incomingPreparationData ?? {};
  const clientPreparationData = { ...incoming };
  delete clientPreparationData.administrativeRequirements;
  const hasCanonicalValue = Object.prototype.hasOwnProperty.call(
    current,
    "administrativeRequirements",
  );

  return hasCanonicalValue
    ? {
        ...clientPreparationData,
        administrativeRequirements: current.administrativeRequirements,
      }
    : clientPreparationData;
}

export function normalizeAdministrativeRequirements(
  value: unknown,
): AdministrativeRequirements {
  if (!value || typeof value !== "object") {
    return { status: "pending", validatedAt: null, validatedByUserId: null };
  }

  const candidate = value as {
    status?: unknown;
    validatedAt?: unknown;
    validatedByUserId?: unknown;
  };
  if (candidate.status !== "validated") {
    return { status: "pending", validatedAt: null, validatedByUserId: null };
  }

  return {
    status: "validated",
    validatedAt:
      typeof candidate.validatedAt === "string" && candidate.validatedAt.trim()
        ? candidate.validatedAt
        : null,
    validatedByUserId:
      typeof candidate.validatedByUserId === "string" && candidate.validatedByUserId.trim()
        ? candidate.validatedByUserId
        : null,
  };
}

/** Public/editor projection: the validator identity remains server-only. */
export function projectAdministrativeRequirementsForRead(
  value: unknown,
): AdministrativeRequirementsRead {
  const normalized = normalizeAdministrativeRequirements(value);
  return {
    status: normalized.status,
    validatedAt: normalized.validatedAt ?? null,
  };
}
