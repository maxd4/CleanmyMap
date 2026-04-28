import dynamic from"next/dynamic";
import type { ActionDrawing } from"@/lib/actions/types";
import type { FormState } from"./action-declaration-form.model";
import { toRequiredNumber } from"./action-declaration-form.model";
import { ActionDeclarationLocationAssist } from"./action-declaration-form.smart-assist";
import type { GpsStatus } from"./action-declaration-form.smart-assist";

const ActionDrawingMap = dynamic(
 () =>
 import("@/components/actions/action-drawing-map").then(
 (mod) => mod.ActionDrawingMap,
 ),
 { ssr: false },
);

type ActionDeclarationLocationSectionProps = {
 form: FormState;
 isQuickMode: boolean;
 manualDrawingEnabled: boolean;
 displayDrawing: ActionDrawing | null;
 drawingMapReadOnly: boolean;
 routePreviewStatus:"idle" |"processing" |"ready" |"error";
 routePreviewMessage: string | null;
 gpsStatus: GpsStatus;
 gpsMessage: string | null;
 effectiveManualDrawingEnabled: boolean;
 onDepartureLocationChange: (value: string) => void;
 onArrivalLocationChange: (value: string) => void;
 onRouteStyleChange: (value:"direct" |"souple") => void;
 onManualDrawingChange: (drawing: ActionDrawing | null) => void;
 onManualDrawingEnabledChange: (enabled: boolean) => void;
 onLatitudeChange: (value: string) => void;
 onLongitudeChange: (value: string) => void;
 onRouteAdjustmentMessageChange: (value: string) => void;
 onAutofillGps: () => void;
};

export function ActionDeclarationLocationSection({
 form,
 isQuickMode,
 manualDrawingEnabled,
 displayDrawing,
 drawingMapReadOnly,
 routePreviewStatus,
 routePreviewMessage,
 gpsStatus,
 gpsMessage,
 effectiveManualDrawingEnabled,
 onDepartureLocationChange,
 onArrivalLocationChange,
 onRouteStyleChange,
 onManualDrawingChange,
 onManualDrawingEnabledChange,
 onLatitudeChange,
 onLongitudeChange,
 onRouteAdjustmentMessageChange,
 onAutofillGps,
}: ActionDeclarationLocationSectionProps) {
 return (
 <section className="md:col-span-2 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4 shadow-sm">
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
<div>
<p className="cmm-text-caption uppercase tracking-[0.14em] text-sky-500">
Localisation
</p>
<h3 className="text-lg font-semibold cmm-text-primary">
 Indique où la collecte a eu lieu
</h3>
</div>
 <span className="rounded-full bg-white px-3 py-1 cmm-text-caption font-semibold cmm-text-secondary">
 2. Tracer
 </span>
 </div>
 <div className="flex flex-wrap items-start justify-between gap-3">
<div className="space-y-1">
<p className="cmm-text-small font-bold text-sky-900">
 Lieu / tracé <span className="text-emerald-500">*</span>
</p>
<p className="cmm-text-caption text-sky-800">
 Départ obligatoire. Arrivée vide = boucle locale dans Paris + proche banlieue.
</p>
</div>
 <div className="rounded-full bg-white px-3 py-1 cmm-text-caption font-semibold text-sky-900">
 {form.departureLocationLabel.trim() ||"Départ à renseigner"}
 {form.arrivalLocationLabel.trim()
 ? ` → ${form.arrivalLocationLabel.trim()}`
 :" (boucle locale)"}
 </div>
 </div>

 <div className="mt-4 grid gap-3 md:grid-cols-2">
 <label className="flex flex-col gap-2 cmm-text-small font-semibold text-sky-950">
 Départ du tracé <span className="text-emerald-500">*</span>
 <input
 type="text"
 className="rounded-xl border border-sky-200 bg-white px-4 py-3 cmm-text-primary outline-none transition focus:border-sky-400"
 value={form.departureLocationLabel}
 onChange={(event) => onDepartureLocationChange(event.target.value)}
 placeholder="Ex: Place de la République"
 />
 </label>

 <label className="flex flex-col gap-2 cmm-text-small font-semibold text-sky-950">
 Arrivée du tracé
 <input
 type="text"
 className="rounded-xl border border-sky-200 bg-white px-4 py-3 cmm-text-primary outline-none transition focus:border-sky-400"
 value={form.arrivalLocationLabel}
 onChange={(event) => onArrivalLocationChange(event.target.value)}
 placeholder="Vide = boucle"
 />
 </label>
 </div>

 <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
 <ActionDeclarationLocationAssist
 gpsStatus={gpsStatus}
 gpsMessage={gpsMessage}
 onAutofillGps={onAutofillGps}
 />

 <label className="flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-sky-900">
 Style de parcours
 <select
 value={form.routeStyle}
 onChange={(event) =>
 onRouteStyleChange(event.target.value as"direct" |"souple")
 }
 className="bg-transparent outline-none"
 >
 <option value="souple">Souple</option>
 <option value="direct">Direct</option>
 </select>
 </label>
 </div>

 <div className="mt-4 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <p className="cmm-text-caption uppercase tracking-[0.14em] text-sky-500">
 Aperçu & tracé
 </p>
 <p className="cmm-text-small cmm-text-secondary">
 {isQuickMode
 ?"L'aperçu se base sur le lieu ou le départ saisi."
 : effectiveManualDrawingEnabled
 ?"Dessine ou corrige le tracé directement sur la carte."
 :"Active le tracé manuel pour confirmer la zone nettoyée."}
 </p>
 </div>
 {!isQuickMode ? (
 <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 cmm-text-caption font-semibold cmm-text-primary">
 <input
 type="checkbox"
 checked={manualDrawingEnabled}
 onChange={(event) =>
 onManualDrawingEnabledChange(event.target.checked)
 }
 className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
 />
 Tracé manuel
 </label>
 ) : null}
 </div>

 <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
 <ActionDrawingMap
 value={displayDrawing}
 onChange={onManualDrawingChange}
 readOnly={drawingMapReadOnly}
 wasteKg={toRequiredNumber(form.wasteKg, 0)}
 butts={Math.max(
 0,
 Math.trunc(toRequiredNumber(form.cigaretteButts, 0)),
 )}
 isCleanPlace={false}
 />
 </div>

 <div className="mt-3 flex flex-wrap items-center gap-2 cmm-text-caption">
 <span className="rounded-full bg-white px-3 py-1 font-semibold text-sky-900">
 {routePreviewStatus ==="processing"
 ?"calcul..."
 : routePreviewStatus ==="ready"
 ?"prêt"
 : routePreviewStatus ==="error"
 ?"partiel"
 :"en attente"}
 </span>
 {routePreviewMessage ? (
 <span className="text-sky-800">{routePreviewMessage}</span>
 ) : null}
 </div>

 {!displayDrawing ? (
<div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 cmm-text-small cmm-text-muted">
 Saisis un lieu ou un départ pour voir l&apos;aperçu dans le périmètre Paris + proche banlieue. En mode complet, active le tracé manuel pour dessiner la zone.
</div>
) : null}
 </div>

 <details className="mt-4 rounded-xl border border-sky-200 bg-white px-4 py-3">
 <summary className="cursor-pointer list-none cmm-text-small font-semibold text-sky-950">
 Détails avancés
 </summary>
 <div className="mt-4 grid gap-3 md:grid-cols-2">
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Latitude
 <input
 type="number"
 step="any"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-sky-400"
 value={form.latitude}
 onChange={(event) => onLatitudeChange(event.target.value)}
 placeholder="48.8566"
 />
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Longitude
 <input
 type="number"
 step="any"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-primary outline-none transition focus:border-sky-400"
 value={form.longitude}
 onChange={(event) => onLongitudeChange(event.target.value)}
 placeholder="2.3522"
 />
 </label>

 <label className="md:col-span-2 flex flex-col gap-2 cmm-text-small font-semibold text-sky-950">
 Message pour ajuster le trajet
 <textarea
 value={form.routeAdjustmentMessage}
 onChange={(event) =>
 onRouteAdjustmentMessageChange(event.target.value)
 }
 placeholder="Ex: éviter l'avenue principale, passer par la rue latérale, garder la boucle compacte..."
 className="min-h-[96px] rounded-xl border border-sky-200 bg-white px-4 py-3 cmm-text-primary outline-none transition focus:border-sky-400"
 maxLength={500}
 />
 <span className="cmm-text-caption font-normal text-sky-800">
 Transmis avec l&apos;action si besoin.
 </span>
 </label>
 </div>
 </details>
 </section>
 );
}
