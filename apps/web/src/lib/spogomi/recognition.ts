export type SpogomiRecognitionKind =
  | "collector"
  | "referee"
  | "organizer"
  | "finish_control"
  | "field_safety"
  | "weighing_sorting"
  | "logistics_support";
type SpogomiRankingKind = "points" | "butts";

export type SpogomiRecognitionParticipant = {
  participantId: string;
  eventId: string;
  divisionId?: string;
  teamId: string | null;
  userId: string | null;
  registrationStatus: "registered" | "withdrawn";
  attendanceStatus: "unknown" | "present" | "absent";
  identityVerified: boolean;
  collectorActivityCertified: boolean;
  actionParticipationConfirmed: boolean;
  teamDisqualified: boolean;
};

export type SpogomiMissionProof = {
  missionId: string;
  eventId: string;
  divisionId?: string;
  participantId: string;
  kind: SpogomiRecognitionKind;
  status: "certified" | "revoked";
  certifiedAt: string | null;
  evidenceReference: string;
  certificationVersion: string;
};

export type SpogomiOfficialRanking = {
  eventId: string;
  divisionId?: string;
  teamId: string;
  kind: SpogomiRankingKind;
  rank: number;
  status: "certified" | "revoked";
  teamEligible: boolean;
  decisionVersion: string;
  sourceReference: string;
};

export type SpogomiAward = {
  userId: string;
  eventId: string;
  divisionId?: string;
  badgeTypeId: string;
  proofReference: string;
  certificationReference: string;
  rankingVersion: string | null;
  occurredOn: string;
};

export type SpogomiRecognitionProjection = {
  awards: SpogomiAward[];
  firstRefereeProofs: Array<{
    userId: string;
    missionId: string;
    eventId: string;
    occurredOn: string;
    certificationVersion: string;
  }>;
  collectorEventCount: number;
  refereeEventCount: number;
};

function isEligibleCollector(participant: SpogomiRecognitionParticipant): boolean {
  return participant.registrationStatus === "registered" &&
    participant.attendanceStatus === "present" &&
    participant.identityVerified &&
    participant.collectorActivityCertified &&
    participant.actionParticipationConfirmed &&
    Boolean(participant.userId) &&
    Boolean(participant.teamId) &&
    !participant.teamDisqualified;
}

export function isEligibleSpogomiMissionParticipant(
  participant: Pick<SpogomiRecognitionParticipant, "registrationStatus" | "attendanceStatus" | "identityVerified" | "actionParticipationConfirmed" | "userId">,
): boolean {
  return participant.registrationStatus === "registered" &&
    participant.attendanceStatus === "present" &&
    participant.identityVerified &&
    participant.actionParticipationConfirmed &&
    Boolean(participant.userId);
}

function medalBadge(kind: SpogomiRankingKind, rank: number): string | null {
  if (rank < 1 || rank > 3) return null;
  const medal = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";
  return `spogomi_${kind === "points" ? "points" : "butts"}_${medal}`;
}

function certifiedRanking(
  rankings: readonly SpogomiOfficialRanking[],
  eventId: string,
  kind: SpogomiRankingKind,
  teamId: string,
  divisionId?: string,
): SpogomiOfficialRanking | null {
  const matches = rankings.filter((ranking) =>
    ranking.eventId === eventId &&
    ranking.kind === kind &&
    ranking.teamId === teamId &&
    (ranking.divisionId ?? null) === (divisionId ?? null) &&
    ranking.status === "certified" &&
    ranking.teamEligible &&
    Number.isInteger(ranking.rank) &&
    ranking.rank >= 1 && ranking.rank <= 3,
  );
  return matches.length === 1 ? matches[0]! : null;
}

function addAward(target: Map<string, SpogomiAward>, award: SpogomiAward): void {
  const key = `${award.userId}:${award.eventId}:${award.badgeTypeId}`;
  if (!target.has(key)) target.set(key, award);
}

function collectEligibleCollectors(input: { eventId: string; eventDate: string; participants: readonly SpogomiRecognitionParticipant[] }, awards: Map<string, SpogomiAward>): Map<string, SpogomiRecognitionParticipant[]> {
  const byTeam = new Map<string, SpogomiRecognitionParticipant[]>();
  for (const participant of input.participants.filter((candidate) => candidate.eventId === input.eventId && isEligibleCollector(candidate))) {
    const teamId = participant.teamId!;
    byTeam.set(teamId, [...(byTeam.get(teamId) ?? []), participant]);
    addAward(awards, { userId: participant.userId!, eventId: input.eventId, divisionId: participant.divisionId, badgeTypeId: "spogomi_collector", proofReference: `spogomi_participant:${participant.participantId}`, certificationReference: `action_participants:${participant.userId}:confirmed`, rankingVersion: null, occurredOn: input.eventDate });
  }
  return byTeam;
}

function addMissionAwards(input: { eventId: string; eventDate: string; participants: readonly SpogomiRecognitionParticipant[]; missions: readonly SpogomiMissionProof[] }, awards: Map<string, SpogomiAward>): void {
  for (const mission of input.missions.filter((candidate) => candidate.eventId === input.eventId && candidate.status === "certified" && candidate.evidenceReference.trim().length > 0)) {
    const participant = input.participants.find((candidate) => candidate.participantId === mission.participantId);
    if (!participant || !isEligibleSpogomiMissionParticipant(participant) || (mission.divisionId && mission.divisionId !== participant.divisionId)) continue;
    const badgeTypeId = mission.kind === "referee" ? "spogomi_referee" : mission.kind === "organizer" ? "spogomi_organizer" : null;
    if (badgeTypeId) addAward(awards, { userId: participant.userId!, eventId: input.eventId, divisionId: participant.divisionId, badgeTypeId, proofReference: `spogomi_mission:${mission.missionId}`, certificationReference: `spogomi_attestation:${mission.missionId}:${mission.certificationVersion}`, rankingVersion: null, occurredOn: mission.certifiedAt ?? input.eventDate });
  }
}

function addRankingAwards(input: { eventId: string; eventDate: string; rankings: readonly SpogomiOfficialRanking[] }, collectorsByTeam: Map<string, SpogomiRecognitionParticipant[]>, awards: Map<string, SpogomiAward>): void {
  for (const teamId of collectorsByTeam.keys()) {
    const members = collectorsByTeam.get(teamId) ?? [];
    const divisionId = members[0]?.divisionId;
    if (members.some((member) => (member.divisionId ?? null) !== (divisionId ?? null))) continue;
    const points = certifiedRanking(input.rankings, input.eventId, "points", teamId, divisionId);
    const butts = certifiedRanking(input.rankings, input.eventId, "butts", teamId, divisionId);
    for (const participant of members) {
      addRankingAward(awards, participant, input, teamId, points);
      addRankingAward(awards, participant, input, teamId, butts);
      if (points && butts) addAward(awards, { userId: participant.userId!, eventId: input.eventId, divisionId: participant.divisionId, badgeTypeId: "spogomi_double_podium", proofReference: `spogomi_ranking:double_podium:${teamId}`, certificationReference: `${points.sourceReference};${butts.sourceReference}`, rankingVersion: `${points.decisionVersion};${butts.decisionVersion}`, occurredOn: input.eventDate });
    }
  }
}

function addRankingAward(awards: Map<string, SpogomiAward>, participant: SpogomiRecognitionParticipant, input: { eventId: string; eventDate: string }, teamId: string, ranking: SpogomiOfficialRanking | null): void {
  if (!ranking) return;
  const badgeTypeId = medalBadge(ranking.kind, ranking.rank);
  if (!badgeTypeId) return;
  addAward(awards, { userId: participant.userId!, eventId: input.eventId, divisionId: participant.divisionId, badgeTypeId, proofReference: `spogomi_ranking:${ranking.kind}:${teamId}`, certificationReference: ranking.sourceReference, rankingVersion: ranking.decisionVersion, occurredOn: input.eventDate });
}

function buildFirstRefereeProofs(input: { eventId: string; eventDate: string; participants: readonly SpogomiRecognitionParticipant[]; missions: readonly SpogomiMissionProof[] }): SpogomiRecognitionProjection["firstRefereeProofs"] {
  const firstRefereeByUser = new Map<string, SpogomiRecognitionProjection["firstRefereeProofs"][number]>();
  for (const mission of input.missions.filter((candidate) => candidate.kind === "referee" && candidate.status === "certified")) {
    const participant = input.participants.find((candidate) => candidate.participantId === mission.participantId);
    if (mission.eventId !== input.eventId || !participant || !isEligibleSpogomiMissionParticipant(participant)) continue;
    const proof = { userId: participant.userId!, missionId: mission.missionId, eventId: mission.eventId, occurredOn: mission.certifiedAt ?? input.eventDate, certificationVersion: mission.certificationVersion };
    const existing = firstRefereeByUser.get(proof.userId);
    if (!existing || `${proof.occurredOn}:${proof.missionId}` < `${existing.occurredOn}:${existing.missionId}`) firstRefereeByUser.set(proof.userId, proof);
  }
  return [...firstRefereeByUser.values()].sort((left, right) => left.userId.localeCompare(right.userId));
}

export function buildSpogomiRecognitionProjection(input: {
  eventId: string;
  eventDate: string;
  participants: readonly SpogomiRecognitionParticipant[];
  missions: readonly SpogomiMissionProof[];
  rankings: readonly SpogomiOfficialRanking[];
}): SpogomiRecognitionProjection {
  const awards = new Map<string, SpogomiAward>();
  const collectorsByTeam = collectEligibleCollectors(input, awards);
  const collectorCount = [...collectorsByTeam.values()].reduce((count, members) => count + members.length, 0);
  addMissionAwards(input, awards);
  addRankingAwards(input, collectorsByTeam, awards);

  return {
    awards: [...awards.values()].sort((left, right) => `${left.userId}:${left.badgeTypeId}`.localeCompare(`${right.userId}:${right.badgeTypeId}`)),
    firstRefereeProofs: buildFirstRefereeProofs(input),
    collectorEventCount: collectorCount ? 1 : 0,
    refereeEventCount: new Set(input.missions.filter((mission) => mission.kind === "referee" && mission.status === "certified").map((mission) => mission.eventId)).size,
  };
}
