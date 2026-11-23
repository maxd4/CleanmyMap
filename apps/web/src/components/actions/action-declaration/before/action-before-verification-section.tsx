"use client";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { FormState } from "../model";
import { buildPublicationSummary } from "./model";
import { buildPreparationDataFromForm } from "../payload";
import { buildPublicActionPracticalInformation } from "@/lib/actions/participation/group-participation-public-projection";
import { ActionCreationLegalPanel } from "../../action-creation-legal-panel";
import { deriveActionFormalitiesFacts } from "@/lib/actions/formalities/facts";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities/qualification";
import { deriveActionVolunteerChecklist } from "@/lib/actions/action-preparation-checklist";
import { buildFormalitiesEmailActionDataFromForm } from "@/lib/actions/formalities/email-draft";
import { createActionPreparationWeatherRequest, useActionPreparationWeather } from "../../use-action-preparation-weather";

export function ActionBeforeVerificationSection({
  form,
  validationIssues,
  validationIssueFields,
  errorMessage,
  guidedReadiness,
  actionId,
  updateField,
  onFormalitiesReadiness,
  onEditDefinition,
}: {
  form: FormState;
  validationIssues: string[];
  validationIssueFields: readonly string[];
  errorMessage: string | null;
  guidedReadiness: "unknown" | "ready" | "blocked";
  actionId?: string | null;
  updateField: (key: "formalitiesContext", value: ActionFormalitiesFacts | null) => void;
  onFormalitiesReadiness?: (readiness: { known: boolean; blocked: boolean }) => void;
  onEditDefinition?: (field?: string) => void;
}) {
  const summary = buildPublicationSummary(form);
  const draftFacts = form.formalitiesContext ?? deriveActionFormalitiesFacts({
    plannedObjective: form.plannedObjective,
    placeType: form.placeType,
  });
  const publicInformation = buildPublicActionPracticalInformation(buildPreparationDataFromForm(form));
  const weatherRequest = createActionPreparationWeatherRequest({
    actionDate: form.actionDate,
    scheduledStartTime: form.eventStartTime || form.departureTime || form.meetingTime,
    scheduledEndTime: form.eventEndTime,
    latitude: form.latitude,
    longitude: form.longitude,
    timeZone: form.actionTimezone,
  });
  const weather = useActionPreparationWeather({
    contextId: actionId,
    request: weatherRequest,
    initialWeatherContext: form.routeCalibrationContext?.plannerSnapshot?.weatherContext ?? null,
  });
  const weatherChecklist = deriveActionVolunteerChecklist({
    preparation: null,
    weatherContext: weather.weatherContext,
    weatherRequest: weather.weatherRequest,
    weatherState: weather.weatherState,
  });
  const corrections = [
    ...validationIssues,
    ...(guidedReadiness === "blocked" ? ["Une formalité démontrée comme requise reste à déclarer envoyée."] : []),
  ];
  const checks = guidedReadiness === "unknown"
    ? ["La qualification serveur sera confirmée après l’enregistrement de l’action."]
    : [];
  const suggestions = [
    ...(!publicInformation.participantMessage ? ["Ajouter un message pratique visible par les bénévoles."] : []),
    ...(publicInformation.accessibilityStatus === "not_evaluated" ? ["Renseigner les conditions d’accessibilité si elles sont connues."] : []),
  ];
  const readinessLabel = guidedReadiness === "ready" ? "Qualification enregistrée" : "Formalités à vérifier";
  const readinessTone = guidedReadiness === "ready" ? "emerald" : "amber";

  return <ActionBeforeVerificationView
    summary={summary}
    draftFacts={draftFacts}
    publicInformation={publicInformation}
    weatherChecklist={weatherChecklist}
    requestWeather={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ weather.requestWeather(); }}
    corrections={corrections}
    validationIssueFields={validationIssueFields}
    checks={checks}
    suggestions={suggestions}
    readinessLabel={readinessLabel}
    readinessTone={readinessTone}
    errorMessage={errorMessage}
    actionId={actionId}
    actionEmailData={buildFormalitiesEmailActionDataFromForm(form)}
    onDraftFactsChange={(facts) => updateField("formalitiesContext", facts)}
    onFormalitiesReadiness={onFormalitiesReadiness}
    onEditDefinition={onEditDefinition}
  />;
}

type ActionBeforeVerificationViewProps = {
  summary: ReturnType<typeof buildPublicationSummary>;
  draftFacts: ActionFormalitiesFacts;
  publicInformation: ReturnType<typeof buildPublicActionPracticalInformation>;
  weatherChecklist: ReturnType<typeof deriveActionVolunteerChecklist>;
  requestWeather: () => void;
  corrections: string[];
  validationIssueFields: readonly string[];
  checks: string[];
  suggestions: string[];
  readinessLabel: string;
  readinessTone: "emerald" | "amber";
  errorMessage: string | null;
  actionId?: string | null;
  actionEmailData: ReturnType<typeof buildFormalitiesEmailActionDataFromForm>;
  onDraftFactsChange: (facts: ActionFormalitiesFacts) => void;
  onFormalitiesReadiness?: (readiness: { known: boolean; blocked: boolean }) => void;
  onEditDefinition?: (field?: string) => void;
};

function ActionBeforeVerificationView({
  summary,
  draftFacts,
  publicInformation,
  weatherChecklist,
  requestWeather,
  corrections,
  validationIssueFields,
  checks,
  suggestions,
  readinessLabel,
  readinessTone,
  errorMessage,
  actionId,
  actionEmailData,
  onDraftFactsChange,
  onFormalitiesReadiness,
  onEditDefinition,
}: ActionBeforeVerificationViewProps) {
  return <CmmCard tone="emerald" variant="glass" size="lg">
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black tracking-tight text-emerald-950">Vérifier et publier</h3>
          <p className="cmm-text-body cmm-text-primary mt-1 max-w-2xl text-sm">Enregistrez le brouillon ici. La publication reste une confirmation distincte.</p>
        </div>
        <CmmPill tone={readinessTone} size="sm">{readinessLabel}</CmmPill>
      </div>
      <dl className="grid gap-x-5 gap-y-2 border-y border-emerald-100 py-3 text-sm sm:grid-cols-2" data-testid="action-creation-preview-summary">
        {summary.map((item) => <div key={item.label} className="min-w-0"><dt className="text-xs font-bold uppercase tracking-wide text-emerald-700">{item.label}</dt><dd className="mt-0.5 whitespace-pre-line leading-5 text-emerald-950">{item.value}</dd></div>)}
      </dl>
      <ActionBeforeReviewGroups corrections={corrections} checks={checks} suggestions={suggestions} errorMessage={errorMessage} validationIssueFields={validationIssueFields} onEditDefinition={onEditDefinition} />
      <CmmDisclosure summary="Aperçu public bénévole" tone="sky" size="sm">
        <ActionBeforeVolunteerPreview publicInformation={publicInformation} weatherChecklist={weatherChecklist} requestWeather={requestWeather} />
      </CmmDisclosure>
      <ActionCreationLegalPanel actionId={actionId} draftFacts={draftFacts} onDraftFactsChange={onDraftFactsChange} onReadinessChange={onFormalitiesReadiness} actionEmailData={actionEmailData} />
    </div>
  </CmmCard>;
}

const FIELD_LABELS: Record<string, string> = {
  actionTitle: "Titre", actionDate: "Date", associationName: "Structure", organizerType: "Type d’organisateur",
  departureLocationLabel: "Rendez-vous", arrivalLocationLabel: "Arrivée", meetingTime: "Heure de rendez-vous",
  departureTime: "Heure de départ", durationMinutes: "Durée", eventStartTime: "Début", eventEndTime: "Fin",
  volunteersCount: "Effectif prévu", volunteerParticipation: "Répartition des bénévoles",
};

function ActionBeforeReviewGroups({ corrections, checks, suggestions, errorMessage, validationIssueFields, onEditDefinition }: Pick<ActionBeforeVerificationViewProps, "corrections" | "checks" | "suggestions" | "validationIssueFields" | "onEditDefinition"> & { errorMessage: string | null }) {
  return <section className="space-y-2" data-testid="action-publication-review-groups" aria-labelledby="action-review-title">
    <h3 id="action-review-title" className="text-sm font-black text-slate-900">À traiter avant de continuer</h3>
    {errorMessage || corrections.length || checks.length || suggestions.length ? <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
      {errorMessage && !corrections.includes(errorMessage) ? <li role="alert" className="font-semibold text-rose-800">{errorMessage}</li> : null}
      {corrections.map((item) => <li key={`correction-${item}`}>{item}</li>)}
      {checks.map((item) => <li key={`check-${item}`}><span className="font-semibold text-amber-900">À vérifier · </span>{item}</li>)}
      {suggestions.map((item) => <li key={`suggestion-${item}`}><span className="font-semibold text-sky-900">Suggestion · </span>{item}</li>)}
      {validationIssueFields.length && onEditDefinition ? <li className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2"><span>Accéder aux champs concernés :</span>{Array.from(new Set(validationIssueFields)).map((field) => <CmmButton key={field} type="button" tone="tertiary" variant="pill" size="sm" onClick={() => onEditDefinition(field)}>{FIELD_LABELS[field] ?? "Modifier dans Définir"}</CmmButton>)}</li> : null}
    </ul> : <p className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-950">Aucun blocage de formulaire détecté. Formalités à vérifier selon le contexte.</p>}
  </section>;
}

function ActionBeforeVolunteerPreview({ publicInformation, weatherChecklist, requestWeather }: Pick<ActionBeforeVerificationViewProps, "publicInformation" | "weatherChecklist" | "requestWeather">) {
  return <div className="rounded-2xl border border-sky-200/70 bg-sky-50/60 px-4 py-4" data-testid="action-volunteer-preview">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-sky-700">Aperçu bénévole</p><h3 className="mt-1 text-lg font-black text-sky-950">Informations pratiques publiques</h3></div><CmmPill tone="sky" size="sm">Sans notes internes</CmmPill></div>
    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <PreviewValue label="Message" value={publicInformation.participantMessage ?? "Non renseigné"} />
      <PreviewValue label="Sécurité" value={publicInformation.safetyInstructions ?? "Aucune consigne principale renseignée"} />
      <PreviewValue label="Matériel à apporter" value={[publicInformation.materialsToBring, ...publicInformation.derivedMaterials, ...(publicInformation.suggestedMaterials ?? [])].filter(Boolean).join(" · ") || "Non renseigné"} />
      <PreviewValue label="Équipements fournis" value={publicInformation.equipmentProvided.join(" · ") || "Non renseigné"} />
      <PreviewValue label="Convivialité" value={publicInformation.refreshmentsProvided.join(" · ") || "Non renseignée"} />
      <PreviewValue label="Checklist bénévole · à apporter" value={publicInformation.volunteerChecklist?.toBring.map((item) => item.label).join(" · ") || "Aucun complément calculé"} />
      <PreviewWeatherValue checklist={weatherChecklist} onRequest={requestWeather} />
      <PreviewValue label="Accessibilité" value={publicInformation.accessibility ?? "Non évaluée"} />
    </dl>
  </div>;
}

function PreviewValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-black uppercase tracking-[0.1em] text-sky-700">{label}</dt><dd className="mt-1 whitespace-pre-line leading-5 text-sky-950">{value}</dd></div>;
}

function PreviewWeatherValue({
  checklist,
  onRequest,
}: {
  checklist: ReturnType<typeof deriveActionVolunteerChecklist>;
  onRequest: () => void;
}) {
  return <div>
    <dt className="text-xs font-black uppercase tracking-[0.1em] text-sky-700">Checklist bénévole · météo</dt>
    <dd className="mt-1 whitespace-pre-line leading-5 text-sky-950">
      {checklist.weatherState === "success"
        ? checklist.weatherRecommendations.map((item) => item.label).join(" · ") || "Aucune recommandation météo particulière."
        : <div className="space-y-2"><p>{checklist.weatherState === "idle" ? "Météo sur demande." : checklist.weatherMessage}</p><CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={onRequest} disabled={checklist.weatherState === "loading"} aria-busy={checklist.weatherState === "loading"}>Voir la météo</CmmButton></div>}
    </dd>
  </div>;
}
