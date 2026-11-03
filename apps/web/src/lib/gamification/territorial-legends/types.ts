export const TERRITORIAL_LEGEND_LEVELS = [
  "arrondissement",
  "commune",
  "department",
  "region",
  "country",
] as const;

export type TerritorialLegendLevel = (typeof TERRITORIAL_LEGEND_LEVELS)[number];

export type TerritorialPart = {
  code: string;
  name: string;
};

export type TerritorialActionFact = {
  actionId: string;
  actionDate: string;
  territory: {
    country: TerritorialPart;
    region: TerritorialPart;
    department: TerritorialPart;
    commune: TerritorialPart;
    arrondissement?: TerritorialPart | null;
  };
};

export type TerritorialParticipationFact = {
  actionId: string;
  userId: string;
  joinedAt: string;
};

export type TerritorialLegendConsent = {
  userId: string;
  enabled: boolean;
  activatedAt: string | null;
};

export type TerritorialPublicProfile = {
  userId: string;
  publicLabel: string;
};

export type TerritorialLegendEntry = {
  rank: number;
  publicLabel: string;
  score: number;
  distinctActions: number;
  tied: boolean;
  tieSize: number;
};

export type TerritorialLegendPage = {
  level: TerritorialLegendLevel;
  campaignYear: number;
  territoryCode: string;
  territoryLabel: string | null;
  generatedAt: string;
  windowDays: 90;
  competitorCount: number;
  maxScore: number;
  titleEligible: boolean;
  title: string | null;
  items: TerritorialLegendEntry[];
  nextCursor: string | null;
  owner?: {
    rank: number;
    score: number;
    distinctActions: number;
    tied: boolean;
    tieSize: number;
  } | null;
};

export type TerritorialLegendWinnerSnapshot = {
  userId: string;
  campaignYear: number;
  level: TerritorialLegendLevel;
  territoryCode: string;
  territoryLabel: string;
  effectiveOn: string;
  score: number;
  rank: 1;
  tieSize: number;
  sourceFingerprint: string;
};

export type TerritorialLegendHoldPeriod = {
  id?: number | string;
  userId: string;
  campaignYear: number;
  level: TerritorialLegendLevel;
  territoryCode: string;
  territoryLabel: string;
  startedOn: string;
  lastVerifiedOn: string;
  endedOn: string | null;
  validityStatus: "active" | "closed" | "invalidated";
  sourceFingerprint: string;
};

export type TerritorialLegendAwardProof = {
  proofId: string;
  userId: string;
  campaignYear: number;
  level: TerritorialLegendLevel;
  territoryCode: string;
  awardKind: "conquest" | "longevity" | "season_end";
  thresholdDays: number;
  holdStartedOn: string;
  heldThroughOn: string;
  awardedOn: string;
  validFrom: string;
  validUntil: string | null;
  validityStatus: "active" | "invalidated";
  sourceFingerprint: string;
};

export type TerritorialLegendHistoryInvalidationResult = {
  invalidatedOn: string;
  invalidatedHoldPeriods: number;
  invalidatedAwardProofs: number;
  affectedUserIds: string[];
};
