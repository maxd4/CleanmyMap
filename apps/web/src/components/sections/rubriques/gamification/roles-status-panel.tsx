import type { ContributorRecognitionCard } from "@/lib/gamification/progression-types";
import {
  ENGAGEMENT_STATUS_DEFINITIONS,
  type EngagementStatusId,
} from "@/lib/gamification/engagement-status";

type RoleStatusKey = EngagementStatusId;

type RoleStatusCard = {
  key: RoleStatusKey;
  labelFr: string;
  labelEn: string;
  descriptionFr: string;
  descriptionEn: string;
  unlocked: boolean;
};

export function buildRoleStatusCards(
  _currentContributor: ContributorRecognitionCard | null | undefined,
  currentStatusId: EngagementStatusId = "observateur",
): RoleStatusCard[] {
  const currentIndex = Math.max(
    0,
    ENGAGEMENT_STATUS_DEFINITIONS.findIndex((status) => status.id === currentStatusId),
  );
  const labelsEn: Record<EngagementStatusId, string> = {
    observateur: "Observer",
    contributeur: "Contributor",
    referent: "Referent",
    mentor: "Mentor",
    coordinateur: "Coordinator",
  };
  const descriptions: Record<EngagementStatusId, [string, string]> = {
    observateur: ["Découvre le terrain et suit la progression.", "Learns the terrain and follows progress."],
    contributeur: ["Une contribution validée est déjà reconnue.", "A validated contribution is already recognized."],
    referent: ["La régularité et la fiabilité deviennent visibles.", "Regularity and reliability become visible."],
    mentor: ["Transmet les bonnes pratiques au réseau.", "Shares good practices with the network."],
    coordinateur: ["Organise des actions et fédère plusieurs acteurs.", "Organizes actions and brings several actors together."],
  };

  return ENGAGEMENT_STATUS_DEFINITIONS.map((status, index) => ({
    key: status.id,
    labelFr: status.label,
    labelEn: labelsEn[status.id],
    descriptionFr: descriptions[status.id][0],
    descriptionEn: descriptions[status.id][1],
    unlocked: index <= currentIndex,
  }));
}
