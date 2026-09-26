import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http/api-errors";
import { loadActionById } from "@/lib/actions/store";
import {
  buildPublicActionReference,
  eventReferenceFromAction,
  isPublicActionReferenceAvailable,
} from "@/lib/chat/action-sharing";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

    let event = null;
    const eventId = eventReferenceFromAction(action);
    if (eventId) {
      const eventResult = await supabase
        .from("community_events")
        .select("id, title, event_date, location_label")
        .eq("id", eventId)
        .maybeSingle();
      if (eventResult.error) {
        return handleApiError(eventResult.error, "GET /api/actions/[actionId]/public (event)");
      }
      if (eventResult.data) {
        event = {
          id: eventResult.data.id,
          title: eventResult.data.title,
          eventDate: eventResult.data.event_date,
          locationLabel: eventResult.data.location_label,
        };
      }
    }

    return NextResponse.json(
      { reference: buildPublicActionReference(action, event) },
      { headers: PUBLIC_NO_STORE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/public");
  }
}
