export const ADMINISTRATIVE_REQUIREMENT_STATUSES = ["pending", "validated"] as const;
export type AdministrativeRequirementsStatus =
  (typeof ADMINISTRATIVE_REQUIREMENT_STATUSES)[number];

export type AdministrativeRequirements = {
  status: AdministrativeRequirementsStatus;
  validatedAt?: string | null;
  validatedByUserId?: string | null;
};

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
