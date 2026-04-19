export type CommunityRsvpStatus = "yes" | "maybe" | "no";

export type CommunityEventItem = {
  id: string;
  createdAt: string;
  organizerClerkId: string | null;
  title: string;
  eventDate: string;
  locationLabel: string;
  description: string | null;
  capacityTarget: number | null;
  attendanceCount: number | null;
  postMortem: string | null;
  rsvpCounts: {
    yes: number;
    maybe: number;
    no: number;
    total: number;
  };
  myRsvpStatus: CommunityRsvpStatus | null;
  organizer?: {
    userId: string | null;
    displayName: string;
    roleBadge: {
      id: string;
      label: string;
      icon: string;
    };
    profileBadge: {
      id: string;
      label: string;
      icon: string;
    };
  };
};

export type CommunityEventsResponse = {
  status: "ok";
  count: number;
  items: CommunityEventItem[];
};

export type CommunityCreateEventPayload = {
  title: string;
  eventDate: string;
  locationLabel: string;
  description?: string;
  capacityTarget?: number;
};

export type CommunityClientErrorCode =
  | "invalid_payload"
  | "permission_denied"
  | "not_found"
  | "network_error"
  | "server_error";

export class CommunityClientError extends Error {
  readonly code: CommunityClientErrorCode;
  readonly status?: number;

  constructor(
    code: CommunityClientErrorCode,
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "CommunityClientError";
    this.code = code;
    this.status = status;
  }
}

function parseApiErrorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  const error = (value as { error?: unknown }).error;
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeClientError(
  responseStatus: number,
  message: string,
): CommunityClientError {
  if (responseStatus === 400) {
    return new CommunityClientError("invalid_payload", message, responseStatus);
  }
  if (responseStatus === 401 || responseStatus === 403) {
    return new CommunityClientError(
      "permission_denied",
      message,
      responseStatus,
    );
  }
  if (responseStatus === 404) {
    return new CommunityClientError("not_found", message, responseStatus);
  }
  return new CommunityClientError("server_error", message, responseStatus);
}

function parsePositiveInteger(
  raw: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(raw)));
}

function parseCommunityEventsPayload(
  payload: unknown,
): CommunityEventsResponse {
  if (!payload || typeof payload !== "object") {
    throw new CommunityClientError(
      "server_error",
      "Reponse community invalide.",
    );
  }
  const body = payload as {
    status?: unknown;
    count?: unknown;
    items?: unknown;
  };
  if (
    body.status !== "ok" ||
    typeof body.count !== "number" ||
    !Array.isArray(body.items)
  ) {
    throw new CommunityClientError(
      "server_error",
      "Reponse community incomplete.",
    );
  }
  return {
    status: "ok",
    count: body.count,
    items: body.items as CommunityEventItem[],
  };
}

export function buildCommunityEventsQueryString(
  params: { limit?: number } = {},
): string {
  const query = new URLSearchParams();
  query.set("limit", String(parsePositiveInteger(params.limit, 1, 300, 120)));
  return query.toString();
}

export async function fetchCommunityEvents(
  params: { limit?: number } = {},
): Promise<CommunityEventsResponse> {
  let response: Response;
  try {
    const query = buildCommunityEventsQueryString(params);
    response = await fetch(`/api/community/events?${query}`, {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    throw new CommunityClientError(
      "network_error",
      "Reseau indisponible: impossible de charger les evenements.",
    );
  }

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw normalizeClientError(
      response.status,
      parseApiErrorMessage(body, "Chargement des evenements impossible."),
    );
  }

  return parseCommunityEventsPayload(body);
}

export async function createCommunityEvent(
  payload: CommunityCreateEventPayload,
): Promise<CommunityEventItem> {
  let response: Response;
  try {
    response = await fetch("/api/community/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new CommunityClientError(
      "network_error",
      "Reseau indisponible: creation d'evenement impossible.",
    );
  }

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw normalizeClientError(
      response.status,
      parseApiErrorMessage(body, "Creation d'evenement impossible."),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    (body as { status?: unknown }).status !== "created"
  ) {
    throw new CommunityClientError(
      "server_error",
      "Reponse creation evenement invalide.",
    );
  }

  const item = (body as { item?: unknown }).item;
  if (!item || typeof item !== "object") {
    throw new CommunityClientError(
      "server_error",
      "Reponse creation evenement incomplete.",
    );
  }
  return item as CommunityEventItem;
}

export async function updateCommunityEventOps(payload: {
  eventId: string;
  capacityTarget?: number | null;
  attendanceCount?: number | null;
  postMortem?: string | null;
}): Promise<CommunityEventItem> {
  let response: Response;
  try {
    response = await fetch("/api/community/events/ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new CommunityClientError(
      "network_error",
      "Reseau indisponible: mise a jour evenement impossible.",
    );
  }

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw normalizeClientError(
      response.status,
      parseApiErrorMessage(body, "Mise a jour evenement impossible."),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    (body as { status?: unknown }).status !== "ok"
  ) {
    throw new CommunityClientError(
      "server_error",
      "Reponse update evenement invalide.",
    );
  }

  const item = (body as { item?: unknown }).item;
  if (!item || typeof item !== "object") {
    throw new CommunityClientError(
      "server_error",
      "Reponse update evenement incomplete.",
    );
  }
  return item as CommunityEventItem;
}

export async function upsertCommunityRsvp(payload: {
  eventId: string;
  status: CommunityRsvpStatus;
}): Promise<{
  eventId: string;
  participantClerkId: string;
  rsvpStatus: CommunityRsvpStatus;
  updatedAt: string;
}> {
  let response: Response;
  try {
    response = await fetch("/api/community/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new CommunityClientError(
      "network_error",
      "Reseau indisponible: RSVP impossible.",
    );
  }

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw normalizeClientError(
      response.status,
      parseApiErrorMessage(body, "RSVP impossible."),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    (body as { status?: unknown }).status !== "ok"
  ) {
    throw new CommunityClientError("server_error", "Reponse RSVP invalide.");
  }

  const item = (body as { item?: unknown }).item;
  if (!item || typeof item !== "object") {
    throw new CommunityClientError("server_error", "Reponse RSVP incomplete.");
  }
  const normalized = item as {
    eventId?: unknown;
    participantClerkId?: unknown;
    rsvpStatus?: unknown;
    updatedAt?: unknown;
  };
  if (
    typeof normalized.eventId !== "string" ||
    typeof normalized.participantClerkId !== "string" ||
    (normalized.rsvpStatus !== "yes" &&
      normalized.rsvpStatus !== "maybe" &&
      normalized.rsvpStatus !== "no") ||
    typeof normalized.updatedAt !== "string"
  ) {
    throw new CommunityClientError("server_error", "Reponse RSVP incomplete.");
  }

  return {
    eventId: normalized.eventId,
    participantClerkId: normalized.participantClerkId,
    rsvpStatus: normalized.rsvpStatus,
    updatedAt: normalized.updatedAt,
  };
}
