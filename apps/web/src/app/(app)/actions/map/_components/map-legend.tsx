import type { ReactNode } from "react";
import { Cigarette, Info, Trash2 } from "lucide-react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import {
  ACTION_POLLUTION_COLOR_STOPS,
  CLEAN_PLACE_COLOR,
  INFRASTRUCTURE_ALERT_THRESHOLD,
  TRASH_SPOTTER_NEUTRAL_COLOR,
  resolveDynamicColor,
} from "@/components/actions/map-marker-categories";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";

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
    icon: (
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: resolveDynamicColor(stop.threshold) }}
      />
    ),
  };
});

const otherStateItems: LegendItem[] = [
  {
    label: "Vert",
    threshold: "clean_place",
    description: "Lieu propre · clean_place",
    icon: (
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: CLEAN_PLACE_COLOR }}
      />
    ),
  },
  {
    label: "Trash Spotter",
    threshold: "niveau non quantifié",
    description: "Signalement neutre, non quantifié",
    icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TRASH_SPOTTER_NEUTRAL_COLOR }} />,
  },
];

const infrastructureItems: LegendItem[] = [
  {
    label: "Bac",
    threshold: `≥ ${INFRASTRUCTURE_ALERT_THRESHOLD}`,
    description: "Besoin collecte",
    icon: <Trash2 size={14} className="text-slate-700" />,
  },
  {
    label: "Cendrier",
    threshold: `≥ ${INFRASTRUCTURE_ALERT_THRESHOLD}`,
    description: "Besoin mégots",
    icon: <Cigarette size={14} className="text-slate-700" />,
  },
  {
    label: "Combiné",
    threshold: "",
    description: "Bac + cendrier",
    icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-violet-600" />,
  },
];

const pollutionGradient = `linear-gradient(90deg, ${ACTION_POLLUTION_COLOR_STOPS.map((stop) => resolveDynamicColor(stop.threshold)).join(", ")})`;

function LegendRow({ item, showThreshold = true }: { item: LegendItem; showThreshold?: boolean }) {
  return (
    <div role="listitem" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2.5 border-b border-sky-100/80 py-1.5 last:border-b-0">
      <span className="flex shrink-0 items-center justify-center">{item.icon}</span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold text-slate-950">{item.label}</span>
        <span className="font-medium text-slate-600">{item.description}</span>
      </span>
      {showThreshold && item.threshold ? <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{item.threshold}</span> : null}
    </div>
  );
}

function LegendGroup({
  id,
  title,
  intro,
  items,
  showThreshold = true,
}: {
  id: string;
  title: string;
  intro?: string;
  items: LegendItem[];
  showThreshold?: boolean;
}) {
  return (
    <section aria-labelledby={id} className="space-y-1.5">
      <h3 id={id} className="text-sm font-semibold text-slate-950">{title}</h3>
      {intro ? <p className="max-w-2xl text-xs font-medium leading-relaxed text-slate-600">{intro}</p> : null}
      <div role="list" className="divide-y divide-sky-100/80">
        {items.map((item) => (
          <LegendRow key={item.label} item={item} showThreshold={showThreshold} />
        ))}
      </div>
    </section>
  );
}

export function MapLegend({ scoreScope = "global" }: { scoreScope?: PollutionScoreScope }) {
  const isDepartmentScope = scoreScope === "department";

  return (
    <section className="rounded-3xl border border-sky-200/80 bg-sky-50/85 p-4 shadow-[0_16px_40px_-30px_rgba(14,165,233,0.24)] sm:p-5">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="flex items-center gap-2.5 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
            <Info size={14} className="text-sky-700" />
            Légende
          </p>
          <p className="text-sm font-medium leading-snug text-slate-600">
            {isDepartmentScope
              ? "Les couleurs comparent les actions à la référence de leur département. Les résultats terrain restent distincts."
              : "Les couleurs indiquent la pollution projetée. Les résultats terrain restent distincts."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2" aria-label="Catégories de la légende">
          <div className="flex min-w-0 items-center gap-2.5 py-0.5 text-xs font-semibold text-slate-800 sm:text-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundImage: pollutionGradient }}
            />
            <span className="min-w-0">Bleu → noir <span className="font-medium text-slate-600">{isDepartmentScope ? "Comparaison départementale" : "Pollution projetée"}</span></span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 py-0.5 text-xs font-semibold text-slate-800 sm:text-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CLEAN_PLACE_COLOR }}
            />
            <span className="min-w-0">Lieu propre</span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 py-0.5 text-xs font-semibold text-slate-800 sm:text-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: TRASH_SPOTTER_NEUTRAL_COLOR }}
            />
            <span className="min-w-0">Signalement <span className="font-medium text-slate-600">Trash Spotter</span></span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 py-0.5 text-xs font-semibold text-slate-800 sm:text-sm">
            <span aria-hidden="true" className="shrink-0 text-base leading-none text-violet-600">◇</span>
            <span className="min-w-0">Infrastructure</span>
          </div>
        </div>

        <CmmDisclosure
          tone="sky"
          summary="Détails de la légende"
        >
          <div className="mt-3 space-y-4">
            <LegendGroup
              id="map-legend-pollution"
              title={isDepartmentScope ? "Comparaison départementale" : "Pollution projetée"}
              intro={
                isDepartmentScope
                  ? "100 % correspond à l'intensité de collecte de référence la plus élevée du département, normalisée par bénévole-heure. Score relatif : ne comparez directement que les actions d'un même département."
                  : "Référence globale : les cinq seuils indiquent la pollution projetée, après la projection temporelle éventuelle."
              }
              items={colorItems}
            />
            <LegendGroup id="map-legend-other-states" title="Autres états" items={otherStateItems} showThreshold={false} />
            <LegendGroup id="map-legend-infrastructure" title="Infrastructures" items={infrastructureItems} />
          </div>
        </CmmDisclosure>
      </div>
    </section>
  );
}
