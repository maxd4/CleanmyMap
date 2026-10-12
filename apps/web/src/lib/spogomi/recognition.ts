import { CURRENT_SPOGOMI_BADGE_DEFINITIONS } from "@/lib/gamification/badge-catalog";

export const SPOGOMI_REPEATABLE_BADGE_IDS = CURRENT_SPOGOMI_BADGE_DEFINITIONS.map(
  (definition) => definition.id,
);

export type SpogomiRecognitionKind = "collector" | "referee" | "organizer";
export type SpogomiRankingKind = "points" | "butts";

export type SpogomiRecognitionParticipant = {
  participantId: string;
  eventId: string;
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
  participantId: string;
  kind: Exclude<SpogomiRecognitionKind, "collector">;
  status: "certified" | "revoked";
  certifiedAt: string | null;
  evidenceReference: string;
  certificationVersion: string;
};

export type SpogomiOfficialRanking = {
  eventId: string;
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
): SpogomiOfficialRanking | null {
  const matches = rankings.filter((ranking) =>
    ranking.eventId === eventId &&
    ranking.kind === kind &&
    ranking.teamId === teamId &&
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

export function buildSpogomiRecognitionProjection(input: {
  eventId: string;
  eventDate: string;
  participants: readonly SpogomiRecognitionParticipant[];
  missions: readonly SpogomiMissionProof[];
  rankings: readonly SpogomiOfficialRanking[];
}): SpogomiRecognitionProjection {
  const awards = new Map<string, SpogomiAward>();
  const collectors = input.participants.filter((participant) => participant.eventId === input.eventId && isEligibleCollector(participant));
  const collectorsByTeam = new Map<string, SpogomiRecognitionParticipant[]>();
  for (const participant of collectors) {
    const teamId = participant.teamId!;
    const team = collectorsByTeam.get(teamId) ?? [];
    team.push(participant);
    collectorsByTeam.set(teamId, team);
    addAward(awards, {
      userId: participant.userId!,
      eventId: input.eventId,
      badgeTypeId: "spogomi_collector",
      proofReference: `spogomi_participant:${participant.participantId}`,
      certificationReference: `action_participants:${participant.userId}:confirmed`,
      rankingVersion: null,
      occurredOn: input.eventDate,
    });
  }

  for (const mission of input.missions.filter((candidate) =>
    candidate.eventId === input.eventId && candidate.status === "certified" && candidate.evidenceReference.trim().length > 0,
  )) {
    const participant = input.participants.find((candidate) => candidate.participantId === mission.participantId);
    if (!participant || !isEligibleSpogomiMissionParticipant(participant)) continue;
    addAward(awards, {
      userId: participant.userId!,
      eventId: input.eventId,
      badgeTypeId: mission.kind === "referee" ? "spogomi_referee" : "spogomi_organizer",
      proofReference: `spogomi_mission:${mission.missionId}`,
      certificationReference: `spogomi_attestation:${mission.missionId}:${mission.certificationVersion}`,
      rankingVersion: null,
      occurredOn: mission.certifiedAt ?? input.eventDate,
    });
  }

  for (const teamId of collectorsByTeam.keys()) {
    const points = certifiedRanking(input.rankings, input.eventId, "points", teamId);
    const butts = certifiedRanking(input.rankings, input.eventId, "butts", teamId);
    const members = collectorsByTeam.get(teamId) ?? [];
    for (const participant of members) {
      if (points) {
        const pointsBadge = medalBadge("points", points.rank);
        if (pointsBadge) addAward(awards, {
          userId: participant.userId!, eventId: input.eventId, badgeTypeId: pointsBadge,
          proofReference: `spogomi_ranking:${points.kind}:${teamId}`,
          certificationReference: points.sourceReference,
          rankingVersion: points.decisionVersion, occurredOn: input.eventDate,
        });
      }
      if (butts) {
        const buttsBadge = medalBadge("butts", butts.rank);
        if (buttsBadge) addAward(awards, {
          userId: participant.userId!, eventId: input.eventId, badgeTypeId: buttsBadge,
          proofReference: `spogomi_ranking:${butts.kind}:${teamId}`,
          certificationReference: butts.sourceReference,
          rankingVersion: butts.decisionVersion, occurredOn: input.eventDate,
        });
      }
      if (points && butts) addAward(awards, {
        userId: participant.userId!, eventId: input.eventId, badgeTypeId: "spogomi_double_podium",
        proofReference: `spogomi_ranking:double_podium:${teamId}`,
        certificationReference: `${points.sourceReference};${butts.sourceReference}`,
        rankingVersion: `${points.decisionVersion};${butts.decisionVersion}`,
        occurredOn: input.eventDate,
      });
    }
  }

  const firstRefereeByUser = new Map<string, SpogomiRecognitionProjection["firstRefereeProofs"][number]>();
  for (const mission of input.missions.filter((candidate) => candidate.kind === "referee" && candidate.status === "certified")) {
    const participant = input.participants.find((candidate) => candidate.participantId === mission.participantId);
    if (mission.eventId !== input.eventId || mission.status !== "certified" || !participant || !isEligibleSpogomiMissionParticipant(participant)) continue;
    const proof = {
      userId: participant.userId!,
      missionId: mission.missionId,
      eventId: mission.eventId,
      occurredOn: mission.certifiedAt ?? input.eventDate,
      certificationVersion: mission.certificationVersion,
    };
    const existing = firstRefereeByUser.get(proof.userId);
    if (!existing || `${proof.occurredOn}:${proof.missionId}` < `${existing.occurredOn}:${existing.missionId}`) {
      firstRefereeByUser.set(proof.userId, proof);
    }
  }

  return {
    awards: [...awards.values()].sort((left, right) => `${left.userId}:${left.badgeTypeId}`.localeCompare(`${right.userId}:${right.badgeTypeId}`)),
    firstRefereeProofs: [...firstRefereeByUser.values()].sort((left, right) => left.userId.localeCompare(right.userId)),
    collectorEventCount: new Set(collectors.map((participant) => participant.eventId)).size,
    refereeEventCount: new Set(input.missions.filter((mission) => mission.kind === "referee" && mission.status === "certified").map((mission) => mission.eventId)).size,
  };
}
