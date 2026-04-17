"use client";

import { useMemo, useState } from "react";
import type { ActionStatus } from "@/lib/actions/types";
import type {
  ModerationActionStatus,
  ModerationCleanPlaceStatus,
  ModerationEntityType,
} from "@/lib/admin/moderation-client";
import type {
  AsyncState,
  ImportDryRunSummary,
  ModerationJournalEntry,
} from "./types";

export const DEFAULT_IMPORT_PAYLOAD = '{\n  "items": []\n}';

export function deriveCanConfirmImport(params: {
  importPreview: ImportDryRunSummary | null;
  importPreviewSignature: string | null;
  importPayload: string;
  importConfirmationText: string;
}): boolean {
  return (
    params.importPreview !== null &&
    Boolean(params.importPreview.dryRunProof?.token) &&
    params.importPreviewSignature === params.importPayload &&
    params.importConfirmationText.trim().toUpperCase() === "CONFIRMER IMPORT"
  );
}

export function appendModerationJournal(
  previous: ModerationJournalEntry[],
  entry: ModerationJournalEntry,
): ModerationJournalEntry[] {
  return [entry, ...previous].slice(0, 12);
}

export function useAdminWorkflowState() {
  const [status, setStatus] = useState<ActionStatus | "all">("all");
  const [days, setDays] = useState<number>(90);
  const [limit, setLimit] = useState<number>(250);
  const [association, setAssociation] = useState<string | "all">("all");

  const [csvState, setCsvState] = useState<AsyncState>("idle");
  const [jsonState, setJsonState] = useState<AsyncState>("idle");
  const [importState, setImportState] = useState<AsyncState>("idle");
  const [importDryRunState, setImportDryRunState] =
    useState<AsyncState>("idle");
  const [moderationState, setModerationState] = useState<AsyncState>("idle");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null,
  );
  const [importPayload, setImportPayload] = useState<string>(
    DEFAULT_IMPORT_PAYLOAD,
  );
  const [importPreview, setImportPreview] =
    useState<ImportDryRunSummary | null>(null);
  const [importPreviewSignature, setImportPreviewSignature] = useState<
    string | null
  >(null);
  const [importConfirmationText, setImportConfirmationText] =
    useState<string>("");

  const [moderationEntityType, setModerationEntityType] =
    useState<ModerationEntityType>("action");
  const [moderationId, setModerationId] = useState<string>("");
  const [actionStatus, setActionStatus] =
    useState<ModerationActionStatus>("approved");
  const [cleanPlaceStatus, setCleanPlaceStatus] =
    useState<ModerationCleanPlaceStatus>("validated");
  const [moderationResult, setModerationResult] = useState<string | null>(null);
  const [moderationJournal, setModerationJournal] = useState<
    ModerationJournalEntry[]
  >([]);
  const [moderationConfirmed, setModerationConfirmed] =
    useState<boolean>(false);
  const [moderationConfirmationText, setModerationConfirmationText] =
    useState<string>("");

  const canConfirmImport = useMemo(
    () =>
      deriveCanConfirmImport({
        importPreview,
        importPreviewSignature,
        importPayload,
        importConfirmationText,
      }),
    [
      importPreview,
      importPreviewSignature,
      importPayload,
      importConfirmationText,
    ],
  );

  function clearImportConfirmationState() {
    setImportPreview(null);
    setImportConfirmationText("");
  }

  function resetModerationConfirmationState() {
    setModerationConfirmed(false);
    setModerationConfirmationText("");
  }

  function pushModerationJournal(entry: ModerationJournalEntry) {
    setModerationJournal((previous) => appendModerationJournal(previous, entry));
  }

  return {
    status,
    setStatus,
    days,
    setDays,
    limit,
    setLimit,
    association,
    setAssociation,
    csvState,
    setCsvState,
    jsonState,
    setJsonState,
    importState,
    setImportState,
    importDryRunState,
    setImportDryRunState,
    moderationState,
    setModerationState,
    errorMessage,
    setErrorMessage,
    lastSuccessMessage,
    setLastSuccessMessage,
    importPayload,
    setImportPayload,
    importPreview,
    setImportPreview,
    importPreviewSignature,
    setImportPreviewSignature,
    importConfirmationText,
    setImportConfirmationText,
    moderationEntityType,
    setModerationEntityType,
    moderationId,
    setModerationId,
    actionStatus,
    setActionStatus,
    cleanPlaceStatus,
    setCleanPlaceStatus,
    moderationResult,
    setModerationResult,
    moderationJournal,
    setModerationJournal,
    moderationConfirmed,
    setModerationConfirmed,
    moderationConfirmationText,
    setModerationConfirmationText,
    canConfirmImport,
    clearImportConfirmationState,
    resetModerationConfirmationState,
    pushModerationJournal,
  };
}
