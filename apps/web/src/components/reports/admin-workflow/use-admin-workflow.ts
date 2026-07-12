"use client";

import { useEffect, useMemo } from"react";
import useSWR from"swr";
import { fetchActions } from"@/lib/actions/http";
import { evaluateActionQuality } from"@/lib/actions/quality";
import type { ActionListItem, ActionListResponse } from"@/lib/actions/types";
import { swrRecentViewOptions } from"@/lib/swr-config";
import {
 buildReportScopeOptions,
 filterReportScopeItems,
 normalizeReportScope,
} from"@/lib/reports/scope";
import { createAdminWorkflowActions } from"./actions";
import { buildExportQuery } from"./helpers";
import {
 fetchAdminOperationAudit,
} from"./services";
import { useAdminWorkflowState } from"./state";
import type {
 ActionModerationEditDraft,
 AdminWorkflowController,
 CleanPlaceModerationEditDraft,
 AdminOperationAuditItem,
} from"./types";

export { buildExportQuery, parseAdminApiError } from"./helpers";

type UseAdminWorkflowParams = {
 initialPreview?: ActionListResponse | null;
 initialAuditItems?: AdminOperationAuditItem[] | null;
};

export function useAdminWorkflow(
 params: UseAdminWorkflowParams = {},
): AdminWorkflowController {
 const state = useAdminWorkflowState();

 const scope = useMemo(
 () => normalizeReportScope({ kind: state.scopeKind, value: state.scopeValue }),
 [state.scopeKind, state.scopeValue],
 );

 const query = useMemo(
 () =>
 buildExportQuery({
 status: state.status,
 days: state.days,
 limit: state.limit,
 scopeKind: state.scopeKind,
 scopeValue: state.scopeValue,
 association: state.association,
 }),
 [
 state.status,
 state.days,
 state.limit,
 state.scopeKind,
 state.scopeValue,
 state.association,
 ],
 );
 const csvExportUrl = `/api/reports/actions.csv?${query}`;
 const jsonExportUrl = `/api/reports/actions.json?${query}`;

 const preview = useSWR<ActionListResponse>(
 [
"admin-workflow-preview",
 state.status,
 String(state.days),
 String(state.limit),
 state.scopeKind,
 state.scopeValue,
 state.association,
 ],
 () =>
 fetchActions({
 status: state.status,
 days: state.days,
 limit: state.limit,
 types:"all",
 scopeKind: state.scopeKind,
 scopeValue: state.scopeValue,
 association: state.association,
 }),
 {
 ...swrRecentViewOptions,
 fallbackData: params.initialPreview ?? undefined,
 revalidateOnMount: params.initialPreview ? false : undefined,
 },
 );

  const auditTargetId =
    state.moderationEntityType === "action" &&
    state.moderationId.trim().length > 0
      ? state.moderationId.trim()
      : null;

  const audit = useSWR<{ items?: AdminOperationAuditItem[] }>(
    ["admin-operation-audit", auditTargetId ?? "global"],
    () => fetchAdminOperationAudit(fetch, 25, auditTargetId),
    {
      ...swrRecentViewOptions,
      fallbackData:
        params.initialAuditItems ? { items: params.initialAuditItems } : undefined,
      revalidateOnMount: params.initialAuditItems ? false : undefined,
    },
  );

 const scopeOptions = useMemo(
 () => buildReportScopeOptions(preview.data?.items ?? []),
 [preview.data?.items],
 );
 const { scopeKind, scopeValue, setScopeValue } = state;

 useEffect(() => {
 if (scopeKind ==="global") {
 if (scopeValue !=="") {
 setScopeValue("");
 }
 return;
 }
 const options =
 scopeKind ==="account"
 ? scopeOptions.accounts
 : scopeKind ==="association"
 ? scopeOptions.associations
 : scopeOptions.arrondissements;
 if (options.length === 0) {
 if (scopeValue !=="") {
 setScopeValue("");
 }
 return;
 }
 if (!options.some((option) => option.value === scopeValue)) {
 setScopeValue(options[0].value);
 }
 }, [scopeOptions, scopeKind, scopeValue, setScopeValue]);

 const previewRows = useMemo(() => {
 return filterReportScopeItems(preview.data?.items ?? [], scope)
 .slice(0, 12)
 .map((item) => ({
 item,
 quality: evaluateActionQuality(item),
 }));
 }, [preview.data?.items, scope]);

 function buildActionEditDraft(item: ActionListItem): ActionModerationEditDraft {
 const metadata = item.contract?.metadata;
 const drawing = item.manual_drawing ?? metadata?.manualDrawing ?? null;
 const wasteBreakdown = item.waste_breakdown ?? metadata?.wasteBreakdown ?? null;
 return {
 actorName: item.actor_name ?? metadata?.actorName ?? "",
 associationName: item.association_name ?? metadata?.associationName ?? "",
 actionDate: item.action_date,
 locationLabel: item.location_label,
 departureLocationLabel: metadata?.departureLocationLabel ?? "",
 arrivalLocationLabel: metadata?.arrivalLocationLabel ?? "",
 routeStyle: metadata?.routeStyle ??"souple",
 routeAdjustmentMessage: metadata?.routeAdjustmentMessage ?? "",
 latitude: item.latitude === null ? "" : String(item.latitude),
 longitude: item.longitude === null ? "" : String(item.longitude),
 wasteKg: String(item.waste_kg ?? 0),
 cigaretteButts: String(item.cigarette_butts ?? 0),
 volunteersCount: String(item.volunteers_count ?? 1),
 durationMinutes: String(item.duration_minutes ?? 0),
 notes: item.notes_plain ?? item.notes ?? metadata?.notesPlain ?? metadata?.notes ?? "",
 placeType: metadata?.placeType ?? "",
 submissionMode: item.submission_mode ?? metadata?.submissionMode ??"complete",
 wasteMegotsKg:
 wasteBreakdown?.megotsKg === undefined ? "" : String(wasteBreakdown.megotsKg),
 wasteMegotsCondition: wasteBreakdown?.megotsCondition ??"propre",
 wastePlastiqueKg:
 wasteBreakdown?.plastiqueKg === undefined ? "" : String(wasteBreakdown.plastiqueKg),
 wasteVerreKg:
 wasteBreakdown?.verreKg === undefined ? "" : String(wasteBreakdown.verreKg),
 wasteMetalKg:
 wasteBreakdown?.metalKg === undefined ? "" : String(wasteBreakdown.metalKg),
 wasteMixteKg:
 wasteBreakdown?.mixteKg === undefined ? "" : String(wasteBreakdown.mixteKg),
 triQuality: wasteBreakdown?.triQuality ??"moyenne",
 manualDrawingJson: drawing ? JSON.stringify(drawing, null, 2) : "",
 };
 }

 function buildCleanPlaceEditDraft(item: ActionListItem): CleanPlaceModerationEditDraft {
 return {
 label: item.location_label,
 wasteType: item.record_type ?? "clean_place",
 latitude: item.latitude === null ? "" : String(item.latitude),
 longitude: item.longitude === null ? "" : String(item.longitude),
 notes: item.notes_plain ?? item.notes ?? "",
 };
 }

 function selectActionForModeration(item: ActionListItem) {
 const isCleanPlace = item.source ==="spots" || item.record_type ==="clean_place" || item.record_type ==="other";
 state.setModerationEntityType(isCleanPlace ?"clean_place" :"action");
 state.setModerationId(item.id);
 state.setSelectedActionCreatorId(isCleanPlace ? null : item.created_by_clerk_id?.trim() || null);
 state.setActionEditDraft(isCleanPlace ? null : buildActionEditDraft(item));
 state.setCleanPlaceEditDraft(isCleanPlace ? buildCleanPlaceEditDraft(item) : null);
 state.resetModerationConfirmationState();
}

 function reloadPreview() {
 void preview.mutate();
 }

 const {
 onDownloadCsv,
 onDownloadJson,
 onImportDryRun,
 onImportPastActions,
 onModerateEntity,
 } = createAdminWorkflowActions({
 state,
 csvExportUrl,
 jsonExportUrl,
 mutatePreview: reloadPreview,
 });

 const setImportPayloadWithReset: AdminWorkflowController["setImportPayload"] = (
 value,
 ) => {
 state.setImportPayload(value);
 state.clearImportConfirmationState();
 };
const setModerationEntityTypeWithReset: AdminWorkflowController["setModerationEntityType"] =
 (value) => {
 state.setModerationEntityType(value);
 state.setSelectedActionCreatorId(null);
 state.setActionEditDraft(null);
 state.setCleanPlaceEditDraft(null);
 state.resetModerationConfirmationState();
};
const setModerationIdWithReset: AdminWorkflowController["setModerationId"] = (
 value,
 ) => {
 state.setModerationId(value);
 state.setSelectedActionCreatorId(null);
 state.setActionEditDraft(null);
 state.setCleanPlaceEditDraft(null);
 state.resetModerationConfirmationState();
};
 const setActionStatusWithReset: AdminWorkflowController["setActionStatus"] = (
 value,
 ) => {
 state.setActionStatus(value);
 state.resetModerationConfirmationState();
 };
 const setCleanPlaceStatusWithReset: AdminWorkflowController["setCleanPlaceStatus"] =
 (value) => {
 state.setCleanPlaceStatus(value);
 state.resetModerationConfirmationState();
 };

 return {
 status: state.status,
 days: state.days,
 limit: state.limit,
 scopeKind: state.scopeKind,
 scopeValue: state.scopeValue,
 association: state.association,
 setStatus: state.setStatus,
 setDays: state.setDays,
 setLimit: state.setLimit,
 setScopeKind: state.setScopeKind,
 setScopeValue: state.setScopeValue,
 setAssociation: state.setAssociation,
 scopeOptions,
 associationOptions: scopeOptions.associations.map((item) => item.label),
 csvState: state.csvState,
 jsonState: state.jsonState,
 importState: state.importState,
 importDryRunState: state.importDryRunState,
 moderationState: state.moderationState,
 errorMessage: state.errorMessage,
 lastSuccessMessage: state.lastSuccessMessage,
 importPayload: state.importPayload,
 importPreview: state.importPreview,
 importConfirmationText: state.importConfirmationText,
 setImportPayload: setImportPayloadWithReset,
 setImportConfirmationText: state.setImportConfirmationText,
 canConfirmImport: state.canConfirmImport,
 moderationEntityType: state.moderationEntityType,
 moderationId: state.moderationId,
 actionStatus: state.actionStatus,
 cleanPlaceStatus: state.cleanPlaceStatus,
 moderationResult: state.moderationResult,
 moderationJournal: state.moderationJournal,
 moderationConfirmed: state.moderationConfirmed,
 moderationConfirmationText: state.moderationConfirmationText,
 moderationReason: state.moderationReason,
 moderationVisibility: state.moderationVisibility,
 selectedActionCreatorId: state.selectedActionCreatorId,
 actionEditDraft: state.actionEditDraft,
 cleanPlaceEditDraft: state.cleanPlaceEditDraft,
 setModerationEntityType: setModerationEntityTypeWithReset,
 setModerationId: setModerationIdWithReset,
 setActionStatus: setActionStatusWithReset,
 setCleanPlaceStatus: setCleanPlaceStatusWithReset,
 setModerationConfirmed: state.setModerationConfirmed,
 setModerationConfirmationText: state.setModerationConfirmationText,
 setModerationReason: state.setModerationReason,
 setModerationVisibility: state.setModerationVisibility,
 setSelectedActionCreatorId: state.setSelectedActionCreatorId,
 setActionEditDraft: state.setActionEditDraft,
 setCleanPlaceEditDraft: state.setCleanPlaceEditDraft,
 previewRows,
 previewLoading: preview.isLoading,
 previewError: Boolean(preview.error),
 reloadPreview,
 selectActionForModeration,
 auditItems: audit.data?.items ?? [],
 auditLoading: audit.isLoading,
 auditError: Boolean(audit.error),
 csvExportUrl,
 jsonExportUrl,
 onDownloadCsv,
 onDownloadJson,
 onImportDryRun,
 onImportPastActions,
 onModerateEntity,
 };
}
