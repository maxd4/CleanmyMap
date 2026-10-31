import { normalizeCommunityTerritory } from "@/lib/community/subscriptions";

export const ACTION_RIDE_SEATS_TOTAL_RANGE = { min: 1, max: 8 } as const;
export const ACTION_RIDE_SEATS_REQUESTED_RANGE = { min: 1, max: 4 } as const;
export const ACTION_RIDE_FREE_TEXT_MAX_LENGTH = 200;

export const ACTION_RIDE_FREE_TEXT_NOTICE =
  "N'indiquez ni adresse précise, ni coordonnées, ni téléphone, ni e-mail, ni plaque d'immatriculation.";

export type ActionRideStatus = "open" | "closed" | "cancelled";
export type ActionRideRequestStatus = "pending" | "accepted" | "declined" | "withdrawn";

export type ActionRideInput = {
  originZoneName: string;
  departureAt: string;
  seatsTotal: number;
  note: string | null;
};

export type ActionRideRequestInput = {
  seatsRequested: number;
  message: string | null;
};

type ActionRideFreeTextRejection =
  | "invalid_text"
  | "contact_like"
  | "coordinate_like"
  | "address_like";

export type ActionRideFreeTextResult =
  | { ok: true; value: string | null }
  | { ok: false; reason: ActionRideFreeTextRejection };

export type ActionRideInputResult =
  | { ok: true; value: ActionRideInput }
  | { ok: false; field: "originZoneName" | "departureAt" | "seatsTotal" | "note"; reason: string };

export type ActionRideRequestInputResult =
  | { ok: true; value: ActionRideRequestInput }
  | { ok: false; field: "seatsRequested" | "message"; reason: string };

const CONTACT_PATTERN =
  /(?:\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?\d[\d .()/-]{7,}\d)|\b(?:t(?:e|é)l(?:ephone)?|whatsapp|signal|telegram|mail|email)\b)/iu;
const COORDINATE_PATTERN =
  /(?:\b(?:lat(?:itude)?|lon(?:gitude)?|coordonn(?:ée|e)s?)\b|[-+]?\d{1,3}(?:[.,]\d+)?\s*[,;]\s*[-+]?\d{1,3}(?:[.,]\d+)?)/iu;
const ADDRESS_PATTERN =
  /(?:\b\d{1,5}\s+(?:rue|avenue|av\.?|boulevard|bd\.?|chemin|impasse|all(?:ée|e)|quai|place|route|passage)\b|\b(?:rue|avenue|boulevard|chemin|impasse|all(?:ée|e)|quai|place|route|passage)\s+[^,\n]{1,100}\s+\d{5}\b|\b\d{5}\b|\b(?:code postal|adresse exacte|chez moi)\b)/iu;

function normalizeFreeText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/gu, " ");
  return normalized.length > 0 ? normalized : null;
}
export function normalizeActionRideOriginZone(value: unknown): string | null {
  return normalizeCommunityTerritory(value);
}

export function validateActionRideFreeText(value: unknown): ActionRideFreeTextResult {
  const normalized = normalizeFreeText(value);
  if (normalized === null) {
    return { ok: true, value: null };
  }
  if (normalized.length > ACTION_RIDE_FREE_TEXT_MAX_LENGTH) {
    return { ok: false, reason: "invalid_text" };
  }
  if (COORDINATE_PATTERN.test(normalized)) {
    return { ok: false, reason: "coordinate_like" };
  }
  if (CONTACT_PATTERN.test(normalized)) {
    return { ok: false, reason: "contact_like" };
  }
  if (ADDRESS_PATTERN.test(normalized)) {
    return { ok: false, reason: "address_like" };
  }
  return { ok: true, value: normalized };
}

function finiteInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function normalizeDepartureAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function validateActionRideInput(input: unknown): ActionRideInputResult {
  if (!input || typeof input !== "object") {
    return { ok: false, field: "originZoneName", reason: "Formulaire de trajet invalide." };
  }
  const candidate = input as Record<string, unknown>;
  const originZoneName = normalizeActionRideOriginZone(candidate.originZoneName);
  if (!originZoneName) {
    return { ok: false, field: "originZoneName", reason: "Choisissez une zone reconnue." };
  }
  const departureAt = normalizeDepartureAt(candidate.departureAt);
  if (!departureAt) {
    return { ok: false, field: "departureAt", reason: "Indiquez un horaire valide." };
  }
  const seatsTotal = finiteInteger(candidate.seatsTotal);
  if (seatsTotal === null || seatsTotal < ACTION_RIDE_SEATS_TOTAL_RANGE.min || seatsTotal > ACTION_RIDE_SEATS_TOTAL_RANGE.max) {
    return { ok: false, field: "seatsTotal", reason: `Le nombre de places doit être compris entre ${ACTION_RIDE_SEATS_TOTAL_RANGE.min} et ${ACTION_RIDE_SEATS_TOTAL_RANGE.max}.` };
  }
  const note = validateActionRideFreeText(candidate.note);
  if (!note.ok) {
    return { ok: false, field: "note", reason: ACTION_RIDE_FREE_TEXT_NOTICE };
  }
  return { ok: true, value: { originZoneName, departureAt, seatsTotal, note: note.value } };
}

export function validateActionRideRequestInput(input: unknown): ActionRideRequestInputResult {
  if (!input || typeof input !== "object") {
    return { ok: false, field: "seatsRequested", reason: "Demande de place invalide." };
  }
  const candidate = input as Record<string, unknown>;
  const seatsRequested = finiteInteger(candidate.seatsRequested);
  if (seatsRequested === null || seatsRequested < ACTION_RIDE_SEATS_REQUESTED_RANGE.min || seatsRequested > ACTION_RIDE_SEATS_REQUESTED_RANGE.max) {
    return { ok: false, field: "seatsRequested", reason: `Le nombre de places demandées doit être compris entre ${ACTION_RIDE_SEATS_REQUESTED_RANGE.min} et ${ACTION_RIDE_SEATS_REQUESTED_RANGE.max}.` };
  }
  const message = validateActionRideFreeText(candidate.message);
  if (!message.ok) {
    return { ok: false, field: "message", reason: ACTION_RIDE_FREE_TEXT_NOTICE };
  }
  return { ok: true, value: { seatsRequested, message: message.value } };
}
