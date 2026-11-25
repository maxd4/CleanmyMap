import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import { escapeHtml } from "@/lib/security/html-escape";
import { formatShortMarkerLabel } from "./annuaire-geo-network.model";

const FAMILY_ACCENT: Record<string, string> = {
  environnemental: "#6d28d9",
  social: "#5b21b6",
  humanitaire: "#4c1d95",
  association_locale: "#6d28d9",
  collectivite: "#0369a1",
  entreprise_rse: "#047857",
  plateforme_mise_en_relation: "#4338ca",
};

/**
 * Marqueur nommé compact lisible en permanence (jamais une sphère anonyme).
 * Tout texte injecté dans le HTML du marqueur est échappé via `escapeHtml`.
 */
export function buildNamedMarkerIconHtml(params: {
  name: string;
  shortName?: string;
  family?: string;
  highlighted?: boolean;
  outsideCity?: boolean;
}): string {
  const { name, shortName, family = "environnemental", highlighted = false, outsideCity = false } = params;
  const label = shortName ?? formatShortMarkerLabel(name);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bg = highlighted ? "#4c1d95" : FAMILY_ACCENT[family] ?? "#5b21b6";
  const border = highlighted ? "#f59e0b" : outsideCity ? "#38bdf8" : "#ffffff";

  return `<div title="${escapeHtml(name)}" class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-2 py-1 shadow-md transition-transform ${
    highlighted ? "scale-105 z-[1000]" : ""
  }" style="background-color: ${bg}; border-color: ${border}; color: #ffffff;">
    <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-black">${escapeHtml(
      initials,
    )}</span>
    <span class="text-xs font-semibold leading-none">${escapeHtml(label)}</span>
  </div>`;
}

/** Marqueur de regroupement numéroté en cas de superposition à faible zoom. */
export function buildClusterMarkerIconHtml(count: number, highlighted = false): string {
  const bg = highlighted ? "#4c1d95" : "#312e81";
  return `<div class="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border-2 border-white px-2 text-xs font-black text-white shadow-md" style="background-color: ${bg};">+${count}</div>`;
}

export function buildAnnuaireBubbleIconHtml(
  entry: AnnuaireEntry,
  highlighted = false,
): string {
  return buildNamedMarkerIconHtml({
    name: entry.name,
    family: entry.types[0],
    highlighted,
  });
}
