"use client";

import type {
  ModerationActionStatus,
  ModerationCleanPlaceStatus,
  ModerationEntityType,
  ModerationVisibility,
} from"@/lib/admin/moderation/moderation-client";
import type {
  ActionModerationEditDraft,
  AdminWorkflowController,
  CleanPlaceModerationEditDraft,
} from"./types";
import { SignalementMediaProofs } from "@/components/actions/signalement-media/signalement-media-proofs";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type StepConfirmProps = {
  workflow: AdminWorkflowController;
};

function updateActionDraft<K extends keyof ActionModerationEditDraft>(
 workflow: AdminWorkflowController,
 key: K,
 value: ActionModerationEditDraft[K],
) {
 workflow.setActionEditDraft((draft) =>
 draft ? { ...draft, [key]: value } : draft,
 );
}

function updateCleanPlaceDraft<K extends keyof CleanPlaceModerationEditDraft>(
 workflow: AdminWorkflowController,
 key: K,
 value: CleanPlaceModerationEditDraft[K],
) {
 workflow.setCleanPlaceEditDraft((draft) =>
 draft ? { ...draft, [key]: value } : draft,
 );
}

export function StepConfirm({ workflow }: StepConfirmProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
    {fr ? "Étape 3 - Confirmer" : "Step 3 - Confirm"}
    </p>

    <div className="mt-3 flex flex-wrap items-center gap-3">
    <CmmButton
      onClick={() => void workflow.onDownloadCsv()}
      tone="primary"
      loading={workflow.csvState === "pending"}
    >
    {workflow.csvState ==="pending"
    ? (fr ? "Préparation CSV..." : "Preparing CSV...")
    : (fr ? "Confirmer export CSV" : "Confirm CSV export")}
    </CmmButton>
    <CmmButton
      onClick={() => void workflow.onDownloadJson()}
      tone="secondary"
      loading={workflow.jsonState === "pending"}
    >
    {workflow.jsonState ==="pending"
    ? (fr ? "Préparation JSON..." : "Preparing JSON...")
    : (fr ? "Confirmer export JSON" : "Confirm JSON export")}
    </CmmButton>
    </div>

    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
    <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
    {fr ? "Import : dry-run obligatoire" : "Import: dry-run required"}
    </p>
    <p className="mt-1 cmm-text-small cmm-text-secondary">
    {fr ? "1) Prévisualiser (dry-run) 2) Vérifier le résumé 3) Confirmer l'import." : "1) Preview (dry-run) 2) Verify summary 3) Confirm import."}
    </p>
 <textarea
 value={workflow.importPayload}
 onChange={(event) => workflow.setImportPayload(event.target.value)}
 rows={8}
 className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono cmm-text-caption cmm-text-secondary outline-none transition focus:border-emerald-500"
 spellCheck={false}
 />
 <div className="mt-3 flex flex-wrap items-center gap-3">
 <CmmButton
  onClick={() => void workflow.onImportDryRun()}
  tone="secondary"
  loading={workflow.importDryRunState === "pending"}
 >
 {workflow.importDryRunState ==="pending"
 ?"Dry-run..."
 :"Previsualiser (dry-run)"}
 </CmmButton>
 <CmmButton
 onClick={() => void workflow.onImportPastActions()}
 disabled={!workflow.canConfirmImport}
 loading={workflow.importState === "pending"}
 tone="primary"
 >
 {workflow.importState ==="pending" ?"Import..." :"Confirmer import"}
 </CmmButton>
 </div>
 <label className="mt-3 flex flex-col gap-2 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Confirmation explicite
 <input
 value={workflow.importConfirmationText}
 onChange={(event) =>
 workflow.setImportConfirmationText(event.target.value)
 }
 placeholder="Taper: CONFIRMER IMPORT"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal normal-case cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>

 {workflow.importPreview ? (
 <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-caption text-emerald-900">
 <p className="font-semibold">Dry-run valide</p>
 <p>
 {workflow.importPreview.count} ligne(s) | Geo ok:{""}
 {workflow.importPreview.stats.withCoordinates} | Geo manquante:{""}
 {workflow.importPreview.stats.missingCoordinates}
 </p>
 <p>
 Volume: {workflow.importPreview.stats.totalWasteKg.toFixed(1)} kg |
 Megots: {workflow.importPreview.stats.totalButts} | Benevoles:{""}
 {workflow.importPreview.stats.totalVolunteers}
 </p>
 <p>
 Periode: {workflow.importPreview.stats.dateMin ??"n/a"} -&gt;{""}
 {workflow.importPreview.stats.dateMax ??"n/a"}
 </p>
 {workflow.importPreview.dryRunProof ? (
 <p>
 Jeton dry-run valable jusqu&apos;a{""}
 {new Date(
 workflow.importPreview.dryRunProof.expiresAt,
 ).toLocaleString("fr-FR")}
 </p>
 ) : null}
 </div>
 ) : null}
 </div>

 <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Moderation: confirmation
 </p>
 <div className="mt-3 grid gap-3 md:grid-cols-3">
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Type de record
 <select
 value={workflow.moderationEntityType}
 onChange={(event) =>
 workflow.setModerationEntityType(
 event.target.value as ModerationEntityType,
 )
 }
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
 <option value="action">Action</option>
 <option value="clean_place">Signalement Trash Spotter</option>
 </select>
 </label>
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary md:col-span-2">
 ID du record
 <input
 value={workflow.moderationId}
 onChange={(event) => workflow.setModerationId(event.target.value)}
 placeholder="UUID/ID"
 className="rounded-lg border border-slate-300 px-3 py-2 font-mono cmm-text-caption outline-none transition focus:border-emerald-500"
 />
 </label>
 </div>
 <div className="mt-3 grid gap-3 md:grid-cols-2">
 {workflow.moderationEntityType ==="action" ? (
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Statut action
 <select
 value={workflow.actionStatus}
 onChange={(event) =>
 workflow.setActionStatus(
 event.target.value as ModerationActionStatus,
 )
 }
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
 <option value="pending">pending</option>
 <option value="approved">approved</option>
 <option value="rejected">rejected</option>
 </select>
 </label>
 ) : (
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Statut du signalement
 <select
 value={workflow.cleanPlaceStatus}
 onChange={(event) =>
 workflow.setCleanPlaceStatus(
 event.target.value as ModerationCleanPlaceStatus,
 )
 }
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
 <option value="new">new</option>
 <option value="validated">validated</option>
 <option value="cleaned">cleaned</option>
 </select>
 </label>
 )}
 <div className="flex items-end">
 <CmmButton
 onClick={() => void workflow.onModerateEntity()}
 disabled={
 !workflow.moderationConfirmed ||
 workflow.moderationConfirmationText.trim().toUpperCase() !==
"CONFIRMER MODERATION"
 }
 loading={workflow.moderationState === "pending"}
 tone="destructive"
 >
 {workflow.moderationState ==="pending"
 ?"Application..."
 :"Confirmer moderation"}
 </CmmButton>
 </div>
 </div>
 {workflow.selectedRecordType === "spot" || workflow.selectedRecordType === "clean_place" ? (
 <div className="mt-4">
 <SignalementMediaProofs
  signalementId={workflow.moderationId}
  variant="panel"
 />
 </div>
 ) : null}
 {workflow.moderationEntityType ==="action" ? (
 <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Compte auteur
 </p>
 <p className="mt-1 font-mono cmm-text-small cmm-text-secondary break-all">
 {workflow.selectedActionCreatorId?.trim() || "Non renseigné depuis la sélection"}
 </p>
 </div>
 ) : null}
 {workflow.moderationEntityType ==="action" && workflow.actionEditDraft ? (
 <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide text-emerald-800">
 Correction des champs du formulaire
 </p>
 <p className="mt-1 cmm-text-caption text-emerald-900/75">
 Les valeurs ci-dessous viennent de la déclaration sélectionnée. Elles sont
 enregistrées avec le statut lors de la confirmation.
 </p>
 <div className="mt-3 grid gap-3 md:grid-cols-3">
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Auteur
 <input
 value={workflow.actionEditDraft!.actorName}
 onChange={(event) => updateActionDraft(workflow,"actorName",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Association
 <input
 value={workflow.actionEditDraft!.associationName}
 onChange={(event) => updateActionDraft(workflow,"associationName",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Date
 <input
 type="date"
 value={workflow.actionEditDraft!.actionDate}
 onChange={(event) => updateActionDraft(workflow,"actionDate",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 </div>
 <div className="mt-3 grid gap-3 md:grid-cols-3">
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950 md:col-span-3">
 Lieu affiché
 <input
 value={workflow.actionEditDraft!.locationLabel}
 onChange={(event) => updateActionDraft(workflow,"locationLabel",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Départ
 <input
 value={workflow.actionEditDraft!.departureLocationLabel}
 onChange={(event) => updateActionDraft(workflow,"departureLocationLabel",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Arrivée
 <input
 value={workflow.actionEditDraft!.arrivalLocationLabel}
 onChange={(event) => updateActionDraft(workflow,"arrivalLocationLabel",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-caption font-semibold text-emerald-950">
 Réglage appliqué
 <span className="inline-flex w-fit rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
 Souple
 </span>
 </div>
</div>
 <label className="mt-3 flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Précisions de localisation
 <input
 value={workflow.actionEditDraft!.routeAdjustmentMessage}
 onChange={(event) => updateActionDraft(workflow,"routeAdjustmentMessage",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 <div className="mt-3 grid gap-3 md:grid-cols-4">
 {[
 ["latitude","Latitude"],
 ["longitude","Longitude"],
 ["wasteKg","Poids total kg"],
 ["cigaretteButts","Mégots"],
 ["volunteersCount","Bénévoles"],
 ["durationMinutes","Durée min"],
 ["wasteMegotsKg","Mégots kg"],
 ["wastePlastiqueKg","Plastique kg"],
 ["wasteVerreKg","Verre kg"],
 ["wasteMetalKg","Métal kg"],
 ["wasteMixteKg","Mixte kg"],
 ].map(([key, label]) => (
 <label key={key} className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 {label}
 <input
 inputMode="decimal"
 value={workflow.actionEditDraft![key as keyof ActionModerationEditDraft] as string}
 onChange={(event) =>
 updateActionDraft(
 workflow,
 key as keyof ActionModerationEditDraft,
 event.target.value as never,
 )
 }
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 ))}
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 État mégots
 <select
 value={workflow.actionEditDraft!.wasteMegotsCondition}
 onChange={(event) => updateActionDraft(workflow,"wasteMegotsCondition",event.target.value as ActionModerationEditDraft["wasteMegotsCondition"])}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 >
 <option value="propre">Propre</option>
 <option value="humide">Humide</option>
 <option value="mouille">Mouillé</option>
 </select>
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Qualité tri
 <select
 value={workflow.actionEditDraft!.triQuality}
 onChange={(event) => updateActionDraft(workflow,"triQuality",event.target.value as ActionModerationEditDraft["triQuality"])}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 >
 <option value="faible">Faible</option>
 <option value="moyenne">Moyenne</option>
 <option value="elevee">Élevée</option>
 </select>
 </label>
 </div>
 <div className="mt-3 grid gap-3 md:grid-cols-2">
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Type de lieu
 <input
 value={workflow.actionEditDraft!.placeType}
 onChange={(event) => updateActionDraft(workflow,"placeType",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Mode
 <select
 value={workflow.actionEditDraft!.submissionMode}
 onChange={(event) => updateActionDraft(workflow,"submissionMode",event.target.value as ActionModerationEditDraft["submissionMode"])}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 >
 <option value="quick">Rapide</option>
 <option value="complete">Complet</option>
 </select>
 </label>
 </div>
 <label className="mt-3 flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Notes
 <textarea
 rows={3}
 value={workflow.actionEditDraft!.notes}
 onChange={(event) => updateActionDraft(workflow,"notes",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 <label className="mt-3 flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Localisation JSON
 <textarea
 rows={4}
 value={workflow.actionEditDraft!.manualDrawingJson}
 onChange={(event) => updateActionDraft(workflow,"manualDrawingJson",event.target.value)}
 className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono font-normal outline-none transition focus:border-emerald-600"
 />
 </label>
 </div>
 ) : null}
 {workflow.moderationEntityType ==="clean_place" && workflow.cleanPlaceEditDraft ? (
 <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide text-emerald-800">
 Correction du signalement
 </p>
 <div className="mt-3 grid gap-3 md:grid-cols-2">
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Lieu
 <input value={workflow.cleanPlaceEditDraft.label} onChange={(event) => updateCleanPlaceDraft(workflow,"label",event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600" />
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Type
 <select value={workflow.cleanPlaceEditDraft.spotType} onChange={(event) => updateCleanPlaceDraft(workflow,"spotType",event.target.value as "spot" | "clean_place")} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none focus:border-emerald-600">
  <option value="spot">Spot</option>
  <option value="clean_place">Lieu propre</option>
 </select>
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Latitude
 <input inputMode="decimal" value={workflow.cleanPlaceEditDraft.latitude} onChange={(event) => updateCleanPlaceDraft(workflow,"latitude",event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600" />
 </label>
 <label className="flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Longitude
 <input inputMode="decimal" value={workflow.cleanPlaceEditDraft.longitude} onChange={(event) => updateCleanPlaceDraft(workflow,"longitude",event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600" />
 </label>
 </div>
 <label className="mt-3 flex flex-col gap-2 cmm-text-caption font-semibold text-emerald-950">
 Notes
 <textarea rows={3} value={workflow.cleanPlaceEditDraft.notes} onChange={(event) => updateCleanPlaceDraft(workflow,"notes",event.target.value)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-emerald-600" />
 </label>
 </div>
 ) : null}
 <label className="mt-3 flex items-center gap-2 cmm-text-caption cmm-text-secondary">
 <input
 type="checkbox"
 checked={workflow.moderationConfirmed}
 onChange={(event) =>
 workflow.setModerationConfirmed(event.target.checked)
 }
 className="h-4 w-4 rounded border-slate-300"
 />
 Je confirme la moderation de cette entite.
 </label>
 <label className="mt-3 flex flex-col gap-2 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Phrase de confirmation
 <input
 value={workflow.moderationConfirmationText}
 onChange={(event) =>
 workflow.setModerationConfirmationText(event.target.value)
 }
 placeholder="Taper: CONFIRMER MODERATION"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal normal-case cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 </label>
 <label className="mt-3 flex flex-col gap-2 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Visibilité modération
 <select
 value={workflow.moderationVisibility}
 onChange={(event) =>
 workflow.setModerationVisibility(event.target.value as ModerationVisibility)
 }
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal normal-case cmm-text-primary outline-none transition focus:border-emerald-500"
 >
 <option value="unchanged">Ne pas changer</option>
 <option value="visible">Restaurer la visibilité publique</option>
 <option value="hidden">Masquer des surfaces publiques</option>
 </select>
 <span className="font-normal normal-case text-slate-500">
 Le masquage retire l&apos;action de la carte, des listes publiques et des formulaires de groupe.
 </span>
 </label>
 <label className="mt-3 flex flex-col gap-2 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 Motif de modération
 <textarea
 rows={3}
 value={workflow.moderationReason}
 onChange={(event) => workflow.setModerationReason(event.target.value)}
 placeholder="Exemple: correction des données terrain après vérification"
 className="rounded-lg border border-slate-300 px-3 py-2 cmm-text-small font-normal normal-case cmm-text-primary outline-none transition focus:border-emerald-500"
 />
 <span className="font-normal normal-case text-slate-500">
 Obligatoire pour un rejet ou une correction d&apos;impact.
 </span>
 </label>
 {workflow.moderationResult ? (
 <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-300 bg-white p-3 cmm-text-caption cmm-text-secondary">
 {workflow.moderationResult}
 </pre>
 ) : null}
 </div>
 </div>
 );
}
