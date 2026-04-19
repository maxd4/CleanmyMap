import type { ComponentType } from "react";
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
        <div className="mt-2 inline-block rounded border border-emerald-100 bg-white p-2 text-xs font-medium text-emerald-700">
          Estimation : ~
          {computeButtsCount(
            toRequiredNumber(form.wasteMegotsKg, 0),
            form.wasteMegotsCondition,
          )}{" "}
          mégots estimés
        </div>
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

  const drawingSummary =
    drawingIsValid && manualDrawing
      ? `Dessin enregistre (${manualDrawing.kind === "polygon" ? "polygone" : "trace"}, ${manualDrawing.coordinates.length} points).`
      : "Aucun dessin valide pour le moment (2 points min pour un trace, 3 pour un polygone).";

  return (
    <>
      <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <label className="flex items-start gap-3 text-sm text-emerald-900">
          <input
            type="checkbox"
            checked={manualDrawingEnabled}
            onChange={(event) => setManualDrawingEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600"
          />
          <span>
            <span className="font-semibold">Option recommandee:</span> tracer a
            la main le parcours ou le polygone nettoye. Cela evite les
            hypotheses sur la distance reellement parcourue.
          </span>
        </label>

        {effectiveManualDrawingEnabled ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-700">
              Carte de Paris (fond blanc): utilisez l&apos;outil ligne pour le
              trace ou polygone pour la zone nettoyee.
            </p>
            <DrawingMapComponent
              value={manualDrawing}
              onChange={setManualDrawing}
              wasteKg={toRequiredNumber(form.wasteKg, 0)}
              butts={Math.max(
                0,
                Math.trunc(toRequiredNumber(form.cigaretteButts, 0)),
              )}
              isCleanPlace={false}
            />
            <p className="text-xs text-slate-700">
              {drawingSummary}
            </p>
          </div>
        ) : null}
      </div>

      {!effectiveManualDrawingEnabled ? (
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
        </>
      ) : null}

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
