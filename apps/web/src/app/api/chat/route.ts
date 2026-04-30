import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getAffectedArrondissements } from "@/lib/geo/paris-arrondissements";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  canAccessChatChannel,
  isChatChannelType,
  type ChatChannelType,
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
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().optional(),
});

type CurrentProfileRow = {
  id: string;
  paris_arrondissement: number | null;
  role_label: string | null;
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

function buildChannelAccessHint(channelType: ChatChannelType): string {
  switch (channelType) {
    case "community":
      return "Canal communautaire indisponible pour le moment.";
    case "dm":
      return "Sélectionnez un destinataire pour ouvrir les messages privés.";
    case "admin_elu":
      return "Canal réservé aux élus et à l'administration.";
    case "territory":
      return "Votre profil doit avoir un arrondissement pour ouvrir ce canal.";
    case "bug_report":
      return "Le canal de feedback est indisponible tant qu'aucun compte administrateur n'est configuré.";
    default:
      return "Canal indisponible.";
  }
}

async function loadCurrentProfile(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
): Promise<CurrentProfileRow | null> {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, paris_arrondissement, role_label")
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

    const profile = await loadCurrentProfile(supabase, userId);
    const profileArrondissement =
      parseArrondissement(parsed.data.arrondissementId?.toString() ?? null) ??
      profile?.paris_arrondissement;

    if (
      !canAccessChatChannel(parsed.data.channelType, {
        roleLabel: identity.role,
        hasArrondissement: profileArrondissement !== null,
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
    let arrondissementId: number | null = null;

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
        arrondissementId =
          parsed.data.arrondissementId ?? profileArrondissement ?? null;
        if (!arrondissementId) {
          return NextResponse.json(
            {
              error: "Arrondissement requis",
              hint: "Renseignez un arrondissement dans votre profil ou dans le message.",
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

    if (parsed.data.channelType !== "territory") {
      arrondissementId = null;
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
        arrondissement_id: arrondissementId,
        content: parsed.data.content,
        attachment_url: parsed.data.attachmentUrl,
        attachment_type: parsed.data.attachmentType,
        attachment_expires_at: parsed.data.attachmentUrl
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      })
      .select(messageSelect)
      .single();

    if (error) return handleApiError(error, "POST /api/chat (insert)");

    if (Math.random() < 0.1) {
      try {
        await adminSupabase.rpc("prune_old_messages");
      } catch (pruneErr) {
        console.error("[Pruning] Failed:", pruneErr);
      }
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
  const profileArrondissement = profile?.paris_arrondissement ?? null;

  if (
    !canAccessChatChannel(channelType, {
      roleLabel: identity.role,
      hasArrondissement: (profileArrondissement ?? requestedArrondissement) !== null,
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
    const territoryFocus = requestedArrondissement ?? profileArrondissement;
    if (!territoryFocus) {
      return NextResponse.json(
        {
          error: "Arrondissement manquant",
          hint: "Ajoutez un arrondissement à votre profil pour ouvrir ce canal.",
        },
        { status: 400 },
      );
    }

    query = query
      .eq("channel_type", "territory")
      .in("arrondissement_id", getAffectedArrondissements(territoryFocus));
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
          channelType === "territory" && !profileArrondissement
            ? "Votre profil n'a pas encore d'arrondissement exploitable."
            : "Vérifiez que la table 'app_messages' existe et que les profils sont synchronisés.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ messages: (data ?? []).reverse() });
}
