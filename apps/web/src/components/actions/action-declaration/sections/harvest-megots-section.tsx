"use client";

import { Cigarette, Droplet, Droplets } from "lucide-react";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import { MAX_CIGARETTE_BUTTS_COUNT } from "@/lib/waste/cigarette-butts";
import { formatCount, formatKg } from "../utils/harvest-utils";
import { DropletGauge, HarvestComparisonTrend } from "../ui/harvest-gauges";
import type { HarvestReferenceStatus } from "../utils/harvest-utils";
import { ACTION_MEASUREMENT_MAX_KG } from "@/lib/waste";
import {
  calculateCigaretteButtsLot,
  type CigaretteButtsLotInput,
} from "@/lib/waste/cigarette-butts";
import type { CigaretteButtsLotDraft } from "../model";

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

function MegotsHeader() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100"><Cigarette size={18} className="text-blue-700" /></div>
        <div><h3 className="text-base font-black tracking-tight text-slate-950">Mégots collectés</h3><p className="text-xs text-slate-500">Nombre, masse et volume</p></div>
      </div>
    </div>
  );
}

type HarvestMegotsSectionProps = {
  wasteMegotsKg: string;
  cigaretteButtsVolumeLiters: string;
  wasteMegotsCondition: ActionMegotsCondition;
  cigaretteButtsCount: string;
  megotsCount: number | null;
  megotsCurrentPerVolunteer: number | null;
  megotsBenchmarkPerVolunteer: number | null;
  megotsBenchmarkSourceCount?: number;
  megotsReferenceStatus?: HarvestReferenceStatus;
  megotsDeltaPercent?: number | null;
  /** Kept for typed compatibility with historical callers; the gauge uses the canonical average above. */
  megotsKg?: number | null;
  megotsComparisonTone?: "emerald" | "orange" | "slate";
  cigaretteButtsCountProvenance: string;
  cigaretteButtsMassProvenance: string;
  cigaretteButtsVolumeProvenance: string;
  cigaretteButtsInputSource?: string | null;
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

function MegotsConditionSelector({
  value,
  onChange,
}: {
  value: ActionMegotsCondition;
  onChange: (value: ActionMegotsCondition) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-bold text-slate-900">État des mégots</legend>
      <div id="harvest-megots-condition" className="grid grid-cols-3 overflow-hidden rounded-xl border border-blue-200 bg-white">
        {MEGOTS_CONDITIONS.map(({ value: condition, label, Icon }) => {
          const selected = condition === value;
          return (
            <label
              key={condition}
              className={selected
                ? "flex min-h-14 cursor-pointer items-center justify-center gap-1 border-2 border-blue-500 bg-blue-50 px-1 text-xs font-bold text-blue-950 outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset sm:gap-2 sm:px-2 sm:text-sm"
                : "flex min-h-14 cursor-pointer items-center justify-center gap-1 border border-transparent px-1 text-xs font-semibold text-slate-700 outline-none hover:bg-blue-50/60 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset sm:gap-2 sm:px-2 sm:text-sm"}
            >
              <input
                type="radio"
                name="harvest-megots-condition"
                value={condition}
                checked={selected}
                onChange={() => onChange(condition)}
                className="sr-only"
              />
              <Icon size={20} className={selected ? "text-blue-600" : "text-slate-500"} aria-hidden="true" />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function MegotsScalarInput({
  id,
  label,
  value,
  unit,
  provenance,
  isSource,
  min,
  max,
  step,
  inputMode,
  onChange,
  readOnly,
}: {
  id: string;
  label: string;
  value: string;
  unit: string;
  provenance: string;
  isSource: boolean;
  min: number;
  max: number;
  step: number;
  inputMode: "numeric" | "decimal";
  onChange: (value: string) => void;
  readOnly: boolean;
}) {
  const statusId = `${id}-status`;
  return (
    <label className="grid min-w-0 grid-cols-[minmax(4rem,auto)_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
      <span className="min-w-0 text-sm font-bold text-blue-950">{label}</span>
      <span className="flex min-w-0 items-center rounded-xl border border-blue-200 bg-white px-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        <input
          id={id}
          type="number"
          inputMode={inputMode}
          min={min}
          max={max}
          step={step}
          value={value}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          aria-describedby={statusId}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 appearance-none !bg-white py-2.5 text-base font-black !text-blue-950 outline-none sm:text-xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="ml-2 shrink-0 text-sm font-bold text-blue-800">{unit}</span>
      </span>
      <span id={statusId} className="col-start-2 block min-w-0 text-xs leading-4 text-slate-500">
        {isSource ? "source · mesure saisie" : formatProvenance(provenance)}
      </span>
    </label>
  );
}

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
            <option value="mouille">Mouillé</option>
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
  megotsCount,
  megotsCurrentPerVolunteer,
  megotsBenchmarkPerVolunteer,
  megotsBenchmarkSourceCount = 0,
  megotsReferenceStatus = megotsBenchmarkPerVolunteer === null || megotsBenchmarkPerVolunteer === undefined ? "unavailable" : "available",
  megotsDeltaPercent = null,
  cigaretteButtsCountProvenance,
  cigaretteButtsMassProvenance,
  cigaretteButtsVolumeProvenance,
  cigaretteButtsInputSource,
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
  const scalarFieldsReadOnly = hidePrimaryMeasurements || megotsLots !== null;

  return (
    <section className="flex h-full min-w-0 flex-col space-y-4 rounded-3xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/30 p-4 shadow-[0_12px_32px_-24px_rgba(37,99,235,0.55)] sm:p-5">
      <MegotsHeader />
      <div className="grid items-center gap-4 sm:grid-cols-2">
        <DropletGauge
          value={megotsCount}
          currentPerVolunteer={megotsCurrentPerVolunteer}
          benchmarkPerVolunteer={megotsBenchmarkPerVolunteer}
          benchmarkSourceCount={megotsBenchmarkSourceCount}
          referenceStatus={megotsReferenceStatus}
        />
        <div className="min-w-0 space-y-2">
          {!hidePrimaryMeasurements || megotsLots !== null ? (
            <div className="min-w-0 space-y-2">
              <MegotsScalarInput
                id="harvest-megots-count"
                label="Nombre"
                value={cigaretteButtsCount}
                unit="mégots"
                provenance={cigaretteButtsCountProvenance}
                isSource={cigaretteButtsInputSource === "count"}
                min={0}
                max={MAX_CIGARETTE_BUTTS_COUNT}
                step={1}
                inputMode="numeric"
                onChange={onMegotsCountChange}
                readOnly={scalarFieldsReadOnly}
              />
              <MegotsScalarInput
                id="harvest-megots-kg"
                label="Masse"
                value={wasteMegotsKg}
                unit="kg"
                provenance={cigaretteButtsMassProvenance}
                isSource={cigaretteButtsInputSource === "mass" || cigaretteButtsInputSource === "mass_kg"}
                min={0}
                max={ACTION_MEASUREMENT_MAX_KG}
                step={0.01}
                inputMode="decimal"
                onChange={onMegotsWeightChange}
                readOnly={scalarFieldsReadOnly}
              />
              <MegotsScalarInput
                id="harvest-megots-volume"
                label="Volume"
                value={cigaretteButtsVolumeLiters}
                unit="L"
                provenance={cigaretteButtsVolumeProvenance}
                isSource={cigaretteButtsInputSource === "volume_l"}
                min={0}
                max={ACTION_MEASUREMENT_MAX_KG}
                step={0.01}
                inputMode="decimal"
                onChange={onMegotsVolumeChange}
                readOnly={scalarFieldsReadOnly}
              />
            </div>
          ) : (
            <MegotsScalarInput
              id="harvest-megots-volume"
              label="Volume"
              value={cigaretteButtsVolumeLiters}
              unit="L"
              provenance={cigaretteButtsVolumeProvenance}
              isSource={cigaretteButtsInputSource === "volume_l"}
              min={0}
              max={ACTION_MEASUREMENT_MAX_KG}
              step={0.01}
              inputMode="decimal"
              onChange={onMegotsVolumeChange}
              readOnly
            />
          )}
          <HarvestComparisonTrend
            currentPerVolunteer={megotsCurrentPerVolunteer}
            benchmarkPerVolunteer={megotsBenchmarkPerVolunteer}
            deltaPercent={megotsDeltaPercent ?? null}
            benchmarkSourceCount={megotsBenchmarkSourceCount ?? 0}
            testId="butts-comparison-trend"
            unitLabel="par unité opérationnelle"
          />
          {megotsLots !== null ? <p className="text-xs text-blue-900/70">Total des lots : modifiez les contributions dans la zone ci-dessous.</p> : null}
        </div>
      </div>
      {megotsLots === null ? (
        <>
          <MegotsConditionSelector value={wasteMegotsCondition} onChange={onMegotsConditionChange} />
          <button type="button" onClick={onAddMegotsLot} className="w-full rounded-xl border border-dashed border-orange-300 bg-orange-50/50 px-4 py-3 text-sm font-bold text-orange-800 transition hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Ajouter un lot</button>
        </>
      ) : (
        <div className="space-y-3" data-testid="megots-lots-editor">
          <p className="text-xs font-semibold text-slate-600">Une mesure source par lot</p>
          {megotsLots.map((lot, index) => <MegotsLotEditor key={lot.id} draft={lot} index={index} total={megotsLots.length} onUpdate={onUpdateMegotsLot} onRemove={onRemoveMegotsLot} onMove={onMoveMegotsLot} />)}
          <button type="button" onClick={onAddMegotsLot} className="w-full rounded-xl border border-dashed border-orange-300 bg-orange-50/50 px-4 py-3 text-sm font-bold text-orange-800 transition hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Ajouter un lot</button>
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2 text-xs text-orange-900">
            <span className="font-bold">Total des lots</span>
            <span className="ml-3">{formatCount(megotsCounted)} comptés · {formatCount(megotsEstimated)} estimés · {formatKg(megotsMeasuredMassKg)} kg mesurés · {formatKg(megotsEstimatedMassKg)} kg estimés</span>
          </div>
        </div>
      )}
    </section>
  );
}
