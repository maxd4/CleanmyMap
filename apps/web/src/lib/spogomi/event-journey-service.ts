import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { SpogomiPublicEvent } from "./public-service";
import { buildSpogomiEventJourney, type SpogomiEventJourneyInput } from "./event-journey";
import { listSpogomiAdmissionRequestsForRequester } from "./admission-requests";
import { resolveSpogomiEventAccessBySlug } from "./authorization";
import { loadSpogomiFieldOperationsAccess } from "./field-operations-service";
import { loadSpogomiIdentityState } from "./identity-link";
import { loadSpogomiRegistrationQuiz, loadSpogomiRegistrationQuizProofsForUser } from "./preparation/registration-quiz-service";
import { loadSpogomiVolunteerSummaryForUser } from "./volunteer";

function emptyInput(event: SpogomiPublicEvent, signInHref: string, signInHrefByStep?: SpogomiEventJourneyInput["signInHrefByStep"]): SpogomiEventJourneyInput {
  return {
    isAuthenticated: false,
    lifecycle: event.lifecycle,
    registrationStatus: event.registrationStatus,
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
  requests: readonly { requestKind: string; status: string }[],
): SpogomiEventJourneyInput["admissionStatus"] {
  const registrations = requests.filter((request) => request.requestKind === "registration");
  if (!registrations.length) return "none";
  if (registrations.some((request) => request.status === "pending")) return "pending";
  if (registrations.some((request) => request.status === "approved")) return "approved";
  return registrations[0]?.status === "rejected" ? "rejected" : "cancelled";
}

async function quizStatus(event: SpogomiPublicEvent, userId: string, supabase: ReturnType<typeof getSupabaseServerClient>): Promise<SpogomiEventJourneyInput["quizStatus"]> {
  if (!event.divisions.length) return "unavailable";
  const definitions = await Promise.all(event.divisions.map(async (division) => {
    try {
      return await loadSpogomiRegistrationQuiz({ supabase, eventId: event.id, divisionId: division.id });
    } catch {
      return null;
    }
  }));
  if (definitions.some((definition) => !definition || !definition.available)) return "unavailable";
  const versions = new Map(definitions.map((definition, index) => [event.divisions[index]!.id, definition!.quizVersion]));
  const proofs = await loadSpogomiRegistrationQuizProofsForUser({ supabase, eventId: event.id, userId, quizVersions: versions });
  return proofs.size === versions.size ? "passed" : "missing";
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
  signInHref: string;
  signInHrefByStep?: SpogomiEventJourneyInput["signInHrefByStep"];
}) {
  const base = emptyInput(params.event, params.signInHref, params.signInHrefByStep);
  if (!params.userId) return buildSpogomiEventJourney(base);

  const supabase = getSupabaseServerClient(true);
  const input: SpogomiEventJourneyInput = { ...base, isAuthenticated: true, privateProofStatus: "available" };
  try {
    const requests = await listSpogomiAdmissionRequestsForRequester(supabase, { eventId: params.event.id, requesterClerkId: params.userId });
    input.admissionStatus = admissionStatus(requests);
  } catch {
    input.admissionStatus = "unavailable";
  }
  try {
    input.quizStatus = await quizStatus(params.event, params.userId, supabase);
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
  return buildSpogomiEventJourney(input);
}
