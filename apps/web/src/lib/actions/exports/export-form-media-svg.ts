import type { ExportForm } from "./export-form-contract";
import type { ActionDeclarationExportPreset, ActionDeclarationExportPresetId } from "./export-form-media-contract";
import { getActionDeclarationExportPreset } from "./export-form-media-presets";
import {
  buildExportNarrative,
  escapeXml,
  formatActionHeadline,
  formatDateLabel,
  getNumberLabel,
  wrapText,
} from "./export-form-media-narrative";

type SvgLayout = {
  isPortrait: boolean;
  padding: number;
  contentWidth: number;
  titleFontSize: number;
  bodyFontSize: number;
  smallFontSize: number;
  columnCount: number;
  metricWidth: number;
  metricHeight: number;
  metricGap: number;
};

type SvgContent = {
  titleLines: string[];
  narrativeLines: string[];
  locationLabel: string;
  metricRows: string;
  notesBlock: string;
};

export function buildActionDeclarationExportPreviewDataUrl(
  form: ExportForm,
  actorName: string,
  presetId: ActionDeclarationExportPresetId,
): string {
  const preset = getActionDeclarationExportPreset(presetId);
  if (!preset) {
    return "";
  }

  const svgMarkup = buildActionDeclarationSocialSvg({
    form,
    actorName,
    preset,
  });

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

export function buildActionDeclarationSocialSvg(params: {
  form: ExportForm;
  actorName: string;
  preset: ActionDeclarationExportPreset;
}): string {
  const { form, actorName, preset } = params;
  const layout = createSvgLayout(preset);
  const content = createSvgContent(form, actorName, preset, layout);

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${preset.width}" height="${preset.height}" viewBox="0 0 ${preset.width} ${preset.height}" role="img" aria-label="${escapeXml(preset.label)}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#052e2b"/>
        <stop offset="45%" stop-color="#0f766e"/>
        <stop offset="100%" stop-color="#134e4a"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#34d399"/>
        <stop offset="100%" stop-color="#67e8f9"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#00110f" flood-opacity="0.38"/>
      </filter>
    </defs>

    <rect width="${preset.width}" height="${preset.height}" fill="url(#bg)"/>
    <circle cx="${preset.width * 0.83}" cy="${preset.height * 0.14}" r="${Math.round(Math.min(preset.width, preset.height) * 0.15)}" fill="rgba(110,231,183,0.2)"/>
    <circle cx="${preset.width * 0.14}" cy="${preset.height * 0.82}" r="${Math.round(Math.min(preset.width, preset.height) * 0.24)}" fill="rgba(103,232,249,0.14)"/>
    <rect x="${layout.padding}" y="${layout.padding}" width="${layout.contentWidth}" height="${preset.height - layout.padding * 2}" rx="${layout.isPortrait ? 40 : 44}" fill="rgba(7,17,16,0.32)" stroke="rgba(255,255,255,0.1)" filter="url(#shadow)"/>

    ${buildSvgIntroMarkup(form, actorName, layout, content)}

    <g transform="translate(${layout.padding}, ${layout.padding + (layout.isPortrait ? 430 : 410)})">
      ${content.metricRows}
    </g>

    ${buildSvgFooterMarkup(form, actorName, preset, layout)}

    ${content.notesBlock}
  </svg>`;
}

function createSvgLayout(preset: ActionDeclarationExportPreset): SvgLayout {
  const isPortrait = preset.height > preset.width;
  const minimumDimension = Math.min(preset.width, preset.height);
  const padding = Math.round(minimumDimension * 0.08);
  const contentWidth = preset.width - padding * 2;
  const bodyFontSize = Math.round(minimumDimension * (isPortrait ? 0.028 : 0.024));
  const columnCount = isPortrait ? 1 : 2;

  return {
    isPortrait,
    padding,
    contentWidth,
    titleFontSize: Math.round(minimumDimension * (isPortrait ? 0.066 : 0.05)),
    bodyFontSize,
    smallFontSize: Math.round(bodyFontSize * 0.88),
    columnCount,
    metricWidth: columnCount === 1 ? contentWidth : Math.floor((contentWidth - 18) / 2),
    metricHeight: isPortrait ? 132 : 112,
    metricGap: 18,
  };
}

function createSvgContent(
  form: ExportForm,
  actorName: string,
  preset: ActionDeclarationExportPreset,
  layout: SvgLayout,
): SvgContent {
  const narrativeLines = buildExportNarrative(form, actorName)
    .flatMap((line) => wrapText(line, layout.isPortrait ? 24 : 34).slice(0, 2))
    .map(escapeXml);

  return {
    titleLines: wrapText(formatActionHeadline(form), layout.isPortrait ? 18 : 24).slice(0, 3),
    narrativeLines,
    locationLabel: form.locationLabel.trim() || form.departureLocationLabel.trim() || "Lieu non renseigné",
    metricRows: buildSvgMetricRows(form, layout),
    notesBlock: buildSvgNotesBlock(form, preset, layout),
  };
}

function getMetricPosition(index: number, layout: SvgLayout): { x: number; y: number } {
  const x = layout.columnCount === 1
    ? layout.padding
    : layout.padding + (index % 2) * (layout.metricWidth + layout.metricGap);
  const y = layout.columnCount === 1
    ? index * (layout.metricHeight + 16)
    : Math.floor(index / 2) * (layout.metricHeight + 16);
  return { x, y: layout.padding + 360 + y };
}

function buildSvgMetricRows(
  form: ExportForm,
  layout: SvgLayout,
): string {
  const metricCards = [
    { label: "Déchets", value: getNumberLabel(form.wasteKg, "kg collectés"), accent: "#10b981" },
    { label: "Bénévoles", value: getNumberLabel(form.volunteersCount, "bénévoles"), accent: "#0891b2" },
    { label: "Durée", value: getNumberLabel(form.durationMinutes, "min"), accent: "#f59e0b" },
    {
      label: "Mégots",
      value: form.wasteMegotsKg.trim() ? `${form.wasteMegotsKg.trim()} kg de mégots` : "Mégots non renseignés",
      accent: "#8b5cf6",
    },
  ];

  return metricCards
    .map((metric, index) => buildSvgMetricCard(metric, index, layout))
    .join("");
}

function buildSvgMetricCard(
  metric: { label: string; value: string; accent: string },
  index: number,
  layout: SvgLayout,
): string {
  const { x, y } = getMetricPosition(index, layout);
  const textWrap = wrapText(metric.value, layout.isPortrait ? 20 : 26).slice(0, 2);
  return `
        <g transform="translate(${x}, ${y})">
          <rect x="0" y="0" width="${layout.metricWidth}" height="${layout.metricHeight}" rx="28" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)"/>
          <rect x="0" y="0" width="12" height="${layout.metricHeight}" rx="6" fill="${metric.accent}" opacity="0.95"/>
          <text x="28" y="36" fill="#FFFFFF" font-size="${layout.smallFontSize}" font-weight="700" letter-spacing="0.18em" text-transform="uppercase">${escapeXml(metric.label)}</text>
          <text x="28" y="78" fill="#ffffff" font-size="${layout.bodyFontSize}" font-weight="800">
            ${textWrap
              .map((line, lineIndex) => `<tspan x="28" dy="${lineIndex === 0 ? 0 : layout.bodyFontSize + 8}">${escapeXml(line)}</tspan>`)
              .join("")}
          </text>
        </g>
      `;
}

function buildSvgIntroMarkup(
  form: ExportForm,
  actorName: string,
  layout: SvgLayout,
  content: Pick<SvgContent, "titleLines" | "narrativeLines" | "locationLabel">,
): string {
  const organizationX = layout.isPortrait ? 24 : Math.floor(layout.contentWidth * 0.76);
  return `
    <g transform="translate(${layout.padding}, ${layout.padding})">
      <text x="0" y="34" fill="#FFFFFF" font-size="${layout.smallFontSize}" font-weight="800" letter-spacing="0.22em">CLEANMYMAP</text>
      <rect x="0" y="48" width="${Math.min(layout.contentWidth, 220)}" height="8" rx="4" fill="url(#accent)"/>
      <text x="0" y="${Math.max(120, layout.titleFontSize + 64)}" fill="#ffffff" font-size="${layout.titleFontSize}" font-weight="900">
        ${content.titleLines
          .map((line, index) => `<tspan x="0" dy="${index === 0 ? 0 : layout.titleFontSize + 14}">${escapeXml(line)}</tspan>`)
          .join("")}
      </text>
      <text x="0" y="${Math.max(210, layout.titleFontSize + 144)}" fill="#FFFFFF" font-size="${layout.bodyFontSize}" font-weight="600">
        <tspan x="0" dy="0">${escapeXml(content.narrativeLines.length > 0 ? content.narrativeLines[0] : "Prêt à partager")}</tspan>
        ${content.narrativeLines
          .slice(1)
          .map((line) => `<tspan x="0" dy="${layout.bodyFontSize + 10}">${line}</tspan>`)
          .join("")}
      </text>

      <rect x="0" y="250" width="${layout.isPortrait ? layout.contentWidth : Math.floor(layout.contentWidth * 0.72)}" height="88" rx="24" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.14)"/>
      <text x="24" y="${layout.isPortrait ? 290 : 286}" fill="#FFFFFF" font-size="${layout.smallFontSize}" font-weight="700" letter-spacing="0.18em">POINT CLÉ</text>
      <text x="24" y="${layout.isPortrait ? 326 : 322}" fill="#ffffff" font-size="${layout.bodyFontSize}" font-weight="800">
        <tspan x="24" dy="0">${escapeXml(content.locationLabel)}</tspan>
      </text>
      <text x="${organizationX}" y="${layout.isPortrait ? 290 : 290}" fill="#FFFFFF" font-size="${layout.smallFontSize}" font-weight="700" letter-spacing="0.18em">ORGANISATION</text>
      <text x="${organizationX}" y="${layout.isPortrait ? 326 : 322}" fill="#ffffff" font-size="${layout.bodyFontSize}" font-weight="800">
        <tspan x="${organizationX}" dy="0">${escapeXml(form.associationName || actorName || "CleanMyMap")}</tspan>
      </text>
    </g>`;
}

function buildSvgFooterMarkup(
  form: ExportForm,
  actorName: string,
  preset: ActionDeclarationExportPreset,
  layout: SvgLayout,
): string {
  return `
    <g transform="translate(${layout.padding}, ${preset.height - layout.padding - 86})">
      <text x="0" y="0" fill="#FFFFFF" font-size="${layout.smallFontSize}" font-weight="700" letter-spacing="0.16em">AUTEUR</text>
      <text x="0" y="${layout.smallFontSize + 20}" fill="#ffffff" font-size="${layout.bodyFontSize}" font-weight="700">${escapeXml(actorName || "Bénévole")}</text>
      <text x="${layout.contentWidth}" y="${layout.smallFontSize + 20}" text-anchor="end" fill="#FFFFFF" font-size="${layout.smallFontSize}" font-weight="600">${escapeXml(formatDateLabel(form.actionDate))}</text>
    </g>`;
}

function buildSvgNotesBlock(
  form: ExportForm,
  preset: ActionDeclarationExportPreset,
  layout: SvgLayout,
): string {
  const notesSnippet = form.notes.trim()
    ? wrapText(form.notes.trim(), layout.isPortrait ? 28 : 40).slice(0, 2)
    : [];
  if (notesSnippet.length === 0) {
    return "";
  }

  const blockHeight = notesSnippet.length * (layout.bodyFontSize + 8) + 70;
  return `
      <g transform="translate(${layout.padding}, ${preset.height - layout.padding - blockHeight})">
        <rect x="0" y="0" width="${layout.contentWidth}" height="${blockHeight}" rx="28" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.14)" />
        <text x="28" y="34" fill="#FFFFFF" font-size="${layout.smallFontSize}" font-weight="700" letter-spacing="0.16em">NOTE</text>
        <text x="28" y="${34 + layout.bodyFontSize + 12}" fill="#ffffff" font-size="${layout.bodyFontSize}" font-weight="600">
          ${notesSnippet
            .map((line, index) => `<tspan x="28" dy="${index === 0 ? 0 : layout.bodyFontSize + 8}">${escapeXml(line)}</tspan>`)
            .join("")}
        </text>
      </g>`;
}
