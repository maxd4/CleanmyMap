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

function formatGenericAmount(
  amount: number | undefined,
  suffix: string,
): string | undefined {
  if (amount === undefined || Number.isNaN(amount)) {
    return undefined;
  }

  return `${amount > 0 ? "+" : ""}${amount} ${suffix}`;
}

function joinKeyParts(...parts: Array<string | undefined>): string | undefined {
  const filtered = parts.filter(Boolean);
  return filtered.length > 0 ? filtered.join(":") : undefined;
}

function buildTierDedupedKey(type: string, payload: RawGamificationEvent): string {
  const tierId = readString(payload["tierId"]) ?? readString(payload["badgeId"]);
  return tierId ? `${type}:${tierId}` : type;
}

function buildBonusDedupedKey(type: string, payload: RawGamificationEvent): string {
  const bonus = readNumber(payload["bonus"]);
  return bonus !== undefined ? `${type}:${bonus}` : type;
}

function buildLevelDedupedKey(type: string, payload: RawGamificationEvent): string {
  const userId = readString(payload["userId"]);
  const level = readNumber(payload["newLevel"]) ?? readNumber(payload["currentLevel"]);
  return userId && level !== undefined ? `${type}:${userId}:${level}` : type;
}

function buildUserDedupedKey(type: string, payload: RawGamificationEvent): string {
  const userId = readString(payload["userId"]);
  return userId ? `${type}:${userId}` : type;
}

function buildSourceDedupedKey(type: string, payload: RawGamificationEvent): string {
  const sourceId = readString(payload["sourceId"]);
  const sourceTable = readString(payload["sourceTable"]);
  return joinKeyParts(type, sourceTable, sourceId) ?? type;
}

function buildDedupedKey(type: string, payload: RawGamificationEvent): string | undefined {
  if (type === "tier_unlocked" || type === "participant_tier_unlocked" || type === "form_tier_unlocked") {
    return buildTierDedupedKey(type, payload);
  }
  if (type === "form_bonus_unlocked") {
    return buildBonusDedupedKey(type, payload);
  }
  if (type === "clean_zone_task_awarded") {
    return buildSourceDedupedKey(type, payload);
  }
  if (type === "first_trace_utile_unlocked") {
    return buildTierDedupedKey(type, payload);
  }
  if (type === "level_up") {
    return buildLevelDedupedKey(type, payload);
  }
  if (type === "referral_invite_awarded") {
    return buildUserDedupedKey(type, payload);
  }
  if (type === "xp_awarded") {
    const userId = readString(payload["userId"]);
    const sourceId = readString(payload["sourceId"]);
    return userId && sourceId ? `${type}:${userId}:${sourceId}` : type;
  }
  return payload["dedupeKey"] as string | undefined;
}

function buildTierUnlockedAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  const xpText = formatGenericAmount(readNumber(payload["xp"]) ?? readNumber(payload["xpAwarded"]), "XP");
  return {
    title: base.title ?? "Palier débloqué",
    message:
      base.message ??
      `Le palier ${readString(payload["title"]) ?? readString(payload["tierId"]) ?? "suivant"} est débloqué.${
        xpText ? ` ${xpText}.` : ""
      }`,
    tone: "explorer",
    icon: base.icon ?? "✨",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildParticipantTierAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  const xpText = formatGenericAmount(readNumber(payload["xp"]) ?? readNumber(payload["xpAwarded"]), "XP");
  return {
    title: base.title ?? "Palier de participation débloqué",
    message:
      base.message ??
      `${readString(payload["tierId"]) ?? "Votre palier"} est débloqué côté participation.${
        xpText ? ` ${xpText}.` : ""
      }`,
    tone: "actions",
    icon: base.icon ?? "🤝",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildFormTierAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  const xpText = formatGenericAmount(readNumber(payload["xp"]) ?? readNumber(payload["xpAwarded"]), "XP");
  return {
    title: base.title ?? "Palier de formulaires débloqué",
    message:
      base.message ??
      `${readString(payload["tierId"]) ?? "Votre palier"} est débloqué pour les formulaires.${
        xpText ? ` ${xpText}.` : ""
      }`,
    tone: "forms",
    icon: base.icon ?? "🌱",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildFormBonusAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  return {
    title: base.title ?? "Bonus de formulaires débloqué",
    message:
      base.message ??
      (formatGenericAmount(readNumber(payload["bonus"]), "XP") ??
        "Un bonus de formulaires a été débloqué."),
    tone: "forms",
    icon: base.icon ?? "✨",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildCleanZoneAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  return {
    title: base.title ?? "Mission zone propre récompensée",
    message:
      base.message ??
      (formatGenericAmount(readNumber(payload["xp"]) ?? readNumber(payload["xpAwarded"]), "XP") ??
        "Une mission zone propre a été récompensée."),
    tone: "clean-zones",
    icon: base.icon ?? "🌍",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildFirstTraceAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  const xpText = formatGenericAmount(readNumber(payload["xp"]) ?? readNumber(payload["xpAwarded"]), "XP");
  return {
    title: base.title ?? "Première trace utile débloquée",
    message:
      base.message ??
      `${readString(payload["badgeId"]) ?? "La première trace utile"} est désormais visible.${
        xpText ? ` ${xpText}.` : ""
      }`,
    tone: "actions",
    icon: base.icon ?? "🏅",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildLevelUpAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  return {
    title: base.title ?? "Niveau supérieur ! 🏆",
    message:
      base.message ??
      `Vous avez atteint le niveau ${readNumber(payload["newLevel"]) ?? readNumber(payload["currentLevel"]) ?? "suivant"}.`,
    tone: "generic",
    icon: base.icon ?? "🏆",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildReferralAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  return {
    title: base.title ?? "Badge invité un ami",
    message:
      base.message ??
      (formatGenericAmount(readNumber(payload["xp"]) ?? readNumber(payload["xpAwarded"]), "XP") ??
        "Le badge de parrainage a été débloqué."),
    tone: "generic",
    icon: base.icon ?? "share-2",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildXpAnnouncement(
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload {
  return {
    title: base.title ?? "XP attribués",
    message:
      base.message ??
      (formatGenericAmount(readNumber(payload["xp"]) ?? readNumber(payload["xpAwarded"]), "XP") ??
        "Des points d'expérience ont été attribués."),
    tone: "generic",
    icon: base.icon ?? "✨",
    source: base.source,
    dedupeKey: base.dedupeKey,
  };
}

function buildTypedAnnouncement(
  type: string,
  payload: RawGamificationEvent,
  base: {
    title?: string;
    message?: string;
    icon?: string;
    source: string;
    dedupeKey?: string;
  },
): GamificationAnnouncementPayload | null {
  if (type === "tier_unlocked") {
    return buildTierUnlockedAnnouncement(payload, base);
  }
  if (type === "participant_tier_unlocked") {
    return buildParticipantTierAnnouncement(payload, base);
  }
  if (type === "form_tier_unlocked") {
    return buildFormTierAnnouncement(payload, base);
  }
  if (type === "form_bonus_unlocked") {
    return buildFormBonusAnnouncement(payload, base);
  }
  if (type === "clean_zone_task_awarded") {
    return buildCleanZoneAnnouncement(payload, base);
  }
  if (type === "first_trace_utile_unlocked") {
    return buildFirstTraceAnnouncement(payload, base);
  }
  if (type === "level_up") {
    return buildLevelUpAnnouncement(payload, base);
  }
  if (type === "referral_invite_awarded") {
    return buildReferralAnnouncement(payload, base);
  }
  if (type === "xp_awarded") {
    return buildXpAnnouncement(payload, base);
  }
  if (base.title && base.message) {
    return {
      title: base.title,
      message: base.message,
      tone: "generic",
      icon: base.icon,
      source: base.source,
      dedupeKey: base.dedupeKey,
    };
  }
  return null;
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
  const type = readString(payload["type"]);
  const base = {
    title: readString(payload["title"]),
    message: readString(payload["message"]),
    icon: readString(payload["icon"]),
    source: readString(payload["source"]) ?? "realtime",
    dedupeKey: type ? buildDedupedKey(type, payload) : readString(payload["dedupeKey"]),
  };

  if (!type) {
    if (base.title && base.message) {
      return {
        title: base.title,
        message: base.message,
        icon: base.icon,
        source: base.source,
        dedupeKey: base.dedupeKey,
      };
    }
    return null;
  }

  return buildTypedAnnouncement(type, payload, base);
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
