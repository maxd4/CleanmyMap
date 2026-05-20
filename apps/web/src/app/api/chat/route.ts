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
import {
  isSafeChatAttachmentUrl,
  isSupportedChatAttachmentMimeType,
} from "@/lib/chat/chat-attachments";
import { createChatNotificationsForMessage } from "@/lib/chat/chat-notifications";
import { mergeRowGroupsById, sortByCreatedAtAsc } from "@/lib/chat/postgrest";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseClerkRlsClient } from "@/lib/supabase/clerk-rls";
import {
  reserveDiscussionMessageSlot,
  toDiscussionRateLimitErrorPayload,
} from "@/lib/community/discussion-rate-limit";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";

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
  attachmentUrl: z
    .string()
    .trim()
    .url()
    .refine(isSafeChatAttachmentUrl, {
      message: "L'URL de la pièce jointe doit utiliser http(s).",
    })
    .optional(),
  attachmentType: z.string().optional(),
});

type CurrentProfileRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
  paris_arrondissement: number | null;
  role_label: string | null;
  metadata: Record<string, unknown> | null;
};

type ChatMessageRow = {
  id: string;
  created_at: string;
  [key: string]: unknown;
};

type ChatQueryResult<T> = PromiseLike<{
  data: T[] | null;
  error: {
    message: string;
    code?: string;
    details?: string;
  } | null;
}>;

const messageSelect =
  "*, sender:profiles!sender_id(display_name, handle, avatar_url)";

async function runMessageQuery(query: ChatQueryResult<ChatMessageRow>): Promise<ChatMessageRow[]> {
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []) as ChatMessageRow[];
}

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
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  userId: string,
): Promise<CurrentProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, handle, paris_arrondissement, role_label, metadata")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as CurrentProfileRow | null;
}

async function resolveBugReportRecipientId(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseClerkRlsClient>>>,
  senderId: string,
  senderRole: string,
): Promise<string | null> {
  const { data: maxData, error: maxError } = await supabase
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

  const { data, error } = await supabase
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

function buildZoneContext(
  zoneName: string | null,
  arrondissementId: number | null,
): ZoneContext {
  return {
    zoneName: zoneName && findZoneWithNeighbors(zoneName) ? zoneName : null,
    arrondissementId,
  };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();

  const identity = await getCurrentUserIdentity();
  if (!identity) return unauthorizedJsonResponse();

  const writeRateLimit = await verifyRateLimit({ limit: 20, window: 60, key: userId });
  const writeRateLimitResponse = createServerRateLimitResponse(
    writeRateLimit.allowed,
    writeRateLimit.retryAfter,
  );
  if (writeRateLimitResponse) {
    return writeRateLimitResponse;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(payload);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);

  if (parsed.data.attachmentUrl) {
    if (!parsed.data.attachmentType) {
      return validationErrorResponse({
        attachmentType: [
          "Le type de la pièce jointe est requis quand un fichier est envoyé.",
        ],
      });
    }

    if (!isSupportedChatAttachmentMimeType(parsed.data.attachmentType)) {
      return validationErrorResponse({
        attachmentType: [
          "Ce format de pièce jointe n'est pas autorisé. Utilisez une image, un PDF ou un document courant.",
        ],
      });
    }
  }

  const supabase = await getSupabaseClerkRlsClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error: "Connexion sécurisée indisponible",
        hint: "Activez l'intégration native Clerk/Supabase dans Supabase et vérifiez que la session Clerk est disponible.",
      },
      { status: 503 },
    );
  }

  try {
    const serviceSupabase = getSupabaseServerClient();

    const quota = await reserveDiscussionMessageSlot(serviceSupabase, {
      userId,
      channel: parsed.data.channelType === "bug_report" ? "bug_report" : "discussion_event",
    });
    if (!quota.allowed) {
      return NextResponse.json(toDiscussionRateLimitErrorPayload(quota), { status: 429 });
    }

    const profile = await loadCurrentProfile(supabase, userId);
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
          supabase,
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

    try {
      await createChatNotificationsForMessage(serviceSupabase, message.id);
    } catch (notificationError) {
      console.warn("[POST /api/chat] Notification fan-out failed:", notificationError);
    }

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
        hint: "Activez l'intégration native Clerk/Supabase dans Supabase et vérifiez que la session Clerk est disponible.",
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

  const createMessageQuery = () =>
    supabase
      .from("app_messages")
      .select(messageSelect)
      .order("created_at", { ascending: false })
      .limit(50);

  try {
    if (channelType === "community") {
      const { data, error } = await createMessageQuery().eq("channel_type", "community");
      if (error) {
        throw error;
      }
      return NextResponse.json({
        messages: sortByCreatedAtAsc((data ?? []) as ChatMessageRow[]),
      });
    }

    if (channelType === "dm") {
      if (!recipientId) {
        return NextResponse.json(
          {
            error: "Destinataire requis",
            hint: "Choisissez un membre pour charger la conversation privée.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await createMessageQuery()
        .eq("channel_type", "dm")
        .in("sender_id", [userId, recipientId])
        .in("recipient_id", [userId, recipientId]);
      if (error) {
        throw error;
      }

      return NextResponse.json({
        messages: sortByCreatedAtAsc((data ?? []) as ChatMessageRow[]),
      });
    }

    if (channelType === "admin_elu") {
      const { data, error } = await createMessageQuery().eq("channel_type", "admin_elu");
      if (error) {
        throw error;
      }

      return NextResponse.json({
        messages: sortByCreatedAtAsc((data ?? []) as ChatMessageRow[]),
      });
    }

    if (channelType === "territory") {
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
      const territoryQueries: Promise<ChatMessageRow[]>[] = [];

      if (zoneName) {
        territoryQueries.push(
          runMessageQuery(createMessageQuery().eq("channel_type", "territory").eq("zone_name", zoneName)),
        );
      }
      if (territory.zoneNames && territory.zoneNames.length > 0) {
        territoryQueries.push(
          runMessageQuery(
            createMessageQuery().eq("channel_type", "territory").in("zone_name", territory.zoneNames),
          ),
        );
      }
      if (territory.arrondissementIds && territory.arrondissementIds.length > 0) {
        territoryQueries.push(
          runMessageQuery(
            createMessageQuery()
              .eq("channel_type", "territory")
              .in("arrondissement_id", territory.arrondissementIds),
          ),
        );
      }

      if (territoryQueries.length === 0) {
        return NextResponse.json(
          {
            error: "Zone invalide",
            hint: "Votre zone n'est pas reconnue. Veuillez choisir un arrondissement parisien ou une commune de la région.",
          },
          { status: 400 },
        );
      }

      const territoryMessages = await Promise.all(territoryQueries);
      return NextResponse.json({
        messages: sortByCreatedAtAsc(mergeRowGroupsById(territoryMessages)),
      });
    }

    if (channelType === "bug_report") {
      const [sentMessages, receivedMessages] = await Promise.all([
        runMessageQuery(
          createMessageQuery().eq("channel_type", "bug_report").eq("sender_id", userId),
        ),
        runMessageQuery(
          createMessageQuery().eq("channel_type", "bug_report").eq("recipient_id", userId),
        ),
      ]);

      return NextResponse.json({
        messages: sortByCreatedAtAsc(
          mergeRowGroupsById([sentMessages, receivedMessages]),
        ),
      });
    }

    return NextResponse.json({ messages: [] });
  } catch (error) {
    console.error("[GET /api/chat] Database Error:", error);
    const dbError = error as {
      message?: string;
      code?: string;
      details?: string;
    };
    return NextResponse.json(
      {
        error: "Erreur Base de Données",
        message: dbError.message ?? "Erreur inconnue",
        code: dbError.code,
        details: dbError.details,
        hint:
          channelType === "territory" && !zoneName && !profileArrondissement
            ? "Votre profil n'a pas encore de zone exploitable."
            : "Vérifiez que la table 'app_messages' existe et que les profils sont synchronisés.",
      },
      { status: 500 },
    );
  }
}
