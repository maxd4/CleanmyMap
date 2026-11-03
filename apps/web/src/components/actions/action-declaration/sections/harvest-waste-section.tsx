"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormState } from "../model";
import type { ValidationIssue } from "../model";
import {
  WasteCharacterizationSelector,
  type WasteCharacterizationFormValues,
} from "@/components/waste/waste-characterization-selector";
import {
  ACTION_WASTE_MASS_RESOLUTION_KG,
  ACTION_MEASUREMENT_MAX_KG,
  compareWasteBreakdownToTotal,
  type ActionWasteMeasurementMethod,
} from "@/lib/waste";
import { TrashBinGauge, WasteComparisonVisual } from "../ui/harvest-gauges";
import { HarvestMeasurementSlider } from "../ui/harvest-measurement-slider";
import {
  HARVEST_WASTE_SLIDER_EXTENSION_KG,
  HARVEST_WASTE_SLIDER_INITIAL_MAX_KG,
  formatKg,
} from "../utils/harvest-utils";

type HarvestWasteSectionProps = {
  wasteKg: string;
  onWasteKgChange: (value: string) => void;
  // Tri détaillé
  wasteMeasurementMethod: ActionWasteMeasurementMethod | "";
  wasteRecyclablesKg: string;
  wasteGlassKg: string;
  wasteHouseholdKg: string;
  wasteOtherKg: string;
  wasteCharacterizationKg?: FormState["wasteCharacterizationKg"];
  wasteUnusualObjects: string;
  wasteSpecialHandlingWaste: string;
  onMeasurementMethodChange: (value: ActionWasteMeasurementMethod | "") => void;
  notes: string;
  onTriChange: <K extends "wasteRecyclablesKg" | "wasteGlassKg" | "wasteHouseholdKg" | "wasteOtherKg" | "wasteCharacterizationKg" | "wasteUnusualObjects" | "wasteSpecialHandlingWaste" | "notes">(
    key: K, value: FormState[K]
  ) => void;
  hidePrimaryMeasurement?: boolean;
  wasteCurrentPerVolunteer: number | null;
  wasteBenchmarkPerVolunteer: number | null;
  wasteBenchmarkSourceCount: number;
  wasteDeltaPercent: number | null;
  comparisonTone: "emerald" | "orange" | "slate";
  validationIssues: ValidationIssue[];
};

const triInputCls = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";
const useDisclosureLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function HarvestWasteHeader() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
          <Trash2 size={18} className="text-emerald-700" />
        </div>
        <div>
          <h3 className="text-base font-black tracking-tight text-slate-950">Déchets collectés</h3>
          <p className="text-xs text-slate-500">Masse totale hors mégots</p>
        </div>
      </div>
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
        Mesure déclarée
      </span>
    </div>
  );
}

function WastePrimaryMeasurement({
  value,
  hidden,
  onChange,
}: { value: string; hidden: boolean; onChange: (value: string) => void }) {
  if (hidden) return null;
  return (
    <HarvestMeasurementSlider
      id="harvest-waste-kg"
      exactInputId="harvest-waste-kg-exact"
      exactInputLabel="Saisie exacte (kg)"
      exactInputMode="decimal"
      label="Masse collectée"
      value={value}
      initialMax={HARVEST_WASTE_SLIDER_INITIAL_MAX_KG}
      extension={HARVEST_WASTE_SLIDER_EXTENSION_KG}
      absoluteMax={ACTION_MEASUREMENT_MAX_KG}
      step={ACTION_WASTE_MASS_RESOLUTION_KG}
      unit="kg"
      accent="emerald"
      formatValue={formatKg}
      onChange={onChange}
    />
  );
}

function WasteMeasurementMethod({
  value,
  onChange,
}: { value: ActionWasteMeasurementMethod | ""; onChange: (value: ActionWasteMeasurementMethod | "") => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-500">Méthode de mesure (facultatif)</span>
      <select value={value} onChange={(event) => onChange(event.target.value as ActionWasteMeasurementMethod | "")} className={triInputCls}>
        <option value="">Non renseignée</option>
        <option value="balance_suspendue">Balance suspendue</option>
        <option value="balance_au_sol">Balance au sol</option>
        <option value="estimation_visuelle">Estimation visuelle</option>
        <option value="autre">Autre</option>
        <option value="inconnue">Inconnue</option>
      </select>
    </label>
  );
}

export function HarvestWasteSection({
  wasteKg,
  onWasteKgChange,
  wasteMeasurementMethod,
  wasteRecyclablesKg,
  wasteGlassKg,
  wasteHouseholdKg,
  wasteOtherKg,
  wasteCharacterizationKg = {},
  wasteUnusualObjects,
  wasteSpecialHandlingWaste,
  onMeasurementMethodChange,
  notes,
  onTriChange,
  hidePrimaryMeasurement = false,
  wasteCurrentPerVolunteer,
  wasteBenchmarkPerVolunteer,
  wasteBenchmarkSourceCount,
  wasteDeltaPercent,
  comparisonTone,
  validationIssues,
}: HarvestWasteSectionProps) {
  const [legacyTriOpen, setLegacyTriOpen] = useState(false);
  const hasTriValidationIssues = validationIssues.some((issue) =>
    issue.field === "wasteRecyclablesKg" ||
    issue.field === "wasteGlassKg" ||
    issue.field === "wasteHouseholdKg" ||
    issue.field === "wasteOtherKg",
  );

  useDisclosureLayoutEffect(() => {
    if (hasTriValidationIssues) setLegacyTriOpen(true);
  }, [hasTriValidationIssues, validationIssues]);

  const parseKg = (value: string): number | null => {
    const parsed = Number(value);
    return value.trim().length > 0 && Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : null;
  };
  const coherence = compareWasteBreakdownToTotal(parseKg(wasteKg), {
    recyclablesKg: parseKg(wasteRecyclablesKg),
    glassKg: parseKg(wasteGlassKg),
    householdWasteKg: parseKg(wasteHouseholdKg),
    otherWasteKg: parseKg(wasteOtherKg),
  });
  return (
    <section className="min-w-0 space-y-4 rounded-3xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 p-4 shadow-[0_12px_32px_-24px_rgba(5,150,105,0.55)] sm:p-5">
      <HarvestWasteHeader />
      <TrashBinGauge value={parseKg(wasteKg)} />
      <WastePrimaryMeasurement value={wasteKg} hidden={hidePrimaryMeasurement} onChange={onWasteKgChange} />
      <WasteComparisonVisual
        currentPerVolunteer={wasteCurrentPerVolunteer}
        benchmarkPerVolunteer={wasteBenchmarkPerVolunteer}
        benchmarkSourceCount={wasteBenchmarkSourceCount}
        deltaPercent={wasteDeltaPercent}
        comparisonTone={comparisonTone}
      />
      <WasteMeasurementMethod value={wasteMeasurementMethod} onChange={onMeasurementMethodChange} />

      <WasteCharacterizationSelector
        characterizationKg={wasteCharacterizationKg as WasteCharacterizationFormValues}
        totalWasteKg={parseKg(wasteKg)}
        onCharacterizationChange={(value) => onTriChange("wasteCharacterizationKg", value as FormState["wasteCharacterizationKg"])}
        error={validationIssues.find((issue) => issue.field === "wasteCharacterizationKg")?.message}
      />

      {/* Historical four-field ventilation remains available for old records. */}
      <div className="border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setLegacyTriOpen((v) => !v)}
          aria-expanded={legacyTriOpen}
          aria-controls={legacyTriOpen ? "harvest-waste-tri-details" : undefined}
          className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <span>Ventilation historique</span>
          <ChevronDown size={14} className={cn("transition-transform", legacyTriOpen && "rotate-180")} />
        </button>

        {legacyTriOpen && (
          <div id="harvest-waste-tri-details" className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            {coherence.status === "warning" ? (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                Ventilation historique et total diffèrent. Vérifiez les valeurs.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "wasteRecyclablesKg" as const, id: "harvest-waste-recyclables-kg", label: "Recyclables (kg)", value: wasteRecyclablesKg },
                { key: "wasteGlassKg" as const,       id: "harvest-waste-glass-kg", label: "Verre (kg)",       value: wasteGlassKg },
                { key: "wasteHouseholdKg" as const,   id: "harvest-waste-household-kg", label: "Déchets ménagers (kg)", value: wasteHouseholdKg },
                { key: "wasteOtherKg" as const,       id: "harvest-waste-other-kg", label: "Autres déchets (kg)", value: wasteOtherKg },
              ].map(({ key, id, label, value }) => (
                <label key={key} className="block space-y-1">
                  <span className="text-xs font-medium text-slate-400">{label}</span>
                  <input
                    id={id}
                    type="number"
                    min="0"
                    step={ACTION_WASTE_MASS_RESOLUTION_KG}
                    max={ACTION_MEASUREMENT_MAX_KG}
                    placeholder="0"
                    className={triInputCls}
                    value={value}
                    onChange={(e) => onTriChange(key, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-400">Objets insolites (facultatif)</span>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder="Ex. objet trouvé ou volume inhabituel"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 resize-none"
                value={wasteUnusualObjects}
                onChange={(e) => onTriChange("wasteUnusualObjects", e.target.value)}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-400">Filière ou point spécialisé (facultatif)</span>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder="Ex. pile, seringue, DEEE ou objet à orienter"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 resize-none"
                value={wasteSpecialHandlingWaste}
                onChange={(e) => onTriChange("wasteSpecialHandlingWaste", e.target.value)}
              />
            </label>

          </div>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-500">Notes générales sur la collecte</span>
        <textarea
          rows={3}
          placeholder="Observations, contexte particulier, difficultés rencontrées…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 resize-none"
          value={notes}
          onChange={(e) => onTriChange("notes", e.target.value)}
        />
      </label>
    </section>
  );
}
