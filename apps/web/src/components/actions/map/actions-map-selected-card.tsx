"use client";

import { Calendar, MapPin, Trash2, Users, Clock, Sparkles, Layers3, ShieldCheck, X } from "lucide-react";
import type { ActionMapItem } from "@/lib/actions/types";
import { buildSelectedActionCardModel } from "./actions-map-selected-card.utils";

type ActionsMapSelectedCardProps = {
  item: ActionMapItem;
  onClear: () => void;
};

function Badge({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "emerald" | "sky" | "amber" | "violet";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tones[tone]}`}>
      {label}
    </span>
  );
}

export function ActionsMapSelectedCard({ item, onClear }: ActionsMapSelectedCardProps) {
  const model = buildSelectedActionCardModel(item);

  return (
    <section className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <Layers3 size={16} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                Sélection carte
              </p>
              <p className="text-xs font-medium text-slate-500">
                Détail compact de l&apos;action active
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-950">
              {model.title}
            </h3>
            <p className="text-xs font-semibold text-slate-500">{model.subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Désélectionner l'action"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge label={model.statusLabel} tone="emerald" />
        <Badge label={model.impactLabel} tone="amber" />
        <Badge label={model.qualityLabel} tone="sky" />
        <Badge label={model.geometryModeLabel} tone="violet" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lieu</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{model.title}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Coordonnées</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{model.coordinatesLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Géométrie</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{model.geometryLabel}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {model.geometryPointLabel}
            {model.geometryConfidenceLabel ? ` · ${model.geometryConfidenceLabel}` : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Type</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{model.recordTypeLabel}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">{model.placeTypeLabel}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Trash2 size={12} />
            <span className="text-[10px] font-black uppercase">Kg</span>
          </div>
          <p className="mt-1 text-sm font-black text-slate-900">{model.wasteLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Sparkles size={12} />
            <span className="text-[10px] font-black uppercase">Mégots</span>
          </div>
          <p className="mt-1 text-sm font-black text-slate-900">{model.buttsLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Users size={12} />
            <span className="text-[10px] font-black uppercase">Équipe</span>
          </div>
          <p className="mt-1 text-sm font-black text-slate-900">{model.volunteersLabel}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock size={12} />
            <span className="text-[10px] font-black uppercase">Durée</span>
          </div>
          <p className="mt-1 text-sm font-black text-slate-900">{model.durationLabel}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar size={12} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">Date</span>
          </div>
          <span className="text-xs font-bold text-slate-900">{model.dateLabel}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin size={12} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">Source</span>
          </div>
          <span className="text-xs font-bold text-slate-900">{model.sourceLabel}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck size={12} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">Trajet</span>
          </div>
          <span className="text-xs font-bold text-slate-900">{model.routeLabel}</span>
        </div>
      </div>

      {model.notes ? (
        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Notes</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{model.notes}</p>
        </div>
      ) : null}
    </section>
  );
}
