"use client";

import { useMemo, useState } from "react";
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
import { parseParisArrondissementCode, resolveParisCleaningDivisionContacts } from "@/lib/actions/formalities/paris-cleaning-contacts";
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

function userStatusLabel(status: "not_started" | "prepared" | "sent"): string {
  switch (status) {
    case "prepared": return "Préparée";
    case "sent": return "Déclarée envoyée";
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
    return <p className="text-xs text-emerald-900/75">Aucune pièce AOT n&apos;est demandée pour le nettoyage participatif ainsi qualifié.</p>;
  }
  return <p className="text-xs text-emerald-900/75">Pièces complémentaires non déterminées par les éléments disponibles ; vérifier la source officielle si la démarche est engagée.</p>;
}

function ActionFormalityDetails({ formality, status }: { formality: Formality; status: "not_started" | "prepared" | "sent" }) {
  return <>
    <dl className="grid gap-2 text-sm text-emerald-900/75 sm:grid-cols-2"><div><dt className="font-semibold">Procédure</dt><dd>{procedureLabel(formality.procedureKind)}</dd></div><div><dt className="font-semibold">Destinataire</dt><dd>{formality.recipient ?? "À identifier"}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Pourquoi</dt><dd>{formality.justification}</dd></div>{formality.deadline ? <div><dt className="font-semibold">Délai indicatif</dt><dd>{formality.deadline.minimumValue} {deadlineUnitLabel(formality.deadline.unit)}</dd></div> : null}<div className="sm:col-span-2"><dt className="font-semibold">Périmètre de la règle</dt><dd>{formality.scope}</dd></div><div><dt className="font-semibold">État de votre démarche</dt><dd>{userStatusLabel(status)}</dd></div></dl>
    {formality.officialChannel ? <p className="text-xs text-emerald-900/70">Canal : {formality.officialChannel.url ? <a className="font-semibold underline" href={formality.officialChannel.url} target="_blank" rel="noreferrer">{formality.officialChannel.label}</a> : formality.officialChannel.label}</p> : null}
    {formality.requestedInformation.length ? <div className="text-xs text-emerald-900/75"><p className="font-semibold">Informations demandées</p><ul className="mt-1 list-disc space-y-1 pl-4">{formality.requestedInformation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    <DocumentRequirements formality={formality} />
    <p className="text-xs text-emerald-900/65">Source : {formality.source?.url ? <a className="font-semibold underline" href={formality.source.url} target="_blank" rel="noreferrer">{formality.source.title}</a> : (formality.source?.title ?? "Aucune source officielle suffisante")}{formality.source?.verifiedOn ? ` · vérifiée le ${formality.source.verifiedOn}` : ""}</p>
  </>;
}

function ActionFormalityActions({ formality, progress, status, isSaving, readOnly, onTransition }: { formality: Formality; progress: ActionFormalitiesWorkflowState["progress"][number] | undefined; status: "not_started" | "prepared" | "sent"; isSaving: boolean; readOnly: boolean; onTransition: (formalityId: string, kind: "mark_prepared" | "declare_sent") => void }) {
  if (readOnly) return <p className="text-xs font-semibold text-sky-800">Les démarches seront conservées après l&apos;enregistrement.</p>;
  return <><div className="flex flex-wrap gap-2">{status === "not_started" || !progress?.validForQualification ? <CmmButton tone="secondary" variant="pill" size="sm" onClick={() => onTransition(formality.id, "mark_prepared")} disabled={isSaving}>{progress?.validForQualification === false ? "Requalifier cette démarche" : "Marquer comme préparée"}</CmmButton> : null}{status === "prepared" ? <CmmButton tone="tertiary" variant="pill" size="sm" onClick={() => onTransition(formality.id, "declare_sent")} disabled={isSaving}>Je déclare l&apos;avoir envoyée</CmmButton> : null}</div>{!progress?.validForQualification ? <p className="text-xs font-semibold text-amber-800">Les faits ont changé : cette démarche doit être revue. La preuve existante est conservée.</p> : null}</>;
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
  onTransition: (formalityId: string, kind: "mark_prepared" | "declare_sent") => void;
}) {
  const status = progress?.userStatus ?? "not_started";
  return (
    <CmmCard key={formality.id} tone="emerald" variant="glass" size="md">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><CmmPill tone={requirementTone(formality.requirementStatus)} size="sm">{requirementLabel(formality.requirementStatus)}</CmmPill><CmmPill tone={status === "sent" ? "emerald" : "slate"} size="sm">{userStatusLabel(status)}</CmmPill></div>
        <h4 className="text-base font-bold text-emerald-950">{formality.competentAuthority.label}</h4>
        {isNationalFallback(formality) ? <NationalFallbackNotice /> : null}
        <ActionFormalityDetails formality={formality} status={status} />
        <ActionFormalityActions formality={formality} progress={progress} status={status} isSaving={isSaving} readOnly={readOnly} onTransition={onTransition} />
      </div>
    </CmmCard>
  );
}

export function ActionFormalitiesQualificationView({
  qualification,
  workflow,
  facts,
  actionEmailData,
  isSaving,
  readOnly = false,
  onTransition,
}: {
  qualification: ActionFormalitiesQualification;
  workflow: ActionFormalitiesWorkflowState;
  facts?: ActionFormalitiesFacts;
  actionEmailData?: FormalitiesEmailActionData;
  isSaving: boolean;
  readOnly?: boolean;
  onTransition: (formalityId: string, kind: "mark_prepared" | "declare_sent") => void;
}) {
  const progressById = new Map(workflow.progress.map((progress) => [progress.formalityId, progress]));
  const summary = summaryFor(qualification);
  const primaryFormality = qualification.formalities.find((formality) => formality.requirementStatus === "required") ??
    qualification.formalities.find((formality) => formality.requirementStatus === "recommended") ??
    qualification.formalities[0];
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
  const contacts = useMemo(
    () => isParisMunicipalCleanwalk ? resolveParisCleaningDivisionContacts(selectedArrondissements) : [],
    [isParisMunicipalCleanwalk, selectedArrondissements],
  );

  return (
    <div className="space-y-3" aria-live="polite" data-testid="action-formalities-qualification">
      <CmmCard tone={summary.tone === "amber" ? "amber" : summary.tone === "sky" ? "sky" : summary.tone === "slate" ? "slate" : "emerald"} variant="glass" size="md" data-testid="action-formalities-summary">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-black text-emerald-950">Formalités locales</h3><CmmPill tone={summary.tone} size="sm">{summary.label}</CmmPill></div>
          <p className="text-sm leading-5 text-emerald-950/80">{summary.explanation}</p>
          {primaryFormality ? <>
            <p className="text-sm text-emerald-950"><span className="font-semibold">Interlocuteur :</span> {primaryFormality.recipient ?? primaryFormality.competentAuthority.label ?? "À confirmer"}</p>
            <p className="text-xs text-emerald-900/70">Source : {primaryFormality.source?.url ? <a className="font-semibold underline" href={primaryFormality.source.url} target="_blank" rel="noreferrer">{primaryFormality.source.title}</a> : primaryFormality.source?.title ?? "Source à confirmer"}{primaryFormality.source?.verifiedOn ? ` · vérifiée le ${primaryFormality.source.verifiedOn}` : ""}</p>
          </> : null}
          <ActionFormalitiesPrintSheet summary={summary.label} actionData={actionEmailData} qualification={qualification} contacts={contacts} />
        </div>
      </CmmCard>
      {isParisMunicipalCleanwalk && contactFormality ? <ActionFormalitiesParisContactPanel actionData={actionEmailData} contactFormality={contactFormality} selectedArrondissements={selectedArrondissements} onArrondissementsChange={updateSelectedArrondissements} /> : null}
      <CmmDisclosure summary="Détail des démarches, sources et pièces" tone="slate" size="sm">
        <div className="space-y-3">
          {qualification.formalities.map((formality) => <ActionFormalityCard key={formality.id} formality={formality} progress={progressById.get(formality.id)} isSaving={isSaving} readOnly={readOnly} onTransition={onTransition} />)}
        </div>
      </CmmDisclosure>
    </div>
  );
}
