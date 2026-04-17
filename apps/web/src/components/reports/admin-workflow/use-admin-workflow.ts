"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { evaluateActionQuality } from "@/lib/actions/quality";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { createAdminWorkflowActions } from "./actions";
import type { AdminWorkflowController } from "./types";
import { buildExportQuery } from "./helpers";
import {
  fetchAdminOperationAudit,
} from "./services";
import { useAdminWorkflowState } from "./state";

export { buildExportQuery, parseAdminApiError } from "./helpers";

export function useAdminWorkflow(): AdminWorkflowController {
  const state = useAdminWorkflowState();

  const query = useMemo(
    () =>
      buildExportQuery({
        status: state.status,
        days: state.days,
        limit: state.limit,
        association: state.association,
      }),
    [state.status, state.days, state.limit, state.association],
  );
  const csvExportUrl = `/api/reports/actions.csv?${query}`;
  const jsonExportUrl = `/api/reports/actions.json?${query}`;

  const preview = useSWR(
    [
      "admin-workflow-preview",
      state.status,
      String(state.days),
      String(state.limit),
      state.association,
    ],
    () =>
      fetchActions({
        status: state.status,
        days: state.days,
        limit: state.limit,
        types: "all",
        association: state.association,
      }),
    swrRecentViewOptions,
  );

  const audit = useSWR(
    ["admin-operation-audit"],
    () => fetchAdminOperationAudit(fetch, 25),
    swrRecentViewOptions,
  );

  const previewRows = useMemo(() => {
    return (preview.data?.items ?? []).slice(0, 12).map((item) => ({
      item,
      quality: evaluateActionQuality(item),
    }));
  }, [preview.data?.items]);

  const associationOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of preview.data?.items ?? []) {
      const value = item.association_name?.trim();
      if (value) {
        names.add(value);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, "fr"));
  }, [preview.data?.items]);

  function selectActionForModeration(actionId: string) {
    state.setModerationEntityType("action");
    state.setModerationId(actionId);
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
      state.resetModerationConfirmationState();
    };
  const setModerationIdWithReset: AdminWorkflowController["setModerationId"] = (
    value,
  ) => {
    state.setModerationId(value);
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
    association: state.association,
    setStatus: state.setStatus,
    setDays: state.setDays,
    setLimit: state.setLimit,
    setAssociation: state.setAssociation,
    associationOptions,
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
    setModerationEntityType: setModerationEntityTypeWithReset,
    setModerationId: setModerationIdWithReset,
    setActionStatus: setActionStatusWithReset,
    setCleanPlaceStatus: setCleanPlaceStatusWithReset,
    setModerationConfirmed: state.setModerationConfirmed,
    setModerationConfirmationText: state.setModerationConfirmationText,
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
