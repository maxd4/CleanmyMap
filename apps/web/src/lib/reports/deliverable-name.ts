export type DeliverableExtension = "csv" | "json" | "md" | "pdf" | "xlsx";

function toAsciiLower(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeDeliverableRubrique(value: string): string {
  const normalized = toAsciiLower(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return normalized || "export";
}

export function formatDeliverableDate(value: Date = new Date()): string {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const year = String(value.getUTCFullYear());
  return `${day}-${month}-${year}`;
}

export function buildDeliverableBaseName(params: {
  rubrique: string;
  date?: Date;
}): string {
  const rubrique = normalizeDeliverableRubrique(params.rubrique);
  const date = formatDeliverableDate(params.date);
  return `${rubrique}_cmm_${date}`;
}

export function buildDeliverableFilename(params: {
  rubrique: string;
  extension: DeliverableExtension;
  date?: Date;
}): string {
  return `${buildDeliverableBaseName({ rubrique: params.rubrique, date: params.date })}.${params.extension}`;
}
