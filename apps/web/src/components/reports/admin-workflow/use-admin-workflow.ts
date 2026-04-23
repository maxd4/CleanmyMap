"use client";

import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { evaluateActionQuality } from "@/lib/actions/quality";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  buildReportScopeOptions,
  filterReportScopeItems,
  normalizeReportScope,
} from "@/lib/reports/scope";
import { createAdminWorkflowActions } from "./actions";
import { buildExportQuery } from "./helpers";
import {
  fetchAdminOperationAudit,
} from "./services";
import { useAdminWorkflowState } from "./state";
import type { AdminWorkflowController } from "./types";

export { buildExportQuery, parseAdminApiError } from "./helpers";

export function useAdminWorkflow(): AdminWorkflowController {
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

  const preview = useSWR(
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
        types: "all",
        scopeKind: state.scopeKind,
        scopeValue: state.scopeValue,
        association: state.association,
      }),
    swrRecentViewOptions,
  );

  const audit = useSWR(
    ["admin-operation-audit"],
    () => fetchAdminOperationAudit(fetch, 25),
    swrRecentViewOptions,
  );

  const scopeOptions = useMemo(
    () => buildReportScopeOptions(preview.data?.items ?? []),
    [preview.data?.items],
  );

  useEffect(() => {
    if (state.scopeKind === "global") {
      if (state.scopeValue !== "") {
        state.setScopeValue("");
      }
      return;
    }
    const options =
      state.scopeKind === "account"
        ? scopeOptions.accounts
        : state.scopeKind === "association"
          ? scopeOptions.associations
          : scopeOptions.arrondissements;
    if (options.length === 0) {
      if (state.scopeValue !== "") {
        state.setScopeValue("");
      }
      return;
    }
    if (!options.some((option) => option.value === state.scopeValue)) {
      state.setScopeValue(options[0].value);
    }
  }, [scopeOptions, state.scopeKind, state.scopeValue]);

  const previewRows = useMemo(() => {
    return filterReportScopeItems(preview.data?.items ?? [], scope)
      .slice(0, 12)
      .map((item) => ({
        item,
        quality: evaluateActionQuality(item),
      }));
  }, [preview.data?.items, scope]);

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
