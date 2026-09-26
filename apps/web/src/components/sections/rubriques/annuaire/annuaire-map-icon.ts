import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import { escapeHtml } from "@/lib/security/html-escape";

export function buildAnnuaireBubbleIconHtml(
  entry: AnnuaireEntry,
  highlighted = false,
): string {
  const primaryType = entry.types[0];
  let color = "#8b5cf6";
  if (primaryType === "environnemental") color = "#8b5cf6";
  if (primaryType === "social") color = "#7c3aed";
  if (primaryType === "humanitaire") color = "#7c3aed";

  const initials = entry.name.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase();

  return `
      <div class="group relative flex items-center gap-2 transition-all duration-300 ${highlighted ? "scale-110 z-[1000]" : "hover:scale-105"}">
        <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-lg shadow-black/10 transition-transform overflow-hidden"
             style="background-color: ${color}; color: #FFFFFF; font-weight: bold; font-size: 12px;">
          ${escapeHtml(initials)}
        </div>
        <div class="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap rounded-xl border border-violet-300/16 bg-[rgba(24,17,54,0.98)] px-3 py-1.5 shadow-xl backdrop-blur-sm">
          <p class="text-xs font-bold text-white">${escapeHtml(entry.name)}</p>
        </div>
      </div>
    `;
}
