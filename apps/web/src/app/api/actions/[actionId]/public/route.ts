import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http/api-errors";
import { loadActionById } from "@/lib/actions/store";
import {
  buildPublicActionReference,
  eventReferenceFromAction,
  getPublicActionShareKind,
  isPublicActionReferenceAvailable,
} from "@/lib/chat/action-sharing";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadPublicActionRetrospective } from "@/lib/actions/action-retrospectives";
import { loadPublicActionRecommendations } from "@/lib/actions/public-action-recommendations.server";
import type { PublicActionRecommendation } from "@/lib/actions/public-action-recommendations";
import { logWarning } from "@/lib/logging/failure-log";
import {
  isPublicCommunityEventRow,
} from "@/lib/actions/runtime-contracts";
import {
  parseActionSingleRow,
  parseActionSupabaseResult,
} from "@/lib/actions/query";

export const runtime = "nodejs";
// Justification Vercel: cette projection publique doit relire l’action courante et ne pas être mise en cache.
export const dynamic = "force-dynamic";

// Justification Vercel: la visibilité et les données de la carte peuvent changer après publication.
const PUBLIC_NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type PublicActionRouteContext = {
  params: Promise<{ actionId: string }>;
};

export async function GET(
  _request: Request,
  context: PublicActionRouteContext,
) {
  try {
    const { actionId } = await context.params;
    const normalizedActionId = actionId.trim();
    const supabase = getSupabaseServerClient(true);
    const action = await loadActionById(supabase, normalizedActionId);

    if (!action || !isPublicActionReferenceAvailable(action)) {
      return NextResponse.json(
        { error: "Action indisponible" },
        { status: 404, headers: PUBLIC_NO_STORE_HEADERS },
      );
    }

    let event: {
      id: string;
      title: string;
      eventDate: string;
      locationLabel: string;
    } | null = null;
    const eventId = eventReferenceFromAction(action);
    if (eventId) {
      const rawEventResult: unknown = await supabase
        .from("community_events")
        .select("id, title, event_date, location_label")
        .eq("id", eventId)
        .maybeSingle();
      const eventResult = parseActionSupabaseResult(rawEventResult);
      if (eventResult.error) {
        return handleApiError(eventResult.error, "GET /api/actions/[actionId]/public (event)");
      }
      const eventRow = parseActionSingleRow(eventResult.data, isPublicCommunityEventRow);
      if (eventResult.data !== null && !eventRow) {
        throw new Error("La réponse de l'événement public est invalide.");
      }
      if (eventRow) {
        event = {
          id: eventRow.id,
          title: eventRow.title,
          eventDate: eventRow.event_date,
          locationLabel: eventRow.location_label,
        };
      }
    }

    const retrospective = await loadPublicActionRetrospective(supabase, action.id);
    let recommendations: PublicActionRecommendation[] = [];
    if (getPublicActionShareKind(action) === "result") {
      try {
        recommendations = await loadPublicActionRecommendations(supabase, action);
      } catch (error) {
        logWarning("Actions/PublicRecommendations", "Public action recommendations unavailable", {
          actionId: action.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json(
      { reference: buildPublicActionReference(action, event, retrospective, { recommendations }) },
      { headers: PUBLIC_NO_STORE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/public");
  }
}
