import type { ReactNode } from "react";
import { Cigarette, Info, Trash2 } from "lucide-react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import {
  ACTION_POLLUTION_COLOR_THRESHOLDS,
  INFRASTRUCTURE_ALERT_THRESHOLD,
  TRASH_SPOTTER_NEUTRAL_COLOR,
} from "@/components/actions/map-marker-categories";

type LegendItem = {
  label: string;
  threshold: string;
  description: string;
  icon: ReactNode;
};

const colorItems: LegendItem[] = [
  {
    label: "Bleu",
    threshold: `< ${ACTION_POLLUTION_COLOR_THRESHOLDS.ORANGE}`,
    description: "Faible",
    icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sky-500" />,
  },
  {
    label: "Orange",
    threshold: `${ACTION_POLLUTION_COLOR_THRESHOLDS.ORANGE}–${ACTION_POLLUTION_COLOR_THRESHOLDS.RED - 1}`,
    description: "Moyenne",
    icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-orange-500" />,
  },
  {
    label: "Rouge",
    threshold: `${ACTION_POLLUTION_COLOR_THRESHOLDS.RED}–${ACTION_POLLUTION_COLOR_THRESHOLDS.VIOLET - 1}`,
    description: "Forte",
    icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-red-500" />,
  },
  {
    label: "Violet",
    threshold: `${ACTION_POLLUTION_COLOR_THRESHOLDS.VIOLET}–${ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK - 1}`,
    description: "Critique",
    icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-violet-500" />,
  },
  {
    label: "Noir",
    threshold: `≥ ${ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK}`,
    description: "Extrême",
    icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-slate-950" />,
  },
];

const otherStateItems: LegendItem[] = [
  {
    label: "Vert",
    threshold: "clean_place",
    description: "Lieu propre · clean_place",
    icon: <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-500" />,
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

function LegendGroup({ id, title, items, showThreshold = true }: { id: string; title: string; items: LegendItem[]; showThreshold?: boolean }) {
  return (
    <section aria-labelledby={id} className="space-y-1.5">
      <h3 id={id} className="text-sm font-semibold text-slate-950">{title}</h3>
      <div role="list" className="divide-y divide-sky-100/80">
        {items.map((item) => (
          <LegendRow key={item.label} item={item} showThreshold={showThreshold} />
        ))}
      </div>
    </section>
  );
}

export function MapLegend() {
  return (
    <section className="rounded-3xl border border-sky-200/80 bg-sky-50/85 p-4 shadow-[0_16px_40px_-30px_rgba(14,165,233,0.24)] sm:p-5">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="flex items-center gap-2.5 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
            <Info size={14} className="text-sky-700" />
            Légende
          </p>
          <p className="text-sm font-medium leading-snug text-slate-600">
            Les couleurs indiquent la pollution projetée. Les résultats terrain restent distincts.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2" aria-label="Catégories de la légende">
          <div className="flex min-w-0 items-center gap-2.5 py-0.5 text-xs font-semibold text-slate-800 sm:text-sm">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r from-sky-500 via-orange-500 to-slate-950" />
            <span className="min-w-0">Bleu → noir <span className="font-medium text-slate-600">Pollution projetée</span></span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 py-0.5 text-xs font-semibold text-slate-800 sm:text-sm">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="min-w-0">Lieu propre</span>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 py-0.5 text-xs font-semibold text-slate-800 sm:text-sm">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
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
            <LegendGroup id="map-legend-pollution" title="Pollution projetée" items={colorItems} />
            <LegendGroup id="map-legend-other-states" title="Autres états" items={otherStateItems} showThreshold={false} />
            <LegendGroup id="map-legend-infrastructure" title="Infrastructures" items={infrastructureItems} />
          </div>
        </CmmDisclosure>
      </div>
    </section>
  );
}
