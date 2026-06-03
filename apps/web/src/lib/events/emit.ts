import { emit, createEvent } from "./bus";
import type { EventType, EventPayload } from "./types";
import { logFailure } from "@/lib/logging/failure-log";

export async function publishEvent<T extends EventType>(
  type: T,
  payload: EventPayload[T],
  source?: string
): Promise<{ delivered: number; failed: number }> {
  const event = createEvent(type, payload, source);
  
  try {
    const result = await emit(event);
    return result;
  } catch (error) {
    logFailure("EventBus", "Emit failed", error, { type, source });
    return { delivered: 0, failed: 1 };
  }
}

export function emitActionCreated(params: {
  actionId: string;
  userId: string;
  locationLabel: string;
  wasteKg: number;
}) {
  return publishEvent("ACTION_CREATED", params, "api/actions");
}

export function emitActionValidated(params: {
  actionId: string;
  userId: string;
  moderatorId: string;
}) {
  return publishEvent("ACTION_VALIDATED", params, "api/admin/moderation");
}

export function emitActionRejected(params: {
  actionId: string;
  userId: string;
  moderatorId: string;
}) {
  return publishEvent("ACTION_REJECTED", params, "api/admin/moderation");
}

export function emitSpotCreated(params: {
  spotId: string;
  userId: string;
  label: string;
  wasteType: string;
}) {
  return publishEvent("SPOT_CREATED", params, "api/actions");
}

export function emitSpotValidated(params: {
  spotId: string;
  userId: string;
  moderatorId: string;
}) {
  return publishEvent("SPOT_VALIDATED", params, "api/admin/moderation");
}

export function emitCommunityRsvpYes(params: {
  eventId: string;
  userId: string;
}) {
  return publishEvent("COMMUNITY_RSVP_YES", params, "api/community/rsvps");
}

export function emitNewsletterSubscribed(params: {
  email: string;
  source: string;
}) {
  return publishEvent("NEWSLETTER_SUBSCRIBED", params, "api/newsletter");
}
