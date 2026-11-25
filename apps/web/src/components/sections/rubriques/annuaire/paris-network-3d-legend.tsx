"use client";

import {
  PARIS_ACTOR_CATEGORY_META,
  PARIS_RELATION_TYPE_META,
  RELATION_THICKNESS_POLICY,
  type ParisActorCategory,
  type ParisRelationType,
} from "@/lib/partners/paris-cleanwalk-network";

export function ParisNetwork3DLegend({ fr }: { fr: boolean }) {
  return (
    <aside
      aria-label={fr ? "Légende du réseau 3D" : "3D network legend"}
      className="rounded-2xl border border-violet-300/15 bg-slate-950/60 p-4 text-xs text-slate-200"
    >
      <p className="text-sm text-slate-300">{fr ? "Couleur : famille · trait : relation · épaisseur : fréquence connue. Un lien absent n'exclut pas une collaboration." : "Color: family · line: relationship · width: known frequency. Missing links do not rule out collaboration."}</p>
      <details className="mt-2">
      <summary className="cursor-pointer font-semibold text-violet-200">{fr ? "Légende détaillée" : "Detailed legend"}</summary>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-violet-300">
            {fr ? "Familles d'acteurs (clusters 3D)" : "Actor families (3D clusters)"}
          </p>
          <ul className="space-y-1.5">
            {(
              Object.entries(PARIS_ACTOR_CATEGORY_META) as [
                ParisActorCategory,
                { label: string; colorHex: string },
              ][]
            ).map(([key, meta]) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full border border-white/30"
                  style={{ backgroundColor: meta.colorHex }}
                  aria-hidden="true"
                />
                <span>{meta.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-violet-300">
            {fr ? "Nature des liens" : "Relation types"}
          </p>
          <ul className="space-y-1.5">
            {(
              Object.entries(PARIS_RELATION_TYPE_META) as [
                ParisRelationType,
                { label: string; colorHex: string; dashPattern: "solid" | "dashed" | "dotted" },
              ][]
            ).map(([key, meta]) => (
              <li key={key} className="flex items-center gap-2">
                <span
                  className="inline-block w-6 shrink-0 border-t-2"
                  style={{
                    borderColor: meta.colorHex,
                    borderStyle: meta.dashPattern,
                  }}
                  aria-hidden="true"
                />
                <span>{meta.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-black uppercase tracking-wider text-violet-300">
            {fr ? "Échelle d'épaisseur (12 mois glissants)" : "Thickness scale (12m rolling)"}
          </p>
          <p className="leading-relaxed text-slate-300">
            {fr
              ? `Pour les actions communes prouvées, l'épaisseur suit une échelle linéaire bornée (${RELATION_THICKNESS_POLICY.minThickness} à ${RELATION_THICKNESS_POLICY.maxThickness} px pour 1 à ${RELATION_THICKNESS_POLICY.maxOperationsScale}+ opérations distinctes).`
              : `For proven joint actions, thickness follows a bounded linear scale (${RELATION_THICKNESS_POLICY.minThickness} to ${RELATION_THICKNESS_POLICY.maxThickness} px for 1 to ${RELATION_THICKNESS_POLICY.maxOperationsScale}+ distinct operations).`}
          </p>
          <p className="leading-relaxed text-slate-300">
            {fr
              ? "Collaborations programmées (ambre, tirets) exclues des opérations historiques. Fréquence inconnue = épaisseur neutre (jamais 0 inventé). Aucun lien n'implique une appartenance au réseau CleanMyMap."
              : "Scheduled collaborations (amber dashed) are excluded from historical operations. Unknown frequency = neutral thickness (never invented 0). No link implies CleanMyMap network membership."}
          </p>
        </div>
      </div>
      </details>
    </aside>
  );
}
