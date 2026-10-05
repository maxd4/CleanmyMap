import {
  buildDonutChartOps,
  escapePdfText,
  parseDonutChartBlock,
  type PdfContentEntry,
} from "./simple-pdf-primitives";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 40;
const MARGIN_TOP = 40;
const LINE_HEIGHT = 14;
const BANNER_LINE_HEIGHT = 20;
const MAX_LINES_PER_PAGE = Math.max(20, Math.floor((PAGE_HEIGHT - MARGIN_TOP * 2) / LINE_HEIGHT));

type PageState = {
  pages: Array<PdfContentEntry[]>;
  currentPage: PdfContentEntry[];
  currentSlots: number;
  pendingChartLines: string[] | null;
};

function flushPage(state: PageState): void {
  if (state.currentPage.length === 0) return;
  state.pages.push(state.currentPage);
  state.currentPage = [];
  state.currentSlots = 0;
}

function commitChartBlock(state: PageState): void {
  if (!state.pendingChartLines) return;
  const chart = parseDonutChartBlock(state.pendingChartLines);
  state.pendingChartLines = null;
  if (!chart) return;
  const slots = Math.max(16, 6 + chart.items.length * 2);
  if (state.currentSlots + slots > MAX_LINES_PER_PAGE) flushPage(state);
  state.currentPage.push(chart);
  state.currentSlots += slots;
}

function appendTextEntry(state: PageState, line: string): void {
  const banner = line.startsWith("!! ");
  const text = banner ? line.slice(3) : line;
  const slots = banner ? 2 : 1;
  if (state.currentSlots + slots > MAX_LINES_PER_PAGE) flushPage(state);
  state.currentPage.push({ kind: "text", text, banner });
  state.currentSlots += slots;
}

function collectPdfPages(lines: string[]): Array<PdfContentEntry[]> {
  const state: PageState = {
    pages: [],
    currentPage: [],
    currentSlots: 0,
    pendingChartLines: null,
  };

  for (const line of lines) {
    if (line === "\f") {
      commitChartBlock(state);
      flushPage(state);
      continue;
    }
    if (line.startsWith("@@CMBR_START|")) {
      commitChartBlock(state);
      state.pendingChartLines = [line];
      continue;
    }
    if (state.pendingChartLines) {
      state.pendingChartLines.push(line);
      if (line.startsWith("@@CMBR_END")) commitChartBlock(state);
      continue;
    }
    appendTextEntry(state, line);
  }

  commitChartBlock(state);
  flushPage(state);
  return state.pages.length > 0
    ? state.pages
    : [[{ kind: "text", text: "Rapport CleanMyMap - Donnees indisponibles", banner: false }]];
}

function renderTextEntry(
  entry: Extract<PdfContentEntry, { kind: "text" }>,
  y: number,
): { ops: string[]; nextY: number } {
  if (entry.banner) {
    const bannerTop = y + 4;
    const bannerBottom = y - BANNER_LINE_HEIGHT + 2;
    const bannerHeight = bannerTop - bannerBottom;
    return {
      ops: [
        "q",
        "0.82 0.16 0.18 rg",
        `${MARGIN_X - 4} ${bannerBottom} ${PAGE_WIDTH - MARGIN_X * 2 + 8} ${bannerHeight} re f`,
        "Q",
        "BT",
        "/F1 11 Tf",
        "1 1 1 rg",
        `1 0 0 1 ${MARGIN_X} ${y} Tm (${escapePdfText(entry.text)}) Tj`,
        "ET",
      ],
      nextY: y - BANNER_LINE_HEIGHT,
    };
  }
  return {
    ops: [
      "BT",
      "/F1 11 Tf",
      "0 0 0 rg",
      `1 0 0 1 ${MARGIN_X} ${y} Tm (${escapePdfText(entry.text)}) Tj`,
      "ET",
    ],
    nextY: y - LINE_HEIGHT,
  };
}

function renderPdfPageContent(entries: PdfContentEntry[]): string {
  let y = PAGE_HEIGHT - MARGIN_TOP;
  const ops: string[] = [];
  for (const entry of entries) {
    if (entry.kind === "donut") {
      const chart = buildDonutChartOps(entry, PAGE_WIDTH, MARGIN_X, y);
      ops.push(...chart.ops);
      y -= chart.height;
      continue;
    }
    const rendered = renderTextEntry(entry, y);
    ops.push(...rendered.ops);
    y = rendered.nextY;
  }
  return ops.join("\n");
}

function buildPdfObjectMap(pages: Array<PdfContentEntry[]>): {
  objectById: Map<number, string>;
  fontObjectId: number;
} {
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  const contentObjectIds = pageObjectIds.map((id) => id + 1);
  const fontObjectId = 3 + pages.length * 2;
  const objectById = new Map<number, string>();

  objectById.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objectById.set(
    2,
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`,
  );
  pages.forEach((entries, index) => {
    const pageObjectId = pageObjectIds[index]!;
    const contentObjectId = contentObjectIds[index]!;
    objectById.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    const streamContent = renderPdfPageContent(entries);
    objectById.set(
      contentObjectId,
      `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`,
    );
  });
  objectById.set(fontObjectId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  return { objectById, fontObjectId };
}

function serializePdfObjects(objectById: Map<number, string>, fontObjectId: number): string {
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
  return `${pdf}trailer\n<< /Size ${fontObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
}

export function buildSimplePdf(lines: string[]): Uint8Array {
  const pages = collectPdfPages(lines);
  const { objectById, fontObjectId } = buildPdfObjectMap(pages);
  return new TextEncoder().encode(serializePdfObjects(objectById, fontObjectId));
}
