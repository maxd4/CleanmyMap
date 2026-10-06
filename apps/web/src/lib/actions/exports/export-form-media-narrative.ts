import type { ExportForm } from "./export-form-contract";
import type { ActionDeclarationExportPresetId } from "./export-form-media-contract";

export function escapeXml(value: string): string {
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

export function wrapText(value: string, maxCharacters: number): string[] {
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

export function formatDateLabel(value: string): string {
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

export function getNumberLabel(value: string, unit: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Non renseigné";
  }

  return `${trimmed} ${unit}`;
}

export function formatActionHeadline(form: ExportForm): string {
  return form.recordType === "clean_place"
    ? "Bilan bénévole de lieu nettoyé"
    : "Déclaration bénévole";
}

export function buildExportNarrative(form: ExportForm, actorName: string): string[] {
  const items = [
    actorName.trim(),
    form.associationName.trim(),
    form.locationLabel.trim() || form.departureLocationLabel.trim(),
    formatDateLabel(form.actionDate),
  ].filter(Boolean);

  return items.length > 0 ? items : ["CleanMyMap"];
}

export function buildActionDeclarationExportFilename(
  form: ExportForm,
  presetId: "pdf" | ActionDeclarationExportPresetId,
): string {
  const actionDate = form.actionDate.trim() || new Date().toISOString().slice(0, 10);
  const dateSlug = slugify(actionDate) || "sans-date";
  const suffix = presetId === "pdf" ? "pdf" : presetId;
  return `cleanmymap-declaration-${dateSlug}-${suffix}.${presetId === "pdf" ? "pdf" : "png"}`;
}

export function buildActionDeclarationShareText(params: {
  form: ExportForm;
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

export function buildActionDeclarationExportLabel(form: ExportForm): string {
  return formatActionHeadline(form);
}
