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
const TEXT_FONT_SIZE = 11;
const TEXT_MAX_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

/**
 * Standard Helvetica widths from the PDF Type 1 font metrics, in 1/1000 em.
 * Keeping these metrics beside the serializer avoids character-count guesses
 * while retaining the existing lightweight PDF writer.
 */
const HELVETICA_WIDTHS = new Map<number, number>();

function registerHelveticaWidth(characters: string, width: number): void {
  for (const character of characters) {
    HELVETICA_WIDTHS.set(character.codePointAt(0) ?? 0, width);
  }
}

registerHelveticaWidth(" !", 278);
registerHelveticaWidth('"', 355);
registerHelveticaWidth("#$", 556);
registerHelveticaWidth("%", 889);
registerHelveticaWidth("&", 667);
registerHelveticaWidth("'", 191);
registerHelveticaWidth("()", 333);
registerHelveticaWidth("*", 389);
registerHelveticaWidth("+", 584);
registerHelveticaWidth(",", 278);
registerHelveticaWidth("-", 333);
registerHelveticaWidth(".", 278);
registerHelveticaWidth("/", 278);
registerHelveticaWidth("0123456789", 556);
registerHelveticaWidth(":;", 278);
registerHelveticaWidth("<=>", 584);
registerHelveticaWidth("?", 556);
registerHelveticaWidth("@", 1015);
registerHelveticaWidth("[]", 278);
registerHelveticaWidth("\\", 278);
registerHelveticaWidth("^", 469);
registerHelveticaWidth("_", 556);
registerHelveticaWidth("`", 333);
registerHelveticaWidth("{}", 334);
registerHelveticaWidth("|", 280);
registerHelveticaWidth("~", 584);
registerHelveticaWidth("ABHNR", 667);
registerHelveticaWidth("C", 722);
registerHelveticaWidth("D", 722);
registerHelveticaWidth("E", 667);
registerHelveticaWidth("F", 611);
registerHelveticaWidth("G", 778);
registerHelveticaWidth("I", 278);
registerHelveticaWidth("J", 500);
registerHelveticaWidth("K", 667);
registerHelveticaWidth("L", 556);
registerHelveticaWidth("M", 833);
registerHelveticaWidth("OQ", 778);
registerHelveticaWidth("P", 667);
registerHelveticaWidth("S", 667);
registerHelveticaWidth("T", 611);
registerHelveticaWidth("U", 722);
registerHelveticaWidth("V", 667);
registerHelveticaWidth("W", 944);
registerHelveticaWidth("X", 667);
registerHelveticaWidth("Y", 667);
registerHelveticaWidth("Z", 611);
registerHelveticaWidth("abcdeghnopq", 556);
registerHelveticaWidth("f", 278);
registerHelveticaWidth("ijkl", 222);
registerHelveticaWidth("m", 833);
registerHelveticaWidth("r", 333);
registerHelveticaWidth("s", 500);
registerHelveticaWidth("t", 278);
registerHelveticaWidth("uvw", 556);
registerHelveticaWidth("xyz", 500);

// Latin-1 and WinAnsi glyphs used by the existing encoder.
registerHelveticaWidth("\u00a0", 278);
registerHelveticaWidth("¡", 333);
registerHelveticaWidth("¢£¤¥", 556);
registerHelveticaWidth("¦", 260);
registerHelveticaWidth("§", 556);
registerHelveticaWidth("¨", 333);
registerHelveticaWidth("©", 737);
registerHelveticaWidth("ª", 333);
registerHelveticaWidth("«", 333);
registerHelveticaWidth("¬", 556);
registerHelveticaWidth("®", 737);
registerHelveticaWidth("¯", 333);
registerHelveticaWidth("°", 400);
registerHelveticaWidth("±", 549);
registerHelveticaWidth("²³´", 333);
registerHelveticaWidth("µ", 556);
registerHelveticaWidth("¶", 537);
registerHelveticaWidth("·", 278);
registerHelveticaWidth("¸", 333);
registerHelveticaWidth("¹", 333);
registerHelveticaWidth("º", 365);
registerHelveticaWidth("»", 333);
registerHelveticaWidth("¼½¾", 834);
registerHelveticaWidth("¿", 611);
registerHelveticaWidth("ÀÁÂÃÄÅ", 667);
registerHelveticaWidth("Æ", 1000);
registerHelveticaWidth("Ç", 667);
registerHelveticaWidth("ÈÉÊË", 667);
registerHelveticaWidth("ÌÍÎÏ", 278);
registerHelveticaWidth("Ð", 722);
registerHelveticaWidth("Ñ", 722);
registerHelveticaWidth("ÒÓÔÕÖØ", 778);
registerHelveticaWidth("×", 584);
registerHelveticaWidth("ÙÚÛÜ", 722);
registerHelveticaWidth("Ý", 667);
registerHelveticaWidth("Þ", 667);
registerHelveticaWidth("ß", 611);
registerHelveticaWidth("àáâãäå", 556);
registerHelveticaWidth("æ", 667);
registerHelveticaWidth("ç", 500);
registerHelveticaWidth("èéêë", 556);
registerHelveticaWidth("ìíîï", 222);
registerHelveticaWidth("ð", 556);
registerHelveticaWidth("ñ", 556);
registerHelveticaWidth("òóôõöø", 556);
registerHelveticaWidth("÷", 584);
registerHelveticaWidth("ùúûü", 556);
registerHelveticaWidth("ýÿ", 500);
registerHelveticaWidth("þ", 556);

// WinAnsi special glyphs not covered by the Latin-1 range.
registerHelveticaWidth("€", 556);
registerHelveticaWidth("‚„", 222);
registerHelveticaWidth("ƒ", 556);
registerHelveticaWidth("…", 1000);
registerHelveticaWidth("†‡", 556);
registerHelveticaWidth("ˆ˜", 333);
registerHelveticaWidth("‰", 1000);
registerHelveticaWidth("Š", 667);
registerHelveticaWidth("‹›", 333);
registerHelveticaWidth("Œ", 1000);
registerHelveticaWidth("Ž", 611);
registerHelveticaWidth("‘’", 222);
registerHelveticaWidth("“”", 333);
registerHelveticaWidth("•", 350);
registerHelveticaWidth("–", 556);
registerHelveticaWidth("—", 1000);
registerHelveticaWidth("™", 1000);
registerHelveticaWidth("š", 500);
registerHelveticaWidth("œ", 667);
registerHelveticaWidth("ž", 500);
registerHelveticaWidth("Ÿ", 667);

function measureHelveticaText(value: string): number {
  let width = 0;
  for (const character of value) {
    // Validate through the canonical WinAnsi encoder before measuring. This
    // preserves the explicit unsupported-glyph failure contract.
    escapePdfText(character);
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 0x09 || codePoint === 0x202f) {
      width += (278 * TEXT_FONT_SIZE) / 1000;
      continue;
    }
    if (codePoint === 0x0a || codePoint === 0x0c || codePoint === 0x0d) continue;
    const glyphWidth = HELVETICA_WIDTHS.get(codePoint);
    if (glyphWidth === undefined) {
      throw new Error(`Helvetica metric missing for supported PDF glyph U+${codePoint.toString(16).toUpperCase()}.`);
    }
    width += glyphWidth;
  }
  return (width * TEXT_FONT_SIZE) / 1000;
}

export const SIMPLE_PDF_TEXT_MAX_WIDTH = TEXT_MAX_WIDTH;

export function measureSimplePdfText(value: string): number {
  return measureHelveticaText(value);
}

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

function splitTextLine(value: string): string[] {
  if (measureHelveticaText(value) <= TEXT_MAX_WIDTH) return [value];

  const characters = Array.from(value);
  const chunks: string[] = [];
  let start = 0;
  let index = 0;
  let width = 0;
  let lastBreakAfter = -1;

  while (index < characters.length) {
    const character = characters[index]!;
    const characterWidth = measureHelveticaText(character);
    const nextWidth = width + characterWidth;

    if (nextWidth <= TEXT_MAX_WIDTH || index === start) {
      width = nextWidth;
      index += 1;
      if (/\s/.test(character)) lastBreakAfter = index;
      continue;
    }

    if (lastBreakAfter > start) {
      chunks.push(characters.slice(start, lastBreakAfter).join(""));
      start = lastBreakAfter;
      index = start;
      width = 0;
      lastBreakAfter = -1;
      continue;
    }

    chunks.push(characters.slice(start, index).join(""));
    start = index;
    width = 0;
    lastBreakAfter = -1;
  }
  if (start < characters.length) chunks.push(characters.slice(start).join(""));
  return chunks;
}

function appendTextEntry(state: PageState, line: string): void {
  const banner = line.startsWith("!! ");
  const text = banner ? line.slice(3) : line;
  splitTextLine(text).forEach((chunk, index) => {
    const isBanner = banner && index === 0;
    const slots = isBanner ? 2 : 1;
    if (state.currentSlots + slots > MAX_LINES_PER_PAGE) flushPage(state);
    state.currentPage.push({ kind: "text", text: chunk, banner: isBanner });
    state.currentSlots += slots;
  });
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
  objectById.set(
    fontObjectId,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
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
