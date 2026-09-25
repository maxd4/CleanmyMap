import type { ActionGeometryKind, ActionSourceName } from "@/lib/actions/types";
import type { ActionVolunteerParticipation } from "@/lib/actions/volunteer-participation";

type PublicSnapshotHealth = {
  partial: boolean;
  failedSources: ActionSourceName[];
  availableSources: ActionSourceName[];
  warnings: string[];
};

/**
 * Minimal public projection needed by the recycling and climate sections.
 * Keep this contract deliberately smaller than the generic action DTO so that
 * SSR cannot accidentally serialize notes, photos, identities, or preparation
 * data that those sections do not need.
 */
export type PublicSectionActionItem = {
  id: string;
  created_at: string;
  actor_name: string | null;
  location_label: string;
  source?: string;
  action_date: string;
  waste_kg: number | null;
  cigarette_butts: number | null;
  volunteers_count: number;
  duration_minutes: number;
  geometry_kind?: ActionGeometryKind | null;
  contract?: {
    geometry: {
      kind: ActionGeometryKind;
      coordinates: [number, number][];
    };
    metadata: {
      volunteerParticipation?: ActionVolunteerParticipation | null;
    };
  };
};

export type PublicSectionActionListResponse = {
  status: "ok";
  count: number;
  items: PublicSectionActionItem[];
  partialSource?: boolean;
  sourceHealth?: PublicSnapshotHealth;
};

export type PublicSectionMapItem = {
  id: string;
  location_label: string;
  geometry_kind?: ActionGeometryKind | null;
  contract?: {
    geometry: {
      kind: ActionGeometryKind;
    };
  };
};

export type PublicSectionMapResponse = {
  status: "ok";
  count: number;
  daysWindow: number | null;
  items: PublicSectionMapItem[];
  partialSource?: boolean;
  sourceHealth?: PublicSnapshotHealth;
};

export type PublicSectionBreakdown = {
  totalKg: number;
  wasteCoverageRate: number;
  lines: Array<{
    category: string;
    kg: number;
    sharePercent: number;
    entries: number;
  }>;
  triQuality: { elevee: number; moyenne: number; faible: number };
  generatedAt: string;
};

export type PublicSectionInitialData = {
  recycling?: {
    actions: PublicSectionActionListResponse | null;
    map: PublicSectionMapResponse | null;
    breakdown: PublicSectionBreakdown | null;
  };
  climate?: {
    actions: PublicSectionActionListResponse | null;
  };
  actors?: {
    actions: PublicSectionActionListResponse | null;
    map: PublicSectionMapResponse | null;
  };
};
