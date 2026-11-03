"use client";

import { Cigarette, Droplet, Droplets } from "lucide-react";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import { formatCount, formatKg } from "../utils/harvest-utils";
import { ButtsComparisonVisual, DropletGauge } from "../ui/harvest-gauges";
import { ACTION_MEASUREMENT_MAX_KG } from "@/lib/waste";
import {
  calculateCigaretteButtsLot,
  type CigaretteButtsLotInput,
} from "@/lib/waste/cigarette-butts";
import type { CigaretteButtsLotDraft } from "../model";
import { HarvestMeasurementSlider } from "../ui/harvest-measurement-slider";
import {
  HARVEST_BUTTS_SLIDER_EXTENSION_COUNT,
  HARVEST_BUTTS_SLIDER_INITIAL_MAX_COUNT,
} from "../utils/harvest-utils";

function formatProvenance(provenance: string): string {
  switch (provenance) {
    case "counted": return "compté";
    case "measured": return "mesuré";
    case "weight_converted": return "estimé";
    case "volume_converted": return "estimé";
    case "estimated": return "estimé";
    case "unknown": return "non qualifié";
    default: return "non renseigné";
  }
}

function MegotsHeader({
  megotsCount,
  provenance,
}: { megotsCount: number | null; provenance: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center"><Cigarette size={15} className="text-amber-600" /></div>
        <div><p className="text-sm font-semibold text-slate-900">Mégots collectés</p><p className="text-xs text-slate-500">Nombre et masse séparés.</p></div>
      </div>
      {megotsCount !== null ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{provenance === "counted" ? "" : "≈ "}{formatCount(megotsCount)} mégots</span> : null}
    </div>
  );
}

type HarvestMegotsSectionProps = {
  wasteMegotsKg: string;
  cigaretteButtsVolumeLiters: string;
  wasteMegotsCondition: ActionMegotsCondition;
  cigaretteButtsCount: string;
  megotsKg: number | null;
  megotsCount: number | null;
  megotsCurrentPerVolunteer: number | null;
  megotsBenchmarkPerVolunteer: number | null;
  megotsBenchmarkSourceCount: number;
  megotsDeltaPercent: number | null;
  megotsComparisonTone: "emerald" | "orange" | "slate";
  cigaretteButtsCountProvenance: string;
  cigaretteButtsMassProvenance: string;
  cigaretteButtsVolumeProvenance: string;
  cigaretteButtsConversionFormulaVersion: string | null;
  megotsLots?: CigaretteButtsLotDraft[] | null;
  megotsCounted?: number;
  megotsEstimated?: number;
  megotsMeasuredMassKg?: number;
  megotsEstimatedMassKg?: number;
  onAddMegotsLot?: () => void;
  onUpdateMegotsLot?: (id: string, patch: Partial<Omit<CigaretteButtsLotDraft, "id">>) => void;
  onRemoveMegotsLot?: (id: string) => void;
  onMoveMegotsLot?: (id: string, direction: -1 | 1) => void;
  onMegotsWeightChange: (value: string) => void;
  onMegotsVolumeChange: (value: string) => void;
  onMegotsCountChange: (value: string) => void;
  onMegotsConditionChange: (value: ActionMegotsCondition) => void;
  hidePrimaryMeasurements?: boolean;
};

function parseLot(draft: CigaretteButtsLotDraft): CigaretteButtsLotInput | null {
  if (!draft.value.trim()) return null;
  const value = Number(draft.value);
  if (!Number.isFinite(value) || value < 0 || (draft.source === "count" && !Number.isInteger(value))) return null;
  return { id: draft.id, source: draft.source, value, condition: draft.condition };
}

function lotSourceLabel(source: CigaretteButtsLotDraft["source"]): string {
  return source === "count" ? "Nombre" : source === "mass_kg" ? "Masse (kg)" : "Volume (L)";
}

const MEGOTS_CONDITIONS: Array<{ value: ActionMegotsCondition; label: string; Icon: typeof Droplet }> = [
  { value: "propre", label: "Sec / Propre", Icon: Droplet },
  { value: "humide", label: "Humide", Icon: Droplets },
  { value: "mouille", label: "Mouillé", Icon: Droplets },
];

function MegotsLotEditor({
  draft,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  draft: CigaretteButtsLotDraft;
  index: number;
  total: number;
  onUpdate: HarvestMegotsSectionProps["onUpdateMegotsLot"];
  onRemove: HarvestMegotsSectionProps["onRemoveMegotsLot"];
  onMove: HarvestMegotsSectionProps["onMoveMegotsLot"];
}) {
  const projection = parseLot(draft);
  const result = projection ? calculateCigaretteButtsLot(projection) : null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3" data-testid={`megots-lot-${draft.id}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">Lot {index + 1}</p>
        <div className="flex gap-1">
          <button type="button" aria-label={`Monter le lot ${index + 1}`} disabled={index === 0} onClick={() => onMove?.(draft.id, -1)} className="rounded-lg px-2 py-1 text-xs text-slate-600 disabled:opacity-30">↑</button>
          <button type="button" aria-label={`Descendre le lot ${index + 1}`} disabled={index === total - 1} onClick={() => onMove?.(draft.id, 1)} className="rounded-lg px-2 py-1 text-xs text-slate-600 disabled:opacity-30">↓</button>
          <button type="button" aria-label={`Supprimer le lot ${index + 1}`} onClick={() => onRemove?.(draft.id)} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700">Supprimer</button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-500">Mesure source</span>
          <select value={draft.source} onChange={(event) => onUpdate?.(draft.id, { source: event.target.value as CigaretteButtsLotDraft["source"] })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
            <option value="count">Nombre de mégots</option>
            <option value="mass_kg">Masse (kg)</option>
            <option value="volume_l">Volume (L)</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-500">Valeur {lotSourceLabel(draft.source)}</span>
          <input id={`harvest-megots-lot-${draft.id}`} inputMode="decimal" type="number" min="0" step={draft.source === "count" ? 1 : 0.01} value={draft.value} onChange={(event) => onUpdate?.(draft.id, { value: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-bold text-slate-900" />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-500">État</span>
          <select value={draft.condition} onChange={(event) => onUpdate?.(draft.id, { condition: event.target.value as ActionMegotsCondition })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
            <option value="propre">Sec / Propre</option>
            <option value="humide">Humide</option>
            <option value="mouille">Très mouillé</option>
          </select>
        </label>
      </div>
      {result ? <p className="text-xs leading-5 text-amber-800">Équivalents : {formatCount(result.count)} mégots · {result.massKg === null ? "masse indisponible" : `${formatKg(result.massKg)} kg ${result.massProvenance === "measured" ? "mesurés" : "estimés"}`}.</p> : <p className="text-xs text-slate-500">Saisissez une valeur non négative.</p>}
    </div>
  );
}

export function HarvestMegotsSection({
  wasteMegotsKg,
  cigaretteButtsVolumeLiters,
  wasteMegotsCondition,
  cigaretteButtsCount,
  megotsKg,
  megotsCount,
  megotsCurrentPerVolunteer,
  megotsBenchmarkPerVolunteer,
  megotsBenchmarkSourceCount,
  megotsDeltaPercent,
  megotsComparisonTone,
  cigaretteButtsCountProvenance,
  cigaretteButtsMassProvenance,
  cigaretteButtsVolumeProvenance,
  megotsLots = null,
  megotsCounted = 0,
  megotsEstimated = 0,
  megotsMeasuredMassKg = 0,
  megotsEstimatedMassKg = 0,
  onAddMegotsLot,
  onUpdateMegotsLot,
  onRemoveMegotsLot,
  onMoveMegotsLot,
  onMegotsWeightChange,
  onMegotsVolumeChange,
  onMegotsCountChange,
  onMegotsConditionChange,
  hidePrimaryMeasurements = false,
}: HarvestMegotsSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      <MegotsHeader megotsCount={megotsCount} provenance={cigaretteButtsCountProvenance} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-slate-900">État des mégots</legend>
        <div id="harvest-megots-condition" role="radiogroup" aria-label="État des mégots" className="grid grid-cols-3 overflow-hidden rounded-xl border border-blue-200 bg-white">
          {MEGOTS_CONDITIONS.map(({ value, label, Icon }) => {
            const selected = value === wasteMegotsCondition;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onMegotsConditionChange(value)}
                className={selected
                  ? "flex min-h-14 items-center justify-center gap-2 border-2 border-blue-500 bg-blue-50 px-2 text-sm font-bold text-blue-950 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                  : "flex min-h-14 items-center justify-center gap-2 border border-transparent px-2 text-sm font-semibold text-slate-700 outline-none hover:bg-blue-50/60 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"}
              >
                <Icon size={20} className={selected ? "text-blue-600" : "text-slate-500"} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
        Une mesure source par lot.
      </p>

      {megotsLots !== null ? (
        <div className="space-y-3" data-testid="megots-lots-editor">
          {megotsLots.map((lot, index) => <MegotsLotEditor key={lot.id} draft={lot} index={index} total={megotsLots.length} onUpdate={onUpdateMegotsLot} onRemove={onRemoveMegotsLot} onMove={onMoveMegotsLot} />)}
          <button type="button" onClick={onAddMegotsLot} className="w-full rounded-xl border border-dashed border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-800">Ajouter un lot</button>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Total des lots</p>
            <p>{formatCount(megotsCounted)} comptés · {formatCount(megotsEstimated)} estimés</p>
            <p>{formatKg(megotsMeasuredMassKg)} kg mesurés · {formatKg(megotsEstimatedMassKg)} kg estimés</p>
          </div>
          <HarvestMeasurementSlider
            id="harvest-megots-count-slider"
            label="Nombre de mégots"
            value={megotsCount === null ? "" : String(megotsCount)}
            initialMax={HARVEST_BUTTS_SLIDER_INITIAL_MAX_COUNT}
            extension={HARVEST_BUTTS_SLIDER_EXTENSION_COUNT}
            absoluteMax={MAX_CIGARETTE_BUTTS_COUNT}
            step={1}
            unit="mégots"
            accent="blue"
            formatValue={formatCount}
            readOnly
            readOnlyLabel="Total des lots : modifiez les valeurs dans chaque lot."
          />
        </div>
      ) : null}

      {megotsLots === null && !hidePrimaryMeasurements ? (
        <>
          <HarvestMeasurementSlider
            id="harvest-megots-count-slider"
            exactInputId="harvest-megots-count"
            exactInputLabel="Saisie exacte (mégots)"
            label="Nombre de mégots"
            value={cigaretteButtsCount}
            initialMax={HARVEST_BUTTS_SLIDER_INITIAL_MAX_COUNT}
            extension={HARVEST_BUTTS_SLIDER_EXTENSION_COUNT}
            absoluteMax={MAX_CIGARETTE_BUTTS_COUNT}
            step={1}
            unit="mégots"
            accent="blue"
            formatValue={formatCount}
            onChange={onMegotsCountChange}
          />

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-500">Masse de mégots (kg)</span>
            <input
              id="harvest-megots-kg"
              inputMode="decimal"
              type="number"
              step="0.01"
              min="0"
              max={ACTION_MEASUREMENT_MAX_KG}
              className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 placeholder:text-slate-300"
              value={wasteMegotsKg}
              onChange={(e) => onMegotsWeightChange(e.target.value)}
              placeholder="Ex : 0,25"
            />
          </label>
        </>
      ) : null}

      {megotsLots === null ? <button type="button" onClick={onAddMegotsLot} className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/40 px-4 py-3 text-sm font-semibold text-amber-800">Ajouter des collectes distinctes par lots</button> : null}

      {megotsCount !== null || megotsKg !== null ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {megotsCount !== null ? (
              <div>
                <p className="text-xs font-semibold text-amber-800">Nombre retenu</p>
                <p className="text-sm font-bold text-amber-900">{formatCount(megotsCount)} mégots</p>
                <p className="mt-1 text-xs text-amber-700">Statut : {formatProvenance(cigaretteButtsCountProvenance)}.</p>
              </div>
            ) : null}
            {megotsKg !== null ? (
              <div>
                <p className="text-xs font-semibold text-amber-800">Masse retenue</p>
                <p className="text-sm font-bold text-amber-900">{formatKg(megotsKg)} kg</p>
                <p className="mt-1 text-xs text-amber-700">Statut : {formatProvenance(cigaretteButtsMassProvenance)}.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <DropletGauge value={megotsCount} />
      <ButtsComparisonVisual
        currentPerVolunteer={megotsCurrentPerVolunteer}
        benchmarkPerVolunteer={megotsBenchmarkPerVolunteer}
        benchmarkSourceCount={megotsBenchmarkSourceCount}
        deltaPercent={megotsDeltaPercent}
        comparisonTone={megotsComparisonTone}
      />

      {megotsLots === null ? <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-500">Volume (L), facultatif pour le mode historique</span>
        <input
          id="harvest-megots-volume"
          inputMode="decimal"
          type="number"
          step="0.01"
          min="0"
          max={ACTION_MEASUREMENT_MAX_KG}
          className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-bold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 placeholder:text-slate-300"
          value={cigaretteButtsVolumeLiters}
          onChange={(e) => onMegotsVolumeChange(e.target.value)}
          placeholder="Ex : 1,5"
        />
        <span className="block text-xs leading-snug text-slate-400">
          Mesure complémentaire, séparée.
        </span>
        {cigaretteButtsVolumeLiters.trim() ? (
          <span className="block text-xs leading-snug text-slate-500">
            Statut : {formatProvenance(cigaretteButtsVolumeProvenance)}.
          </span>
        ) : null}
      </label> : null}
    </section>
  );
}
