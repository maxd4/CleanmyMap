import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  canAccessChatChannel,
  isChatChannelType,
  type ChatChannelType,
  getTerritoryFilter,
  buildChannelAccessHint,
  extractZoneContextFromMetadata,
  type ZoneContext,
} from "@/lib/chat/channels";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  reserveDiscussionMessageSlot,
  toDiscussionRateLimitErrorPayload,
} from "@/lib/community/discussion-rate-limit";

const CHANNEL_TYPES = [
  "community",
  "dm",
  "admin_elu",
  "territory",
  "bug_report",
] as const satisfies readonly ChatChannelType[];

const sendMessageSchema = z.object({
  channelType: z.enum(CHANNEL_TYPES),
  content: z.string().min(1).max(2000),
  recipientId: z.string().optional(),
  arrondissementId: z.number().int().min(1).max(20).optional(),
  zoneName: z.string().optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
});

type CurrentProfileRow = {
  id: string;
  paris_arrondissement: number | null;
  role_label: string | null;
  metadata: Record<string, unknown> | null;
};

const messageSelect =
  "*, sender:profiles!sender_id(display_name, handle, avatar_url)";

function parseArrondissement(raw: string | null): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }

  return parsed;
}

async function loadCurrentProfile(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
): Promise<CurrentProfileRow | null> {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, paris_arrondissement, role_label, metadata")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as CurrentProfileRow | null;
}

async function resolveBugReportRecipientId(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  senderId: string,
  senderRole: string,
): Promise<string | null> {
  const { data: maxData, error: maxError } = await adminSupabase
    .from("profiles")
    .select("id")
    .in("role_label", ["imu", "max"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (maxError) {
    throw maxError;
  }

  if (maxData?.id) {
    return maxData.id;
  }

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role_label", "admin")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return data.id;
  }

  if (senderRole === "admin" || senderRole === "max") {
    return senderId;
  }

  return null;
}

function toVisibilityFilter(userId: string, recipientId: string) {
  return `and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`;
}

function buildZoneContext(
  zoneName: string | null,
  arrondissementId: number | null,
): ZoneContext {
  return {
    zoneName: zoneName && findZoneWithNeighbors(zoneName) ? zoneName : null,
    arrondissementId,
  };
}

function quotePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Connexion sécurisée indisponible",
        hint: "Configurez un template JWT Clerk Supabase (ou CLERK_SUPABASE_JWT_TEMPLATE) pour activer la lecture/écriture sous RLS.",
      },
      { status: 503 },
    );
  }
  const adminSupabase = getSupabaseAdminClient();

  try {
    const quota = await reserveDiscussionMessageSlot(supabase, {
      userId,
      channel: parsed.data.channelType === "bug_report" ? "bug_report" : "discussion_event",
    });
    if (!quota.allowed) {
      return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), { status: 429 });
    }

    const profile = await loadCurrentProfile(adminSupabase, userId);
    const metadataZone = extractZoneContextFromMetadata(profile?.metadata ?? null);

    const parsedArr = parseArrondissement(parsed.data.arrondissementId?.toString() ?? null);
    const profileArrondissement = profile?.paris_arrondissement ?? parsedArr;

    const zoneName = parsed.data.zoneName?.trim() || metadataZone.zoneName;
    const arrondissementId = parsed.data.arrondissementId ?? profileArrondissement;
    const zoneContext = buildZoneContext(zoneName, arrondissementId);
    const arrondissementLabel =
      !zoneName && arrondissementId && arrondissementId >= 1 && arrondissementId <= 20
        ? `${arrondissementId}e arrondissement`
        : null;

    const hasGreaterParisZone =
      (zoneName && findZoneWithNeighbors(zoneName)) !== null || arrondissementLabel !== null;
    const hasArrondissement = arrondissementId !== null && arrondissementId >= 1 && arrondissementId <= 20;

    if (
      !canAccessChatChannel(parsed.data.channelType, {
        roleLabel: identity.role,
        hasArrondissement,
        hasGreaterParisZone,
        zoneContext,
      })
    ) {
      return NextResponse.json(
        {
          error: "Canal indisponible",
          hint: buildChannelAccessHint(parsed.data.channelType),
        },
        { status: 403 },
      );
    }

    let recipientId: string | null = null;
    let targetArrondissementId: number | null = null;
    let targetZoneName: string | null = null;

    switch (parsed.data.channelType) {
      case "dm": {
        recipientId = parsed.data.recipientId?.trim() ?? null;
        if (!recipientId) {
          return NextResponse.json(
            {
              error: "Destinataire requis",
              hint: "Choisissez un membre avant d'envoyer un message privé.",
            },
            { status: 400 },
          );
        }
        break;
      }
      case "territory": {
        if (zoneName && findZoneWithNeighbors(zoneName)) {
          targetZoneName = zoneName;
          targetArrondissementId = null;
        } else if (arrondissementId && arrondissementId >= 1 && arrondissementId <= 20) {
          targetArrondissementId = arrondissementId;
          targetZoneName = arrondissementLabel;
        } else {
          return NextResponse.json(
            {
              error: "Zone requise",
              hint: "Renseignez une zone (arrondissement ou commune) dans votre profil ou dans le message.",
            },
            { status: 400 },
          );
        }
        break;
      }
      case "bug_report": {
        recipientId = await resolveBugReportRecipientId(
          adminSupabase,
          userId,
          identity.role,
        );
        if (!recipientId) {
          return NextResponse.json(
            {
              error: "Destinataire introuvable",
              hint: buildChannelAccessHint("bug_report"),
            },
            { status: 503 },
          );
        }
        break;
      }
      case "community":
      case "admin_elu":
        break;
      default:
        break;
    }

    const mentions = parsed.data.content.match(/@([a-z0-9_]+)/g);
    if (mentions) {
      const handles = mentions.map((mention) => mention.slice(1));
      const { data: mentionedProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("handle", handles);

      if (mentionedProfiles && mentionedProfiles.length > 0) {
        const notifications = mentionedProfiles
          .filter((profileRow) => profileRow.id !== userId)
          .map((profileRow) => ({
            user_id: profileRow.id,
            type: "community",
            title: "Vous avez été tagué ! ✉️",
            content: "Un membre vous a mentionné dans une discussion.",
            payload: { fromId: userId, channelType: parsed.data.channelType },
          }));

        if (notifications.length > 0) {
          await adminSupabase.from("app_notifications").insert(notifications);
        }
      }
    }

    const { data: message, error } = await supabase
      .from("app_messages")
      .insert({
        sender_id: userId,
        recipient_id: recipientId,
        channel_type: parsed.data.channelType,
        arrondissement_id: targetArrondissementId,
        zone_name: targetZoneName,
        content: parsed.data.content,
        attachment_url: parsed.data.attachmentUrl,
        attachment_type: parsed.data.attachmentType,
        attachment_expires_at: parsed.data.attachmentUrl
          ? new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      })
      .select(messageSelect)
      .single();

    if (error) return handleApiError(error, "POST /api/chat (insert)");

    return NextResponse.json({ status: "sent", message }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/chat (general)");
  }
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();

  const { searchParams } = new URL(request.url);
  const channelTypeRaw = searchParams.get("channelType");
  const channelType = isChatChannelType(channelTypeRaw) ? channelTypeRaw : null;
  const recipientId = searchParams.get("recipientId");
  const requestedArrondissement = parseArrondissement(searchParams.get("arrondissementId"));
  const requestedZoneName = searchParams.get("zoneName");

  if (!channelType) {
    return NextResponse.json(
      {
        error: "Canal invalide",
        hint: "Le paramètre channelType doit être renseigné.",
      },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Connexion sécurisée indisponible",
        hint: "Configurez un template JWT Clerk Supabase (ou CLERK_SUPABASE_JWT_TEMPLATE) pour activer la lecture/écriture sous RLS.",
      },
      { status: 503 },
    );
  }

  const profile = await loadCurrentProfile(supabase, userId);
  const profileMetadataZone = extractZoneContextFromMetadata(profile?.metadata ?? null);
  const profileArrondissement = profile?.paris_arrondissement ?? null;

  const zoneName = requestedZoneName || profileMetadataZone.zoneName;
  const arrondissementId = requestedArrondissement ?? profileArrondissement;
  const zoneContext = buildZoneContext(zoneName, arrondissementId);

  const hasGreaterParisZone = (zoneName && findZoneWithNeighbors(zoneName)) !== null;
  const hasArrondissement = arrondissementId !== null && arrondissementId >= 1 && arrondissementId <= 20;

  if (
    !canAccessChatChannel(channelType, {
      roleLabel: identity.role,
      hasArrondissement,
      hasGreaterParisZone,
      zoneContext,
    })
  ) {
    return NextResponse.json(
      {
        error: "Canal inaccessible",
        hint: buildChannelAccessHint(channelType),
      },
      { status: 403 },
    );
  }

  let query = supabase
    .from("app_messages")
    .select(messageSelect)
    .order("created_at", { ascending: false })
    .limit(50);

  if (channelType === "community") {
    query = query.eq("channel_type", "community");
  } else if (channelType === "dm") {
    if (!recipientId) {
      return NextResponse.json(
        {
          error: "Destinataire requis",
          hint: "Choisissez un membre pour charger la conversation privée.",
        },
        { status: 400 },
      );
    }

    query = query
      .eq("channel_type", "dm")
      .or(toVisibilityFilter(userId, recipientId));
  } else if (channelType === "admin_elu") {
    query = query.eq("channel_type", "admin_elu");
  } else if (channelType === "territory") {
    if (!zoneName && !arrondissementId) {
      return NextResponse.json(
        {
          error: "Zone manquante",
          hint: "Ajoutez une zone (arrondissement ou commune) à votre profil pour ouvrir ce canal.",
        },
        { status: 400 },
      );
    }

    const territory = getTerritoryFilter(zoneContext);

    const territoryFilters: string[] = [];
    if (zoneName) {
      territoryFilters.push(`zone_name.eq.${quotePostgrestValue(zoneName)}`);
    }
    if (territory.zoneNames && territory.zoneNames.length > 0) {
      territoryFilters.push(
        `zone_name.in.(${territory.zoneNames.map((n) => quotePostgrestValue(n)).join(",")})`,
      );
    }
    if (territory.arrondissementIds && territory.arrondissementIds.length > 0) {
      territoryFilters.push(`arrondissement_id.in.(${territory.arrondissementIds.join(",")})`);
    }

    if (territoryFilters.length > 0) {
      query = query
        .eq("channel_type", "territory")
        .or(territoryFilters.join(","));
    } else {
      return NextResponse.json(
        {
          error: "Zone invalide",
          hint: "Votre zone n'est pas reconnue. Veuillez choisir un arrondissement parisien ou une commune de la région.",
        },
        { status: 400 },
      );
    }
  } else if (channelType === "bug_report") {
    query = query
      .eq("channel_type", "bug_report")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[GET /api/chat] Database Error:", error);
    return NextResponse.json(
      {
        error: "Erreur Base de Données",
        message: error.message,
        code: error.code,
        details: error.details,
        hint:
          channelType === "territory" && !zoneName && !profileArrondissement
            ? "Votre profil n'a pas encore de zone exploitable."
            : "Vérifiez que la table 'app_messages' existe et que les profils sont synchronisés.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ messages: (data ?? []).reverse() });
}
