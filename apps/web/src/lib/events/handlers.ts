import type { Event, EventType, EventPayload } from "./types";
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

export async function handleProgressionEvent(event: Event): Promise<void> {
  const supabase = getSupabaseServerClient();

  switch (event.type) {
    case "ACTION_CREATED": {
      const payload = event.payload as EventPayload["ACTION_CREATED"];
      try {
        await trackActionCreated(supabase, { userId: payload.userId, actionId: payload.actionId });
      } catch (error) {
        console.error("[Progression] Action created tracking failed:", { actionId: payload.actionId, error });
      }
      break;
    }

    case "ACTION_VALIDATED": {
      const payload = event.payload as EventPayload["ACTION_VALIDATED"];
      try {
        await trackActionValidationBonus(supabase, { actionId: payload.actionId });
      } catch (error) {
        console.error("[Progression] Action validation tracking failed:", { actionId: payload.actionId, error });
      }
      break;
    }

    case "ACTION_REJECTED": {
      const payload = event.payload as EventPayload["ACTION_REJECTED"];
      try {
        await trackActionRejection(supabase, { actionId: payload.actionId });
      } catch (error) {
        console.error("[Progression] Action rejection tracking failed:", { actionId: payload.actionId, error });
      }
      break;
    }

    case "SPOT_CREATED": {
      const payload = event.payload as EventPayload["SPOT_CREATED"];
      try {
        await trackSpotCreated(supabase, { userId: payload.userId, spotId: payload.spotId });
      } catch (error) {
        console.error("[Progression] Spot created tracking failed:", { spotId: payload.spotId, error });
      }
      break;
    }

    case "SPOT_VALIDATED": {
      const payload = event.payload as EventPayload["SPOT_VALIDATED"];
      try {
        await trackSpotValidationBonus(supabase, { spotId: payload.spotId });
      } catch (error) {
        console.error("[Progression] Spot validation tracking failed:", { spotId: payload.spotId, error });
      }
      break;
    }

    case "COMMUNITY_RSVP_YES": {
      const payload = event.payload as EventPayload["COMMUNITY_RSVP_YES"];
      try {
        await trackCommunityRsvpYes(supabase, { userId: payload.userId, eventId: payload.eventId });
      } catch (error) {
        console.error("[Progression] RSVP tracking failed:", { eventId: payload.eventId, error });
      }
      break;
    }

    case "COMMUNITY_EVENT_CREATED": {
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
      break;
    }
  }
}

export async function handleNotificationEvent(event: Event): Promise<void> {
  const supabase = getSupabaseServerClient();

  switch (event.type) {
    case "ACTION_VALIDATED": {
      const payload = event.payload as EventPayload["ACTION_VALIDATED"];
      try {
        const { data: action } = await supabase
          .from("actions")
          .select("location_label")
          .eq("id", payload.actionId)
          .single();

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
