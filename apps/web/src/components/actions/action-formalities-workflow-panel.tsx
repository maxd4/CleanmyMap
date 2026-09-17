"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill, type PillTone } from "@/components/ui/cmm-pill";
import {
  fetchActionFormalities,
  updateActionFormalities,
  type ActionFormalitiesResponse,
} from "@/lib/actions/http";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities-qualification";

type TernaryFact = boolean | "unknown";

function factValue(value: TernaryFact): string {
  return value === "unknown" ? "unknown" : value ? "true" : "false";
}

function parseFact(value: string): TernaryFact {
  if (value === "true") return true;
  if (value === "false") return false;
  return "unknown";
}

function requirementLabel(status: ActionFormalitiesResponse["qualification"]["formalities"][number]["requirementStatus"]): string {
  switch (status) {
    case "required":
      return "Obligatoire selon la règle";
    case "recommended":
      return "Recommandé";
    case "not_required":
      return "Non requis dans ce cas";
    default:
      return "À confirmer";
  }
}

function requirementTone(status: ActionFormalitiesResponse["qualification"]["formalities"][number]["requirementStatus"]): PillTone {
  switch (status) {
    case "required":
      return "amber";
    case "recommended":
      return "sky";
    case "not_required":
      return "emerald";
    default:
      return "slate";
  }
}

function userStatusLabel(status: "not_started" | "prepared" | "sent"): string {
  switch (status) {
    case "prepared":
      return "Préparée";
    case "sent":
      return "Déclarée envoyée";
    default:
      return "À préparer";
  }
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-emerald-950">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal text-emerald-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const TERNARY_OPTIONS = [
  { value: "unknown", label: "À préciser" },
  { value: "true", label: "Oui" },
  { value: "false", label: "Non" },
];

export function ActionFormalitiesWorkflowPanel({
  actionId,
}: {
  actionId?: string | null;
}) {
  const [data, setData] = useState<ActionFormalitiesResponse | null>(null);
  const [facts, setFacts] = useState<ActionFormalitiesFacts | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actionId) {
      return;
    }

    let active = true;
    fetchActionFormalities(actionId)
      .then((next) => {
        if (!active) return;
        setData(next);
        setFacts(next.facts);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error && reason.message
            ? reason.message
          : "Impossible de charger la qualification des formalités.",
        );
      });

    return () => {
      active = false;
    };
  }, [actionId]);

  const hasUnknownFacts = useMemo(
    () =>
      facts
        ? [
            facts.publicSpace,
            facts.manager.kind,
            facts.isPublicRoadwayActivity,
            facts.isItinerant,
            facts.isClaiming,
            facts.hasInstallations,
            facts.requiresPhysicalOccupation,
          ].some((value) => value === "unknown")
      : false,
    [facts],
  );

  async function saveFacts() {
    if (!actionId || !facts || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const next = await updateActionFormalities(actionId, { facts });
      setData(next);
      setFacts(next.facts);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "Impossible d'enregistrer les faits de qualification.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function applyTransition(
    formalityId: string,
    kind: "mark_prepared" | "declare_sent",
  ) {
    if (!actionId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const next = await updateActionFormalities(actionId, {
        transition: { formalityId, kind },
      });
      setData(next);
      setFacts(next.facts);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error && reason.message
          ? reason.message
          : "Impossible d'enregistrer cet état de formalité.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!actionId) {
    return (
      <p className="text-sm leading-6 text-emerald-950">
        Enregistrez d&apos;abord le pré-formulaire pour qualifier les formalités et conserver leur état.
      </p>
    );
  }
  const isLoading = !data || data.actionId !== actionId;
  if (error && isLoading) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-emerald-900/70">Qualification en cours…</p>;
  }
  if (!data || !facts) return null;

  const progressById = new Map(
    data.workflow.progress.map((progress) => [progress.formalityId, progress]),
  );
  const managerNeedsLabel = facts.manager.kind === "other_public";

  return (
    <div className="space-y-5" data-testid="action-formalities-workflow">
      <div className="space-y-2">
        <h3 className="text-lg font-black text-emerald-950">Qualification officielle</h3>
        <p className="text-sm leading-6 text-emerald-950">
          Les faits ci-dessous déterminent la règle appliquée. Une information inconnue reste inconnue :
          elle ne crée pas d&apos;obligation et ne vaut pas confirmation d&apos;exemption.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-4 sm:grid-cols-2">
        <SelectField
          label="Espace concerné"
          value={facts.publicSpace}
          onChange={(value) => setFacts({ ...facts, publicSpace: value as ActionFormalitiesFacts["publicSpace"] })}
          options={[
            { value: "unknown", label: "À préciser" },
            { value: "public_domain", label: "Domaine public" },
            { value: "private_domain", label: "Domaine privé" },
          ]}
        />
        <SelectField
          label="Gestionnaire identifié"
          value={facts.manager.kind}
          onChange={(value) =>
            setFacts({
              ...facts,
              manager: {
                kind: value as ActionFormalitiesFacts["manager"]["kind"],
                label: value === "other_public" ? facts.manager.label : null,
              },
            })
          }
          options={[
            { value: "unknown", label: "À identifier" },
            { value: "paris_city", label: "Ville de Paris" },
            { value: "state", label: "État" },
            { value: "sncf", label: "SNCF" },
            { value: "haropa", label: "HAROPA" },
            { value: "other_public", label: "Autre gestionnaire public" },
            { value: "private", label: "Gestionnaire privé" },
          ]}
        />
        {managerNeedsLabel ? (
          <label className="grid gap-1 text-xs font-semibold text-emerald-950 sm:col-span-2">
            <span>Nom du gestionnaire (si connu)</span>
            <input
              value={facts.manager.label ?? ""}
              onChange={(event) =>
                setFacts({
                  ...facts,
                  manager: { ...facts.manager, label: event.target.value || null },
                })
              }
              maxLength={200}
              className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </label>
        ) : null}
        <SelectField
          label="Activité sur la voie publique"
          value={factValue(facts.isPublicRoadwayActivity)}
          onChange={(value) => setFacts({ ...facts, isPublicRoadwayActivity: parseFact(value) })}
          options={TERNARY_OPTIONS}
        />
        <SelectField
          label="Action itinérante"
          value={factValue(facts.isItinerant)}
          onChange={(value) => setFacts({ ...facts, isItinerant: parseFact(value) })}
          options={TERNARY_OPTIONS}
        />
        <SelectField
          label="Dimension revendicative"
          value={factValue(facts.isClaiming)}
          onChange={(value) => setFacts({ ...facts, isClaiming: parseFact(value) })}
          options={TERNARY_OPTIONS}
        />
        <SelectField
          label="Installation ou structure"
          value={factValue(facts.hasInstallations)}
          onChange={(value) => setFacts({ ...facts, hasInstallations: parseFact(value) })}
          options={TERNARY_OPTIONS}
        />
        <SelectField
          label="Occupation physique du lieu"
          value={factValue(facts.requiresPhysicalOccupation)}
          onChange={(value) => setFacts({ ...facts, requiresPhysicalOccupation: parseFact(value) })}
          options={TERNARY_OPTIONS}
        />
        <SelectField
          label="Foule importante ou installation complexe"
          value={factValue(facts.largeCrowdOrComplexInstallations)}
          onChange={(value) => setFacts({ ...facts, largeCrowdOrComplexInstallations: parseFact(value) })}
          options={TERNARY_OPTIONS}
        />
        <SelectField
          label="Usage local établi"
          value={factValue(facts.localCustomaryUse)}
          onChange={(value) => setFacts({ ...facts, localCustomaryUse: parseFact(value) })}
          options={TERNARY_OPTIONS}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CmmButton tone="primary" variant="pill" size="sm" onClick={() => void saveFacts()} disabled={isSaving}>
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer les faits
        </CmmButton>
        {hasUnknownFacts ? (
          <span className="text-xs text-amber-800">Certaines données doivent encore être confirmées.</span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}

      <div className="space-y-3" aria-live="polite">
        <h3 className="text-lg font-black text-emerald-950">Formalités applicables</h3>
        {data.qualification.formalities.map((formality) => {
          const progress = progressById.get(formality.id);
          const status = progress?.userStatus ?? "not_started";
          return (
            <CmmCard key={formality.id} tone="emerald" variant="glass" size="md">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CmmPill tone={requirementTone(formality.requirementStatus)} size="sm">
                    {requirementLabel(formality.requirementStatus)}
                  </CmmPill>
                  <CmmPill tone={status === "sent" ? "emerald" : "slate"} size="sm">
                    {userStatusLabel(status)}
                  </CmmPill>
                </div>
                <h4 className="text-base font-bold text-emerald-950">{formality.competentAuthority.label}</h4>
                <dl className="grid gap-2 text-sm text-emerald-900/75 sm:grid-cols-2">
                  <div><dt className="font-semibold">Procédure</dt><dd>{formality.procedureKind}</dd></div>
                  <div><dt className="font-semibold">Destinataire</dt><dd>{formality.recipient ?? "À identifier"}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-semibold">Pourquoi</dt><dd>{formality.justification}</dd></div>
                  {formality.deadline ? (
                    <div><dt className="font-semibold">Délai indicatif</dt><dd>{formality.deadline.minimumValue} {formality.deadline.unit}</dd></div>
                  ) : null}
                  <div className="sm:col-span-2"><dt className="font-semibold">Périmètre de la règle</dt><dd>{formality.scope}</dd></div>
                  <div><dt className="font-semibold">État de votre démarche</dt><dd>{userStatusLabel(status)}</dd></div>
                </dl>
                {formality.officialChannel ? (
                  <p className="text-xs text-emerald-900/70">
                    Canal : {formality.officialChannel.url ? (
                      <a className="font-semibold underline" href={formality.officialChannel.url} target="_blank" rel="noreferrer">
                        {formality.officialChannel.label}
                      </a>
                    ) : formality.officialChannel.label}
                  </p>
                ) : null}
                {formality.requestedInformation.length || formality.requestedDocuments.length ? (
                  <div className="grid gap-3 text-xs text-emerald-900/75 sm:grid-cols-2">
                    {formality.requestedInformation.length ? <div><p className="font-semibold">Informations demandées</p><ul className="mt-1 list-disc space-y-1 pl-4">{formality.requestedInformation.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                    {formality.requestedDocuments.length ? <div><p className="font-semibold">Pièces demandées</p><ul className="mt-1 list-disc space-y-1 pl-4">{formality.requestedDocuments.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
                  </div>
                ) : null}
                <p className="text-xs text-emerald-900/65">
                  Source : {formality.source?.url ? (
                    <a className="font-semibold underline" href={formality.source.url} target="_blank" rel="noreferrer">
                      {formality.source.title}
                    </a>
                  ) : (formality.source?.title ?? "Aucune source officielle suffisante")}
                  {formality.source?.verifiedOn ? ` · vérifiée le ${formality.source.verifiedOn}` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {status === "not_started" || !progress?.validForQualification ? (
                    <CmmButton tone="secondary" variant="pill" size="sm" onClick={() => void applyTransition(formality.id, "mark_prepared")} disabled={isSaving}>
                      {progress?.validForQualification === false ? "Requalifier cette démarche" : "Marquer comme préparée"}
                    </CmmButton>
                  ) : null}
                  {status === "prepared" ? (
                    <CmmButton tone="tertiary" variant="pill" size="sm" onClick={() => void applyTransition(formality.id, "declare_sent")} disabled={isSaving}>
                      Je déclare l&apos;avoir envoyée
                    </CmmButton>
                  ) : null}
                </div>
                {!progress?.validForQualification ? (
                  <p className="text-xs font-semibold text-amber-800">Les faits ont changé : cette démarche doit être revue. La preuve existante est conservée.</p>
                ) : null}
              </div>
            </CmmCard>
          );
        })}
      </div>
    </div>
  );
}
