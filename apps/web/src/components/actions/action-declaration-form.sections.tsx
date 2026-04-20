import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { computeButtsCount } from "@/lib/actions/data-contract";
import type { ActionDrawing, ActionMegotsCondition } from "@/lib/actions/types";
import type { FormState } from "./action-declaration-form.model";
import { toRequiredNumber } from "./action-declaration-form.model";

type UpdateField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type DrawingMapProps = {
  value: ActionDrawing | null;
  onChange: (drawing: ActionDrawing | null) => void;
  wasteKg?: number;
  butts?: number;
  isCleanPlace?: boolean;
};

type CompleteModeFieldsProps = {
  isQuickMode: boolean;
  effectiveManualDrawingEnabled: boolean;
  manualDrawingEnabled: boolean;
  setManualDrawingEnabled: (value: boolean) => void;
  drawingIsValid: boolean;
  manualDrawing: ActionDrawing | null;
  setManualDrawing: (value: ActionDrawing | null) => void;
  form: FormState;
  updateField: UpdateField;
  drawingMapComponent: ComponentType<DrawingMapProps>;
};

export function ActionDeclarationMegotsSection({
  form,
  updateField,
}: {
  form: FormState;
  updateField: UpdateField;
}) {
  return (
    <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-semibold text-slate-700">
        Extraction de Mégots
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Masse de mégots (kg ou g)
          <input
            type="number"
            step="0.01"
            min="0"
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.wasteMegotsKg}
            onChange={(event) => updateField("wasteMegotsKg", event.target.value)}
            placeholder="Ex: 0.5"
          />
          <p className="text-[10px] italic text-slate-500">
            Entrez 0.05 pour 50g
          </p>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Qualité / État des mégots
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.wasteMegotsCondition}
            onChange={(event) =>
              updateField(
                "wasteMegotsCondition",
                event.target.value as ActionMegotsCondition,
              )
            }
          >
            <option value="propre">Propre (Sec, facile à recycler)</option>
            <option value="humide">
              Humide / Avec impuretés (Terre, sable)
            </option>
            <option value="mouille">
              Mouillé (Saturé d&apos;eau, après pluie)
            </option>
          </select>
        </label>
      </div>

      {toRequiredNumber(form.wasteMegotsKg, 0) > 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md p-[2px]"
        >
          <div className="bg-white rounded-[10px] p-3 text-center">
            <h4 className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Impact Ecologique</h4>
            <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-lg">
              <span>💧</span>
              <span>
                {(computeButtsCount(
                  toRequiredNumber(form.wasteMegotsKg, 0),
                  form.wasteMegotsCondition,
                ) * 500).toLocaleString("fr-FR")} L d'eau préservés
              </span>
            </div>
            <p className="text-[10px] mt-1 text-slate-400 font-medium">Basé sur ~{computeButtsCount(
                  toRequiredNumber(form.wasteMegotsKg, 0),
                  form.wasteMegotsCondition,
                ).toLocaleString("fr-FR")} mégots extraits</p>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

export function ActionDeclarationCompleteModeFields({
  isQuickMode,
  effectiveManualDrawingEnabled,
  manualDrawingEnabled,
  setManualDrawingEnabled,
  drawingIsValid,
  manualDrawing,
  setManualDrawing,
  form,
  updateField,
  drawingMapComponent: DrawingMapComponent,
}: CompleteModeFieldsProps) {
  if (isQuickMode) {
    return null;
  }



  return (
    <>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Latitude (optionnel)
            <input
              type="number"
              step="any"
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
              value={form.latitude}
              onChange={(event) => updateField("latitude", event.target.value)}
              placeholder="48.8566"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Longitude (optionnel)
            <input
              type="number"
              step="any"
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
              value={form.longitude}
              onChange={(event) => updateField("longitude", event.target.value)}
              placeholder="2.3522"
            />
          </label>


      <label className="flex flex-col gap-2 text-sm text-slate-700">
        Duree (minutes)
        <input
          type="number"
          min="0"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
          value={form.durationMinutes}
          onChange={(event) => updateField("durationMinutes", event.target.value)}
        />
      </label>

      <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
        Commentaire (optionnel)
        <textarea
          className="min-h-[110px] rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          maxLength={1000}
          placeholder="Ex: presence de nombreux megots pres des bouches de metro."
        />
      </label>

      <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tri par filiere (optionnel)
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.wastePlastiqueKg}
            onChange={(event) => updateField("wastePlastiqueKg", event.target.value)}
            placeholder="Plastique kg"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.wasteVerreKg}
            onChange={(event) => updateField("wasteVerreKg", event.target.value)}
            placeholder="Verre kg"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.wasteMetalKg}
            onChange={(event) => updateField("wasteMetalKg", event.target.value)}
            placeholder="Metal kg"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.wasteMixteKg}
            onChange={(event) => updateField("wasteMixteKg", event.target.value)}
            placeholder="Mixte kg"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
          />
          <select
            value={form.triQuality}
            onChange={(event) =>
              updateField(
                "triQuality",
                event.target.value as "faible" | "moyenne" | "elevee",
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
          >
            <option value="faible">Tri faible</option>
            <option value="moyenne">Tri moyen</option>
            <option value="elevee">Tri eleve</option>
          </select>
        </div>
      </div>
    </>
  );
}
