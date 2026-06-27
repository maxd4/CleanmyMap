import type { FormState } from "@/components/actions/action-declaration-form.model";

export type ActionDeclarationExportPresetId =
  | "png"
  | "story-instagram"
  | "publication-facebook"
  | "publication-x";

export type ActionDeclarationExportBundleId =
  | "terrain"
  | "social"
  | "institutionnel"
  | "rapport";

export type ActionDeclarationExportPreset = {
  id: ActionDeclarationExportPresetId;
  label: string;
  description: string;
  width: number;
  height: number;
  filenameSuffix: string;
};

export type ActionDeclarationExportTarget =
  | {
      id: "pdf";
      label: string;
      description: string;
      buttonLabel: string;
    }
  | (ActionDeclarationExportPreset & {
      buttonLabel: string;
    });

export type ActionDeclarationExportBundle = {
  id: ActionDeclarationExportBundleId;
  label: string;
  description: string;
  targetIds: ActionDeclarationExportTarget["id"][];
  previewTargetId: ActionDeclarationExportTarget["id"];
};

const ACTION_DECLARATION_EXPORT_PRESETS: ActionDeclarationExportPreset[] = [
  {
    id: "png",
    label: "PNG",
    description: "Image carrée 1080 × 1080 pour partager un résumé rapide.",
    width: 1080,
    height: 1080,
    filenameSuffix: "png",
  },
  {
    id: "story-instagram",
    label: "Story Instagram",
    description: "Format vertical 1080 × 1920 pour une story prête à publier.",
    width: 1080,
    height: 1920,
    filenameSuffix: "story-instagram",
  },
  {
    id: "publication-facebook",
    label: "Publication Facebook",
    description: "Format paysage 1200 × 630 pour un post Facebook.",
    width: 1200,
    height: 630,
    filenameSuffix: "publication-facebook",
  },
  {
    id: "publication-x",
    label: "Publication X / Twitter",
    description: "Format paysage 1600 × 900 pour un post X.",
    width: 1600,
    height: 900,
    filenameSuffix: "publication-x",
  },
];

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function wrapText(value: string, maxCharacters: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length <= maxCharacters) {
      current = next;
      continue;
    }

    if (current.length > 0) {
      lines.push(current);
    }
    current = word;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function formatDateLabel(value: string): string {
  if (!value) {
    return "Date non renseignée";
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(new Date(parsed));
}

function getNumberLabel(value: string, unit: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Non renseigné";
  }

  return `${trimmed} ${unit}`;
}

function formatActionHeadline(form: FormState): string {
  return form.recordType === "clean_place"
    ? "Bilan bénévole de lieu nettoyé"
    : "Déclaration bénévole";
}

function getExportPreset(presetId: ActionDeclarationExportPresetId): ActionDeclarationExportPreset | undefined {
  return ACTION_DECLARATION_EXPORT_PRESETS.find((item) => item.id === presetId);
}

function buildExportNarrative(form: FormState, actorName: string): string[] {
  const items = [
    actorName.trim(),
    form.associationName.trim(),
    form.locationLabel.trim() || form.departureLocationLabel.trim(),
    formatDateLabel(form.actionDate),
  ].filter(Boolean);

  return items.length > 0 ? items : ["CleanMyMap"];
}

export function getActionDeclarationExportTargets(): ActionDeclarationExportTarget[] {
  return [
    {
      id: "pdf",
      label: "Fichier PDF",
      description: "Ouvre la version imprimable A4 du formulaire.",
      buttonLabel: "Ouvrir le PDF",
    },
    ...ACTION_DECLARATION_EXPORT_PRESETS.map((preset) => ({
      ...preset,
      buttonLabel: "Télécharger",
    })),
  ];
}

export function getActionDeclarationExportBundles(): ActionDeclarationExportBundle[] {
  return [
    {
      id: "terrain",
      label: "Terrain",
      description: "Priorise l’impression et un visuel image simple à partager.",
      targetIds: ["pdf", "png"],
      previewTargetId: "png",
    },
    {
      id: "social",
      label: "Réseaux sociaux",
      description: "Mets en avant les formats verticaux et carrés prêts à publier.",
      targetIds: ["story-instagram", "png", "publication-facebook", "publication-x"],
      previewTargetId: "story-instagram",
    },
    {
      id: "institutionnel",
      label: "Institutionnel",
      description: "Met l’accent sur le PDF et la publication Facebook pour partage formel.",
      targetIds: ["pdf", "publication-facebook", "png"],
      previewTargetId: "pdf",
    },
    {
      id: "rapport",
      label: "Rapport",
      description: "Concentre l’export sur la version imprimable et l’archive visuelle.",
      targetIds: ["pdf", "png"],
      previewTargetId: "pdf",
    },
  ];
}

export function getActionDeclarationExportBundle(
  bundleId: ActionDeclarationExportBundleId,
): ActionDeclarationExportBundle {
  const bundle = getActionDeclarationExportBundles().find((item) => item.id === bundleId);
  if (!bundle) {
    return getActionDeclarationExportBundles()[0];
  }

  return bundle;
}

export function buildActionDeclarationExportFilename(
  form: FormState,
  presetId: "pdf" | ActionDeclarationExportPresetId,
): string {
  const actionDate = form.actionDate.trim() || new Date().toISOString().slice(0, 10);
  const dateSlug = slugify(actionDate) || "sans-date";
  const suffix = presetId === "pdf" ? "pdf" : presetId;
  return `cleanmymap-declaration-${dateSlug}-${suffix}.${presetId === "pdf" ? "pdf" : "png"}`;
}

export function buildActionDeclarationExportPreviewDataUrl(
  form: FormState,
  actorName: string,
  presetId: ActionDeclarationExportPresetId,
): string {
  const preset = ACTION_DECLARATION_EXPORT_PRESETS.find((item) => item.id === presetId);
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

export function buildActionDeclarationShareText(params: {
  form: FormState;
  actorName: string;
  exportLabel?: string;
}): string {
  const { form, actorName, exportLabel } = params;
  const lines = [
    exportLabel ? `${exportLabel} avec CleanMyMap` : "Export CleanMyMap",
    form.actionDate ? `Date: ${formatDateLabel(form.actionDate)}` : "",
    form.locationLabel || form.departureLocationLabel
      ? `Lieu: ${form.locationLabel || form.departureLocationLabel}`
      : "",
    form.wasteKg ? `${form.wasteKg} kg collectés` : "",
    form.volunteersCount ? `${form.volunteersCount} bénévoles mobilisés` : "",
    actorName ? `Déclaré par ${actorName}` : "",
    form.associationName ? `Structure: ${form.associationName}` : "",
    "#CleanMyMap #CleanUp #Benevoles",
  ].filter(Boolean);

  return lines.join("\n");
}

/* eslint-disable complexity, max-lines-per-function */
export function buildActionDeclarationSocialSvg(params: {
  form: FormState;
  actorName: string;
  preset: ActionDeclarationExportPreset;
}): string {
  const { form, actorName, preset } = params;
  const isPortrait = preset.height > preset.width;
  const padding = Math.round(Math.min(preset.width, preset.height) * 0.08);
  const contentWidth = preset.width - padding * 2;
  const titleFontSize = Math.round(Math.min(preset.width, preset.height) * (isPortrait ? 0.066 : 0.05));
  const bodyFontSize = Math.round(Math.min(preset.width, preset.height) * (isPortrait ? 0.028 : 0.024));
  const smallFontSize = Math.round(bodyFontSize * 0.88);
  const titleLines = wrapText(formatActionHeadline(form), isPortrait ? 18 : 24).slice(0, 3);
  const narrativeLines = buildExportNarrative(form, actorName)
    .flatMap((line) => wrapText(line, isPortrait ? 24 : 34).slice(0, 2))
    .map(escapeXml);
  const heroWaste = getNumberLabel(form.wasteKg, "kg collectés");
  const heroVolunteer = getNumberLabel(form.volunteersCount, "bénévoles");
  const heroDuration = getNumberLabel(form.durationMinutes, "min");
  const heroMegots = form.wasteMegotsKg.trim() ? `${form.wasteMegotsKg.trim()} kg de mégots` : "Mégots non renseignés";
  const locationLabel =
    form.locationLabel.trim() ||
    form.departureLocationLabel.trim() ||
    "Lieu non renseigné";
  const notesSnippet = form.notes.trim()
    ? wrapText(form.notes.trim(), isPortrait ? 28 : 40).slice(0, 2)
    : [];
  const columnCount = isPortrait ? 1 : 2;
  const metricWidth = columnCount === 1
    ? contentWidth
    : Math.floor((contentWidth - 18) / 2);
  const metricHeight = isPortrait ? 132 : 112;
  const metricGap = 18;
  const metricX = (index: number): number => {
    if (columnCount === 1) {
      return padding;
    }
    return padding + (index % 2) * (metricWidth + metricGap);
  };
  const metricY = (index: number): number => {
    if (columnCount === 1) {
      return index * (metricHeight + 16);
    }
    return Math.floor(index / 2) * (metricHeight + 16);
  };

  const metricCards = [
    { label: "Déchets", value: heroWaste, accent: "#10b981" },
    { label: "Bénévoles", value: heroVolunteer, accent: "#0891b2" },
    { label: "Durée", value: heroDuration, accent: "#f59e0b" },
    { label: "Mégots", value: heroMegots, accent: "#8b5cf6" },
  ];

  const metricRows = metricCards
    .map((metric, index) => {
      const x = metricX(index);
      const y = padding + 360 + metricY(index);
      const textWrap = wrapText(metric.value, isPortrait ? 20 : 26).slice(0, 2);
      return `
        <g transform="translate(${x}, ${y})">
          <rect x="0" y="0" width="${metricWidth}" height="${metricHeight}" rx="28" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)"/>
          <rect x="0" y="0" width="12" height="${metricHeight}" rx="6" fill="${metric.accent}" opacity="0.95"/>
          <text x="28" y="36" fill="rgba(255,255,255,0.72)" font-size="${smallFontSize}" font-weight="700" letter-spacing="0.18em" text-transform="uppercase">${escapeXml(metric.label)}</text>
          <text x="28" y="78" fill="#ffffff" font-size="${bodyFontSize}" font-weight="800">
            ${textWrap
              .map((line, lineIndex) => `<tspan x="28" dy="${lineIndex === 0 ? 0 : bodyFontSize + 8}">${escapeXml(line)}</tspan>`)
              .join("")}
          </text>
        </g>
      `;
    })
    .join("");

  const notesBlock = notesSnippet.length
    ? `
      <g transform="translate(${padding}, ${preset.height - padding - (notesSnippet.length * (bodyFontSize + 8) + 70)})">
        <rect x="0" y="0" width="${contentWidth}" height="${notesSnippet.length * (bodyFontSize + 8) + 70}" rx="28" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.14)" />
        <text x="28" y="34" fill="rgba(255,255,255,0.72)" font-size="${smallFontSize}" font-weight="700" letter-spacing="0.16em">NOTE</text>
        <text x="28" y="${34 + bodyFontSize + 12}" fill="#ffffff" font-size="${bodyFontSize}" font-weight="600">
          ${notesSnippet
            .map((line, index) => `<tspan x="28" dy="${index === 0 ? 0 : bodyFontSize + 8}">${escapeXml(line)}</tspan>`)
            .join("")}
        </text>
      </g>
    `
    : "";

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
    <rect x="${padding}" y="${padding}" width="${contentWidth}" height="${preset.height - padding * 2}" rx="${isPortrait ? 40 : 44}" fill="rgba(7,17,16,0.32)" stroke="rgba(255,255,255,0.1)" filter="url(#shadow)"/>

    <g transform="translate(${padding}, ${padding})">
      <text x="0" y="34" fill="rgba(255,255,255,0.72)" font-size="${smallFontSize}" font-weight="800" letter-spacing="0.22em">CLEANMYMAP</text>
      <rect x="0" y="48" width="${Math.min(contentWidth, 220)}" height="8" rx="4" fill="url(#accent)"/>
      <text x="0" y="${Math.max(120, titleFontSize + 64)}" fill="#ffffff" font-size="${titleFontSize}" font-weight="900">
        ${titleLines
          .map((line, index) => `<tspan x="0" dy="${index === 0 ? 0 : titleFontSize + 14}">${escapeXml(line)}</tspan>`)
          .join("")}
      </text>
      <text x="0" y="${Math.max(210, titleFontSize + 144)}" fill="rgba(255,255,255,0.86)" font-size="${bodyFontSize}" font-weight="600">
        <tspan x="0" dy="0">${escapeXml(narrativeLines.length > 0 ? narrativeLines[0] : "Prêt à partager")}</tspan>
        ${narrativeLines
          .slice(1)
          .map((line) => `<tspan x="0" dy="${bodyFontSize + 10}">${line}</tspan>`)
          .join("")}
      </text>

      <rect x="0" y="${isPortrait ? 250 : 250}" width="${isPortrait ? contentWidth : Math.floor(contentWidth * 0.72)}" height="88" rx="24" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.14)"/>
      <text x="24" y="${isPortrait ? 290 : 286}" fill="rgba(255,255,255,0.68)" font-size="${smallFontSize}" font-weight="700" letter-spacing="0.18em">POINT CLÉ</text>
      <text x="24" y="${isPortrait ? 326 : 322}" fill="#ffffff" font-size="${bodyFontSize}" font-weight="800">
        <tspan x="24" dy="0">${escapeXml(locationLabel)}</tspan>
      </text>
      <text x="${isPortrait ? 24 : Math.floor(contentWidth * 0.76)}" y="${isPortrait ? 290 : 290}" fill="rgba(255,255,255,0.68)" font-size="${smallFontSize}" font-weight="700" letter-spacing="0.18em">ORGANISATION</text>
      <text x="${isPortrait ? 24 : Math.floor(contentWidth * 0.76)}" y="${isPortrait ? 326 : 322}" fill="#ffffff" font-size="${bodyFontSize}" font-weight="800">
        <tspan x="${isPortrait ? 24 : Math.floor(contentWidth * 0.76)}" dy="0">${escapeXml(form.associationName || actorName || "CleanMyMap")}</tspan>
      </text>
    </g>

    <g transform="translate(${padding}, ${padding + (isPortrait ? 430 : 410)})">
      ${metricRows}
    </g>

    <g transform="translate(${padding}, ${preset.height - padding - 86})">
      <text x="0" y="0" fill="rgba(255,255,255,0.72)" font-size="${smallFontSize}" font-weight="700" letter-spacing="0.16em">AUTEUR</text>
      <text x="0" y="${smallFontSize + 20}" fill="#ffffff" font-size="${bodyFontSize}" font-weight="700">${escapeXml(actorName || "Bénévole")}</text>
      <text x="${contentWidth}" y="${smallFontSize + 20}" text-anchor="end" fill="rgba(255,255,255,0.72)" font-size="${smallFontSize}" font-weight="600">${escapeXml(formatDateLabel(form.actionDate))}</text>
    </g>

    ${notesBlock}
  </svg>`;
}

export async function downloadActionDeclarationExportImage(params: {
  form: FormState;
  actorName: string;
  presetId: ActionDeclarationExportPresetId;
}): Promise<boolean> {
  const preset = getExportPreset(params.presetId);
  if (!preset) {
    throw new Error("Format d'export introuvable.");
  }

  const pngBlob = await createActionDeclarationExportPngBlob({
    form: params.form,
    actorName: params.actorName,
    preset,
  });
  downloadBlob(pngBlob, buildActionDeclarationExportFilename(params.form, preset.id));
  return true;
}

/* eslint-enable complexity, max-lines-per-function */

export async function createActionDeclarationExportPngBlob(params: {
  form: FormState;
  actorName: string;
  preset: ActionDeclarationExportPreset;
}): Promise<Blob> {
  const svgMarkup = buildActionDeclarationSocialSvg({
    form: params.form,
    actorName: params.actorName,
    preset: params.preset,
  });
  const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";
    const loadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Impossible de générer l'aperçu PNG."));
    });

    img.src = svgUrl;
    await loadPromise;

    const canvas = document.createElement("canvas");
    canvas.width = params.preset.width;
    canvas.height = params.preset.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Impossible d'initialiser le canevas PNG.");
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Impossible de générer l'image PNG."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.download = filename;
  downloadLink.href = url;
  downloadLink.rel = "noopener";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildActionDeclarationExportLabel(form: FormState): string {
  return formatActionHeadline(form);
}
