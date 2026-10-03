import type { StorageBusinessClassificationSignalType } from "./storage-business-classification";
import type { StorageBusinessDomainId } from "./storage-business-taxonomy";

export type StorageBusinessContributionTopFile = {
  bucketId: string;
  bucketLabel: string;
  businessSignal?: StorageBusinessClassificationSignalType;
  businessEvidence?: string;
  businessDomain?: string | null;
  sourceTable?: string | null;
  businessContext?: string | null;
  name: string;
  extension: string;
  bytes: number;
  sizeLabel: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type StorageBusinessContributionMimeSubtype = {
  key: string;
  label: string;
  bytes: number;
  count: number;
  sharePercent: number | null;
  averageBytes: number | null;
  knownSizeCount?: number;
};

export type StorageBusinessContributionHistoryPoint = {
  snapshotMonth: string;
  monthLabel: string;
  currentBytes: number;
  currentCount: number;
  sharePercent: number;
  deltaBytes: number;
  deltaCount: number;
  deltaPercent: number | null;
  cumulative3MonthBytes: number;
  cumulative3MonthPercent: number | null;
  accelerationBytes: number;
  accelerationPercent: number | null;
};

export type StorageBusinessContributionAlertSeverity = "info" | "warning" | "critical";

export type StorageBusinessContributionAlertSignal =
  | "quotaShare"
  | "growth"
  | "photoDominance"
  | "heavyExports"
  | "acceleration";

export type StorageBusinessContributionAlert = {
  id: string;
  domainId: StorageBusinessDomainId;
  label: string;
  title: string;
  message: string;
  severity: StorageBusinessContributionAlertSeverity;
  signal: StorageBusinessContributionAlertSignal;
  snapshotMonth: string;
  currentBytes: number;
  thresholdBytes: number | null;
  currentSharePercent: number;
  thresholdSharePercent: number | null;
};

export type StorageBusinessContributionItem = {
  id: StorageBusinessDomainId;
  label: string;
  description: string;
  currentBytes: number;
  currentCount: number;
  currentSharePercent: number;
  currentAverageBytes: number;
  previousBytes: number;
  previousCount: number;
  deltaBytes: number;
  deltaPercent: number | null;
  deltaCount: number;
  cumulative3MonthBytes: number;
  cumulative3MonthPercent: number | null;
  accelerationBytes: number;
  accelerationPercent: number | null;
  history: StorageBusinessContributionHistoryPoint[];
  topFiles: StorageBusinessContributionTopFile[];
  mimeSubtypes: StorageBusinessContributionMimeSubtype[];
  alerts: StorageBusinessContributionAlert[];
};

export type StorageBusinessContributionReport = {
  previousSnapshotMonth: string | null;
  historyMonths: string[];
  alerts: StorageBusinessContributionAlert[];
  items: StorageBusinessContributionItem[];
};
