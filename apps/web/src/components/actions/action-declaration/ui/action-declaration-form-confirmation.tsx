import type { FormState } from "../model";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import type { CreateActionPayload } from "@/lib/actions/types";
import { summarizeActionDrawingValidation } from "../action-drawing-validation";
import { formatGeometryPointCount } from "../../map/layers/actions-map-geometry-render";
import { getOrganizerTypeLabel } from "@/lib/actions/organizer-type";
import {
  deriveEventDurationMinutes,
  deriveOrganizationMinutes,
  formatBusinessDurationMinutes,
} from "@/lib/actions/time-contract";

type ActionDeclarationFormConfirmationProps = {
  form: FormState;
  payload: CreateActionPayload;
  userMetadata: {
    userId: string;
    handle?: string;
    username?: string;
    displayName?: string;
    email?: string;
  };
  onModify: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
};

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-emerald-200/70 bg-white px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/75">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-emerald-950">{children}</dd>
    </div>
  );
}

export function ActionDeclarationFormConfirmation({
  form,
  payload,
  userMetadata,
  onModify,
  onConfirm,
  isSubmitting,
}: ActionDeclarationFormConfirmationProps) {
  const isCleanPlaceMode = payload.recordType === "clean_place" || payload.recordType === "spot";
  const drawingSummary = summarizeActionDrawingValidation(payload.manualDrawing ?? null);
  const event = deriveEventDurationMinutes(payload.eventStartTime, payload.eventEndTime);
  const organization = deriveOrganizationMinutes({
    actionDurationMinutes: payload.durationMinutes,
    eventDurationMinutes: event.eventDurationMinutes,
  });
  const actor = userMetadata.displayName || userMetadata.handle || userMetadata.username || "Utilisateur";
  const geometrySummary = payload.manualDrawing
    ? `${formatGeometryPointCount(drawingSummary.pointCount)} · ${drawingSummary.message}`
    : form.gpxImport
      ? "Tracé GPX importé"
      : "Aperçu géographique ou point disponible";

  return (
    <CmmDialog
      open
      dismissible={false}
      size="lg"
      ariaLabelledBy="action-declaration-confirmation-title"
      ariaDescribedBy="action-declaration-confirmation-description"
      panelClassName="max-h-[90vh] rounded-[2.5rem] border border-emerald-200/70 bg-[#F3FBF6]/98 backdrop-blur-xl shadow-[0_24px_50px_-22px_rgba(34,197,94,0.18)]"
    >
      <div className="cmm-modal-header-sticky rounded-t-[2.5rem] bg-gradient-to-r from-emerald-50 via-[#EFFAF3] to-[#EAF7EF] px-6 py-5 sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Dernière vérification</p>
        <h2 id="action-declaration-confirmation-title" className="mt-1 text-2xl font-black tracking-tight text-emerald-950">
          {isCleanPlaceMode ? "Confirmer le lieu propre" : "Confirmer l’action réalisée"}
        </h2>
        <p id="action-declaration-confirmation-description" className="mt-2 text-sm leading-6 text-emerald-950">
          Vérifiez ces éléments essentiels. Modifier revient au formulaire sans perdre vos valeurs.
        </p>
      </div>

      <div className="space-y-5 p-6 sm:p-8">
        <div className="rounded-2xl border border-emerald-200/80 bg-[#ECF8EF] px-4 py-3 text-sm text-emerald-950">
          <span className="font-bold">Déclaré par :</span> {actor}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <SummaryItem label="Action">
            {form.actionTitle.trim() || "Titre facultatif non renseigné"}
          </SummaryItem>
          <SummaryItem label="Date réelle">
            {payload.actionDate || "Non renseignée"}
          </SummaryItem>
          <SummaryItem label="Organisateur">
            {payload.organizerName?.trim() || form.associationName || "Non renseigné"}
            <span className="mt-1 block text-xs font-normal text-emerald-900/60">{getOrganizerTypeLabel(payload.organizerType)}</span>
            <span className="mt-1 block text-xs font-normal text-emerald-900/60">
              {payload.organizerAccounts?.length
                ? `Coorganisateurs : ${payload.organizerAccounts.join(", ")}`
                : "Aucun coorganisateur n’est déclaré"}
            </span>
          </SummaryItem>
          <SummaryItem label="Lieu de référence">
            {payload.locationLabel || "Non renseigné"}
            <span className="mt-1 block text-xs font-normal text-emerald-900/60">{form.placeType || "Environnement non renseigné"}</span>
          </SummaryItem>
          <SummaryItem label="Participants présents">
            {isCleanPlaceMode ? "Non applicable" : `${payload.volunteersCount ?? "Non renseigné"}`}
            {payload.volunteerParticipation ? (
              <span className="mt-1 block text-xs font-normal text-emerald-900/60">
                Enfants {payload.volunteerParticipation.childrenCount ?? "—"} · Retraités {payload.volunteerParticipation.retiredCount ?? "—"}
              </span>
            ) : null}
            <span className="mt-1 block text-xs font-normal text-emerald-900/60">Le nombre de participants présents est déclaré séparément des comptes.</span>
          </SummaryItem>
          <SummaryItem label="Durée réelle">
            {formatBusinessDurationMinutes(payload.durationMinutes)}
            {organization.status === "available" ? <span className="mt-1 block text-xs font-normal text-emerald-900/60">Organisation : {formatBusinessDurationMinutes(organization.organizationMinutes)}</span> : null}
          </SummaryItem>
          <SummaryItem label={isCleanPlaceMode ? "Signalement" : "Déchets hors mégots"}>
            {isCleanPlaceMode ? "Lieu propre" : payload.wasteKg == null ? "Non renseigné" : `${payload.wasteKg} kg`}
          </SummaryItem>
          {!isCleanPlaceMode ? (
            <SummaryItem label="Mégots">
              {payload.cigaretteButtsCount == null ? "Nombre non renseigné" : `${payload.cigaretteButtsCount} · `}
              {payload.cigaretteButtsKg == null ? "masse non renseignée" : `${payload.cigaretteButtsKg} kg`}
            </SummaryItem>
          ) : null}
        </dl>

        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryItem label="Terrain et géométrie">{geometrySummary}</SummaryItem>
          <SummaryItem label="Horaires complémentaires">
            {event.status === "available" ? `${payload.eventStartTime} – ${payload.eventEndTime}` : "Non renseignés"}
          </SummaryItem>
        </div>

        {form.notes.trim() ? (
          <div className="rounded-xl border border-emerald-200/70 bg-white px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700/75">Observations</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-950">{form.notes}</p>
          </div>
        ) : null}
      </div>

      <div className="cmm-modal-footer-sticky flex flex-col gap-3 rounded-b-[2.5rem] bg-[#F3FBF6]/98 px-4 py-5 sm:flex-row sm:gap-4 sm:px-8 sm:py-6">
        <button
          type="button"
          onClick={onModify}
          disabled={isSubmitting}
          className="flex-1 rounded-2xl border-2 border-emerald-200 bg-[#F3FBF6] px-6 py-3.5 text-base font-bold text-emerald-900 shadow-sm transition-all hover:border-emerald-300 hover:bg-[#ECF8EF] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Modifier avant envoi
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_28px_-10px_rgba(34,197,94,0.45)] transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Envoi en cours…" : "Confirmer et envoyer"}
        </button>
      </div>
    </CmmDialog>
  );
}
