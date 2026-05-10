import { normalizeDeliverableRubrique } from "@/lib/reports/deliverable-name";

export type PdfReportColumn = {
  key: string;
  label: string;
};

export type PdfReportStat = {
  label: string;
  value: string | number;
  detail?: string;
};

export type PdfReportData = {
  title?: string;
  summary?: string[];
  stats?: PdfReportStat[];
  rows?: Record<string, unknown>[];
  columns?: PdfReportColumn[];
  generatedAt?: string;
};

export type PdfReportPayload = {
  title: string;
  rubrique: string;
  periode: string;
  organizationType: string;
  organizationName?: string;
  data: PdfReportData;
};

function normalizePeriodForFilename(value: string): string {
  return normalizeDeliverableRubrique(value || "periode");
}

export function buildPdfReportFilename(params: {
  rubrique: string;
  periode: string;
}): string {
  return `rapport_${normalizeDeliverableRubrique(params.rubrique)}_${normalizePeriodForFilename(params.periode)}.pdf`;
}

export function hasPdfReportData(data: PdfReportData | null | undefined): boolean {
  if (!data) return false;
  if (data.summary?.some((line) => line.trim().length > 0)) return true;
  if (data.stats?.length) return true;
  if (data.rows?.length) return true;
  return false;
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

export function buildPdfReportLines(payload: PdfReportPayload): string[] {
  const generatedAt = payload.data.generatedAt ?? new Date().toISOString();
  const generatedLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(generatedAt));
  const columns =
    payload.data.columns ??
    Object.keys(payload.data.rows?.[0] ?? {}).map((key) => ({ key, label: key }));

  const lines: string[] = [
    payload.title,
    "",
    `Rubrique: ${payload.rubrique}`,
    `Periode: ${payload.periode}`,
    `Type d'organisation: ${payload.organizationType}`,
  ];

  if (payload.organizationName?.trim()) {
    lines.push(`Organisation: ${payload.organizationName.trim()}`);
  }

  lines.push(`Genere le: ${generatedLabel}`, "");

  if (payload.data.summary?.length) {
    lines.push("Resume");
    for (const item of payload.data.summary) {
      if (item.trim()) lines.push(`- ${item.trim()}`);
    }
    lines.push("");
  }

  if (payload.data.stats?.length) {
    lines.push("Indicateurs");
    for (const stat of payload.data.stats) {
      const detail = stat.detail ? ` (${stat.detail})` : "";
      lines.push(`- ${stat.label}: ${formatValue(stat.value)}${detail}`);
    }
    lines.push("");
  }

  if (payload.data.rows?.length) {
    lines.push("Donnees visibles");
    lines.push(columns.map((column) => column.label).join(" | "));
    for (const row of payload.data.rows.slice(0, 80)) {
      lines.push(columns.map((column) => formatValue(row[column.key])).join(" | "));
    }
    if (payload.data.rows.length > 80) {
      lines.push(`... ${payload.data.rows.length - 80} ligne(s) supplementaire(s) non affichee(s).`);
    }
  }

  return lines.filter((line) => line.length <= 180).map((line) => line.slice(0, 180));
}

function escapePdfText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function buildSimplePdf(lines: string[]): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 40;
  const marginTop = 40;
  const lineHeight = 14;
  const usableHeight = pageHeight - marginTop * 2;
  const maxLinesPerPage = Math.max(20, Math.floor(usableHeight / lineHeight));
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }

  if (pages.length === 0) {
    pages.push(["Rapport CleanMyMap - Donnees indisponibles"]);
  }

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  const baseObjectId = 3;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const pageObjectId = baseObjectId + pageIndex * 2;
    pageObjectIds.push(pageObjectId);
    contentObjectIds.push(pageObjectId + 1);
  }

  const fontObjectId = baseObjectId + pages.length * 2;
  const objectById = new Map<number, string>();

  objectById.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objectById.set(
    2,
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`,
  );

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const pageObjectId = pageObjectIds[pageIndex]!;
    const contentObjectId = contentObjectIds[pageIndex]!;
    objectById.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );

    let y = pageHeight - marginTop;
    const textOps: string[] = ["BT", "/F1 11 Tf"];
    for (const rawLine of pages[pageIndex] ?? []) {
      textOps.push(`1 0 0 1 ${marginX} ${y} Tm (${escapePdfText(rawLine)}) Tj`);
      y -= lineHeight;
    }
    textOps.push("ET");

    const streamContent = textOps.join("\n");
    objectById.set(
      contentObjectId,
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`,
    );
  }

  objectById.set(fontObjectId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  let currentOffset = pdf.length;

  for (let objectId = 1; objectId <= fontObjectId; objectId += 1) {
    const body = objectById.get(objectId);
    if (!body) throw new Error(`PDF object ${objectId} missing`);
    const object = `${objectId} 0 obj\n${body}\nendobj\n`;
    offsets[objectId] = currentOffset;
    pdf += object;
    currentOffset += object.length;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${fontObjectId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let objectId = 1; objectId <= fontObjectId; objectId += 1) {
    pdf += `${String(offsets[objectId] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${fontObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
