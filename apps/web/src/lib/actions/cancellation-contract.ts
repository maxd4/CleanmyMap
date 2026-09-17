export const ACTION_CANCELLATION_REASONS = [
  "weather",
  "organizer_unavailable",
  "authorization_logistics",
  "insufficient_participants",
  "moved",
  "other",
] as const;

export type ActionCancellationReason =
  (typeof ACTION_CANCELLATION_REASONS)[number];

export const ACTION_CANCELLATION_CONFIRMATION = "CONFIRMER ANNULATION";

export type ActionCancellationResult = {
  id: string;
  status: "cancelled";
  alreadyCancelled: boolean;
  cancelledAt: string;
  cancelledBy: string;
  cancellationReason: ActionCancellationReason | null;
  previousStatus: "pending" | "approved";
};

export class ActionCancellationError extends Error {
  readonly code: "not_found" | "not_eligible" | "conflict";

  constructor(
    code: ActionCancellationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "ActionCancellationError";
    this.code = code;
  }
}
