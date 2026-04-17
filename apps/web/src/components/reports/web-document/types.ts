import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import type { CommunityEventItem } from "@/lib/community/http";

export type ChapterAudience = "terrain" | "strategie" | "mixte";

export type ChapterDef = {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  audience: ChapterAudience;
};

export type AreaStats = {
  area: string;
  actions: number;
  kg: number;
  butts: number;
  recurrence: number;
  score: number;
};

export type RouteStep = {
  index: number;
  label: string;
  kg: number;
  butts: number;
  segmentKm: number;
  latitude: number;
  longitude: number;
};

export type MonthRow = {
  month: string;
  actions: number;
  kg: number;
  butts: number;
  volunteers: number;
  minutes: number;
};

export type ReportModel = {
  generatedAt: string;
  totals: {
    actions: number;
    kg: number;
    butts: number;
    volunteers: number;
    hours: number;
  };
  map: {
    points: number;
    traces: number;
    polylines: number;
    polygons: number;
    geoCoverage: number;
    traceCoverage: number;
  };
  moderation: {
    pending: number;
    approved: number;
    rejected: number;
    conversion: number;
    delayDays: number;
  };
  quality: {
    completenessScore: number;
    coherenceScore: number;
    freshnessDays: number;
    geolocRate: number;
  };
  areas: AreaStats[];
  trendPercent: number;
  monthRows6: MonthRow[];
  monthRows12: MonthRow[];
  routeSteps: RouteStep[];
  routeDistance: number;
  terrain: {
    actionCount: number;
    spotCount: number;
    cleanPlaceCount: number;
  };
  recycling: { recyclableKg: number; triIndex: number };
  climate: {
    six: { actions: number; kg: number; butts: number };
    twelve: { actions: number; kg: number; butts: number };
    waterProtectedLiters: number;
    co2AvoidedKg: number;
  };
  community: {
    totalEvents: number;
    upcomingEvents: number;
    pastEvents: number;
    rsvp: { yes: number; maybe: number; no: number };
    participationRate: number;
    topLeaderboard: Array<{ name: string; actions: number; kg: number; butts: number }>;
    badgeConfirmed: number;
    badgeExpert: number;
    sourceBuckets: { citoyen: number; associatif: number; institutionnel: number };
  };
  annualRows: string[][];
  calendar: Array<[string, string, string, string]>;
};

export type ReportModelInput = {
  allItems: ActionListItem[];
  approvedItems: ActionListItem[];
  mapItems: ActionMapItem[];
  events: CommunityEventItem[];
  now?: Date;
};
