export const ACTION_ACCESSIBILITY_NEEDS = [
  "step_free_route",
  "shorter_route",
  "rest_breaks",
  "adapted_equipment",
  "simplified_information",
  "written_instructions",
  "oral_instructions",
  "human_support",
  "personal_companion",
] as const;

export type ActionAccessibilityNeed = (typeof ACTION_ACCESSIBILITY_NEEDS)[number];
export type ActionAccessibilityCheckIn = "completed" | "not_applicable";
export type ActionAccessibilityCheckInUpdate = ActionAccessibilityCheckIn | null;

export type ActionAccessibilitySupportRequest = {
  id: string;
  action_id: string;
  requester_user_id: string;
  requested_needs: ActionAccessibilityNeed[];
  day_tracking_consent: boolean;
  arrival_status: ActionAccessibilityCheckIn | null;
  contact_status: ActionAccessibilityCheckIn | null;
  departure_status: ActionAccessibilityCheckIn | null;
  retention_expires_at: string;
  created_at: string;
  updated_at: string;
};

export type ActionAccessibilitySupportOrganizerRequest = Omit<ActionAccessibilitySupportRequest, "requester_user_id"> & {
  participantLabel: string;
};
