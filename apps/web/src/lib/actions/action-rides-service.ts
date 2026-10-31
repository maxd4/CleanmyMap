import type { SupabaseClient } from "@supabase/supabase-js";
import { isPublicActionReferenceAvailable } from "@/lib/chat/action-sharing";
import { loadActionById } from "@/lib/actions/store";
import { readActionRegistrationRecord } from "@/lib/actions/participation/registration-records";
import {
  validateActionRideInput,
  validateActionRideRequestInput,
  type ActionRideRequestStatus,
  type ActionRideStatus,
} from "./action-rides";

type RideClient = SupabaseClient;

export type ActionRideRow = {
  id: string;
  action_id: string;
  driver_user_id: string;
  origin_zone_name: string;
  departure_at: string;
  seats_total: number;
  note: string | null;
  status: ActionRideStatus;
  created_at: string;
  updated_at: string;
};

type ActionRideRequestRow = {
  id: string;
  ride_id: string;
  passenger_user_id: string;
  seats_requested: number;
  message: string | null;
  status: ActionRideRequestStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type ActionRideCapacityRow = {
  ride_id: string;
  seats_total: number;
  seats_reserved: number;
  seats_available: number;
};

type ProfileRow = { id: string; display_name: string | null; handle: string | null };

export type ActionRideRequestProjection = {
  id: string;
  seatsRequested: number;
  message: string | null;
  status: ActionRideRequestStatus;
  resolvedAt: string | null;
  passengerDisplayName?: string;
};

export type ActionRideProjection = {
  id: string;
  originZoneName: string;
  departureAt: string;
  seatsTotal: number;
  seatsAvailable: number;
  note: string | null;
  status: ActionRideStatus;
  driverDisplayName: string;
  isDriver: boolean;
  myRequests: ActionRideRequestProjection[];
  requests: ActionRideRequestProjection[];
};

export class ActionRideServiceError extends Error {
  readonly status: 400 | 403 | 404 | 409 | 422;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 422) {
    super(message);
    this.name = "ActionRideServiceError";
    this.status = status;
  }
}

const RIDE_COLUMNS = "id, action_id, driver_user_id, origin_zone_name, departure_at, seats_total, note, status, created_at, updated_at";
const REQUEST_COLUMNS = "id, ride_id, passenger_user_id, seats_requested, message, status, created_at, updated_at, resolved_at";

function rowError(_error: { message?: string } | null, fallback: string): never {
  throw new ActionRideServiceError(fallback, 409);
}

function normalizeRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function assertActionReadable(
  action: Awaited<ReturnType<typeof loadActionById>>,
  actionId: string,
): asserts action is NonNullable<Awaited<ReturnType<typeof loadActionById>>> {
  if (!action || action.id !== actionId) throw new ActionRideServiceError("Action introuvable.", 404);
  if (
    action.action_phase !== "pre_action" ||
    !action.published_at ||
    action.moderation_visibility === "hidden" ||
    action.status === "rejected" ||
    action.status === "cancelled" ||
    action.access_mode === "invite_link" ||
    Boolean(action.review_state && !["not_required", "approved"].includes(action.review_state))
  ) {
    throw new ActionRideServiceError("Le covoiturage n'est pas disponible pour cette action.", 403);
  }
}

async function resolveConfirmedMember(
  supabase: RideClient,
  actionId: string,
  userId: string,
  requireFuture: boolean,
) {
  const action = await loadActionById(supabase, actionId);
  assertActionReadable(action, actionId);
  const registration = await readActionRegistrationRecord(supabase, { actionId, userId });
  if (registration?.registration_status !== "confirmed") {
    throw new ActionRideServiceError("Le covoiturage est réservé aux inscrits confirmés.", 403);
  }
  if (requireFuture && !isPublicActionReferenceAvailable(action)) {
    throw new ActionRideServiceError("Cette action a commencé ou n'est plus éligible au covoiturage.", 409);
  }
  return action;
}

async function loadRide(
  supabase: RideClient,
  actionId: string,
  rideId: string,
): Promise<ActionRideRow> {
  const result = await supabase
    .from("action_rides")
    .select(RIDE_COLUMNS)
    .eq("action_id", actionId)
    .eq("id", rideId)
    .maybeSingle();
  if (result.error) throw new ActionRideServiceError("Le trajet est temporairement indisponible.", 409);
  if (!result.data) throw new ActionRideServiceError("Trajet introuvable.", 404);
  return result.data as ActionRideRow;
}

async function loadCapacity(supabase: RideClient, rideId: string): Promise<ActionRideCapacityRow> {
  const result: { data: unknown; error: { message?: string } | null } = await supabase.rpc("action_ride_capacity", { p_ride_id: rideId });
  if (result.error) throw new ActionRideServiceError("La capacité du trajet est temporairement indisponible.", 409);
  const row = normalizeRows<ActionRideCapacityRow>(result.data)[0];
  if (!row) throw new ActionRideServiceError("Capacité du trajet indisponible.", 409);
  return { ...row, seats_available: Math.max(0, Number(row.seats_available)) };
}

async function loadProfiles(supabase: RideClient, userIds: string[]): Promise<Map<string, ProfileRow>> {
  const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const result = await supabase.from("profiles").select("id, display_name, handle").in("id", ids);
  if (result.error) throw new ActionRideServiceError("Les profils publics sont temporairement indisponibles.", 409);
  return new Map(normalizeRows<ProfileRow>(result.data).map((row) => [row.id, row]));
}

function displayName(profiles: Map<string, ProfileRow>, userId: string): string {
  const row = profiles.get(userId);
  return row?.display_name?.trim() || row?.handle?.trim() || "Membre";
}

export async function listActionRides(
  supabase: RideClient,
  params: { actionId: string; userId: string },
): Promise<{ actionId: string; rides: ActionRideProjection[] }> {
  await resolveConfirmedMember(supabase, params.actionId, params.userId, false);
  const result = await supabase
    .from("action_rides")
    .select(RIDE_COLUMNS)
    .eq("action_id", params.actionId)
    .order("departure_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(50);
  if (result.error) throw new ActionRideServiceError("Les trajets sont temporairement indisponibles.", 409);
  const rides = normalizeRows<ActionRideRow>(result.data);
  const capacities = await Promise.all(rides.map((ride) => loadCapacity(supabase, ride.id)));
  const rideIds = rides.map((ride) => ride.id);
  const requestsResult = rideIds.length
    ? await supabase.from("action_ride_requests").select(REQUEST_COLUMNS).in("ride_id", rideIds).order("created_at", { ascending: true })
    : { data: [], error: null };
  if (requestsResult.error) throw new ActionRideServiceError("Les demandes sont temporairement indisponibles.", 409);
  const requests = normalizeRows<ActionRideRequestRow>(requestsResult.data);
  const profiles = await loadProfiles(supabase, [
    ...rides.map((ride) => ride.driver_user_id),
    ...requests.map((request) => request.passenger_user_id),
  ]);
  const requestsByRide = new Map<string, ActionRideRequestRow[]>();
  for (const request of requests) {
    const list = requestsByRide.get(request.ride_id) ?? [];
    list.push(request);
    requestsByRide.set(request.ride_id, list);
  }
  return {
    actionId: params.actionId,
    rides: rides.map((ride, index) => {
      const rideRequests = requestsByRide.get(ride.id) ?? [];
      const isDriver = ride.driver_user_id === params.userId;
      const mine = rideRequests.filter((request) => request.passenger_user_id === params.userId);
      return {
        id: ride.id,
        originZoneName: ride.origin_zone_name,
        departureAt: ride.departure_at,
        seatsTotal: ride.seats_total,
        seatsAvailable: capacities[index]?.seats_available ?? 0,
        note: ride.note,
        status: ride.status,
        driverDisplayName: displayName(profiles, ride.driver_user_id),
        isDriver,
        myRequests: mine.map((request) => projectRequest(request)),
        requests: isDriver ? rideRequests.map((request) => projectRequest(request, displayName(profiles, request.passenger_user_id))) : [],
      };
    }),
  };
}

function projectRequest(request: ActionRideRequestRow, passengerDisplayName?: string): ActionRideRequestProjection {
  return {
    id: request.id,
    seatsRequested: request.seats_requested,
    message: request.message,
    status: request.status,
    resolvedAt: request.resolved_at,
    ...(passengerDisplayName ? { passengerDisplayName } : {}),
  };
}

export async function createActionRide(
  supabase: RideClient,
  params: { actionId: string; userId: string; input: unknown },
) {
  await resolveConfirmedMember(supabase, params.actionId, params.userId, true);
  const parsed = validateActionRideInput(params.input);
  if (!parsed.ok) throw new ActionRideServiceError(parsed.reason, 422);
  const result = await supabase.from("action_rides").insert({
    action_id: params.actionId,
    driver_user_id: params.userId,
    origin_zone_name: parsed.value.originZoneName,
    departure_at: parsed.value.departureAt,
    seats_total: parsed.value.seatsTotal,
    note: parsed.value.note,
    status: "open",
  }).select(RIDE_COLUMNS).single();
  if (result.error) rowError(result.error, "Le trajet n'a pas pu être créé.");
  return { ride: result.data as ActionRideRow };
}

export async function updateActionRide(
  supabase: RideClient,
  params: { actionId: string; rideId: string; userId: string; input: unknown },
) {
  await resolveConfirmedMember(supabase, params.actionId, params.userId, true);
  const ride = await loadRide(supabase, params.actionId, params.rideId);
  if (ride.driver_user_id !== params.userId) throw new ActionRideServiceError("Seul le conducteur peut modifier ce trajet.", 403);
  const parsed = validateActionRideInput(params.input);
  if (!parsed.ok) throw new ActionRideServiceError(parsed.reason, 422);
  const result: { data: unknown; error: { message?: string } | null } = await supabase.rpc("update_action_ride_details", {
    p_ride_id: params.rideId,
    p_actor_user_id: params.userId,
    p_origin_zone_name: parsed.value.originZoneName,
    p_departure_at: parsed.value.departureAt,
    p_seats_total: parsed.value.seatsTotal,
    p_note: parsed.value.note,
  });
  if (result.error) rowError(result.error, "Le trajet n'a pas pu être modifié.");
  return { ride: normalizeRows<ActionRideRow>(result.data)[0] ?? null };
}

export async function transitionActionRide(
  supabase: RideClient,
  params: { actionId: string; rideId: string; userId: string; status: "closed" | "cancelled" },
) {
  await resolveConfirmedMember(supabase, params.actionId, params.userId, false);
  await loadRide(supabase, params.actionId, params.rideId);
  const result: { data: unknown; error: { message?: string } | null } = await supabase.rpc("transition_action_ride", {
    p_ride_id: params.rideId,
    p_actor_user_id: params.userId,
    p_status: params.status,
  });
  if (result.error) rowError(result.error, "Le trajet n'a pas pu être clôturé.");
  return normalizeRows<{ ride_id: string; status: ActionRideStatus; resolved_requests: number; notified_passengers: number }>(result.data)[0] ?? null;
}

export async function createActionRideRequest(
  supabase: RideClient,
  params: { actionId: string; rideId: string; userId: string; input: unknown },
) {
  await resolveConfirmedMember(supabase, params.actionId, params.userId, true);
  const ride = await loadRide(supabase, params.actionId, params.rideId);
  if (ride.status !== "open") throw new ActionRideServiceError("Ce trajet n'est plus ouvert.", 409);
  if (ride.driver_user_id === params.userId) throw new ActionRideServiceError("Vous ne pouvez pas demander une place sur votre propre trajet.", 422);
  const parsed = validateActionRideRequestInput(params.input);
  if (!parsed.ok) throw new ActionRideServiceError(parsed.reason, 422);
  const result = await supabase.from("action_ride_requests").insert({
    ride_id: params.rideId,
    passenger_user_id: params.userId,
    seats_requested: parsed.value.seatsRequested,
    message: parsed.value.message,
    status: "pending",
  }).select(REQUEST_COLUMNS).single();
  if (result.error) rowError(result.error, "La demande n'a pas pu être créée. Elle existe peut-être déjà.");
  return { request: result.data as ActionRideRequestRow };
}

export async function decideActionRideRequest(
  supabase: RideClient,
  params: { actionId: string; rideId: string; requestId: string; userId: string; decision: "accept" | "decline" | "withdraw" },
) {
  await resolveConfirmedMember(supabase, params.actionId, params.userId, params.decision !== "withdraw");
  const ride = await loadRide(supabase, params.actionId, params.rideId);
  if (params.decision === "withdraw" && ride.status === "cancelled") throw new ActionRideServiceError("Ce trajet est annulé.", 409);
  const rpcName = params.decision === "accept"
    ? "accept_action_ride_request"
    : params.decision === "decline"
      ? "decline_action_ride_request"
      : "withdraw_action_ride_request";
  const result: { data: unknown; error: { message?: string } | null } = await supabase.rpc(rpcName, {
    p_request_id: params.requestId,
    p_actor_user_id: params.userId,
  });
  if (result.error) rowError(result.error, "La demande n'a pas pu être mise à jour.");
  return normalizeRows<Record<string, unknown>>(result.data)[0] ?? null;
}

export async function resolveActionRideContact(
  supabase: RideClient,
  params: { actionId: string; rideId: string; userId: string; requestId?: string },
) {
  await resolveConfirmedMember(supabase, params.actionId, params.userId, false);
  const ride = await loadRide(supabase, params.actionId, params.rideId);
  let requestsQuery = supabase
    .from("action_ride_requests")
    .select(REQUEST_COLUMNS)
    .eq("ride_id", ride.id)
    .eq("status", "accepted");
  if (params.requestId) requestsQuery = requestsQuery.eq("id", params.requestId);
  const requestsResult = await requestsQuery;
  if (requestsResult.error) throw new ActionRideServiceError("Les demandes sont temporairement indisponibles.", 409);
  const requests = normalizeRows<ActionRideRequestRow>(requestsResult.data);
  const peerId = ride.driver_user_id === params.userId
    ? requests[0]?.passenger_user_id
    : requests.find((request) => request.passenger_user_id === params.userId)
      ? ride.driver_user_id
      : null;
  if (!peerId || peerId === params.userId) throw new ActionRideServiceError("Le contact privé est disponible après acceptation de la demande.", 403);
  const profiles = await loadProfiles(supabase, [peerId]);
  const profile = profiles.get(peerId);
  return {
    recipient: {
      id: peerId,
      displayName: displayName(profiles, peerId),
      handle: profile?.handle?.trim() || null,
    },
  };
}
