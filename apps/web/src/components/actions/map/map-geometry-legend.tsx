import type { ReactNode } from "react";
import { Cigarette, Info, Trash2 } from "lucide-react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import {
  ACTION_POLLUTION_COLOR_STOPS,
  CLEAN_PLACE_COLOR,
  INFRASTRUCTURE_ALERT_THRESHOLD,
  TRASH_SPOTTER_NEUTRAL_COLOR,
  resolveDynamicColor,
} from "../map-marker-categories";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { CurrentPlaceStateMode } from "@/lib/actions/pollution/current-place-state";
import { POLLUTION_SCORE_UNAVAILABLE_COLOR } from "./pollution-score-scope";

type LegendItem = {
  label: string;
  threshold: string;
  description: string;
  icon: ReactNode;
};

const pollutionLevelLabels = {
  blue: "Premier seuil",
  orange: "Moyenne",
  red: "Forte",
  violet: "Critique",
  black: "Extrême",
} as const;

const colorItems: LegendItem[] = ACTION_POLLUTION_COLOR_STOPS.map((stop, index) => {
  const nextStop = ACTION_POLLUTION_COLOR_STOPS[index + 1];
  const threshold = nextStop
    ? index === 0
      ? `< ${nextStop.threshold}`
      : `${stop.threshold}–${nextStop.threshold - 1}`
    : `≥ ${stop.threshold}`;

  return {
    label: stop.label.split(" · ")[0],
    threshold,
    description: pollutionLevelLabels[stop.key],
    icon: <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: resolveDynamicColor(stop.threshold) }} />,
  };
});

const otherStateItems: LegendItem[] = [
  { label: "Gris", threshold: "score absent", description: "Score indisponible · non classé", icon: <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: POLLUTION_SCORE_UNAVAILABLE_COLOR }} /> },
  { label: "Vert", threshold: "clean_place", description: "Lieu explicitement propre · clean_place", icon: <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: CLEAN_PLACE_COLOR }} /> },
  { label: "Trash Spotter", threshold: "niveau non quantifié", description: "Signalement neutre, non quantifié", icon: <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: TRASH_SPOTTER_NEUTRAL_COLOR }} /> },
];

const infrastructureItems: LegendItem[] = [
  { label: "Bac", threshold: `≥ ${INFRASTRUCTURE_ALERT_THRESHOLD}`, description: "Besoin collecte", icon: <Trash2 size={15} className="text-slate-700" aria-hidden="true" /> },
  { label: "Cendrier", threshold: `≥ ${INFRASTRUCTURE_ALERT_THRESHOLD}`, description: "Besoin mégots", icon: <Cigarette size={15} className="text-slate-700" aria-hidden="true" /> },
  { label: "Combiné", threshold: "", description: "Bac + cendrier", icon: <span aria-hidden="true" className="h-3 w-3 rounded-full bg-violet-600" /> },
];

function LegendRow({ item, showThreshold = true }: { item: LegendItem; showThreshold?: boolean }) {
  return (
    <div role="listitem" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2.5 border-b border-sky-100/80 py-2 last:border-b-0">
      <span className="flex shrink-0 items-center justify-center">{item.icon}</span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold text-slate-950">{item.label}</span>
        <span className="font-medium text-slate-600">{item.description}</span>
      </span>
      {showThreshold && item.threshold ? <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{item.threshold}</span> : null}
    </div>
  );
}

function LegendGroup({ id, title, intro, items, showThreshold = true }: { id: string; title: string; intro?: string; items: LegendItem[]; showThreshold?: boolean }) {
  return (
    <section aria-labelledby={id} className="space-y-1.5">
      <h3 id={id} className="text-sm font-semibold text-slate-950">{title}</h3>
      {intro ? <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-800">{intro}</p> : null}
      <div role="list" className="divide-y divide-sky-100/80">
        {items.map((item) => <LegendRow key={item.label} item={item} showThreshold={showThreshold} />)}
      </div>
    </section>
  );
}

export function MapGeometryLegend({ scoreScope = "global", displayMode = "projected_today" }: { scoreScope?: PollutionScoreScope; displayMode?: CurrentPlaceStateMode }) {
  const isDepartmentScope = scoreScope === "department";
  const readingLabel = isDepartmentScope ? "Score relatif départemental" : displayMode === "observed" ? "Pollution observée" : "Pollution projetée";
  const readingIntro = isDepartmentScope
    ? "Les couleurs comparent le score réel de chaque action à la référence de son département. Ce score n'est pas projeté dans le temps."
    : displayMode === "observed"
      ? "Les couleurs indiquent la pollution observée ou mesurée. Aucune projection temporelle n'est utilisée."
      : "Les couleurs indiquent la pollution projetée à partir de la dernière action. Cette estimation ne constitue pas une mesure actuelle du terrain.";

  return (
    <section role="note" aria-label="Légende de la carte" className="pointer-events-auto w-[min(25rem,calc(100vw-1.5rem))] max-h-[min(32rem,calc(100dvh-10rem))] min-w-0 overflow-x-hidden overflow-y-auto rounded-2xl border border-sky-200/80 bg-white/95 p-4 text-slate-800 shadow-[0_18px_42px_-28px_rgba(14,165,233,0.45)] backdrop-blur-xl">
      <div className="flex items-start gap-2.5">
        <Info size={16} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="text-base font-semibold text-slate-950">Légende</p>
          <p className="text-sm font-medium leading-snug text-slate-600">{readingIntro}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Catégories principales de la légende">
        <div className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-slate-800"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundImage: `linear-gradient(90deg, ${ACTION_POLLUTION_COLOR_STOPS.map((stop) => resolveDynamicColor(stop.threshold)).join(", ")})` }} /><span className="min-w-0">Bleu → noir · {readingLabel}</span></div>
        <div className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-slate-800"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: CLEAN_PLACE_COLOR }} /><span className="min-w-0">Lieu propre</span></div>
        <div className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-slate-800"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: TRASH_SPOTTER_NEUTRAL_COLOR }} /><span className="min-w-0">Trash Spotter · neutre</span></div>
        <div className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-slate-800"><span aria-hidden="true" className="text-base leading-none text-violet-600">◇</span><span className="min-w-0">Infrastructure</span></div>
      </div>

      <CmmDisclosure tone="sky" summary="Détails de la légende">
        <div className="mt-3 space-y-4">
          <LegendGroup id="map-legend-pollution" title={readingLabel} intro={isDepartmentScope ? "Les cinq seuils sont normalisés par bénévole à partir de la référence du département. Comparez directement seulement les actions d'un même département." : displayMode === "observed" ? "Référence globale : les cinq seuils indiquent la pollution observée ou mesurée." : "Référence globale : les cinq seuils indiquent la pollution projetée après la projection temporelle éventuelle."} items={colorItems} />
          <LegendGroup id="map-legend-other-states" title="Autres états" items={otherStateItems} showThreshold={false} />
          <LegendGroup id="map-legend-infrastructure" title="Infrastructures" items={infrastructureItems} />
          <section aria-labelledby="map-legend-geometry" className="space-y-2">
            <h3 id="map-legend-geometry" className="text-sm font-semibold text-slate-950">Géométries</h3>
            <div className="grid gap-2 text-sm font-medium leading-snug text-slate-700">
              <p className="flex items-center gap-2"><span className="h-0.5 w-6 shrink-0 bg-slate-700" aria-hidden="true" />Trait plein : parcours déclaré ou connu</p>
              <p className="flex items-center gap-2"><span className="h-0.5 w-6 shrink-0 border-t-2 border-dashed border-slate-700" aria-hidden="true" />Trait pointillé : parcours reconstruit</p>
              <p className="flex items-center gap-2"><span className="h-3.5 w-6 shrink-0 rounded-sm border border-slate-700 bg-slate-500/25" aria-hidden="true" />Surface remplie : zone d&apos;action</p>
              <p className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full border border-slate-700 bg-slate-500/60" aria-hidden="true" />Point : localisation seule</p>
            </div>
            <p className="text-sm font-medium leading-snug text-slate-500">Zone indicative : opacité réduite et libellé explicite.</p>
          </section>
          <a href="/methodologie#methodologie-carte-actions" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-sm font-semibold leading-tight text-sky-800 transition hover:border-sky-300 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50">Voir la méthodologie détaillée</a>
        </div>
      </CmmDisclosure>
    </section>
  );
}
