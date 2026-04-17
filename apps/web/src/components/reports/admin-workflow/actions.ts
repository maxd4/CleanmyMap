import {
  ModerationClientError,
  postAdminModeration,
  type ModerationPayload,
} from "@/lib/admin/moderation-client";
import { buildDeliverableFilename } from "@/lib/reports/deliverable-name";
import type {
  AsyncState,
  ImportDryRunSummary,
  ModerationJournalEntry,
} from "./types";
import {
  downloadFromUrl,
  runImportConfirm,
  runImportDryRun,
  triggerBrowserDownload,
} from "./services";

type Setter<T> = (value: T) => void;

export type AdminWorkflowActionState = {
  setCsvState: Setter<AsyncState>;
  setJsonState: Setter<AsyncState>;
  setImportState: Setter<AsyncState>;
  setImportDryRunState: Setter<AsyncState>;
  setModerationState: Setter<AsyncState>;
  setErrorMessage: Setter<string | null>;
  setLastSuccessMessage: Setter<string | null>;
  importPayload: string;
  setImportPreview: Setter<ImportDryRunSummary | null>;
  setImportPreviewSignature: Setter<string | null>;
  setImportConfirmationText: Setter<string>;
  canConfirmImport: boolean;
  importPreview: ImportDryRunSummary | null;
  importConfirmationText: string;
  moderationEntityType: "action" | "clean_place";
  moderationId: string;
  actionStatus: "pending" | "approved" | "rejected";
  cleanPlaceStatus: "new" | "validated" | "cleaned";
  moderationConfirmed: boolean;
  moderationConfirmationText: string;
  setModerationResult: Setter<string | null>;
  resetModerationConfirmationState: () => void;
  pushModerationJournal: (entry: ModerationJournalEntry) => void;
};

type CreateAdminWorkflowActionsParams = {
  state: AdminWorkflowActionState;
  csvExportUrl: string;
  jsonExportUrl: string;
  mutatePreview: () => void;
};

type DownloadParams = {
  exportUrl: string;
  extension: "csv" | "json";
  label: "CSV" | "JSON";
  setState: Setter<AsyncState>;
  state: AdminWorkflowActionState;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Erreur inconnue.";
}

function buildModerationPayload(
  state: AdminWorkflowActionState,
  trimmedId: string,
): ModerationPayload {
  if (state.moderationEntityType === "action") {
    return {
      entityType: "action",
      id: trimmedId,
      status: state.actionStatus,
      confirmPhrase: state.moderationConfirmationText,
    };
  }

  return {
    entityType: "clean_place",
    id: trimmedId,
    status: state.cleanPlaceStatus,
    confirmPhrase: state.moderationConfirmationText,
  };
}

export function parseModerationErrorMessage(error: unknown): string {
  if (error instanceof ModerationClientError) {
    if (error.code === "permission_denied") {
      return `Acces admin requis (${error.message}).`;
    }
    if (error.code === "network_error") {
      return "Erreur reseau pendant la moderation. Reessaie dans quelques secondes.";
    }
    return error.message;
  }

  return toErrorMessage(error);
}

async function runDownload(params: DownloadParams): Promise<void> {
  params.setState("pending");
  params.state.setErrorMessage(null);

  try {
    const result = await downloadFromUrl(params.exportUrl);
    triggerBrowserDownload(
      result.blob,
      result.filename ??
        buildDeliverableFilename({
          rubrique: "export_actions",
          extension: params.extension,
          date: new Date(),
        }),
    );
    params.setState("success");
    params.state.setLastSuccessMessage(
      `${params.label} exporte avec succes (${new Date().toLocaleString("fr-FR")}).`,
    );
  } catch (error) {
    params.setState("error");
    params.state.setErrorMessage(toErrorMessage(error));
  }
}

export function createAdminWorkflowActions(
  params: CreateAdminWorkflowActionsParams,
): {
  onDownloadCsv: () => Promise<void>;
  onDownloadJson: () => Promise<void>;
  onImportDryRun: () => Promise<void>;
  onImportPastActions: () => Promise<void>;
  onModerateEntity: () => Promise<void>;
} {
  const { state } = params;

  async function onDownloadCsv() {
    await runDownload({
      exportUrl: params.csvExportUrl,
      extension: "csv",
      label: "CSV",
      setState: state.setCsvState,
      state,
    });
  }

  async function onDownloadJson() {
    await runDownload({
      exportUrl: params.jsonExportUrl,
      extension: "json",
      label: "JSON",
      setState: state.setJsonState,
      state,
    });
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
      state.setErrorMessage(toErrorMessage(error));
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
      params.mutatePreview();
    } catch (error) {
      state.setImportState("error");
      state.setErrorMessage(toErrorMessage(error));
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

    const payload = buildModerationPayload(state, trimmedId);
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
      params.mutatePreview();
    } catch (error) {
      state.setModerationState("error");
      const message = parseModerationErrorMessage(error);
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

  return {
    onDownloadCsv,
    onDownloadJson,
    onImportDryRun,
    onImportPastActions,
    onModerateEntity,
  };
}
