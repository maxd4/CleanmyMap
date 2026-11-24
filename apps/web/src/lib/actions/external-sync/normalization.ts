import { createHash } from "node:crypto";
import type { ExternalActionEvent } from "./types";

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function validDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function validTime(value: unknown): string | null {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return value;
}

function validHttpsUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function normalizeExternalActionEvent(input: {
  source: ExternalActionEvent["source"];
  externalId: unknown;
  externalUrl: unknown;
  title: unknown;
  description?: unknown;
  actionDate: unknown;
  startTime?: unknown;
  endTime?: unknown;
  meetingPoint?: unknown;
  commune?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  activityType?: unknown;
  registrationUrl?: unknown;
  routeReference?: unknown;
  crossReferences?: unknown;
  sourceRevision?: unknown;
  observedAt: unknown;
  externalStatus?: unknown;
}): ExternalActionEvent | null {
  const externalId = text(input.externalId);
  const externalUrl = validHttpsUrl(input.externalUrl);
  const title = text(input.title);
  const actionDate = validDate(input.actionDate);
  const observedAt = typeof input.observedAt === "string" && Number.isFinite(Date.parse(input.observedAt))
    ? new Date(input.observedAt).toISOString()
    : null;
  if (!externalId || externalId.length > 300 || !externalUrl || !title || title.length > 300 || !actionDate || !observedAt) return null;
  const latitude = typeof input.latitude === "number" && Number.isFinite(input.latitude) && input.latitude >= -90 && input.latitude <= 90 ? input.latitude : null;
  const longitude = typeof input.longitude === "number" && Number.isFinite(input.longitude) && input.longitude >= -180 && input.longitude <= 180 ? input.longitude : null;
  const references = Array.isArray(input.crossReferences)
    ? [...new Set(input.crossReferences.flatMap((value) => {
        const url = validHttpsUrl(value);
        return url ? [url] : [];
      }))].slice(0, 8)
    : [];
  const externalStatus = input.externalStatus === "published" || input.externalStatus === "cancelled"
    ? input.externalStatus
    : "unknown";
  return {
    source: input.source,
    externalId,
    externalUrl,
    title,
    ...(text(input.description) ? { description: text(input.description)!.slice(0, 4000) } : {}),
    actionDate,
    timezone: "Europe/Paris",
    ...(validTime(input.startTime) ? { startTime: validTime(input.startTime) } : {}),
    ...(validTime(input.endTime) ? { endTime: validTime(input.endTime) } : {}),
    ...(text(input.meetingPoint) ? { meetingPoint: text(input.meetingPoint)!.slice(0, 500) } : {}),
    ...(text(input.commune) ? { commune: text(input.commune)!.slice(0, 160) } : {}),
    ...(text(input.address) ? { address: text(input.address)!.slice(0, 500) } : {}),
    ...(latitude !== null ? { latitude } : {}),
    ...(longitude !== null ? { longitude } : {}),
    ...(text(input.activityType) ? { activityType: text(input.activityType)!.slice(0, 120) } : {}),
    ...(validHttpsUrl(input.registrationUrl) ? { registrationUrl: validHttpsUrl(input.registrationUrl) } : {}),
    ...(text(input.routeReference) ? { routeReference: text(input.routeReference)!.slice(0, 500) } : {}),
    ...(references.length ? { crossReferences: references } : {}),
    ...(text(input.sourceRevision) ? { sourceRevision: text(input.sourceRevision)!.slice(0, 300) } : {}),
    observedAt,
    externalStatus,
  };
}

function normalizeIdentityText(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

/** Exact, conservative identity for cross-platform duplicates; incomplete data is never fuzzy-matched. */
export function buildExternalActionIdentityHash(event: ExternalActionEvent, organizerDirectoryId: string): string | null {
  const startTime = event.startTime;
  const location = normalizeIdentityText(event.meetingPoint ?? event.address ?? null);
  const route = normalizeIdentityText(event.routeReference ?? null);
  if (!organizerDirectoryId.trim() || !startTime || !location || !route) return null;
  const identity = [organizerDirectoryId.trim(), event.actionDate, startTime, location, route].join("\u001f");
  return createHash("sha256").update(identity).digest("hex");
}

export function isExternalActionPublishAdmissible(event: ExternalActionEvent, now = new Date()): boolean {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: event.timezone }).format(now);
  return event.externalStatus === "published" && event.actionDate >= today && Boolean(event.title && (event.meetingPoint || event.address || event.commune));
}
