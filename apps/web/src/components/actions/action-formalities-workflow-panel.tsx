"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  fetchActionFormalities,
  updateActionFormalities,
  type ActionFormalitiesResponse,
} from "@/lib/actions/http";
import { qualifyActionFormalities, type ActionFormalitiesFacts } from "@/lib/actions/formalities-qualification";
import {
  buildFormalitiesWorkflowState,
  isFormalitiesPublicationBlocked,
} from "@/lib/actions/formalities-workflow";
import {
  ActionFormalitiesQualificationView,
} from "./action-formalities-qualification-view";

export { ActionFormalitiesQualificationView } from "./action-formalities-qualification-view";

function hasUnknownFacts(facts: ActionFormalitiesFacts | null): boolean {
  if (!facts) return false;
  return [
    facts.publicSpace,
    facts.manager.kind,
    facts.isPublicRoadwayActivity,
    facts.isItinerant,
    facts.isClaiming,
    facts.hasInstallations,
    facts.requiresPhysicalOccupation,
    facts.localCustomaryUse,
    facts.largeCrowdOrComplexInstallations,
  ].some((value) => value === "unknown");
}

function factValue(value: boolean | "unknown"): string {
  return value === "unknown" ? "unknown" : value ? "true" : "false";
}

export function ActionFormalitiesWorkflowPanel({
  actionId,
  draftFacts,
  onDraftFactsChange,
  onReadinessChange,
}: {
  actionId?: string | null;
  draftFacts?: ActionFormalitiesFacts | null;
  onDraftFactsChange?: (facts: ActionFormalitiesFacts) => void;
  onReadinessChange?: (readiness: { known: boolean; blocked: boolean }) => void;
}) {
  const [data, setData] = useState<ActionFormalitiesResponse | null>(null);
  const [facts, setFacts] = useState<ActionFormalitiesFacts | null>(null);
  const [draftFactsOverride, setDraftFactsOverride] = useState<ActionFormalitiesFacts | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDraftFacts = draftFactsOverride ?? draftFacts ?? null;
  const draftData = useMemo(() => {
    if (!effectiveDraftFacts) return null;
    const qualification = qualifyActionFormalities(effectiveDraftFacts);
    const workflow = buildFormalitiesWorkflowState({ facts: effectiveDraftFacts, qualification });
    return { status: "ok" as const, actionId: "draft", facts: effectiveDraftFacts, qualification, workflow };
  }, [effectiveDraftFacts]);

  useEffect(() => {
    if (!actionId) {
      if (draftData) {
        onReadinessChange?.({
          known: true,
          blocked: isFormalitiesPublicationBlocked(draftData.qualification, draftData.workflow),
        });
      } else {
        onReadinessChange?.({ known: false, blocked: false });
      }
      return;
    }

    let active = true;
    fetchActionFormalities(actionId)
      .then((next) => {
        if (!active) return;
        setData(next);
        setFacts(next.facts);
        onReadinessChange?.({
          known: true,
          blocked: isFormalitiesPublicationBlocked(next.qualification, next.workflow),
        });
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
  }, [actionId, draftData, onReadinessChange]);

  const visibleData = actionId ? data : draftData;
  const visibleFacts = actionId ? facts : effectiveDraftFacts;
  const hasUnknown = useMemo(() => hasUnknownFacts(visibleFacts), [visibleFacts]);

  function updateDraftFacts(next: ActionFormalitiesFacts) {
    setDraftFactsOverride(next);
    setFacts(next);
    if (!actionId) onDraftFactsChange?.(next);
  }

  async function persistFormalitiesUpdate(
    update: Parameters<typeof updateActionFormalities>[1],
    fallbackMessage: string,
  ) {
    if (!actionId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const next = await updateActionFormalities(actionId, update);
      setData(next);
      setFacts(next.facts);
      onReadinessChange?.({
        known: true,
        blocked: isFormalitiesPublicationBlocked(next.qualification, next.workflow),
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error && reason.message ? reason.message : fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveFacts() {
    if (!visibleFacts) return;
    await persistFormalitiesUpdate(
      { facts: visibleFacts },
      "Impossible d'enregistrer les faits de qualification.",
    );
  }

  async function applyTransition(
    formalityId: string,
    kind: "mark_prepared" | "declare_sent",
  ) {
    await persistFormalitiesUpdate(
      { transition: { formalityId, kind } },
      "Impossible d'enregistrer cet état de formalité.",
    );
  }

  if (!actionId && (!visibleData || !visibleFacts)) {
    return <p className="text-sm leading-6 text-emerald-950">Renseignez le lieu pour obtenir une qualification indicative. Elle sera recalculée et conservée après l&apos;enregistrement.</p>;
  }
  const isLoading = !visibleData || visibleData.actionId !== (actionId ?? "draft");
  if (error && isLoading) return <p className="text-sm text-rose-700">{error}</p>;
  if (isLoading) return <p className="text-sm text-emerald-900/70">Qualification en cours…</p>;
  if (!visibleData || !visibleFacts) return null;

  const managerNeedsLabel = visibleFacts.manager.kind === "other_public";
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
        <SelectField label="Espace concerné" value={visibleFacts.publicSpace} onChange={(value) => updateDraftFacts({ ...visibleFacts, publicSpace: value as ActionFormalitiesFacts["publicSpace"] })} options={[
          { value: "unknown", label: "À préciser" },
          { value: "public_domain", label: "Domaine public" },
          { value: "private_domain", label: "Domaine privé" },
        ]} />
        <SelectField label="Gestionnaire identifié" value={visibleFacts.manager.kind} onChange={(value) => updateDraftFacts({ ...visibleFacts, manager: { kind: value as ActionFormalitiesFacts["manager"]["kind"], label: value === "other_public" ? visibleFacts.manager.label : null } })} options={[
          { value: "unknown", label: "À identifier" },
          { value: "paris_city", label: "Ville de Paris" },
          { value: "state", label: "État" },
          { value: "sncf", label: "SNCF" },
          { value: "haropa", label: "HAROPA" },
          { value: "other_public", label: "Autre gestionnaire public" },
          { value: "private", label: "Gestionnaire privé" },
        ]} />
        {managerNeedsLabel ? <label className="grid gap-1 text-xs font-semibold text-emerald-950 sm:col-span-2"><span>Nom du gestionnaire (si connu)</span><input value={visibleFacts.manager.label ?? ""} onChange={(event) => updateDraftFacts({ ...visibleFacts, manager: { ...visibleFacts.manager, label: event.target.value || null } })} maxLength={200} className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" /></label> : null}
        <FactSelect label="Activité sur la voie publique" value={visibleFacts.isPublicRoadwayActivity} onChange={(value) => updateDraftFacts({ ...visibleFacts, isPublicRoadwayActivity: value })} />
        <FactSelect label="Action itinérante" value={visibleFacts.isItinerant} onChange={(value) => updateDraftFacts({ ...visibleFacts, isItinerant: value })} />
        <FactSelect label="Dimension revendicative" value={visibleFacts.isClaiming} onChange={(value) => updateDraftFacts({ ...visibleFacts, isClaiming: value })} />
        <FactSelect label="Installation ou structure" value={visibleFacts.hasInstallations} onChange={(value) => updateDraftFacts({ ...visibleFacts, hasInstallations: value })} />
        <FactSelect label="Occupation physique du lieu" value={visibleFacts.requiresPhysicalOccupation} onChange={(value) => updateDraftFacts({ ...visibleFacts, requiresPhysicalOccupation: value })} />
        <FactSelect label="Foule importante ou installation complexe" value={visibleFacts.largeCrowdOrComplexInstallations} onChange={(value) => updateDraftFacts({ ...visibleFacts, largeCrowdOrComplexInstallations: value })} />
        <FactSelect label="Usage local établi" value={visibleFacts.localCustomaryUse} onChange={(value) => updateDraftFacts({ ...visibleFacts, localCustomaryUse: value })} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {actionId ? <CmmButton tone="primary" variant="pill" size="sm" onClick={() => void saveFacts()} disabled={isSaving}>
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer les faits
        </CmmButton> : <span className="text-xs font-semibold text-sky-800">Qualification indicative · non persistée avant la création de l&apos;action</span>}
        {hasUnknown ? <span className="text-xs text-amber-800">Certaines données doivent encore être confirmées.</span> : null}
      </div>
      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      <ActionFormalitiesQualificationView qualification={visibleData.qualification} workflow={visibleData.workflow} isSaving={isSaving} readOnly={!actionId} onTransition={(formalityId, kind) => void applyTransition(formalityId, kind)} />
    </div>
  );
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
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal text-emerald-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

const TERNARY_OPTIONS = [
  { value: "unknown", label: "À préciser" },
  { value: "true", label: "Oui" },
  { value: "false", label: "Non" },
];

function FactSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | "unknown";
  onChange: (value: boolean | "unknown") => void;
}) {
  return <SelectField label={label} value={factValue(value)} onChange={(next) => onChange(next === "true" ? true : next === "false" ? false : "unknown")} options={TERNARY_OPTIONS} />;
}
