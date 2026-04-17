"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { evaluateActionQuality } from "@/lib/actions/quality";
import {
  ModerationClientError,
  postAdminModeration,
  type ModerationPayload,
} from "@/lib/admin/moderation-client";
import { buildDeliverableFilename } from "@/lib/reports/deliverable-name";
import { swrRecentViewOptions } from "@/lib/swr-config";
import type { AdminWorkflowController } from "./types";
import { buildExportQuery } from "./helpers";
import {
  downloadFromUrl,
  fetchAdminOperationAudit,
  runImportConfirm,
  runImportDryRun,
  triggerBrowserDownload,
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

  async function onDownloadCsv() {
    state.setCsvState("pending");
    state.setErrorMessage(null);
    try {
      const result = await downloadFromUrl(csvExportUrl);
      triggerBrowserDownload(
        result.blob,
        result.filename ??
          buildDeliverableFilename({
            rubrique: "export_actions",
            extension: "csv",
            date: new Date(),
          }),
      );
      state.setCsvState("success");
      state.setLastSuccessMessage(
        `CSV exporte avec succes (${new Date().toLocaleString("fr-FR")}).`,
      );
    } catch (error) {
      state.setCsvState("error");
      state.setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue.",
      );
    }
  }

  async function onDownloadJson() {
    state.setJsonState("pending");
    state.setErrorMessage(null);
    try {
      const result = await downloadFromUrl(jsonExportUrl);
      triggerBrowserDownload(
        result.blob,
        result.filename ??
          buildDeliverableFilename({
            rubrique: "export_actions",
            extension: "json",
            date: new Date(),
          }),
      );
      state.setJsonState("success");
      state.setLastSuccessMessage(
        `JSON exporte avec succes (${new Date().toLocaleString("fr-FR")}).`,
      );
    } catch (error) {
      state.setJsonState("error");
      state.setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue.",
      );
    }
  }

  async function onImportDryRun() {
    state.setImportDryRunState("pending");
    state.setErrorMessage(null);
    state.setImportPreview(null);

    try {
      const summary = await runImportDryRun({ importPayload: state.importPayload });
      state.setImportPreview(summary);
      state.setImportPreviewSignature(state.importPayload);
      state.setImportConfirmationText("");
      state.setImportDryRunState("success");
      state.setLastSuccessMessage("Dry-run valide. Importable apres confirmation.");
    } catch (error) {
      state.setImportDryRunState("error");
      state.setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue.",
      );
    }
  }

  async function onImportPastActions() {
    if (!state.canConfirmImport) {
      state.setImportState("error");
      state.setErrorMessage(
        "Lance d'abord un dry-run valide avant de confirmer l'import.",
      );
      return;
    }

    state.setImportState("pending");
    state.setErrorMessage(null);

    try {
      const data = await runImportConfirm({
        importPayload: state.importPayload,
        dryRunProof: state.importPreview?.dryRunProof?.token,
        confirmPhrase: state.importConfirmationText,
      });
      state.setImportState("success");
      const op = data.operationId ? ` (op ${data.operationId})` : "";
      state.setLastSuccessMessage(
        `Import confirme: ${data.count ?? 0} action(s) ajoutee(s).${op}`,
      );
      void preview.mutate();
    } catch (error) {
      state.setImportState("error");
      state.setErrorMessage(
        error instanceof Error ? error.message : "Erreur inconnue.",
      );
    }
  }

  async function onModerateEntity() {
    const trimmedId = state.moderationId.trim();
    if (!trimmedId) {
      state.setModerationState("error");
      state.setErrorMessage("Renseigne un identifiant d'entite (UUID/ID).");
      return;
    }
    if (!state.moderationConfirmed) {
      state.setModerationState("error");
      state.setErrorMessage("Confirme explicitement la moderation avant execution.");
      return;
    }
    if (
      state.moderationConfirmationText.trim().toUpperCase() !==
      "CONFIRMER MODERATION"
    ) {
      state.setModerationState("error");
      state.setErrorMessage("Saisis la phrase CONFIRMER MODERATION avant execution.");
      return;
    }

    state.setModerationState("pending");
    state.setErrorMessage(null);
    state.setModerationResult(null);

    const payload: ModerationPayload =
      state.moderationEntityType === "action"
        ? {
            entityType: "action",
            id: trimmedId,
            status: state.actionStatus,
            confirmPhrase: state.moderationConfirmationText,
          }
        : {
            entityType: "clean_place",
            id: trimmedId,
            status: state.cleanPlaceStatus,
            confirmPhrase: state.moderationConfirmationText,
          };

    try {
      const result = await postAdminModeration(payload);
      state.setModerationState("success");
      state.setModerationResult(JSON.stringify(result, null, 2));
      const successMessage = `Moderation appliquee pour ${payload.entityType} (${payload.id}) a ${new Date().toLocaleString("fr-FR")}.`;
      state.setLastSuccessMessage(successMessage);
      state.resetModerationConfirmationState();
      state.pushModerationJournal({
        at: new Date().toISOString(),
        entityType: payload.entityType,
        id: payload.id,
        targetStatus: payload.status,
        outcome: "success",
        message: successMessage,
        sourceTable: result.sourceTable,
        copiedToLocalValidatedStore: result.copiedToLocalValidatedStore,
      });
      void preview.mutate();
    } catch (error) {
      state.setModerationState("error");
      let message = "Erreur inconnue.";
      if (error instanceof ModerationClientError) {
        if (error.code === "permission_denied") {
          message = `Acces admin requis (${error.message}).`;
        } else if (error.code === "network_error") {
          message =
            "Erreur reseau pendant la moderation. Reessaie dans quelques secondes.";
        } else {
          message = error.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      state.setErrorMessage(message);
      state.pushModerationJournal({
        at: new Date().toISOString(),
        entityType: payload.entityType,
        id: payload.id,
        targetStatus: payload.status,
        outcome: "error",
        message,
      });
    }
  }

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
