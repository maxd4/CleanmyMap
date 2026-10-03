export type RoleChangeReasonError = "required" | "too_short" | "too_long";

export const ROLE_CHANGE_REASON_MIN_LENGTH = 5;
export const ROLE_CHANGE_REASON_MAX_LENGTH = 500;

export function validateRoleChangeReason(value: string): RoleChangeReasonError | null {
  const reason = value.trim();
  if (reason.length === 0) {
    return "required";
  }
  if (reason.length < ROLE_CHANGE_REASON_MIN_LENGTH) {
    return "too_short";
  }
  if (reason.length > ROLE_CHANGE_REASON_MAX_LENGTH) {
    return "too_long";
  }
  return null;
}
