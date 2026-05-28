import {
  actionQualityScoreFromRow,
  isSpontaneousActionNotes,
  parseAssociationNameFromActionNotes,
} from "./progression-data";
import type {
  ActionRow,
  ContributorRecognitionCard,
  ContributorRecognitionSummary,
  ContributorRecognitionType,
} from "./progression-types";

type RecognitionAggregate = {
  userId: string;
  actorName: string;
  associationName: string;
  verifiedContributions: number;
  qualitySum: number;
  zoneCounts: Map<string, number>;
  typeCounts: Record<ContributorRecognitionType, number>;
  activeMonths: Set<string>;
  lastContributionDate: string | null;
};

export type ContributorRecognitionIndex = ContributorRecognitionSummary & {
  cardsByUserId: Map<string, ContributorRecognitionCard>;
};

const CONTRIBUTION_TYPE_LABELS: Record<ContributorRecognitionType, string> = {
  terrain: "Terrain vérifié",
  diffusion: "Relais vérifié",
  coordination: "Coordination vérifiée",
  mentorat: "Mentorat vérifié",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeZoneLabel(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) {
    return "Zone inconnue";
  }

  const arrondissementMatch = value.match(/\b([1-9]|1[0-9]|2[0-9])(?:er|e|eme|ème)?\b/i);
  if (arrondissementMatch?.[1]) {
    return `${arrondissementMatch[1]}e`;
  }

  const firstSegment = value.split(",")[0]?.trim() || value;
  if (firstSegment.length <= 28) {
    return firstSegment;
  }
  return `${firstSegment.slice(0, 25).trim()}…`;
}

function inferContributionType(row: ActionRow): ContributorRecognitionType {
  const raw = `${row.notes ?? ""} ${row.location_label ?? ""}`.toLowerCase();
  if (
    raw.includes("relais") ||
    raw.includes("diffusion") ||
    raw.includes("partage") ||
    raw.includes("communication")
  ) {
    return "diffusion";
  }
  if (
    raw.includes("coord") ||
    raw.includes("organis") ||
    raw.includes("animation") ||
    raw.includes("accompagn") ||
    row.volunteers_count >= 6
  ) {
    return "coordination";
  }
  if (
    raw.includes("mentor") ||
    raw.includes("formation") ||
    raw.includes("guide") ||
    raw.includes("bonne pratique") ||
    raw.includes("referent") ||
    raw.includes("référent")
  ) {
    return "mentorat";
  }
  return "terrain";
}

function buildRegularityLabel(
  verifiedContributions: number,
  activeMonths: number,
): string {
  if (verifiedContributions >= 12 && activeMonths >= 6) {
    return "Très régulier";
  }
  if (verifiedContributions >= 8 && activeMonths >= 4) {
    return "Régulier";
  }
  if (verifiedContributions >= 3 && activeMonths >= 2) {
    return "En continuité";
  }
  return "Ponctuel";
}

function buildContributionBadge(type: ContributorRecognitionType): string {
  return CONTRIBUTION_TYPE_LABELS[type];
}

function buildThanksMessage(params: {
  actorName: string;
  associationName: string;
  topZone: string;
  mentorEligible: boolean;
}): string {
  const actor = params.actorName.trim() || "Contributeur";
  if (params.associationName !== "Sans association") {
    return `${params.associationName} remercie ${actor} pour cette contribution vérifiée à ${params.topZone}.`;
  }
  if (params.mentorEligible) {
    return `${actor} devient un repère utile pour le réseau local et aide à transmettre les bonnes pratiques.`;
  }
  return `${actor} renforce l'action locale à ${params.topZone}.`;
}

function buildHighlight(params: {
  verifiedContributions: number;
  topZone: string;
  contributionType: ContributorRecognitionType;
  regularityLabel: string;
}): string {
  return [
    `${params.verifiedContributions} contributions vérifiées`,
    params.topZone,
    CONTRIBUTION_TYPE_LABELS[params.contributionType],
    params.regularityLabel,
  ].join(" · ");
}

function scoreContributor(params: {
  verifiedContributions: number;
  qualityAverage: number;
  activeMonths: number;
  mentorEligible: boolean;
}): number {
  return round1(
    Math.min(params.verifiedContributions, 20) * 1.2 +
      params.qualityAverage * 0.45 +
      params.activeMonths * 4 +
      (params.mentorEligible ? 10 : 0),
  );
}

function toCard(aggregate: RecognitionAggregate): ContributorRecognitionCard {
  const topZoneEntry = [...aggregate.zoneCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"),
  )[0];
  const typeEntry = Object.entries(aggregate.typeCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"),
  )[0];
  const topZone = topZoneEntry?.[0] ?? "Zone inconnue";
  const contributionType = (typeEntry?.[0] as ContributorRecognitionType | undefined) ?? "terrain";
  const qualityAverage =
    aggregate.verifiedContributions > 0
      ? round1(aggregate.qualitySum / aggregate.verifiedContributions)
      : 0;
  const activeMonths = aggregate.activeMonths.size;
  const regularityLabel = buildRegularityLabel(
    aggregate.verifiedContributions,
    activeMonths,
  );
  const mentorEligible =
    aggregate.verifiedContributions >= 8 &&
    qualityAverage >= 75 &&
    activeMonths >= 4;
  const badges = [
    buildContributionBadge(contributionType),
    regularityLabel,
    mentorEligible ? "Mentor local" : "Contributeur utile",
  ];

  return {
    userId: aggregate.userId,
    actorName: aggregate.actorName.trim() || "Contributeur",
    associationName: aggregate.associationName,
    verifiedContributions: aggregate.verifiedContributions,
    qualityAverage,
    topZone,
    contributionType,
    regularityLabel,
    activeMonths,
    mentorEligible,
    lastContributionDate: aggregate.lastContributionDate ?? new Date().toISOString().slice(0, 10),
    highlight: buildHighlight({
      verifiedContributions: aggregate.verifiedContributions,
      topZone,
      contributionType,
      regularityLabel,
    }),
    thanksMessage: buildThanksMessage({
      actorName: aggregate.actorName,
      associationName: aggregate.associationName,
      topZone,
      mentorEligible,
    }),
    badges,
    score: scoreContributor({
      verifiedContributions: aggregate.verifiedContributions,
      qualityAverage,
      activeMonths,
      mentorEligible,
    }),
  };
}

export function buildContributorRecognitionIndex(
  rows: ActionRow[],
  currentUserId?: string | null,
): ContributorRecognitionIndex {
  const approvedRows = rows.filter(
    (row) => row.status === "approved" && isSpontaneousActionNotes(row.notes),
  );
  const grouped = new Map<string, RecognitionAggregate>();

  for (const row of approvedRows) {
    const userId = row.created_by_clerk_id?.trim() || row.actor_name?.trim() || "anonymous";
    const current = grouped.get(userId) ?? {
      userId,
      actorName: row.actor_name?.trim() || "Contributeur",
      associationName: parseAssociationNameFromActionNotes(row.notes),
      verifiedContributions: 0,
      qualitySum: 0,
      zoneCounts: new Map<string, number>(),
      typeCounts: {
        terrain: 0,
        diffusion: 0,
        coordination: 0,
        mentorat: 0,
      },
      activeMonths: new Set<string>(),
      lastContributionDate: null,
    };

    current.verifiedContributions += 1;
    current.qualitySum += actionQualityScoreFromRow(row);
    const zone = normalizeZoneLabel(row.location_label);
    current.zoneCounts.set(zone, (current.zoneCounts.get(zone) ?? 0) + 1);
    const type = inferContributionType(row);
    current.typeCounts[type] += 1;
    current.activeMonths.add(row.action_date.slice(0, 7));
    if (!current.lastContributionDate || row.action_date > current.lastContributionDate) {
      current.lastContributionDate = row.action_date;
    }
    if (current.actorName === "Contributeur" && row.actor_name?.trim()) {
      current.actorName = row.actor_name.trim();
    }
    if (
      current.associationName === "Sans association" ||
      current.associationName.trim().length === 0
    ) {
      const associationName = parseAssociationNameFromActionNotes(row.notes);
      if (associationName !== "Sans association") {
        current.associationName = associationName;
      }
    }

    grouped.set(userId, current);
  }

  const cardsByUserId = new Map<string, ContributorRecognitionCard>();
  const topContributors = [...grouped.values()]
    .map((aggregate) => {
      const card = toCard(aggregate);
      cardsByUserId.set(card.userId, card);
      return card;
    })
    .sort((a, b) => b.score - a.score || b.qualityAverage - a.qualityAverage || b.activeMonths - a.activeMonths)
    .slice(0, 3);

  return {
    topContributors,
    currentContributor:
      typeof currentUserId === "string" && currentUserId.trim().length > 0
        ? cardsByUserId.get(currentUserId) ?? null
        : null,
    cardsByUserId,
  };
}
