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
