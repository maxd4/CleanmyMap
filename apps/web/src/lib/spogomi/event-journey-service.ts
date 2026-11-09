import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SpogomiPublicEvent } from "./public-service";
import { buildSpogomiEventJourney, type SpogomiEventJourneyInput } from "./event-journey";
import { listSpogomiAdmissionRequestsForRequester } from "./admission-requests";
import { resolveSpogomiEventAccessBySlug } from "./authorization";
import { loadSpogomiFieldOperationsAccess } from "./field-operations-service";
import { loadSpogomiIdentityState } from "./identity-link";
import { loadSpogomiRegistrationQuiz, loadSpogomiRegistrationQuizProofsForUser, SpogomiRegistrationQuizError } from "./preparation/registration-quiz-service";
import { loadSpogomiRegistrationReadiness } from "./preparation/registration-readiness-service";
import { loadSpogomiVolunteerSummaryForUser } from "./volunteer";

function selectedDivision(event: SpogomiPublicEvent, selectedDivisionId?: string | null) {
  return event.divisions.find((division) => division.id === selectedDivisionId) ?? event.divisions[0] ?? null;
}

function emptyInput(event: SpogomiPublicEvent, selectedDivisionId: string | null | undefined, signInHref: string, signInHrefByStep?: SpogomiEventJourneyInput["signInHrefByStep"]): SpogomiEventJourneyInput {
  const division = selectedDivision(event, selectedDivisionId);
  return {
    isAuthenticated: false,
    lifecycle: event.lifecycle,
    registrationStatus: division?.registrationStatus ?? event.registrationStatus,
    directRegistrationAvailable: division?.directRegistrationAvailable === true,
    resultsStatus: event.resultsStatus,
    quizStatus: "unavailable",
    admissionStatus: "none",
    identityStatus: "identity_unlinked",
    teamLinked: false,
    privateProofStatus: "unavailable",
    hasCertifiedMission: false,
    hasActiveAttestation: false,
    organizerSpaceHref: null,
    refereeSpaceHref: null,
    refereeCapabilities: [],
    signInHref,
    signInHrefByStep,
  };
}

function admissionStatus(
  requests: readonly { requestKind: string; status: string; divisionId: string }[],
  selectedDivisionId: string | null,
): SpogomiEventJourneyInput["admissionStatus"] {
  const registrations = requests.filter((request) => request.requestKind === "registration" && request.divisionId === selectedDivisionId);
  if (!registrations.length) return "none";
  if (registrations.some((request) => request.status === "pending")) return "pending";
  if (registrations.some((request) => request.status === "approved")) return "approved";
  return registrations[0]?.status === "rejected" ? "rejected" : "cancelled";
}

function hasActiveRegistrationRequest(requests: readonly { requestKind: string; status: string }[]): boolean {
  return requests.some((request) => request.requestKind === "registration" && (request.status === "pending" || request.status === "approved"));
}

async function loadRegistrationContractRevision(eventId: string, supabase: ReturnType<typeof getSupabaseServerClient>): Promise<number> {
  const result = await supabase.from("spogomi_events").select("registration_contract_revision").eq("id", eventId).maybeSingle();
  if (result.error || !result.data || !Number.isInteger(Number(result.data.registration_contract_revision))) {
    throw new SpogomiRegistrationQuizError("La révision du contrat d’inscription est indisponible.", "unavailable");
  }
  return Number(result.data.registration_contract_revision);
}

async function quizStatus(event: SpogomiPublicEvent, divisionId: string | null, userId: string, supabase: ReturnType<typeof getSupabaseServerClient>): Promise<SpogomiEventJourneyInput["quizStatus"]> {
  if (!divisionId) return "unavailable";
  const definition = await loadSpogomiRegistrationQuiz({ supabase, eventId: event.id, divisionId });
  if (!definition.available) return "unavailable";
  const versions = new Map([[divisionId, definition.quizVersion]]);
  const registrationContractRevision = await loadRegistrationContractRevision(event.id, supabase);
  const proofs = await loadSpogomiRegistrationQuizProofsForUser({ supabase, eventId: event.id, userId, quizVersions: versions, registrationContractRevision });
  return proofs.has(divisionId) ? "passed" : "missing";
}

function roleSpaceInputs(event: SpogomiPublicEvent, slug: string, eventAccess: Awaited<ReturnType<typeof resolveSpogomiEventAccessBySlug>>, fieldAccess: Awaited<ReturnType<typeof loadSpogomiFieldOperationsAccess>>) {
  const organizer = Boolean(eventAccess?.isOrganizer || fieldAccess?.isOrganizer);
  const organizerSection = event.lifecycle === "finished" ? "results" : "teams";
  const organizerSpaceHref = organizer ? `/spogomi/${encodeURIComponent(slug)}/espace#${organizerSection}` : null;
  const capabilities = new Set<SpogomiEventJourneyInput["refereeCapabilities"][number]>();
  if (eventAccess?.capabilities.has("checkin") || fieldAccess?.capabilities.has("arrival")) capabilities.add("attendance");
  if (fieldAccess && [...fieldAccess.capabilities].some((capability) => capability === "timing" || capability === "weighing" || capability === "measurement_entry" || capability === "certification")) capabilities.add("operations");
  if (eventAccess?.capabilities.has("arbitrate") || fieldAccess?.capabilities.has("arbitration")) capabilities.add("arbitration");
  if (eventAccess?.capabilities.has("observe")) capabilities.add("results");
  const orderedCapabilities = (["attendance", "operations", "arbitration", "results"] as const).filter((capability) => capabilities.has(capability));
  const refereeSpaceHref = orderedCapabilities.length ? `/spogomi/${encodeURIComponent(slug)}/espace#${orderedCapabilities[0]}` : null;
  return { organizerSpaceHref, refereeSpaceHref, refereeCapabilities: orderedCapabilities };
}

export async function loadSpogomiEventJourney(params: {
  event: SpogomiPublicEvent;
  userId: string | null;
  selectedDivisionId?: string | null;
  signInHref: string;
  signInHrefByStep?: SpogomiEventJourneyInput["signInHrefByStep"];
}) {
  const division = selectedDivision(params.event, params.selectedDivisionId);
  const supabase = getSupabaseServerClient(true);
  let registrationReadinessReady = false;
  try {
    registrationReadinessReady = (await loadSpogomiRegistrationReadiness({ supabase, eventId: params.event.id })).ready;
  } catch {
    registrationReadinessReady = false;
  }
  const base = emptyInput(params.event, division?.id, params.signInHref, params.signInHrefByStep);
  base.directRegistrationAvailable = base.directRegistrationAvailable && registrationReadinessReady;
  if (!params.userId) return { ...buildSpogomiEventJourney(base), registrationReadinessReady };

  const input: SpogomiEventJourneyInput = { ...base, isAuthenticated: true, privateProofStatus: "available" };
  try {
    const requests = await listSpogomiAdmissionRequestsForRequester(supabase, { eventId: params.event.id, requesterClerkId: params.userId });
    input.admissionStatus = admissionStatus(requests, division?.id ?? null);
    input.activeRegistrationRequest = hasActiveRegistrationRequest(requests);
  } catch {
    input.admissionStatus = "unavailable";
  }
  try {
    input.quizStatus = await quizStatus(params.event, division?.id ?? null, params.userId, supabase);
  } catch {
    input.quizStatus = "unavailable";
  }
  try {
    const identity = await loadSpogomiIdentityState(supabase, { eventId: params.event.id, clerkId: params.userId });
    input.identityStatus = identity.state === "participation_unavailable" ? "unavailable" : identity.state;
    input.teamLinked = Boolean(identity.team);
  } catch {
    input.identityStatus = "unavailable";
  }
  try {
    const summary = await loadSpogomiVolunteerSummaryForUser(supabase, params.userId);
    const eventSummary = summary.chronology.find((event) => event.eventId === params.event.id);
    input.hasCertifiedMission = Boolean(eventSummary?.identityVerified && eventSummary.missions.some((mission) => mission.status === "certified" && mission.evidenceReference.trim().length > 0));
    input.hasActiveAttestation = summary.certificates.some((certificate) => certificate.eventId === params.event.id && certificate.status === "active");
  } catch {
    input.privateProofStatus = "unavailable";
  }
  try {
    const [eventAccess, fieldAccess] = await Promise.all([
      resolveSpogomiEventAccessBySlug({ supabase, eventSlug: params.event.slug, userId: params.userId }),
      loadSpogomiFieldOperationsAccess({ supabase, eventId: params.event.id, userId: params.userId }),
    ]);
    Object.assign(input, roleSpaceInputs(params.event, params.event.slug, eventAccess, fieldAccess));
  } catch {
    input.organizerSpaceHref = null;
    input.refereeSpaceHref = null;
    input.refereeCapabilities = [];
  }
  return { ...buildSpogomiEventJourney(input), registrationReadinessReady };
}
