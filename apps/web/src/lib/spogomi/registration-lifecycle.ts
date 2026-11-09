export type SpogomiAdmissionRequestKind = "team_join" | "registration" | "presence_regularization";
export type SpogomiAdmissionStatus = "pending" | "approved" | "rejected" | "cancelled";

/**
 * Presentation-side mirror of the server matrix. The SQL function
 * spogomi_admission_transition_allowed remains the enforcement owner; this
 * module keeps the UI and tests from inventing a different lifecycle.
 */
export const SPOGOMI_ADMISSION_TRANSITIONS: Readonly<Record<SpogomiAdmissionStatus, readonly SpogomiAdmissionStatus[]>> = {
  pending: ["approved", "rejected", "cancelled"],
  approved: [],
  rejected: [],
  cancelled: [],
};

export function isSpogomiAdmissionTransitionAllowed(
  currentStatus: SpogomiAdmissionStatus,
  targetStatus: SpogomiAdmissionStatus,
): boolean {
  return currentStatus === targetStatus || SPOGOMI_ADMISSION_TRANSITIONS[currentStatus].includes(targetStatus);
}

export function requiresSpogomiQuizForNewAdmission(params: {
  requestKind: SpogomiAdmissionRequestKind;
  hasActiveRequest: boolean;
  hasRegisteredParticipant: boolean;
}): boolean {
  if (params.requestKind !== "registration") return false;
  return !params.hasActiveRequest && !params.hasRegisteredParticipant;
}

export function canReopenSpogomiParticipant(params: {
  registrationStatus: "registered" | "withdrawn";
  sourceSystem: string;
  sameDivision: boolean;
}): boolean {
  return params.registrationStatus === "withdrawn" && params.sourceSystem === "direct_registration" && params.sameDivision;
}
