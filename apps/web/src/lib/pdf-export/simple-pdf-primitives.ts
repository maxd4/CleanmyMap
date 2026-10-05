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

export type PdfDonutChartBlock = {
  kind: "donut";
  modeLabel: string;
  title: string;
  previousSnapshotMonth: string | null;
  totalValue: number;
  previousTotalValue: number;
  items: PdfDonutChartItem[];
};

export type PdfContentEntry = PdfTextEntry | PdfDonutChartBlock;

export function escapePdfText(value: string): string {
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

function parseChartNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseChartMetadata(metaLine: string | undefined): {
  previousSnapshotMonth: string | null;
  totalValue: number;
  previousTotalValue: number;
} {
  if (!metaLine?.startsWith("@@CMBR_META|")) {
    return { previousSnapshotMonth: null, totalValue: 0, previousTotalValue: 0 };
  }
  const [, month = "", total = "0", previousTotal = "0"] = metaLine.split("|");
  return {
    previousSnapshotMonth: month.trim() || null,
    totalValue: parseChartNumber(total),
    previousTotalValue: parseChartNumber(previousTotal),
  };
}

function parseDonutItem(line: string): PdfDonutChartItem | null {
  if (!line.startsWith("@@CMBR_ITEM|")) return null;
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
  return {
    id: `${indexLabel}:${id}`,
    label,
    value: parseChartNumber(value),
    previousValue: parseChartNumber(previousValue),
    deltaValue: parseChartNumber(deltaValue),
    deltaPercent: deltaPercent === "na" ? null : parseChartNumber(deltaPercent),
    sharePercent: parseChartNumber(sharePercent),
    count: parseChartNumber(count),
  };
}

function resolveChartTotal(total: number, items: PdfDonutChartItem[], previous = false): number {
  if (total > 0 || items.length === 0) return total;
  return items.reduce((sum, item) => sum + (previous ? item.previousValue : item.value), 0);
}

export function parseDonutChartBlock(lines: string[]): PdfDonutChartBlock | null {
  const [startLine, metaLine, ...rest] = lines;
  if (!startLine?.startsWith("@@CMBR_START|")) return null;
  const [, modeLabel = "Stockage", title = "Camembert mensuel"] = startLine.split("|");
  const metadata = parseChartMetadata(metaLine);
  const items = rest.map(parseDonutItem).filter((item): item is PdfDonutChartItem => item !== null);
  return {
    kind: "donut",
    modeLabel,
    title,
    previousSnapshotMonth: metadata.previousSnapshotMonth,
    totalValue: resolveChartTotal(metadata.totalValue, items),
    previousTotalValue: resolveChartTotal(metadata.previousTotalValue, items, true),
    items,
  };
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

function chartColors(modeLabel: string): string[] {
  return modeLabel.toLowerCase().includes("pression")
    ? ["#60a5fa", "#22c55e", "#f97316", "#f43f5e", "#c084fc", "#14b8a6", "#eab308"]
    : ["#38bdf8", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#f97316", "#22c55e"];
}

function buildChartHeaderOps(block: PdfDonutChartBlock, marginX: number, titleY: number): string[] {
  return [
    "BT",
    "/F1 13 Tf",
    "0 0 0 rg",
    `1 0 0 1 ${marginX} ${titleY} Tm (${escapePdfText("Camembert mensuel")}) Tj`,
    "ET",
    "BT",
    "/F1 9 Tf",
    "0 0 0 rg",
    `1 0 0 1 ${marginX} ${titleY - 14} Tm (${escapePdfText(block.title)}) Tj`,
    "ET",
  ];
}

function buildChartSlicesOps(
  block: PdfDonutChartBlock,
  chartTotal: number,
  colors: string[],
  centerX: number,
  centerY: number,
): string[] {
  const ops: string[] = [];
  let angle = -Math.PI / 2;
  block.items.forEach((item, index) => {
    const sweep = Math.max(0.02, (Math.max(0, item.value) / chartTotal) * Math.PI * 2);
    const nextAngle = angle + sweep;
    const [red, green, blue] = hexToRgb(colors[index % colors.length] ?? colors[0] ?? "#38bdf8");
    ops.push(
      "q",
      `${(red / 255).toFixed(3)} ${(green / 255).toFixed(3)} ${(blue / 255).toFixed(3)} rg`,
      buildWedgePath(centerX, centerY, 58, angle, nextAngle),
      "Q",
    );
    angle = nextAngle;
  });
  ops.push("q", "1 1 1 rg", buildCirclePath(centerX, centerY, 30), "Q");
  return ops;
}

function buildChartCenterOps(block: PdfDonutChartBlock, chartTotal: number, centerX: number, centerY: number): string[] {
  const centerTotalText = block.modeLabel.toLowerCase().includes("pression")
    ? `${Math.round(chartTotal)} pts`
    : formatPdfBytes(chartTotal);
  return [
    "BT",
    "/F1 10 Tf",
    "0 0 0 rg",
    `1 0 0 1 ${centerX - 27} ${centerY + 6} Tm (${escapePdfText(block.modeLabel)}) Tj`,
    "ET",
    "BT",
    "/F1 13 Tf",
    "0 0 0 rg",
    `1 0 0 1 ${centerX - 30} ${centerY - 10} Tm (${escapePdfText(centerTotalText)}) Tj`,
    "ET",
  ];
}

function buildChartLegendOps(
  block: PdfDonutChartBlock,
  colors: string[],
  pageWidth: number,
  marginX: number,
  startY: number,
): { ops: string[]; rowCount: number } {
  const legendX = marginX + 220;
  const rows = block.items.slice(0, 9);
  const ops: string[] = [];
  rows.forEach((item, index) => {
    const rowY = startY - 34 - index * 16;
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
    const noteY = startY - 34 - rows.length * 16 - 8;
    ops.push("BT", "/F1 8 Tf", "0 0 0 rg", `1 0 0 1 ${legendX} ${noteY} Tm (${escapePdfText(`Comparé à ${block.previousSnapshotMonth}`)}) Tj`, "ET");
  }
  return { ops, rowCount: rows.length };
}

export function buildDonutChartOps(
  block: PdfDonutChartBlock,
  pageWidth: number,
  marginX: number,
  startY: number,
): { ops: string[]; height: number } {
  const centerX = marginX + 102;
  const centerY = startY - 86;
  const chartTotal = block.totalValue > 0 ? block.totalValue : block.items.reduce((sum, item) => sum + item.value, 0) || 1;
  const colors = chartColors(block.modeLabel);
  const legend = buildChartLegendOps(block, colors, pageWidth, marginX, startY);
  const ops = [
    ...buildChartHeaderOps(block, marginX, startY),
    ...buildChartSlicesOps(block, chartTotal, colors, centerX, centerY),
    ...buildChartCenterOps(block, chartTotal, centerX, centerY),
    ...legend.ops,
  ];
  return { ops, height: Math.max(180, 110 + Math.min(legend.rowCount, 9) * 16) };
}
