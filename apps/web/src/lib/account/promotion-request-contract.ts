import type { AppProfile } from "@/lib/profiles";

export type PromotionRequestTargetRole = "elu" | "admin";

const REQUESTABLE_ROLES: Readonly<Record<AppProfile, readonly PromotionRequestTargetRole[]>> = {
  benevole: ["elu", "admin"],
  coordinateur: ["elu", "admin"],
  scientifique: ["elu", "admin"],
  entreprise: ["elu", "admin"],
  elu: ["admin"],
  admin: [],
  max: [],
};

export function getRequestablePromotionRoles(
  currentRole: AppProfile,
): readonly PromotionRequestTargetRole[] {
  return REQUESTABLE_ROLES[currentRole];
}

export function canRequestPromotionRole(
  currentRole: AppProfile,
  requestedRole: string,
): requestedRole is PromotionRequestTargetRole {
  return getRequestablePromotionRoles(currentRole).includes(
    requestedRole as PromotionRequestTargetRole,
  );
}
