"use client";

import { useMemo, useState } from "react";
import { ActionFormalitiesMetropolitanContacts } from "./action-formalities-metropolitan-contacts";
import { SUPPORT_NEEDS, MUNICIPAL_CLEANING_NEEDS, normalizeSupportNeeds, resolveLocalSupport, type SupportNeed } from "@/lib/actions/formalities/accompaniment";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmPill, type PillTone } from "@/components/ui/cmm-pill";
import type { ActionFormalitiesResponse } from "@/lib/actions/http";
import type {
  ActionFormalitiesFacts,
  ActionFormalitiesQualification,
} from "@/lib/actions/formalities/qualification";
import type { FormalitiesEmailActionData } from "@/lib/actions/formalities/email-draft";
import type { ActionFormalitiesWorkflowState } from "@/lib/actions/formalities/workflow";
import { availableFormalitiesTransitions } from "@/lib/actions/formalities/workflow";
import { parseParisArrondissementCode } from "@/lib/actions/formalities/paris-cleaning-contacts";
import { resolveParisFormalitiesSupport } from "@/lib/actions/formalities/paris-support";
import { ActionFormalitiesParisContactPanel } from "./action-formalities-paris-contact-panel";
import { ActionFormalitiesPrintSheet } from "./action-formalities-print-sheet";

type Formality = ActionFormalitiesResponse["qualification"]["formalities"][number];

function requirementLabel(status: Formality["requirementStatus"]): string {
  switch (status) {
    case "required": return "Obligatoire selon la règle";
    case "recommended": return "Recommandé";
    case "not_required": return "Non requis dans ce cas";
    default: return "À confirmer";
  }
}

function requirementTone(status: Formality["requirementStatus"]): PillTone {
  switch (status) {
    case "required": return "amber";
    case "recommended": return "sky";
    case "not_required": return "emerald";
    default: return "slate";
  }
}

type UserStatus = ActionFormalitiesWorkflowState["progress"][number]["userStatus"];
type TransitionKind = "mark_prepared" | "declare_sent" | "record_receipt" | "record_authorization" | "record_refusal";
function userStatusLabel(status: UserStatus): string {
  switch (status) {
    case "prepared": return "Préparée";
    case "sent": return "Déclarée envoyée";
    case "receipt_received": return "Récépissé déclaré reçu";
    case "authorization_obtained": return "Autorisation déclarée obtenue";
    case "refused": return "Refus déclaré reçu";
    default: return "À préparer";
  }
}

function deadlineUnitLabel(unit: "days" | "months"): string {
  return unit === "months" ? "mois" : "jours";
}

function procedureLabel(procedureKind: Formality["procedureKind"]): string {
  switch (procedureKind) {
    case "city_aot": return "Autorisation d’occupation temporaire";
    case "police_declaration": return "Déclaration auprès de l’autorité compétente";
    case "police_authorization": return "Accord d’ordre public et de sécurité";
    case "other_manager": return "Accord du gestionnaire du lieu";
    case "information_only": return "Information et vérification";
    case "none": return "Aucune procédure identifiée";
    default: return "Procédure locale à vérifier";
  }
}

function isNationalFallback(formality: Formality): boolean {
  return formality.ruleScope?.kind === "national" && formality.requirementStatus === "unknown";
}

function NationalFallbackNotice() {
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-sky-950" role="status">
      <p className="font-semibold">Cadre national disponible</p>
      <p className="mt-1 leading-5">
        Le cadre national applicable est disponible, mais CleanMyMap ne dispose pas encore d’une règle locale suffisamment vérifiée pour cette action.
      </p>
    </div>
  );
}

function summaryFor(qualification: ActionFormalitiesQualification): {
  label: string;
  tone: PillTone;
  explanation: string;
} {
  const statuses = qualification.formalities.map((formality) => formality.requirementStatus);
  if (statuses.includes("required")) {
    return { label: "Démarche requise", tone: "amber", explanation: "Au moins une formalité est requise selon les faits et la règle indiquée." };
  }
  if (statuses.includes("unknown")) {
    return { label: "À confirmer", tone: "slate", explanation: "Les faits ou les sources disponibles ne permettent pas de conclure sur toutes les formalités." };
  }
  if (statuses.includes("recommended")) {
    return { label: "Contact recommandé", tone: "sky", explanation: "Un contact pratique est recommandé ; il ne constitue pas à lui seul une obligation administrative." };
  }
  return { label: "Aucune déclaration identifiée", tone: "emerald", explanation: "Aucune déclaration ou autorisation n’est identifiée pour les faits qualifiés." };
}

function DocumentRequirements({ formality }: { formality: Formality }) {
  if (formality.requestedDocuments.length > 0) {
    const heading = formality.requirementStatus === "required"
      ? "Pièces listées pour la démarche requise"
      : formality.requirementStatus === "recommended"
        ? "Pièces recommandées"
        : "Pièces à confirmer";
    return <div className="text-xs text-emerald-900/75"><p className="font-semibold">{heading}</p><ul className="mt-1 list-disc space-y-1 pl-4">{formality.requestedDocuments.map((item) => <li key={item}>{item}</li>)}</ul></div>;
  }
  if (formality.requirementStatus === "unknown") {
    return <p className="text-xs font-semibold text-amber-900">Pièces à confirmer auprès de l&apos;interlocuteur compétent.</p>;
  }
  if (formality.procedureKind === "none") {
    return <p className="text-xs text-emerald-900/75">Aucune pièce particulière n&apos;est listée pour cette démarche.</p>;
  }
  return <p className="text-xs text-emerald-900/75">Pièces complémentaires non déterminées par les éléments disponibles ; vérifier la source officielle si la démarche est engagée.</p>;
}

function ActionFormalityDetails({ formality }: { formality: Formality }) {
  return <>
    <dl className="grid gap-2 text-sm text-emerald-950 sm:grid-cols-2"><div className="sm:col-span-2"><dt className="font-semibold">Pourquoi</dt><dd>{formality.justification}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Périmètre</dt><dd>{formality.scope}</dd></div></dl>
    <p className="text-sm">Canal : {formality.officialChannel?.url ? <a className="font-semibold underline" href={formality.officialChannel.url} target="_blank" rel="noreferrer">{formality.officialChannel.label}</a> : formality.officialChannel?.label ?? "À confirmer auprès de l’interlocuteur compétent"}</p>
    {formality.requestedInformation.length ? <div className="text-xs text-emerald-900/75"><p className="font-semibold">Informations demandées</p><ul className="mt-1 list-disc space-y-1 pl-4">{formality.requestedInformation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    <DocumentRequirements formality={formality} />
  </>;
}

function ActionFormalityActions({ formality, progress, status, isSaving, readOnly, onTransition }: { formality: Formality; progress: ActionFormalitiesWorkflowState["progress"][number] | undefined; status: UserStatus; isSaving: boolean; readOnly: boolean; onTransition: (formalityId: string, kind: TransitionKind) => void }) {
  if (readOnly) return <p className="text-xs font-semibold text-sky-800">Les démarches seront conservées après l&apos;enregistrement.</p>;
  const transitionLabels: Record<TransitionKind, string> = {
    mark_prepared: progress?.validForQualification === false ? "Requalifier cette démarche" : status === "refused" ? "Préparer une nouvelle demande" : "Marquer comme préparée",
    declare_sent: "Déclarer l’envoi",
    record_receipt: "Déclarer le récépissé reçu",
    record_authorization: "Déclarer l’autorisation obtenue",
    record_refusal: "Déclarer le refus reçu",
  };
  const transitions = availableFormalitiesTransitions(formality, progress);
  return <><div className="flex flex-wrap gap-2">{transitions.map((kind) => <CmmButton key={kind} tone={kind === "record_authorization" ? "primary" : kind === "declare_sent" ? "tertiary" : "secondary"} variant="pill" size="sm" onClick={() => onTransition(formality.id, kind)} disabled={isSaving}>{transitionLabels[kind]}</CmmButton>)}</div>{progress?.proof ? <p className="text-xs text-emerald-900">État déclaré par l&apos;organisateur le {new Date(progress.proof.recordedAt).toLocaleDateString("fr-FR")} ; aucune vérification externe.</p> : null}{!progress?.validForQualification ? <p className="text-xs font-semibold text-amber-800">Les faits ont changé : cette démarche doit être revue. La preuve existante est conservée.</p> : null}</>;
}

function ActionFormalityCard({
  formality,
  progress,
  isSaving,
  readOnly,
  onTransition,
}: {
  formality: Formality;
  progress: ActionFormalitiesWorkflowState["progress"][number] | undefined;
  isSaving: boolean;
  readOnly: boolean;
  onTransition: (formalityId: string, kind: TransitionKind) => void;
}) {
  const status = progress?.userStatus ?? "not_started";
  return <article className="space-y-2 border-t border-emerald-200 py-3 first:border-0 first:pt-0" data-formality-id={formality.id}>
    <div className="flex flex-wrap items-center gap-2"><CmmPill tone={requirementTone(formality.requirementStatus)} size="sm">{requirementLabel(formality.requirementStatus)}</CmmPill><CmmPill tone={formality.requirementStatus === "required" && (status === "refused" || status === "not_started" || status === "prepared" || !progress?.validForQualification) ? "amber" : status === "authorization_obtained" || status === "receipt_received" || status === "sent" ? "emerald" : "slate"} size="sm">{userStatusLabel(status)}</CmmPill><span className="text-sm font-semibold text-emerald-950">{procedureLabel(formality.procedureKind)}</span></div>
    {isNationalFallback(formality) ? <NationalFallbackNotice /> : <p className="text-sm leading-5 text-emerald-950">{formality.justification}</p>}
    {formality.deadline ? <p className="text-sm text-emerald-950"><strong>Délai minimum :</strong> {formality.deadline.minimumValue} {deadlineUnitLabel(formality.deadline.unit)}. {formality.deadline.note}</p> : formality.requirementStatus === "required" ? <p className="text-sm text-amber-950">Délai à confirmer auprès de l’autorité.</p> : null}
    {formality.source ? <p className="text-xs text-emerald-900">Source : {formality.source.url ? <a className="font-semibold underline" href={formality.source.url} target="_blank" rel="noreferrer">{formality.source.title}</a> : formality.source.title}{formality.source.verifiedOn ? ` · vérifiée le ${formality.source.verifiedOn}` : ""}</p> : <p className="text-xs font-semibold text-amber-900">Source officielle à confirmer.</p>}
    <ActionFormalityActions formality={formality} progress={progress} status={status} isSaving={isSaving} readOnly={readOnly} onTransition={onTransition} />
    <CmmDisclosure summary="Périmètre, canal, informations et pièces" tone="emerald" size="sm"><div className="space-y-2"><ActionFormalityDetails formality={formality} /></div></CmmDisclosure>
    {progress?.proof ? <p className="text-xs text-emerald-900">Déclaration enregistrée le {new Date(progress.proof.recordedAt).toLocaleDateString("fr-FR")} ; non vérifiée auprès de l’administration.</p> : null}
    {!progress?.validForQualification ? <p className="text-sm font-semibold text-amber-900">Les faits ont changé : cette démarche doit être revue. La preuve existante est conservée.</p> : null}
  </article>;
}

function groupFormalities(formalities: Formality[]) {
  const groups = new Map<string, Formality[]>();
  for (const formality of formalities) {
    const recipient = formality.recipient?.trim() || formality.competentAuthority.label;
    groups.set(recipient, [...(groups.get(recipient) ?? []), formality]);
  }
  return [...groups.entries()].map(([recipient, items]) => ({ recipient, items }));
}

function FormalityGroups({ formalities, progressById, isSaving, readOnly, onTransition }: {
  formalities: Formality[];
  progressById: Map<string, ActionFormalitiesWorkflowState["progress"][number]>;
  isSaving: boolean;
  readOnly: boolean;
  onTransition: (formalityId: string, kind: TransitionKind) => void;
}) {
  return <div className="space-y-3">{groupFormalities(formalities).map(group => <CmmCard key={group.recipient} as="section" tone="emerald" variant="outlined" size="sm">
    <h4 className="font-bold text-emerald-950">{group.recipient}</h4>
    {group.items.map(formality => <ActionFormalityCard key={formality.id} formality={formality} progress={progressById.get(formality.id)} isSaving={isSaving} readOnly={readOnly} onTransition={onTransition} />)}
  </CmmCard>)}</div>;
}

export function ActionFormalitiesQualificationView({
  qualification,
  workflow,
  facts,
  actionEmailData,
  isSaving,
  readOnly = false,
  onTransition,
  supportNeeds,
  onSupportNeedsChange,
  actionId,
}: {
  qualification: ActionFormalitiesQualification;
  workflow: ActionFormalitiesWorkflowState;
  facts?: ActionFormalitiesFacts;
  actionEmailData?: FormalitiesEmailActionData;
  actionId?: string | null;
  supportNeeds?: readonly SupportNeed[];
  onSupportNeedsChange?: (needs: SupportNeed[]) => void;
  isSaving: boolean;
  readOnly?: boolean;
  onTransition: (formalityId: string, kind: TransitionKind) => void;
}) {
  const [localNeeds, setLocalNeeds] = useState<SupportNeed[]>([]);
  const needs = supportNeeds ?? localNeeds;
  const updateNeeds = (next: SupportNeed[]) => {
    const normalized = normalizeSupportNeeds(next);
    if (onSupportNeedsChange) onSupportNeedsChange(normalized);
    else setLocalNeeds(normalized);
  };
  const progressById = new Map(workflow.progress.map((progress) => [progress.formalityId, progress]));
  const summary = summaryFor(qualification);
  const contactFormality = qualification.formalities.find((formality) => formality.id === "paris-participatory-cleaning-contact-cleanliness-service");
  const isParisMunicipalCleanwalk = Boolean(
    facts?.isCleanwalk &&
    facts.territory.code === "FR-75" &&
    facts.manager.kind === "paris_city" &&
    contactFormality,
  );
  const resolvedArrondissementCode = facts?.territory.arrondissement?.code ?? null;
  const formArrondissementCode = actionEmailData?.contactArrondissementCode ?? null;
  const resolvedContactAreaMode = actionEmailData?.contactAreaMode ?? "unknown";
  const initialArrondissements = useMemo(() => {
    if (resolvedContactAreaMode === "route_or_area") return [];
    const number = parseParisArrondissementCode(formArrondissementCode ?? resolvedArrondissementCode);
    return number ? [number] : [];
  }, [formArrondissementCode, resolvedArrondissementCode, resolvedContactAreaMode]);
  const arrondissementContextKey = `${resolvedContactAreaMode}:${formArrondissementCode ?? resolvedArrondissementCode ?? "unknown"}`;
  const [arrondissementSelection, setArrondissementSelection] = useState({
    contextKey: arrondissementContextKey,
    values: initialArrondissements,
  });
  const selectedArrondissements = arrondissementSelection.contextKey === arrondissementContextKey
    ? arrondissementSelection.values
    : initialArrondissements;
  const updateSelectedArrondissements = (values: number[]) => {
    setArrondissementSelection({ contextKey: arrondissementContextKey, values });
  };
  const support = useMemo(
    () => isParisMunicipalCleanwalk ? resolveParisFormalitiesSupport(selectedArrondissements) : undefined,
    [isParisMunicipalCleanwalk, selectedArrondissements],
  );

  return (
    <div className="space-y-3" data-testid="action-formalities-qualification">
      <CmmCard as="section" tone="emerald" variant="outlined" size="sm" data-testid="action-formalities-summary">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-black text-emerald-950">Formalités et accompagnement</h3><CmmPill tone={summary.tone} size="sm">{summary.label}</CmmPill></div>
          <p className="text-sm leading-5 text-emerald-950/80">{summary.explanation}</p>
          <ActionFormalitiesPrintSheet summary={summary.label} actionData={actionEmailData} qualification={qualification} contacts={support?.divisions ?? []} support={support} />
        </div>
      </CmmCard>
      {qualification.formalities.some(formality => formality.requirementStatus === "required") ? <section aria-labelledby="required-formalities-title" className="space-y-2"><h3 id="required-formalities-title" className="text-base font-bold text-emerald-950">Obligations et démarches requises</h3><FormalityGroups formalities={qualification.formalities.filter(formality => formality.requirementStatus === "required")} progressById={progressById} isSaving={isSaving} readOnly={readOnly} onTransition={onTransition} /></section> : null}
      {facts?.isCleanwalk ? <>
        <fieldset className="space-y-2 rounded-xl border border-emerald-200 p-3">
          <legend className="font-semibold">De quoi avez-vous besoin ? (facultatif)</legend>
          {SUPPORT_NEEDS.map(item => <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm text-slate-900 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-700"><input className="size-4 accent-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" type="checkbox" checked={needs.includes(item.id)} onChange={event => updateNeeds(event.target.checked ? [...needs, item.id] : needs.filter(need => need !== item.id))} />{item.label}</label>)}
        </fieldset>
        {isParisMunicipalCleanwalk && contactFormality && needs.some(need => MUNICIPAL_CLEANING_NEEDS.includes(need) || need === "association" || need === "communication") ? <ActionFormalitiesParisContactPanel actionData={actionEmailData} contactFormality={contactFormality} selectedArrondissements={selectedArrondissements} onArrondissementsChange={updateSelectedArrondissements} support={support} needs={needs} /> : null}
        {!isParisMunicipalCleanwalk ? resolveLocalSupport(qualification.territory, resolvedContactAreaMode, needs).map(channel => <section key={channel.id} className="space-y-2 rounded-xl border p-3 text-sm"><h4 className="font-semibold">{channel.label}</h4><p>{channel.guidance}</p><a className="underline" href={channel.url} target="_blank" rel="noreferrer">Démarche officielle</a>{channel.email ? <p><a className="underline" href={`mailto:${channel.email}`}>{channel.email}</a></p> : null}<p className="text-xs">Source vérifiée le {channel.verifiedOn}.</p></section>) : null}
        {needs.length ? <div className="space-y-1 text-sm">
          <p>Pour les besoins sans canal local documenté, vérifier l’interlocuteur compétent. Aucun soutien ni prise en charge n’est présumé.</p>
          {resolvedContactAreaMode !== "single_location" ? <p>Vérifier tous les territoires traversés : le point de départ ne suffit pas.</p> : null}
          <a href="https://lannuaire.service-public.gouv.fr/" target="_blank" rel="noreferrer" className="underline">Consulter l’annuaire officiel des services publics</a>
        </div> : null}
      </> : null}
      <CmmDisclosure summary="Autres démarches et interlocuteurs du territoire" tone="slate" size="sm">
        <div className="space-y-3">
          {qualification.formalities.some(formality => formality.requirementStatus !== "required") ? <FormalityGroups formalities={qualification.formalities.filter(formality => formality.requirementStatus !== "required")} progressById={progressById} isSaving={isSaving} readOnly={readOnly} onTransition={onTransition} /> : <p className="text-sm">Aucune autre démarche qualifiée.</p>}
          <ActionFormalitiesMetropolitanContacts key={actionId ?? "draft"} actionId={actionId} needs={needs} />
        </div>
      </CmmDisclosure>
    </div>
  );
}
