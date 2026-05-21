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
    payload.data.columns ?? Object.keys(payload.data.rows?.[0] ?? {}).map((key) => ({ key, label: key }));

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

function formatPdfNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

function formatPdfBytes(bytes: number): string {
  const kilobyte = 1024;
  const megabyte = kilobyte * 1024;
  const gigabyte = megabyte * 1024;

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes >= gigabyte) {
    return `${formatPdfNumber(bytes / gigabyte)} GB`;
  }

  if (bytes >= megabyte) {
    return `${formatPdfNumber(bytes / megabyte)} MB`;
  }

  if (bytes >= kilobyte) {
    return `${formatPdfNumber(bytes / kilobyte)} KB`;
  }

  return `${Math.round(bytes)} B`;
}

function buildCirclePath(
  centerX: number,
  centerY: number,
  radius: number,
  segments = 24,
): string {
  const points: Array<[number, number]> = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments;
    points.push([
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
    ]);
  }

  const [firstX, firstY] = points[0] ?? [centerX, centerY];
  const path = [`${firstX.toFixed(2)} ${firstY.toFixed(2)} m`];
  for (let index = 1; index < points.length; index += 1) {
    const [x, y] = points[index] ?? [centerX, centerY];
    path.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
  }
  path.push("h", "f");
  return path.join("\n");
}

function buildWedgePath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  const steps = Math.max(4, Math.ceil(Math.abs(sweep) / (Math.PI / 18)));
  const points: Array<[number, number]> = [];

  for (let index = 0; index <= steps; index += 1) {
    const angle = startAngle + (sweep * index) / steps;
    points.push([
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius,
    ]);
  }

  const path = [`${centerX.toFixed(2)} ${centerY.toFixed(2)} m`];
  for (const [x, y] of points) {
    path.push(`${x.toFixed(2)} ${y.toFixed(2)} l`);
  }
  path.push("h", "f");
  return path.join("\n");
}

type PdfTextEntry = {
  kind: "text";
  text: string;
  banner: boolean;
};

type PdfDonutChartItem = {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  deltaValue: number;
  deltaPercent: number | null;
  sharePercent: number;
  count: number;
};

type PdfDonutChartBlock = {
  kind: "donut";
  modeLabel: string;
  title: string;
  previousSnapshotMonth: string | null;
  totalValue: number;
  previousTotalValue: number;
  items: PdfDonutChartItem[];
};

type PdfContentEntry = PdfTextEntry | PdfDonutChartBlock;

function parseChartNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDonutChartBlock(lines: string[]): PdfDonutChartBlock | null {
  if (lines.length === 0) {
    return null;
  }

  const [startLine, metaLine, ...rest] = lines;
  if (!startLine?.startsWith("@@CMBR_START|")) {
    return null;
  }

  const [, modeLabel = "Stockage", title = "Camembert mensuel"] = startLine.split("|");
  let previousSnapshotMonth: string | null = null;
  let totalValue = 0;
  let previousTotalValue = 0;
  const items: PdfDonutChartItem[] = [];

  if (metaLine?.startsWith("@@CMBR_META|")) {
    const [, metaPreviousMonth = "", metaTotal = "0", metaPreviousTotal = "0"] = metaLine.split("|");
    previousSnapshotMonth = metaPreviousMonth.trim().length > 0 ? metaPreviousMonth : null;
    totalValue = parseChartNumber(metaTotal);
    previousTotalValue = parseChartNumber(metaPreviousTotal);
  }

  for (const line of rest) {
    if (line.startsWith("@@CMBR_ITEM|")) {
      const [
        ,
        indexLabel = "0",
        id = "",
        label = "",
        value = "0",
        sharePercent = "0",
        previousValue = "0",
        deltaValue = "0",
        deltaPercent = "na",
        count = "0",
      ] = line.split("|");

      items.push({
        id: `${indexLabel}:${id}`,
        label,
        value: parseChartNumber(value),
        previousValue: parseChartNumber(previousValue),
        deltaValue: parseChartNumber(deltaValue),
        deltaPercent: deltaPercent === "na" ? null : parseChartNumber(deltaPercent),
        sharePercent: parseChartNumber(sharePercent),
        count: parseChartNumber(count),
      });
    }
  }

  if (items.length > 0 && totalValue <= 0) {
    totalValue = items.reduce((sum, item) => sum + item.value, 0);
  }

  if (items.length > 0 && previousTotalValue <= 0) {
    previousTotalValue = items.reduce((sum, item) => sum + item.previousValue, 0);
  }

  return {
    kind: "donut",
    modeLabel,
    title,
    previousSnapshotMonth,
    totalValue,
    previousTotalValue,
    items,
  };
}

function buildDonutChartOps(
  block: PdfDonutChartBlock,
  pageWidth: number,
  marginX: number,
  startY: number,
): { ops: string[]; height: number } {
  const chartCenterX = marginX + 102;
  const chartCenterY = startY - 86;
  const outerRadius = 58;
  const innerRadius = 30;
  const legendX = marginX + 220;
  const legendBaseY = startY - 34;
  const titleY = startY;
  const subtitleY = startY - 14;
  const chartTotal = block.totalValue > 0 ? block.totalValue : block.items.reduce((sum, item) => sum + item.value, 0) || 1;
  const colors = block.modeLabel.toLowerCase().includes("pression")
    ? ["#60a5fa", "#22c55e", "#f97316", "#f43f5e", "#c084fc", "#14b8a6", "#eab308"]
    : ["#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#f97316", "#22c55e"];

  const ops: string[] = [
    "BT",
    "/F1 13 Tf",
    "0 0 0 rg",
    `1 0 0 1 ${marginX} ${titleY} Tm (${escapePdfText("Camembert mensuel")}) Tj`,
    "ET",
    "BT",
    "/F1 9 Tf",
    "0 0 0 rg",
    `1 0 0 1 ${marginX} ${subtitleY} Tm (${escapePdfText(block.title)}) Tj`,
    "ET",
  ];

  let angle = -Math.PI / 2;
  block.items.forEach((item, index) => {
    const slice = Math.max(0, item.value) / chartTotal;
    const sweep = Math.max(0.02, slice * Math.PI * 2);
    const nextAngle = angle + sweep;
    const [red, green, blue] = hexToRgb(colors[index % colors.length] ?? colors[0] ?? "#38bdf8");
    ops.push(
      "q",
      `${(red / 255).toFixed(3)} ${(green / 255).toFixed(3)} ${(blue / 255).toFixed(3)} rg`,
      buildWedgePath(chartCenterX, chartCenterY, outerRadius, angle, nextAngle),
      "Q",
    );
    angle = nextAngle;
  });

  ops.push(
    "q",
    "1 1 1 rg",
    buildCirclePath(chartCenterX, chartCenterY, innerRadius),
    "Q",
  );

  const centerTotalText = block.modeLabel.toLowerCase().includes("pression")
    ? `${Math.round(chartTotal)} pts`
    : formatPdfBytes(chartTotal);

  ops.push(
    "BT",
    "/F1 10 Tf",
    "0 0 0 rg",
    `1 0 0 1 ${chartCenterX - 27} ${chartCenterY + 6} Tm (${escapePdfText(block.modeLabel)}) Tj`,
    "ET",
    "BT",
    "/F1 13 Tf",
    "0 0 0 rg",
    `1 0 0 1 ${chartCenterX - 30} ${chartCenterY - 10} Tm (${escapePdfText(centerTotalText)}) Tj`,
    "ET",
  );

  const legendRows = block.items.slice(0, 9);
  legendRows.forEach((item, index) => {
    const rowY = legendBaseY - index * 16;
    const [red, green, blue] = hexToRgb(colors[index % colors.length] ?? colors[0] ?? "#38bdf8");
    const rowValue = block.modeLabel.toLowerCase().includes("pression")
      ? `${Math.round(item.value)} pts`
      : formatPdfBytes(item.value);

    ops.push(
      "q",
      `${(red / 255).toFixed(3)} ${(green / 255).toFixed(3)} ${(blue / 255).toFixed(3)} rg`,
      `${legendX} ${rowY - 4} 7 7 re f`,
      "Q",
      "BT",
      "/F1 8 Tf",
      "0 0 0 rg",
      `1 0 0 1 ${legendX + 12} ${rowY} Tm (${escapePdfText(item.label)}) Tj`,
      "ET",
      "BT",
      "/F1 8 Tf",
      "0 0 0 rg",
      `1 0 0 1 ${pageWidth - marginX - 112} ${rowY} Tm (${escapePdfText(`${rowValue} · ${formatPdfNumber(item.sharePercent, 1)}%`)}) Tj`,
      "ET",
    );
  });

  if (block.previousSnapshotMonth) {
    const noteY = legendBaseY - legendRows.length * 16 - 8;
    ops.push(
      "BT",
      "/F1 8 Tf",
      "0 0 0 rg",
      `1 0 0 1 ${legendX} ${noteY} Tm (${escapePdfText(`Comparé à ${block.previousSnapshotMonth}`)}) Tj`,
      "ET",
    );
  }

  const height = Math.max(180, 110 + Math.min(legendRows.length, 9) * 16);
  return { ops, height };
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace("#", "");
  if (normalized.length !== 6) {
    return [56, 189, 248];
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return [56, 189, 248];
  }

  return [red, green, blue];
}

export function buildSimplePdf(lines: string[]): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 40;
  const marginTop = 40;
  const lineHeight = 14;
  const bannerLineHeight = 20;
  const bannerPrefix = "!! ";
  const usableHeight = pageHeight - marginTop * 2;
  const maxLinesPerPage = Math.max(20, Math.floor(usableHeight / lineHeight));
  const pages: Array<PdfContentEntry[]> = [];

  let currentPage: PdfContentEntry[] = [];
  let currentSlots = 0;
  let pendingChartLines: string[] | null = null;

  const flushPage = () => {
    if (currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentSlots = 0;
    }
  };

  const commitChartBlock = () => {
    if (!pendingChartLines) {
      return;
    }

    const chart = parseDonutChartBlock(pendingChartLines);
    pendingChartLines = null;
    if (!chart) {
      return;
    }

    const slots = Math.max(16, 6 + chart.items.length * 2);
    if (currentSlots + slots > maxLinesPerPage && currentPage.length > 0) {
      flushPage();
    }

    currentPage.push(chart);
    currentSlots += slots;
  };

  for (const line of lines) {
    if (line === "\f") {
      commitChartBlock();
      flushPage();
      continue;
    }

    if (line.startsWith("@@CMBR_START|")) {
      commitChartBlock();
      pendingChartLines = [line];
      continue;
    }

    if (pendingChartLines) {
      pendingChartLines.push(line);
      if (line.startsWith("@@CMBR_END")) {
        commitChartBlock();
      }
      continue;
    }

    const banner = line.startsWith(bannerPrefix);
    const text = banner ? line.slice(bannerPrefix.length) : line;
    const slots = banner ? 2 : 1;
    if (currentSlots + slots > maxLinesPerPage && currentPage.length > 0) {
      flushPage();
    }
    currentPage.push({ kind: "text", text, banner });
    currentSlots += slots;
  }

  commitChartBlock();

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  if (pages.length === 0) {
    pages.push([{ kind: "text", text: "Rapport CleanMyMap - Donnees indisponibles", banner: false }]);
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
    const textOps: string[] = [];

    for (const entry of pages[pageIndex] ?? []) {
      if (entry.kind === "donut") {
        const { ops, height } = buildDonutChartOps(entry, pageWidth, marginX, y);
        textOps.push(...ops);
        y -= height;
        continue;
      }

      if (entry.banner) {
        const bannerTop = y + 4;
        const bannerBottom = y - bannerLineHeight + 2;
        const bannerHeight = bannerTop - bannerBottom;
        textOps.push(
          "q",
          "0.82 0.16 0.18 rg",
          `${marginX - 4} ${bannerBottom} ${pageWidth - marginX * 2 + 8} ${bannerHeight} re f`,
          "Q",
          "BT",
          "/F1 11 Tf",
          "1 1 1 rg",
          `1 0 0 1 ${marginX} ${y} Tm (${escapePdfText(entry.text)}) Tj`,
          "ET",
        );
        y -= bannerLineHeight;
        continue;
      }

      textOps.push(
        "BT",
        "/F1 11 Tf",
        "0 0 0 rg",
        `1 0 0 1 ${marginX} ${y} Tm (${escapePdfText(entry.text)}) Tj`,
        "ET",
      );
      y -= lineHeight;
    }

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
