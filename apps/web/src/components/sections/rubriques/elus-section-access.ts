import { getRequestablePromotionRoles } from "@/lib/account/promotion-request-contract";
import { normalizeProfileRole } from "@/lib/profiles";

type ErrorWithStatus = { status?: unknown };

export function isPromotionEligibleEluAccessDenied(
  error: unknown,
  isSignedIn: boolean,
  role: string | null | undefined,
): boolean {
  const grantedRole = normalizeProfileRole(role) ?? "benevole";
  const status =
    error && typeof error === "object"
      ? (error as ErrorWithStatus).status
      : undefined;

  return Boolean(
    isSignedIn &&
      status === 403 &&
      getRequestablePromotionRoles(grantedRole).includes("elu"),
  );
}
