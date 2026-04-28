import type { FormState } from "./action-declaration-form.model";
import type { CreateActionPayload } from "@/lib/actions/types";
import {
  formatGeometryPointCount,
  summarizeActionDrawingValidation,
} from "./map/actions-map-geometry.utils";

type ActionDeclarationFormConfirmationProps = {
  form: FormState;
  payload: CreateActionPayload;
  userMetadata: {
    userId: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
  onModify: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
};

export function ActionDeclarationFormConfirmation({
  form,
  payload,
  userMetadata,
  onModify,
  onConfirm,
  isSubmitting,
}: ActionDeclarationFormConfirmationProps) {
  const impactCO2 = (payload.wasteKg * 0.5).toFixed(1);
  const impactPlastic = (payload.wasteKg * 0.3).toFixed(1);
  const drawingSummary = summarizeActionDrawingValidation(payload.manualDrawing ?? null);

  return (
    <div className="cmm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cmm-modal-panel cmm-modal-scroll max-h-[90vh] w-full max-w-3xl rounded-[2.5rem] border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] dark:bg-slate-900/95 dark:border-slate-700/60">
        {/* En-tête avec dégradé */}
        <div className="cmm-modal-header-sticky overflow-hidden rounded-t-[2.5rem] bg-gradient-to-r from-emerald-50 via-cyan-50 to-sky-50 px-8 py-6 dark:from-emerald-950/60 dark:via-cyan-950/60 dark:to-sky-950/60">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block h-3 w-3 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-sm" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Confirmation de votre action
            </h2>
          </div>
          <p className="text-sm text-slate-600 pl-6">
            Vérifiez les informations avant l&apos;envoi
          </p>
        </div>

        <div className="space-y-5 p-8">
          {/* Utilisateur */}
          <div className="rounded-[1.5rem] border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-700 font-bold mb-1">
                  Déclaré par
                </p>
                <p className="text-base font-bold text-emerald-900">
                  {userMetadata.displayName || userMetadata.username || 'Utilisateur'}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
                Automatique
              </span>
            </div>
          </div>

          {/* Structure */}
          <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">
              Structure / Cadre d&apos;engagement
            </p>
            <p className="text-base font-bold text-slate-900">
              {form.associationName}
            </p>
            {form.enterpriseName && (
              <p className="text-sm text-slate-600 mt-1">{form.enterpriseName}</p>
            )}
          </div>

          {/* Date et lieu */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">
                Date
              </p>
              <p className="text-base font-bold text-slate-900">
                {new Date(payload.actionDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">
                Type de lieu
              </p>
              <p className="text-base font-bold text-slate-900">
                {form.placeType}
              </p>
            </div>
          </div>

          {/* Localisation */}
          <div className="rounded-[1.5rem] border border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-sky-50/40 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-sky-600 font-bold mb-2">
              Localisation
            </p>
            <p className="text-base font-bold text-sky-900">
              {payload.locationLabel}
            </p>
            {form.departureLocationLabel && (
              <p className="text-sm text-sky-700 mt-2">
                Départ : {form.departureLocationLabel}
                {form.arrivalLocationLabel && ` → Arrivée : ${form.arrivalLocationLabel}`}
              </p>
            )}
          </div>

          {/* Tracé retenu */}
          <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">
              Tracé retenu
            </p>
            {payload.manualDrawing ? (
              <div className="space-y-2">
                <p className="text-base font-bold text-slate-900">
                  {payload.manualDrawing.kind === "polygon" ? "Polygone" : "Tracé"}
                </p>
                <p className="text-sm text-slate-600">
                  {formatGeometryPointCount(drawingSummary.pointCount)} · {drawingSummary.message}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Aucun tracé manuel validé. La carte utilisera le point disponible ou l&apos;aperçu géographique.
              </p>
            )}
          </div>

          {/* Déchets collectés */}
          <div className="rounded-[1.5rem] border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-50/40 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-700 font-bold mb-3">
              Déchets collectés
            </p>
            <p className="text-4xl font-bold text-emerald-900 tracking-tight">
              {payload.wasteKg} kg
            </p>
            {payload.cigaretteButtsCount && payload.cigaretteButtsCount > 0 && (
              <p className="text-sm text-emerald-800 mt-2 font-semibold">
                dont {payload.cigaretteButtsCount} mégots
              </p>
            )}
          </div>

          {/* Bénévoles et durée */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">
                Bénévoles
              </p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                {payload.volunteersCount}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">
                Durée
              </p>
              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                {payload.durationMinutes} min
              </p>
            </div>
          </div>

          {/* Commentaire */}
          {form.notes && (
            <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 font-bold mb-2">
                Remarques
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {form.notes}
              </p>
            </div>
          )}

          {/* Impact estimé */}
          <div className="rounded-[1.5rem] border border-purple-200/60 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
              <p className="text-xs uppercase tracking-[0.14em] text-purple-700 font-bold">
                Impact estimé
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-purple-600 font-semibold mb-1">Déchets évités</p>
                <p className="text-xl font-bold text-purple-900 tracking-tight">
                  {payload.wasteKg} kg
                </p>
              </div>
              <div>
                <p className="text-xs text-purple-600 font-semibold mb-1">CO₂ évité</p>
                <p className="text-xl font-bold text-purple-900 tracking-tight">
                  ~{impactCO2} kg
                </p>
              </div>
              <div>
                <p className="text-xs text-purple-600 font-semibold mb-1">Plastique</p>
                <p className="text-xl font-bold text-purple-900 tracking-tight">
                  ~{impactPlastic} kg
                </p>
              </div>
            </div>
          </div>

          {/* Message de validation */}
          <div className="rounded-[1.5rem] border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-blue-50/40 p-5 shadow-sm">
            <p className="text-sm text-blue-900 leading-relaxed">
              Votre action sera visible sur la carte une fois le formulaire validé et complété par les administrateurs. Merci pour votre contribution !
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="cmm-modal-footer-sticky flex gap-4 bg-white/95 px-8 py-6 rounded-b-[2.5rem] dark:bg-slate-900/95">
          <button
            type="button"
            onClick={onModify}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl border-2 border-slate-300 bg-white px-6 py-4 text-base font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-4 text-base font-bold text-white shadow-[0_8px_32px_-6px_rgba(6,182,212,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-8px_rgba(6,182,212,0.6)] hover:from-emerald-400 hover:to-cyan-400 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Envoi en cours..." : "Confirmer l'envoi"}
          </button>
        </div>
      </div>
    </div>
  );
}
