"use client";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill, type PillTone } from "@/components/ui/cmm-pill";
import type { ActionFormalitiesResponse } from "@/lib/actions/http";
import type {
  ActionFormalitiesQualification,
} from "@/lib/actions/formalities-qualification";
import type { ActionFormalitiesWorkflowState } from "@/lib/actions/formalities-workflow";

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

function preparedMessage(recipient: string | null): string {
  return recipient
    ? `À adresser à ${recipient}. Joignez les informations et pièces listées ci-dessus via le canal officiel.`
    : "Destinataire à identifier avant tout envoi. Aucun message n’est envoyé par ce parcours.";
}

function ActionFormalityDetails({ formality, status }: { formality: Formality; status: "not_started" | "prepared" | "sent" }) {
  return <>
    <dl className="grid gap-2 text-sm text-emerald-900/75 sm:grid-cols-2"><div><dt className="font-semibold">Procédure</dt><dd>{procedureLabel(formality.procedureKind)}</dd></div><div><dt className="font-semibold">Destinataire</dt><dd>{formality.recipient ?? "À identifier"}</dd></div><div className="sm:col-span-2"><dt className="font-semibold">Pourquoi</dt><dd>{formality.justification}</dd></div>{formality.deadline ? <div><dt className="font-semibold">Délai indicatif</dt><dd>{formality.deadline.minimumValue} {deadlineUnitLabel(formality.deadline.unit)}</dd></div> : null}<div className="sm:col-span-2"><dt className="font-semibold">Périmètre de la règle</dt><dd>{formality.scope}</dd></div><div><dt className="font-semibold">État de votre démarche</dt><dd>{userStatusLabel(status)}</dd></div></dl>
    {formality.officialChannel ? <p className="text-xs text-emerald-900/70">Canal : {formality.officialChannel.url ? <a className="font-semibold underline" href={formality.officialChannel.url} target="_blank" rel="noreferrer">{formality.officialChannel.label}</a> : formality.officialChannel.label}</p> : null}
    <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs text-sky-950"><p className="font-semibold">Message préparé</p><p className="mt-1 leading-5">{preparedMessage(formality.recipient)}</p></div>
    {formality.requestedInformation.length || formality.requestedDocuments.length ? <div className="grid gap-3 text-xs text-emerald-900/75 sm:grid-cols-2">{formality.requestedInformation.length ? <div><p className="font-semibold">Informations demandées</p><ul className="mt-1 list-disc space-y-1 pl-4">{formality.requestedInformation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{formality.requestedDocuments.length ? <div><p className="font-semibold">Pièces demandées</p><ul className="mt-1 list-disc space-y-1 pl-4">{formality.requestedDocuments.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}</div> : null}
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
  isSaving,
  readOnly = false,
  onTransition,
}: {
  qualification: ActionFormalitiesQualification;
  workflow: ActionFormalitiesWorkflowState;
  isSaving: boolean;
  readOnly?: boolean;
  onTransition: (formalityId: string, kind: "mark_prepared" | "declare_sent") => void;
}) {
  const progressById = new Map(workflow.progress.map((progress) => [progress.formalityId, progress]));

  return (
    <div className="space-y-3" aria-live="polite" data-testid="action-formalities-qualification">
      <h3 className="text-lg font-black text-emerald-950">Formalités locales</h3>
      {qualification.formalities.map((formality) => <ActionFormalityCard key={formality.id} formality={formality} progress={progressById.get(formality.id)} isSaving={isSaving} readOnly={readOnly} onTransition={onTransition} />)}
    </div>
  );
}
