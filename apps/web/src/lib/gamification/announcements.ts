import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dispatchGamificationCelebration,
  type GamificationCelebrationPayload,
} from "./celebration";

export type GamificationAnnouncementPayload = GamificationCelebrationPayload;

type RawGamificationEvent = Record<string, unknown>;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function buildDedupedKey(type: string, payload: RawGamificationEvent): string | undefined {
  const tierId = readString(payload.tierId) ?? readString(payload.badgeId);
  const userId = readString(payload.userId);
  const sourceId = readString(payload.sourceId);
  const sourceTable = readString(payload.sourceTable);
  const bonus = readNumber(payload.bonus);
  const level = readNumber(payload.newLevel) ?? readNumber(payload.currentLevel);

  switch (type) {
    case "tier_unlocked":
    case "participant_tier_unlocked":
    case "form_tier_unlocked":
      return tierId ? `${type}:${tierId}` : type;
    case "form_bonus_unlocked":
      return bonus !== undefined ? `${type}:${bonus}` : type;
    case "clean_zone_task_awarded":
      return [type, sourceTable, sourceId].filter(Boolean).join(":") || type;
    case "first_trace_utile_unlocked":
      return tierId ? `${type}:${tierId}` : type;
    case "level_up":
      return userId && level !== undefined ? `${type}:${userId}:${level}` : type;
    case "referral_invite_awarded":
      return userId ? `${type}:${userId}` : type;
    case "xp_awarded":
      return userId && sourceId ? `${type}:${userId}:${sourceId}` : type;
    default:
      return payload.dedupeKey as string | undefined;
  }
}

function formatGenericAmount(amount: number | undefined, suffix: string): string | undefined {
  if (amount === undefined || Number.isNaN(amount)) {
    return undefined;
  }

  return `${amount > 0 ? "+" : ""}${amount} ${suffix}`;
}

export function announceGamificationGain(payload: GamificationAnnouncementPayload): void {
  dispatchGamificationCelebration(payload);
}

export function resolveGamificationAnnouncement(
  raw: unknown,
): GamificationAnnouncementPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as RawGamificationEvent;
  const type = readString(payload.type);
  const title = readString(payload.title);
  const message = readString(payload.message);
  const icon = readString(payload.icon);
  const source = readString(payload.source) ?? "realtime";
  const dedupeKey = type ? buildDedupedKey(type, payload) : readString(payload.dedupeKey);

  if (!type) {
    if (title && message) {
      return { title, message, icon, source, dedupeKey };
    }
    return null;
  }

  switch (type) {
    case "tier_unlocked":
      {
        const xpText = formatGenericAmount(readNumber(payload.xp) ?? readNumber(payload.xpAwarded), "XP");
        return {
          title: title ?? "Palier débloqué",
          message:
            message ??
            `Le palier ${readString(payload.title) ?? readString(payload.tierId) ?? "suivant"} est débloqué.${
              xpText ? ` ${xpText}.` : ""
            }`,
          tone: "explorer",
          icon: icon ?? "✨",
          source,
          dedupeKey,
        };
      }
    case "participant_tier_unlocked":
      {
        const xpText = formatGenericAmount(readNumber(payload.xp) ?? readNumber(payload.xpAwarded), "XP");
        return {
          title: title ?? "Palier de participation débloqué",
          message:
            message ??
            `${readString(payload.tierId) ?? "Votre palier"} est débloqué côté participation.${
              xpText ? ` ${xpText}.` : ""
            }`,
          tone: "actions",
          icon: icon ?? "🤝",
          source,
          dedupeKey,
        };
      }
    case "form_tier_unlocked":
      {
        const xpText = formatGenericAmount(readNumber(payload.xp) ?? readNumber(payload.xpAwarded), "XP");
        return {
          title: title ?? "Palier de formulaires débloqué",
          message:
            message ??
            `${readString(payload.tierId) ?? "Votre palier"} est débloqué pour les formulaires.${
              xpText ? ` ${xpText}.` : ""
            }`,
          tone: "forms",
          icon: icon ?? "🌱",
          source,
          dedupeKey,
        };
      }
    case "form_bonus_unlocked":
      return {
        title: title ?? "Bonus de formulaires débloqué",
        message:
          message ??
          (formatGenericAmount(readNumber(payload.bonus), "XP") ??
            "Un bonus de formulaires a été débloqué."),
        tone: "forms",
        icon: icon ?? "✨",
        source,
        dedupeKey,
      };
    case "clean_zone_task_awarded":
      return {
        title: title ?? "Mission zone propre récompensée",
        message:
          message ??
          (formatGenericAmount(readNumber(payload.xp) ?? readNumber(payload.xpAwarded), "XP") ??
            "Une mission zone propre a été récompensée."),
        tone: "clean-zones",
        icon: icon ?? "🌍",
        source,
        dedupeKey,
      };
    case "first_trace_utile_unlocked":
      {
        const xpText = formatGenericAmount(readNumber(payload.xp) ?? readNumber(payload.xpAwarded), "XP");
        return {
          title: title ?? "Première trace utile débloquée",
          message:
            message ??
            `${readString(payload.badgeId) ?? "La première trace utile"} est désormais visible.${
              xpText ? ` ${xpText}.` : ""
            }`,
          tone: "actions",
          icon: icon ?? "🏅",
          source,
          dedupeKey,
        };
      }
    case "level_up":
      return {
        title: title ?? "Niveau supérieur ! 🏆",
        message:
          message ??
          `Vous avez atteint le niveau ${readNumber(payload.newLevel) ?? readNumber(payload.currentLevel) ?? "suivant"}.`,
        tone: "generic",
        icon: icon ?? "🏆",
        source,
        dedupeKey,
      };
    case "referral_invite_awarded":
      return {
        title: title ?? "Badge invité un ami",
        message:
          message ??
          (formatGenericAmount(readNumber(payload.xp) ?? readNumber(payload.xpAwarded), "XP") ??
            "Le badge de parrainage a été débloqué."),
        tone: "generic",
        icon: icon ?? "share-2",
        source,
        dedupeKey,
      };
    case "xp_awarded":
      return {
        title: title ?? "XP attribués",
        message:
          message ??
          (formatGenericAmount(readNumber(payload.xp) ?? readNumber(payload.xpAwarded), "XP") ??
            "Des points d'expérience ont été attribués."),
        tone: "generic",
        icon: icon ?? "✨",
        source,
        dedupeKey,
      };
    default:
      if (title && message) {
        return { title, message, tone: "generic", icon, source, dedupeKey };
      }

      return null;
  }
}

export async function broadcastGamificationAnnouncement(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("notify_gamification", {
      channel: "gamification",
      payload,
    });

    if (error) {
      console.warn("[gamification] notification broadcast skipped:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[gamification] notification broadcast failed:", error);
    return false;
  }
}
