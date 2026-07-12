import type { Dispatch, SetStateAction } from"react";
import type { AdminOperationAuditEntry } from "@/lib/admin/operation-audit";
import type { ActionQualityResult } from"@/lib/actions/quality";
import type {
 ActionListItem,
 ActionMegotsCondition,
 ActionStatus,
 ActionSubmissionMode,
 ActionWasteBreakdown,
} from"@/lib/actions/types";
import type { ReportScopeChoice, ReportScopeKind } from"@/lib/reports/scope";
import type {
  ModerationActionStatus,
  ModerationCleanPlaceStatus,
  ModerationEntityType,
  ModerationVisibility,
} from"@/lib/admin/moderation-client";

export type AsyncState ="idle" |"pending" |"success" |"error";

export type ModerationJournalEntry = {
 at: string;
 entityType: ModerationEntityType;
 id: string;
 targetStatus: string;
 outcome:"success" |"error";
 message: string;
 sourceTable?: string;
 copiedToLocalValidatedStore?: boolean;
};

export type ImportDryRunSummary = {
 status:"dry_run";
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

export type AdminOperationAuditItem = AdminOperationAuditEntry;

export type PreviewRow = {
 item: ActionListItem;
 quality: ActionQualityResult;
};

export type ActionModerationEditDraft = {
 actorName: string;
 associationName: string;
 actionDate: string;
 locationLabel: string;
 departureLocationLabel: string;
 arrivalLocationLabel: string;
 routeStyle: "direct" |"souple";
 routeAdjustmentMessage: string;
 latitude: string;
 longitude: string;
 wasteKg: string;
 cigaretteButts: string;
 volunteersCount: string;
 durationMinutes: string;
 notes: string;
 placeType: string;
 submissionMode: ActionSubmissionMode;
 wasteMegotsKg: string;
 wasteMegotsCondition: ActionMegotsCondition;
 wastePlastiqueKg: string;
 wasteVerreKg: string;
 wasteMetalKg: string;
 wasteMixteKg: string;
 triQuality: "faible" |"moyenne" |"elevee";
 manualDrawingJson: string;
};

export type CleanPlaceModerationEditDraft = {
 label: string;
 wasteType: string;
 latitude: string;
 longitude: string;
 notes: string;
};

export type AdminWorkflowController = {
 status: ActionStatus |"all";
 days: number;
 limit: number;
 scopeKind: ReportScopeKind;
 scopeValue: string;
 association: string |"all";
 setStatus: Dispatch<SetStateAction<ActionStatus |"all">>;
 setDays: Dispatch<SetStateAction<number>>;
 setLimit: Dispatch<SetStateAction<number>>;
 setScopeKind: Dispatch<SetStateAction<ReportScopeKind>>;
 setScopeValue: Dispatch<SetStateAction<string>>;
 setAssociation: Dispatch<SetStateAction<string |"all">>;
 associationOptions: string[];
 scopeOptions: {
 accounts: ReportScopeChoice[];
 associations: ReportScopeChoice[];
 arrondissements: ReportScopeChoice[];
 };

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
  moderationReason: string;
  moderationVisibility: ModerationVisibility;
  selectedActionCreatorId: string | null;
  actionEditDraft: ActionModerationEditDraft | null;
  cleanPlaceEditDraft: CleanPlaceModerationEditDraft | null;
 setModerationEntityType: Dispatch<SetStateAction<ModerationEntityType>>;
 setModerationId: Dispatch<SetStateAction<string>>;
 setActionStatus: Dispatch<SetStateAction<ModerationActionStatus>>;
 setCleanPlaceStatus: Dispatch<SetStateAction<ModerationCleanPlaceStatus>>;
 setModerationConfirmed: Dispatch<SetStateAction<boolean>>;
  setModerationConfirmationText: Dispatch<SetStateAction<string>>;
  setModerationReason: Dispatch<SetStateAction<string>>;
  setModerationVisibility: Dispatch<SetStateAction<ModerationVisibility>>;
  setActionEditDraft: Dispatch<SetStateAction<ActionModerationEditDraft | null>>;
  setCleanPlaceEditDraft: Dispatch<SetStateAction<CleanPlaceModerationEditDraft | null>>;
  setSelectedActionCreatorId: Dispatch<SetStateAction<string | null>>;

 previewRows: PreviewRow[];
 previewLoading: boolean;
 previewError: boolean;
 reloadPreview: () => void;
 selectActionForModeration: (item: ActionListItem) => void;

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
