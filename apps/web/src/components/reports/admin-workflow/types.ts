import type { Dispatch, SetStateAction } from "react";
import type { ActionQualityResult } from "@/lib/actions/quality";
import type {
  ActionListItem,
  ActionStatus,
  ActionSubmissionMode,
  ActionWasteBreakdown,
} from "@/lib/actions/types";
import type {
  ModerationActionStatus,
  ModerationCleanPlaceStatus,
  ModerationEntityType,
} from "@/lib/admin/moderation-client";

export type AsyncState = "idle" | "pending" | "success" | "error";

export type ModerationJournalEntry = {
  at: string;
  entityType: ModerationEntityType;
  id: string;
  targetStatus: string;
  outcome: "success" | "error";
  message: string;
  sourceTable?: string;
  copiedToLocalValidatedStore?: boolean;
};

export type ImportDryRunSummary = {
  status: "dry_run";
  count: number;
  dryRunProof?: {
    token: string;
    expiresAt: string;
    payloadHash: string;
  };
  stats: {
    withCoordinates: number;
    missingCoordinates: number;
    totalWasteKg: number;
    totalButts: number;
    totalVolunteers: number;
    dateMin: string | null;
    dateMax: string | null;
  };
};

export type AdminOperationAuditItem = {
  operationId: string;
  at: string;
  actorUserId: string;
  operationType: "moderation" | "import_dry_run" | "import_confirm";
  outcome: "success" | "error";
  targetId?: string;
  details: Record<string, unknown>;
};

export type PreviewRow = {
  item: ActionListItem;
  quality: ActionQualityResult;
};

export type AdminWorkflowController = {
  status: ActionStatus | "all";
  days: number;
  limit: number;
  association: string | "all";
  setStatus: Dispatch<SetStateAction<ActionStatus | "all">>;
  setDays: Dispatch<SetStateAction<number>>;
  setLimit: Dispatch<SetStateAction<number>>;
  setAssociation: Dispatch<SetStateAction<string | "all">>;
  associationOptions: string[];

  csvState: AsyncState;
  jsonState: AsyncState;
  importState: AsyncState;
  importDryRunState: AsyncState;
  moderationState: AsyncState;
  errorMessage: string | null;
  lastSuccessMessage: string | null;

  importPayload: string;
  importPreview: ImportDryRunSummary | null;
  importConfirmationText: string;
  setImportPayload: Dispatch<SetStateAction<string>>;
  setImportConfirmationText: Dispatch<SetStateAction<string>>;
  canConfirmImport: boolean;

  moderationEntityType: ModerationEntityType;
  moderationId: string;
  actionStatus: ModerationActionStatus;
  cleanPlaceStatus: ModerationCleanPlaceStatus;
  moderationResult: string | null;
  moderationJournal: ModerationJournalEntry[];
  moderationConfirmed: boolean;
  moderationConfirmationText: string;
  setModerationEntityType: Dispatch<SetStateAction<ModerationEntityType>>;
  setModerationId: Dispatch<SetStateAction<string>>;
  setActionStatus: Dispatch<SetStateAction<ModerationActionStatus>>;
  setCleanPlaceStatus: Dispatch<SetStateAction<ModerationCleanPlaceStatus>>;
  setModerationConfirmed: Dispatch<SetStateAction<boolean>>;
  setModerationConfirmationText: Dispatch<SetStateAction<string>>;

  previewRows: PreviewRow[];
  previewLoading: boolean;
  previewError: boolean;
  reloadPreview: () => void;
  selectActionForModeration: (actionId: string) => void;

  auditItems: AdminOperationAuditItem[];
  auditLoading: boolean;
  auditError: boolean;

  csvExportUrl: string;
  jsonExportUrl: string;

  onDownloadCsv: () => Promise<void>;
  onDownloadJson: () => Promise<void>;
  onImportDryRun: () => Promise<void>;
  onImportPastActions: () => Promise<void>;
  onModerateEntity: () => Promise<void>;
};

export type WorkflowActionLike = {
  id: string;
  action_date: string;
  location_label: string;
  status: ActionStatus;
  association_name?: string | null;
  submission_mode?: ActionSubmissionMode | null;
  waste_breakdown?: ActionWasteBreakdown | null;
};
