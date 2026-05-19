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
  const isCleanPlaceMode =
    payload.recordType === "clean_place" || payload.recordType === "spot";
  const impactCO2 = (payload.wasteKg * 0.5).toFixed(1);
  const impactPlastic = (payload.wasteKg * 0.3).toFixed(1);
  const drawingSummary = summarizeActionDrawingValidation(payload.manualDrawing ?? null);

  return (
    <div className="cmm-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="cmm-modal-panel cmm-modal-scroll max-h-[90vh] w-full max-w-3xl rounded-[2.5rem] border border-emerald-200/70 bg-[#F3FBF6]/98 backdrop-blur-xl shadow-[0_24px_50px_-22px_rgba(34,197,94,0.18)]">
        {/* En-tête avec dégradé */}
        <div className="cmm-modal-header-sticky overflow-hidden rounded-t-[2.5rem] bg-gradient-to-r from-emerald-50 via-[#EFFAF3] to-[#EAF7EF] px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block h-3 w-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 shadow-sm" />
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950">
              {isCleanPlaceMode ? "Confirmation de votre lieu propre" : "Confirmation de votre action"}
            </h2>
          </div>
          <p className="text-sm text-emerald-900/65 pl-6">
            {isCleanPlaceMode
              ? "Cette fenêtre apparaît avant l'envoi. Modifier revient au formulaire, confirmer transmet le signalement."
              : "Cette fenêtre apparaît avant l'envoi. Modifier revient au formulaire, confirmer transmet la déclaration."}
          </p>
        </div>

        <div className="space-y-5 p-8">
          {/* Utilisateur */}
          <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#ECF8EF] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-emerald-700 font-bold mb-1">
                  Déclaré par
                </p>
                <p className="text-base font-bold text-emerald-950">
                  {userMetadata.displayName || userMetadata.username || 'Utilisateur'}
                </p>
              </div>
              <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm">
                Automatique
              </span>
            </div>
          </div>

          {/* Structure */}
          <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-900/55 font-bold mb-2">
              Structure / Cadre d&apos;engagement
            </p>
            <p className="text-base font-bold text-emerald-950">
              {form.associationName}
            </p>
            {form.enterpriseName && (
              <p className="text-sm text-emerald-900/65 mt-1">{form.enterpriseName}</p>
            )}
          </div>

          {/* Date et lieu */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-900/55 font-bold mb-2">
                Date
              </p>
              <p className="text-base font-bold text-emerald-950">
                {new Date(payload.actionDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-900/55 font-bold mb-2">
                Type de lieu
              </p>
              <p className="text-base font-bold text-emerald-950">
                {form.placeType}
              </p>
            </div>
          </div>

          {/* Localisation */}
          <div className="rounded-[1.5rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-[#EFFAF3] to-[#EAF7EF] p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-700 font-bold mb-2">
              Localisation
            </p>
            <p className="text-base font-bold text-emerald-950">
              {payload.locationLabel}
            </p>
            {form.departureLocationLabel && (
              <p className="text-sm text-emerald-900/70 mt-2">
                Départ : {form.departureLocationLabel}
                {form.arrivalLocationLabel && ` → Arrivée : ${form.arrivalLocationLabel}`}
              </p>
            )}
          </div>

          {/* Tracé retenu */}
          <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-900/55 font-bold mb-2">
              Tracé retenu
            </p>
            {payload.manualDrawing ? (
              <div className="space-y-2">
                <p className="text-base font-bold text-emerald-950">
                  {payload.manualDrawing.kind === "polygon" ? "Polygone" : "Tracé"}
                </p>
                <p className="text-sm text-emerald-900/65">
                  {formatGeometryPointCount(drawingSummary.pointCount)} · {drawingSummary.message}
                </p>
              </div>
            ) : (
              <p className="text-sm text-emerald-900/65">
                Aucun tracé manuel validé. La carte utilisera le point disponible ou l&apos;aperçu géographique.
              </p>
            )}
          </div>

          {/* Déchets collectés */}
          <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#ECF8EF] p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-emerald-700 font-bold mb-3">
              {isCleanPlaceMode ? "Lieu propre" : "Déchets collectés"}
            </p>
            <p className="text-4xl font-bold text-emerald-950 tracking-tight">
              {isCleanPlaceMode ? "Signalé" : `${payload.wasteKg} kg`}
            </p>
            {isCleanPlaceMode ? (
              <p className="text-sm text-emerald-900/70 mt-2 font-semibold">
                {payload.locationLabel}
              </p>
            ) : (
              payload.cigaretteButtsCount &&
              payload.cigaretteButtsCount > 0 && (
                <p className="text-sm text-emerald-900/70 mt-2 font-semibold">
                  dont {payload.cigaretteButtsCount} mégots
                </p>
              )
            )}
          </div>

          {/* Bénévoles et durée */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-900/55 font-bold mb-2">
                Bénévoles
              </p>
              <p className="text-2xl font-bold text-emerald-950 tracking-tight">
                {payload.volunteersCount}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-900/55 font-bold mb-2">
                Durée
              </p>
              <p className="text-2xl font-bold text-emerald-950 tracking-tight">
                {payload.durationMinutes} min
              </p>
            </div>
          </div>

          {/* Commentaire */}
          {form.notes && (
            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-900/55 font-bold mb-2">
                Remarques
              </p>
              <p className="text-sm text-emerald-900/75 whitespace-pre-wrap leading-relaxed">
                {form.notes}
              </p>
            </div>
          )}

          {!isCleanPlaceMode && (
            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-gradient-to-br from-[#EFFAF3] via-[#F7FCF8] to-[#EAF7EF] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500" />
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-700 font-bold">
                  Impact estimé
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-emerald-700 font-semibold mb-1">Déchets évités</p>
                  <p className="text-xl font-bold text-emerald-950 tracking-tight">
                    {payload.wasteKg} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-semibold mb-1">CO₂ évité</p>
                  <p className="text-xl font-bold text-emerald-950 tracking-tight">
                    ~{impactCO2} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-semibold mb-1">Plastique</p>
                  <p className="text-xl font-bold text-emerald-950 tracking-tight">
                    ~{impactPlastic} kg
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message de validation */}
          <div className="rounded-[1.5rem] border border-emerald-200/70 bg-gradient-to-br from-[#EFFAF3] to-[#EAF7EF] p-5 shadow-sm">
            <p className="text-sm text-emerald-900/80 leading-relaxed">
              {isCleanPlaceMode
                ? "Votre lieu propre sera visible sur la carte une fois le formulaire validé par les administrateurs. Merci pour votre signalement."
                : "Votre action sera visible sur la carte une fois le formulaire validé et complété par les administrateurs. Merci pour votre contribution !"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="cmm-modal-footer-sticky flex gap-4 bg-[#F3FBF6]/98 px-8 py-6 rounded-b-[2.5rem]">
          <button
            type="button"
            onClick={onModify}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl border-2 border-emerald-200 bg-[#F3FBF6] px-6 py-4 text-base font-bold text-emerald-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-[#ECF8EF] hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Modifier avant envoi
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-[0_8px_28px_-10px_rgba(34,197,94,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-[0_18px_38px_-10px_rgba(34,197,94,0.42)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Envoi en cours..." : "Confirmer et envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
