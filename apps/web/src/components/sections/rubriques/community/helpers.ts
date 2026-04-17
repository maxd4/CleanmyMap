"use client";

import type { CommunityRsvpStatus } from "@/lib/community/http";

export function formatFrDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    parsed,
  );
}

export function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const asInt = Math.trunc(parsed);
  return asInt >= 0 ? asInt : null;
}

export function toRsvpLabel(status: CommunityRsvpStatus): string {
  if (status === "yes") {
    return "Je participe";
  }
  if (status === "maybe") {
    return "Peut-etre";
  }
  return "Je ne participe pas";
}
