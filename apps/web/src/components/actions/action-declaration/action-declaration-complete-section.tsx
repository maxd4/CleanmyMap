"use client";

import dynamic from"next/dynamic";
import { computeButtsCount } from"@/lib/actions/data-contract";
import type { ActionDrawing } from"@/lib/actions/types";
import { toRequiredNumber } from"./payload";
import type { FormState, UpdateFormField } from"./types";

const ActionDrawingMap = dynamic(
 () =>
 import("@/components/actions/action-drawing-map").then(
 (module) => module.ActionDrawingMap,
 ),
 { ssr: false },
);

type ActionDeclarationCompleteSectionProps = {
 form: FormState;
 updateField: UpdateFormField;
 manualDrawingEnabled: boolean;
 setManualDrawingEnabled: (value: boolean) => void;
 effectiveManualDrawingEnabled: boolean;
 manualDrawing: ActionDrawing | null;
 setManualDrawing: (value: ActionDrawing | null) => void;
 drawingIsValid: boolean;
};

export function ActionDeclarationCompleteSection({
 form,
 updateField,
 manualDrawingEnabled,
 setManualDrawingEnabled,
 effectiveManualDrawingEnabled,
 manualDrawing,
 setManualDrawing,
 drawingIsValid,
}: ActionDeclarationCompleteSectionProps) {
 return (
 <>
 <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
 <label className="flex items-start gap-3 cmm-text-small text-emerald-900">
 <input
 type="checkbox"
 checked={manualDrawingEnabled}
 onChange={(event) => setManualDrawingEnabled(event.target.checked)}
 className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600"
 />
 <span>
 <span className="font-semibold">Option recommandée :</span> tracer à
 la main le parcours ou le polygone nettoyé. Cela évite les
 hypothèses sur la distance réellement parcourue.
 </span>
 </label>

 {effectiveManualDrawingEnabled ? (
 <div className="mt-4 space-y-3">
 <p className="cmm-text-caption cmm-text-secondary">
 Carte de Paris (fond blanc) : utilisez l&apos;outil ligne pour le
 tracé ou polygone pour la zone nettoyée.
 </p>
 <ActionDrawingMap
 value={manualDrawing}
 onChange={setManualDrawing}
 wasteKg={toRequiredNumber(form.wasteKg, 0)}
 butts={Math.max(
 0,
 Math.trunc(toRequiredNumber(form.cigaretteButts, 0)),
 )}
 isCleanPlace={false}
 />
 <p className="cmm-text-caption cmm-text-secondary">
 {drawingIsValid
 ? `Dessin enregistré (${manualDrawing?.kind ==="polygon" ?"polygone" :"tracé"}, ${manualDrawing?.coordinates.length ?? 0} points).`
 :"Aucun dessin valide pour le moment (2 points min pour un tracé, 3 pour un polygone)."}
 </p>
 </div>
 ) : null}
 </div>

 {!effectiveManualDrawingEnabled ? (
 <>
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Latitude (optionnel)
 <input
 type="number"
 step="any"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.latitude}
 onChange={(event) => updateField("latitude", event.target.value)}
 placeholder="48.8566"
 />
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Longitude (optionnel)
 <input
 type="number"
 step="any"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.longitude}
 onChange={(event) => updateField("longitude", event.target.value)}
 placeholder="2.3522"
 />
 </label>
 </>
 ) : null}

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Dechets collectes (kg) *
 <input
 type="number"
 step="0.1"
 min="0"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.wasteKg}
 onChange={(event) => updateField("wasteKg", event.target.value)}
 />
 </label>

 <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
 <p className="mb-2 cmm-text-small font-semibold cmm-text-secondary">
 Extraction de Mégots
 </p>
 <div className="grid gap-4 md:grid-cols-2">
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Masse de mégots (kg ou g)
 <input
 type="number"
 step="0.01"
 min="0"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.wasteMegotsKg}
 onChange={(event) =>
 updateField("wasteMegotsKg", event.target.value)
 }
 placeholder="Ex: 0.5"
 />
 <p className="cmm-text-caption italic cmm-text-muted">
 Entrez 0.05 pour 50g
 </p>
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Qualité / État des mégots
 <select
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.wasteMegotsCondition}
 onChange={(event) =>
 updateField("wasteMegotsCondition", event.target.value as FormState["wasteMegotsCondition"])
 }
 >
 <option value="propre">Propre (Sec, facile à recycler)</option>
 <option value="humide">
 Humide / Avec impuretés (Terre, sable)
 </option>
 <option value="mouille">Mouillé (Saturé d&apos;eau, après pluie)</option>
 </select>
 </label>
 </div>

 {toRequiredNumber(form.wasteMegotsKg, 0) > 0 ? (
 <div className="mt-2 inline-block rounded border border-emerald-100 bg-white p-2 cmm-text-caption font-medium text-emerald-700">
 Estimation : ~
 {computeButtsCount(
 toRequiredNumber(form.wasteMegotsKg, 0),
 form.wasteMegotsCondition,
 )}{""}
 mégots estimés
 </div>
 ) : null}
 </div>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Nombre de bénévoles *
 <input
 type="number"
 min="1"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.volunteersCount}
 onChange={(event) => updateField("volunteersCount", event.target.value)}
 />
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Durée (minutes)
 <input
 type="number"
 min="0"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.durationMinutes}
 onChange={(event) => updateField("durationMinutes", event.target.value)}
 />
 </label>

 <label className="md:col-span-2 flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Commentaire (optionnel)
 <textarea
 className="min-h-[110px] rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-emerald-500"
 value={form.notes}
 onChange={(event) => updateField("notes", event.target.value)}
 maxLength={1000}
 placeholder="Ex: presence de nombreux megots pres des bouches de metro."
 />
 </label>

 <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
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
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small outline-none transition focus:border-emerald-500"
 />
 <input
 type="number"
 step="0.1"
 min="0"
 value={form.wasteVerreKg}
 onChange={(event) => updateField("wasteVerreKg", event.target.value)}
 placeholder="Verre kg"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small outline-none transition focus:border-emerald-500"
 />
 <input
 type="number"
 step="0.1"
 min="0"
 value={form.wasteMetalKg}
 onChange={(event) => updateField("wasteMetalKg", event.target.value)}
 placeholder="Metal kg"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small outline-none transition focus:border-emerald-500"
 />
 <input
 type="number"
 step="0.1"
 min="0"
 value={form.wasteMixteKg}
 onChange={(event) => updateField("wasteMixteKg", event.target.value)}
 placeholder="Mixte kg"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small outline-none transition focus:border-emerald-500"
 />
 <select
 value={form.triQuality}
 onChange={(event) =>
 updateField("triQuality", event.target.value as FormState["triQuality"])
 }
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small outline-none transition focus:border-emerald-500"
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
