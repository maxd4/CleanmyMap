export type SpogomiOrientationProgressKey =
  | "volunteer.participation"
  | "volunteer.contributions"
  | "volunteer.attestations"
  | "referee.certification"
  | "organizer.event_publication"
  | "organizer.results_publication";

export type SpogomiOrientationProgressProof = {
  key: SpogomiOrientationProgressKey;
  eventId: string;
  eventName: string;
  evidence: "certified_participation" | "certified_mission" | "active_attestation" | "event_published" | "results_published";
};

function pushUnique(target: SpogomiOrientationProgressProof[], proof: SpogomiOrientationProgressProof): void {
  if (!target.some((candidate) => candidate.key === proof.key && candidate.eventId === proof.eventId)) target.push(proof);
}

type VolunteerProgressEvent = {
  eventId: string;
  eventName: string;
  eventState: string;
  identityVerified: boolean;
  attendanceStatus: "unknown" | "present" | "absent" | null;
  actionParticipationConfirmed: boolean;
  missions: Array<{ kind: string; status: "certified" | "revoked"; evidenceReference: string }>;
};

type VolunteerProgressCertificate = { eventId: string; status: "active" | "revoked" | "replaced" };
type PersonalProgressEvent = {
  id: string;
  name: string;
  relations: readonly string[];
  publicVisibility: "private" | "published";
  publicResultsVisibility: "hidden" | "provisional" | "certified";
};

export function buildSpogomiOrientationProgress(input: {
  personalEvents: readonly PersonalProgressEvent[];
  volunteerSummary: { chronology: readonly VolunteerProgressEvent[]; certificates: readonly VolunteerProgressCertificate[] };
}): SpogomiOrientationProgressProof[] {
  const proofs: SpogomiOrientationProgressProof[] = [];

  for (const event of input.volunteerSummary.chronology) {
    const hasCertifiedParticipation = event.eventState === "certified" &&
      event.identityVerified &&
      event.attendanceStatus === "present" &&
      event.actionParticipationConfirmed;
    const hasCertifiedMission = event.missions.some((mission) => mission.status === "certified" && mission.evidenceReference.trim().length > 0);
    const hasCertifiedRefereeMission = event.missions.some((mission) => mission.kind === "referee" && mission.status === "certified" && mission.evidenceReference.trim().length > 0);
    const hasActiveAttestation = input.volunteerSummary.certificates.some((certificate) => certificate.eventId === event.eventId && certificate.status === "active");

    if (hasCertifiedParticipation) pushUnique(proofs, { key: "volunteer.participation", eventId: event.eventId, eventName: event.eventName, evidence: "certified_participation" });
    if (hasCertifiedMission) pushUnique(proofs, { key: "volunteer.contributions", eventId: event.eventId, eventName: event.eventName, evidence: "certified_mission" });
    if (hasActiveAttestation) pushUnique(proofs, { key: "volunteer.attestations", eventId: event.eventId, eventName: event.eventName, evidence: "active_attestation" });
    if (hasCertifiedRefereeMission) pushUnique(proofs, { key: "referee.certification", eventId: event.eventId, eventName: event.eventName, evidence: "certified_mission" });
  }

  for (const event of input.personalEvents) {
    const isOrganizer = event.relations.includes("organizer");
    if (!isOrganizer) continue;
    if (event.publicVisibility === "published") pushUnique(proofs, { key: "organizer.event_publication", eventId: event.id, eventName: event.name, evidence: "event_published" });
    if (event.publicResultsVisibility === "certified") pushUnique(proofs, { key: "organizer.results_publication", eventId: event.id, eventName: event.name, evidence: "results_published" });
  }

  return proofs.sort((left, right) => `${left.key}:${left.eventId}`.localeCompare(`${right.key}:${right.eventId}`));
}
