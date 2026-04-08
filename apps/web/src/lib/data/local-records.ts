export const LOCAL_DATA_STORE_VERSION = 1 as const;

export const RECORD_TYPES = ["action", "clean_place", "other"] as const;
export type LocalRecordType = (typeof RECORD_TYPES)[number];

export const RECORD_STATUSES = ["test", "pending", "validated", "rejected"] as const;
export type LocalRecordStatus = (typeof RECORD_STATUSES)[number];

export type LocalRecordSource =
  | "test_seed"
  | "google_sheet"
  | "user_submission"
  | "admin_validation"
  | "manual_import"
  | "system_sync";

export type LocalGeo = {
  label: string;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type LocalMetrics = {
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  volunteersCount?: number | null;
  durationMinutes?: number | null;
};

export type LocalTrace = {
  externalId?: string | null;
  originTable?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  importedAt?: string | null;
  notes?: string | null;
};

export type LocalMapMeta = {
  displayable: boolean;
  lat?: number | null;
  lon?: number | null;
};

export type LocalDataRecord = {
  id: string;
  recordType: LocalRecordType;
  status: LocalRecordStatus;
  source: LocalRecordSource;
  title: string;
  description?: string | null;
  location: LocalGeo;
  eventDate?: string | null;
  metrics?: LocalMetrics;
  map: LocalMapMeta;
  trace?: LocalTrace;
};

export type LocalDataStore = {
  version: number;
  updatedAt: string;
  records: LocalDataRecord[];
};

export function isLocalRecordStatus(value: string): value is LocalRecordStatus {
  return RECORD_STATUSES.includes(value as LocalRecordStatus);
}

export function mapActionStatusToLocalStatus(value: string): LocalRecordStatus {
  if (value === "approved") {
    return "validated";
  }
  if (value === "rejected") {
    return "rejected";
  }
  return "pending";
}

export function mapLocalStatusToActionStatus(value: LocalRecordStatus): "pending" | "approved" | "rejected" {
  if (value === "validated") {
    return "approved";
  }
  if (value === "rejected") {
    return "rejected";
  }
  return "pending";
}
