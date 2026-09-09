import type { OrganizerType } from "./organizer-type";

export type OrganizerGeographicScope = "local" | "regional" | "national";
export type OrganizerActivityCadence =
  | "monthly"
  | "multiple_per_year"
  | "annual";
export type OrganizerActivityRole =
  | "direct_organizer"
  | "network_coordinator"
  | "both";

export type OrganizerDirectoryEntry = {
  id: string;
  name: string;
  value: string;
  organizerType: Exclude<OrganizerType, "spontaneous">;
  geographicScope: OrganizerGeographicScope;
  city: string | null;
  region: string | null;
  isIleDeFrance: boolean | null;
  parentOrganization: string | null;
  activityCadence: OrganizerActivityCadence;
  activityRole: OrganizerActivityRole;
  websiteUrl: string;
  activityEvidenceUrls: readonly string[];
  activityEvidenceSummary: string;
  lastVerifiedActivityYear: number;
  verifiedAt: string;
};
