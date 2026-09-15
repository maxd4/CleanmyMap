import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentUserIdentity } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadActionById } from "@/lib/actions/store";
import {
  buildShareDestinationList,
  getPublicActionShareKind,
  resolveShareTerritoryDestination,
} from "@/lib/chat/action-sharing";
import { loadCurrentProfile } from "../route.data";
import { canAccessChatChannel } from "@/lib/chat/channels";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";

export const runtime = "nodejs";
// Justification Vercel: les destinations dépendent de l’utilisateur courant et de ses memberships.
export const dynamic = "force-dynamic";

// Justification Vercel: cette liste privée ne doit jamais être servie depuis un cache partagé.
const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

type DmDestinationRow = {
  peer_id: string;
  peer_display_name: string | null;
  peer_handle: string | null;
};

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
  }
  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return unauthorizedJsonResponse();
  }

  const actionId = new URL(request.url).searchParams.get("actionId")?.trim() ?? "";
  if (!actionId) {
    return NextResponse.json({ error: "Action requise" }, { status: 400 });
  }

  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Connexion sécurisée indisponible" },
      { status: 503, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  try {
    const action = await loadActionById(getSupabaseServerClient(), actionId);
    const shareKind = action ? getPublicActionShareKind(action) : null;
    if (!action || !shareKind) {
      return NextResponse.json(
        { error: "Action non partageable" },
        { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const [profile, dmResult] = await Promise.all([
      loadCurrentProfile(supabase, userId),
      supabase.rpc("list_my_dm_conversations"),
    ]);
    if (dmResult.error) {
      return handleApiError(dmResult.error, "GET /api/chat/share-destinations");
    }

    const territory = resolveShareTerritoryDestination(profile);
    const includeTerritory = Boolean(
      territory &&
        canAccessChatChannel("territory", {
          roleLabel: identity.activeRole,
          hasArrondissement: territory.arrondissementId !== null,
          hasGreaterParisZone: Boolean(
            territory.zoneName && findZoneWithNeighbors(territory.zoneName),
          ),
          zoneContext: {
            zoneName: territory.zoneName ?? null,
            arrondissementId: territory.arrondissementId ?? null,
          },
        }),
    );

    return NextResponse.json(
      {
        shareKind,
        destinations: buildShareDestinationList({
          profile,
          dmRows: (dmResult.data ?? []) as DmDestinationRow[],
          includeTerritory,
        }),
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    return handleApiError(error, "GET /api/chat/share-destinations");
  }
}
