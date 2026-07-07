import type { Event, EventPayload } from "./types";
import {
  trackActionCreated,
  trackActionValidationBonus,
  trackActionRejection,
  trackSpotCreated,
  trackSpotValidationBonus,
  trackCommunityRsvpYes,
  trackCommunityOpsUpdate,
} from "@/lib/gamification/progression";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runSingleActionQuery } from "@/lib/actions/query";

type ProgressionEventHandler = (
  supabase: ReturnType<typeof getSupabaseServerClient>,
  event: Event,
) => Promise<void>;

async function trackActionCreatedEvent(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  event: Event,
): Promise<void> {
  const payload = event.payload as EventPayload["ACTION_CREATED"];
  try {
    await trackActionCreated(supabase, { userId: payload.userId, actionId: payload.actionId });
  } catch (error) {
    console.error("[Progression] Action created tracking failed:", { actionId: payload.actionId, error });
  }
}

async function trackActionValidatedEvent(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  event: Event,
): Promise<void> {
  const payload = event.payload as EventPayload["ACTION_VALIDATED"];
  try {
    await trackActionValidationBonus(supabase, { actionId: payload.actionId });
  } catch (error) {
    console.error("[Progression] Action validation tracking failed:", { actionId: payload.actionId, error });
  }
}

async function trackActionRejectedEvent(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  event: Event,
): Promise<void> {
  const payload = event.payload as EventPayload["ACTION_REJECTED"];
  try {
    await trackActionRejection(supabase, { actionId: payload.actionId });
  } catch (error) {
    console.error("[Progression] Action rejection tracking failed:", { actionId: payload.actionId, error });
  }
}

async function trackSpotCreatedEvent(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  event: Event,
): Promise<void> {
  const payload = event.payload as EventPayload["SPOT_CREATED"];
  try {
    await trackSpotCreated(supabase, { userId: payload.userId, spotId: payload.spotId });
  } catch (error) {
    console.error("[Progression] Spot created tracking failed:", { spotId: payload.spotId, error });
  }
}

async function trackSpotValidatedEvent(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  event: Event,
): Promise<void> {
  const payload = event.payload as EventPayload["SPOT_VALIDATED"];
  try {
    await trackSpotValidationBonus(supabase, { spotId: payload.spotId });
  } catch (error) {
    console.error("[Progression] Spot validation tracking failed:", { spotId: payload.spotId, error });
  }
}

async function trackCommunityRsvpYesEvent(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  event: Event,
): Promise<void> {
  const payload = event.payload as EventPayload["COMMUNITY_RSVP_YES"];
  try {
    await trackCommunityRsvpYes(supabase, { userId: payload.userId, eventId: payload.eventId });
  } catch (error) {
    console.error("[Progression] RSVP tracking failed:", { eventId: payload.eventId, error });
  }
}

async function trackCommunityEventCreatedEvent(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  event: Event,
): Promise<void> {
  const payload = event.payload as EventPayload["COMMUNITY_EVENT_CREATED"];
  try {
    await trackCommunityOpsUpdate(supabase, {
      userId: payload.userId,
      eventId: payload.eventId,
      attendanceCount: null,
      hasPostMortem: false,
    });
  } catch (error) {
    console.error("[Progression] Event creation tracking failed:", { eventId: payload.eventId, error });
  }
}

const PROGRESSION_EVENT_HANDLERS: Partial<Record<Event["type"], ProgressionEventHandler>> = {
  ACTION_CREATED: trackActionCreatedEvent,
  ACTION_VALIDATED: trackActionValidatedEvent,
  ACTION_REJECTED: trackActionRejectedEvent,
  SPOT_CREATED: trackSpotCreatedEvent,
  SPOT_VALIDATED: trackSpotValidatedEvent,
  COMMUNITY_RSVP_YES: trackCommunityRsvpYesEvent,
  COMMUNITY_EVENT_CREATED: trackCommunityEventCreatedEvent,
};

export async function handleProgressionEvent(event: Event): Promise<void> {
  const supabase = getSupabaseServerClient();
  const handler = PROGRESSION_EVENT_HANDLERS[event.type];
  if (!handler) {
    return;
  }

  await handler(supabase, event);
}

export async function handleNotificationEvent(event: Event): Promise<void> {
  const supabase = getSupabaseServerClient();

  switch (event.type) {
    case "ACTION_VALIDATED": {
      const payload = event.payload as EventPayload["ACTION_VALIDATED"];
      try {
        const action = await runSingleActionQuery<{ location_label: string }>(supabase, (query) =>
          query.select("location_label").eq("id", payload.actionId).maybeSingle(),
        );

        if (action) {
          await supabase.from("app_notifications").insert({
            user_id: payload.userId,
            type: "validation",
            title: "Action Validée !",
            content: `Votre action à ${action.location_label} a été approuvée. Merci pour votre impact !`,
            payload: { entityType: "action", id: payload.actionId },
          });
        }
      } catch (error) {
        console.error("[Notification] Action validated failed:", { actionId: payload.actionId, error });
      }
      break;
    }

    case "SPOT_VALIDATED": {
      const payload = event.payload as EventPayload["SPOT_VALIDATED"];
      try {
        const { data: spot } = await supabase
          .from("trash_spotter_spots")
          .select("label")
          .eq("id", payload.spotId)
          .single();

        if (spot) {
          await supabase.from("app_notifications").insert({
            user_id: payload.userId,
            type: "validation",
            title: "Signalement Validé !",
            content: `Votre signalement à ${spot.label} a été validé.`,
            payload: { entityType: "spot", id: payload.spotId },
          });
        }
      } catch (error) {
        console.error("[Notification] Spot validated failed:", { spotId: payload.spotId, error });
      }
      break;
    }
  }
}

export function registerEventHandlers(): void {
  void import("./bus").then(({ subscribe }) => {
  
    subscribe("ACTION_CREATED", handleProgressionEvent);
    subscribe("ACTION_VALIDATED", handleProgressionEvent);
    subscribe("ACTION_REJECTED", handleProgressionEvent);
    subscribe("ACTION_VALIDATED", handleNotificationEvent);
    subscribe("SPOT_CREATED", handleProgressionEvent);
    subscribe("SPOT_VALIDATED", handleProgressionEvent);
    subscribe("SPOT_VALIDATED", handleNotificationEvent);
    subscribe("COMMUNITY_RSVP_YES", handleProgressionEvent);
    subscribe("COMMUNITY_EVENT_CREATED", handleProgressionEvent);
  });
}
