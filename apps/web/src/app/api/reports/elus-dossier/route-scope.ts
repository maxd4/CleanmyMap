import { createHash } from "node:crypto";
import { buildDateFloor } from "@/lib/reports/csv";
import { parsePositiveInteger } from "@/lib/http/query-params";

export type ExportFormat = "json" | "md" | "pdf";
export type ScopeKind = "global" | "account" | "association" | "arrondissement";
export type ScopeSelection = {
  kind: ScopeKind;
  value: string | null;
};

export const ELUS_DOSSIER_BUCKET = "reports";
export const ELUS_DOSSIER_RESPONSE_CACHE_CONTROL =
  "private, max-age=300, stale-while-revalidate=86400";
export const ELUS_DOSSIER_PDF_REDIRECT_CACHE_CONTROL =
  "private, max-age=300, stale-while-revalidate=86400";

export function parseExportFormat(raw: string | null): ExportFormat {
  if (raw === "md" || raw === "pdf") {
    return raw;
  }
  return "json";
}

export function resolveScopeSelection(params: {
  scopeKind: string | null;
  scopeValue: string | null;
  legacyAssociation: string | null;
}): ScopeSelection {
  return {
    kind:
      params.scopeKind === "account" ||
      params.scopeKind === "association" ||
      params.scopeKind === "arrondissement"
        ? params.scopeKind
        : params.legacyAssociation
          ? "association"
          : "global",
    value:
      params.scopeValue ??
      (params.scopeKind === "association" ? params.legacyAssociation : null) ??
      params.legacyAssociation,
  };
}

export function buildElusDossierPdfStoragePath(params: {
  generatedAt: string;
  days: number;
  limit: number;
  scopeKind: ScopeKind;
  scopeValue: string | null;
}): string {
  const cacheKey = createHash("sha1")
    .update(
      JSON.stringify({
        generatedDate: params.generatedAt.slice(0, 10),
        days: params.days,
        limit: params.limit,
        scopeKind: params.scopeKind,
        scopeValue: params.scopeValue,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  return `elus-dossier/${params.generatedAt.slice(0, 10)}/${cacheKey}.pdf`;
}

export function parseElusDossierRequest(url: URL) {
  const days = parsePositiveInteger(url.searchParams.get("days"), 7, 365, 90);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 50, 2500, 1200);
  const format = parseExportFormat(url.searchParams.get("format"));
  const scope = resolveScopeSelection({
    scopeKind: url.searchParams.get("scopeKind"),
    scopeValue: url.searchParams.get("scopeValue"),
    legacyAssociation: url.searchParams.get("association"),
  });
  const cacheDay = new Date().toISOString().slice(0, 10);

  return {
    days,
    limit,
    format,
    floorDate: buildDateFloor(days * 2),
    scope,
    cachedPdfPath: buildElusDossierPdfStoragePath({
      generatedAt: cacheDay,
      days,
      limit,
      scopeKind: scope.kind,
      scopeValue: scope.value,
    }),
  };
}
