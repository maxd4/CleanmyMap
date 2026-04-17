import type { AdminOperationAuditItem, ImportDryRunSummary } from "./types";
import {
  parseAdminApiError,
  parseImportPayload,
  parseJsonSafely,
} from "./helpers";

export async function downloadFromUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ filename: string | null; blob: Blob }> {
  const response = await fetchImpl(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Echec du telechargement.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const matched = disposition?.match(/filename=\"(.+)\"/);
  const filename = matched?.[1] ?? null;
  return { filename, blob };
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

export async function fetchAdminOperationAudit(
  fetchImpl: typeof fetch = fetch,
  limit = 25,
): Promise<{ items?: AdminOperationAuditItem[] }> {
  const response = await fetchImpl(`/api/admin/operations?limit=${limit}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(parseAdminApiError(body, "Audit indisponible."));
  }
  return body as { items?: AdminOperationAuditItem[] };
}

export async function runImportDryRun(params: {
  importPayload: string;
  fetchImpl?: typeof fetch;
}): Promise<ImportDryRunSummary> {
  const normalized = parseImportPayload(params.importPayload);
  const fetchImpl = params.fetchImpl ?? fetch;

  const response = await fetchImpl("/api/actions/import?dryRun=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized),
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(parseAdminApiError(body, "Dry-run invalide."));
  }
  return body as ImportDryRunSummary;
}

export async function runImportConfirm(params: {
  importPayload: string;
  dryRunProof?: string;
  confirmPhrase: string;
  fetchImpl?: typeof fetch;
}): Promise<{ count?: number; operationId?: string }> {
  const normalized = parseImportPayload(params.importPayload);
  const fetchImpl = params.fetchImpl ?? fetch;

  const response = await fetchImpl("/api/actions/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(normalized as Record<string, unknown>),
      dryRunProof: params.dryRunProof,
      confirmPhrase: params.confirmPhrase,
    }),
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(parseAdminApiError(body, "Import impossible."));
  }
  return body as { count?: number; operationId?: string };
}
