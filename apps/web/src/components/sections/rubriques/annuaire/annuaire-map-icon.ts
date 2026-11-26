import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import { escapeHtml } from "@/lib/security/html-escape";
import { formatShortMarkerLabel } from "./annuaire-geo-network.model";
import { getNetworkLogoDiameter } from "./annuaire-geo-network.visuals";

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
  logoPath?: string | null;
  neighbours?: number;
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
  const diameter = getNetworkLogoDiameter(params.neighbours ?? 0);
  const logoPath = params.logoPath && /^\/(?:brand|images\/partners)\/[a-zA-Z0-9._/-]+$/.test(params.logoPath) && !params.logoPath.includes("..") ? params.logoPath : null;
  const bg = highlighted ? "#4c1d95" : FAMILY_ACCENT[family] ?? "#5b21b6";
  const border = highlighted ? "#f59e0b" : outsideCity ? "#38bdf8" : "#ffffff";

  const badge = logoPath
    ? '<img alt="" src="' + escapeHtml(logoPath) + '" class="h-full w-full rounded-full object-contain" />'
    : '<span title="Logo non renseigné" class="text-xs font-black">' + escapeHtml(initials) + '</span>';
  return '<div title="' + escapeHtml(name) + '" style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);white-space:nowrap;color:' + bg + ';">'
    + '<span style="background:white;width:' + diameter + 'px;height:' + diameter + 'px;border:2px solid ' + border + ';box-shadow:0 2px 8px #0003;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;">' + badge + '</span>'
    + '<span class="rounded bg-white/95 px-1 text-xs font-bold shadow-sm">' + escapeHtml(label) + '</span>'
    + '<span style="height:12px;width:2px;background:' + bg + '"></span>'
    + '<svg width="18" height="24" viewBox="0 0 18 24" aria-hidden="true"><path d="M9 24C7 20 0 13 0 9a9 9 0 1 1 18 0c0 4-7 11-9 15Z" fill="' + bg + '"/><circle cx="9" cy="9" r="3" fill="white"/></svg></div>';
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
