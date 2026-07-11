import type { FormState } from "@/components/actions/action-declaration-form.model";
import type { ActionDeclarationExportBundleId, ActionDeclarationExportPresetId } from "@/lib/actions/export-form-media";

export type ActionDeclarationExportHistoryTargetId = "pdf" | ActionDeclarationExportPresetId;

export type ActionDeclarationExportHistoryEntry = {
  id: string;
  generatedAt: string;
  filename: string;
  label: string;
  sourceLabel: string;
  targetId: ActionDeclarationExportHistoryTargetId;
  actorName: string;
  form: FormState;
  bundleId?: ActionDeclarationExportBundleId;
};

const STORAGE_KEY = "cleanmymap.action_declaration_export_history.v1";
const MAX_HISTORY = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isActionDeclarationExportTargetId(
  value: unknown,
): value is ActionDeclarationExportHistoryTargetId {
  return value === "pdf" || value === "png" || value === "story-instagram" || value === "publication-facebook" || value === "publication-x";
}

function hasValidHistoryEntryBase(value: Record<string, unknown>): boolean {
  return (
    typeof value["id"] === "string" &&
    typeof value["generatedAt"] === "string" &&
    typeof value["filename"] === "string" &&
    typeof value["label"] === "string" &&
    typeof value["sourceLabel"] === "string" &&
    typeof value["actorName"] === "string" &&
    isRecord(value["form"])
  );
}

function isHistoryEntry(value: unknown): value is ActionDeclarationExportHistoryEntry {
  if (!isRecord(value)) {
    return false;
  }

  return hasValidHistoryEntryBase(value) && isActionDeclarationExportTargetId(value["targetId"]);
}

export function readActionDeclarationExportHistory(): ActionDeclarationExportHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isHistoryEntry).slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function writeActionDeclarationExportHistory(entries: ActionDeclarationExportHistoryEntry[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
    return true;
  } catch {
    return false;
  }
}

export function createActionDeclarationExportHistoryEntry(params: {
  filename: string;
  label: string;
  sourceLabel: string;
  targetId: ActionDeclarationExportHistoryTargetId;
  actorName: string;
  form: FormState;
  bundleId?: ActionDeclarationExportBundleId;
}): ActionDeclarationExportHistoryEntry {
  return {
    id: `CMM-EXP-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    filename: params.filename,
    label: params.label,
    sourceLabel: params.sourceLabel,
    targetId: params.targetId,
    actorName: params.actorName,
    form: params.form,
    bundleId: params.bundleId,
  };
}

export function mergeActionDeclarationExportHistory(
  previous: ActionDeclarationExportHistoryEntry[],
  nextEntries: ActionDeclarationExportHistoryEntry[],
): ActionDeclarationExportHistoryEntry[] {
  const seen = new Set<string>();
  const merged: ActionDeclarationExportHistoryEntry[] = [];

  for (const entry of [...nextEntries, ...previous]) {
    if (seen.has(entry.id)) {
      continue;
    }

    seen.add(entry.id);
    merged.push(entry);
    if (merged.length >= MAX_HISTORY) {
      break;
    }
  }

  return merged;
}
