"use client";

import type { CommunityRsvpStatus } from"@/lib/community/http";

export function formatFrDate(value: string): string {
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) {
 return value;
 }
 return new Intl.DateTimeFormat("fr-FR", { dateStyle:"medium" }).format(
 parsed,
 );
}

export function parseOptionalInt(value: string): number | null {
 const trimmed = value.trim();
 if (!trimmed) {
 return null;
 }
 const parsed = Number(trimmed);
 if (!Number.isInteger(parsed) || parsed < 0 || parsed > 200000) {
 return null;
 }
 return parsed;
}

export function toRsvpLabel(status: CommunityRsvpStatus): string {
 if (status ==="yes") {
 return"Je participe";
 }
 if (status ==="maybe") {
 return"Peut-être";
 }
 return"Je ne participe pas";
}
