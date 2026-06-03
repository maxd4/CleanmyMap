import type { ReactNode } from "react";
import { Cigarette, Info, Trash2 } from "lucide-react";
import {
  INFRASTRUCTURE_ALERT_THRESHOLD,
  SCORE_THRESHOLDS,
} from "@/components/actions/map-marker-categories";

type LegendItem = {
  label: string;
  threshold: string;
  note: string;
  icon: ReactNode;
};

const pollutionItems: LegendItem[] = [
  {
    label: "Bleu",
    threshold: "0 kg / 0 mégot",
    note: "Lieu propre",
    icon: <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.5)]" />,
  },
  {
    label: "Vert",
    threshold: `score < ${SCORE_THRESHOLDS.MEDIUM}`,
    note: "Faible",
    icon: <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />,
  },
  {
    label: "Jaune",
    threshold: `score ${SCORE_THRESHOLDS.MEDIUM}-${SCORE_THRESHOLDS.CRITICAL - 1}`,
    note: "Moyen/Fort",
    icon: <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.45)]" />,
  },
  {
    label: "Violet",
    threshold: `score ≥ ${SCORE_THRESHOLDS.CRITICAL}`,
    note: "Critique",
    icon: <span className="h-2.5 w-2.5 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />,
  },
];

const infrastructureItems: LegendItem[] = [
  {
    label: "Bac",
    threshold: `≥ ${INFRASTRUCTURE_ALERT_THRESHOLD}`,
    note: "Besoin collecte",
    icon: <Trash2 size={14} className="text-slate-700" />,
  },
  {
    label: "Cendrier",
    threshold: `≥ ${INFRASTRUCTURE_ALERT_THRESHOLD}`,
    note: "Besoin mégots",
    icon: <Cigarette size={14} className="text-slate-700" />,
  },
  {
    label: "Combiné",
    threshold: "bac + cendrier",
    note: "Double besoin",
    icon: <span className="h-2.5 w-2.5 rounded-full bg-violet-600 shadow-[0_0_12px_rgba(124,58,237,0.5)]" />,
  },
];

function LegendChip({ item }: { item: LegendItem }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-[0_10px_24px_-20px_rgba(6,17,30,0.18)]">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50">
        {item.icon}
      </div>
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-950">{item.label}</span>
          <span className="text-[10px] font-semibold text-slate-500">{item.threshold}</span>
        </div>
        <p className="text-[11px] font-medium leading-snug text-slate-600">{item.note}</p>
      </div>
    </div>
  );
}

export function MapLegend() {
  return (
    <section className="rounded-[2.5rem] border border-sky-200/80 bg-sky-50/85 p-6 shadow-[0_16px_40px_-30px_rgba(14,165,233,0.24)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-3 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
            <Info size={14} className="text-sky-700" />
            Légende
          </p>
          <p className="text-sm font-medium leading-relaxed text-slate-600">
            Deux scores séparés. Référence dynamique = plus grosse action par bénévole sur actions approuvées. Une nouvelle action plus forte devient le nouveau max.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
            Déchets: max kg / bénévole = 100
          </span>
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
            Mégots: max mégots / bénévole = 100
          </span>
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700">
            Couleur = max des 2 scores
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Pollution
          </p>
          <div className="grid gap-3">
            {pollutionItems.map((item) => (
              <LegendChip key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Infra
          </p>
          <div className="grid gap-3">
            {infrastructureItems.map((item) => (
              <LegendChip key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
