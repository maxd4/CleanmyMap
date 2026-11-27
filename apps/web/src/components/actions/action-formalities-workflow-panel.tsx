"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Loader2, Save } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import {
  fetchActionFormalities,
  updateActionFormalities,
  type ActionFormalitiesResponse,
} from "@/lib/actions/http";
import { qualifyActionFormalities, type ActionFormalitiesFacts } from "@/lib/actions/formalities/qualification";
import {
  buildFormalitiesWorkflowState,
  availableFormalitiesTransitions,
  isFormalitiesPublicationBlocked,
} from "@/lib/actions/formalities/workflow";
import {
  ActionFormalitiesQualificationView,
} from "./action-formalities-qualification-view";
import type { SupportNeed } from "@/lib/actions/formalities/accompaniment";
import type { FormalitiesEmailActionData } from "@/lib/actions/formalities/email-draft";

export { ActionFormalitiesQualificationView } from "./action-formalities-qualification-view";

function hasUnknownFacts(facts: ActionFormalitiesFacts | null): boolean {
  if (!facts) return false;
  return [
    facts.publicSpace,
    facts.manager.kind,
    facts.isPublicRoadwayActivity,
    facts.isCortegeOrGathering,
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

function buildDraftFormalitiesData(
  effectiveDraftFacts: ActionFormalitiesFacts | null,
  actionEmailData?: FormalitiesEmailActionData,
): ActionFormalitiesResponse | null {
  if (!effectiveDraftFacts) return null;
  const qualification = qualifyActionFormalities(effectiveDraftFacts);
  const workflow = buildFormalitiesWorkflowState({ facts: effectiveDraftFacts, qualification });
  return { status: "ok", actionId: "draft", facts: effectiveDraftFacts, qualification, workflow,
    availableTransitions: Object.fromEntries(qualification.formalities.map((formality) => [formality.id,
      availableFormalitiesTransitions(formality, workflow.progress.find((progress) => progress.formalityId === formality.id))])),
    actionData: actionEmailData };
}

function useActionFormalitiesData({
  actionId,
  draftData,
  notifyReadiness,
}: {
  actionId?: string | null;
  draftData: ActionFormalitiesResponse | null;
  notifyReadiness: (readiness: { known: boolean; blocked: boolean }) => void;
}) {
  const [data, setData] = useState<ActionFormalitiesResponse | null>(null);
  const [facts, setFacts] = useState<ActionFormalitiesFacts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actionId) {
      const readiness = draftData
        ? { known: true, blocked: isFormalitiesPublicationBlocked(draftData.qualification, draftData.workflow) }
        : { known: false, blocked: false };
      notifyReadiness(readiness);
      return;
    }

    let active = true;
    fetchActionFormalities(actionId)
      .then((next) => {
        if (!active) return;
        setData(next);
        setFacts(next.facts);
        notifyReadiness({
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
  }, [actionId, draftData, notifyReadiness]);

  return { data, setData, facts, setFacts, error, setError };
}

function useActionFormalitiesReadiness(
  onReadinessChange?: (readiness: { known: boolean; blocked: boolean }) => void,
) {
  const lastReadinessKey = useRef<string | null>(null);
  return useCallback((readiness: { known: boolean; blocked: boolean }) => {
    const key = `${readiness.known}:${readiness.blocked}`;
    if (lastReadinessKey.current === key) return;
    lastReadinessKey.current = key;
    onReadinessChange?.(readiness);
  }, [onReadinessChange]);
}

function useActionFormalitiesPersistence({
  actionId,
  visibleFacts,
  notifyReadiness,
  setData,
  setFacts,
  setError,
}: {
  actionId?: string | null;
  visibleFacts: ActionFormalitiesFacts | null;
  notifyReadiness: (readiness: { known: boolean; blocked: boolean }) => void;
  setData: Dispatch<SetStateAction<ActionFormalitiesResponse | null>>;
  setFacts: Dispatch<SetStateAction<ActionFormalitiesFacts | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const persistFormalitiesUpdate = useCallback(async (
    update: Parameters<typeof updateActionFormalities>[1],
    fallbackMessage: string,
  ) => {
    if (!actionId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const next = await updateActionFormalities(actionId, update);
      setData(next);
      setFacts(next.facts);
      notifyReadiness({
        known: true,
        blocked: isFormalitiesPublicationBlocked(next.qualification, next.workflow),
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error && reason.message ? reason.message : fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  }, [actionId, isSaving, notifyReadiness, setData, setError, setFacts]);

  const saveFacts = useCallback(async () => {
    if (!visibleFacts) return;
    await persistFormalitiesUpdate(
      { facts: visibleFacts },
      "Impossible d'enregistrer les faits de qualification.",
    );
  }, [persistFormalitiesUpdate, visibleFacts]);

  const applyTransition = useCallback(async (
    formalityId: string,
    kind: "mark_prepared" | "declare_sent" | "record_receipt" | "record_authorization" | "record_refusal",
  ) => {
    await persistFormalitiesUpdate(
      { transition: { formalityId, kind } },
      "Impossible d'enregistrer cet état de formalité.",
    );
  }, [persistFormalitiesUpdate]);

  return { isSaving, saveFacts, applyTransition };
}

type ActionFormalitiesWorkflowPanelProps = {
  actionId?: string | null;
  draftFacts?: ActionFormalitiesFacts | null;
  onDraftFactsChange?: (facts: ActionFormalitiesFacts) => void;
  onReadinessChange?: (readiness: { known: boolean; blocked: boolean }) => void;
  actionEmailData?: FormalitiesEmailActionData;
  supportNeeds?: readonly SupportNeed[];
  onSupportNeedsChange?: (needs: SupportNeed[]) => void;
};

export function ActionFormalitiesWorkflowPanel(props: ActionFormalitiesWorkflowPanelProps) {
  return <ActionFormalitiesWorkflowPanelRuntime {...props} />;
}

function ActionFormalitiesWorkflowPanelRuntime({
  actionId,
  draftFacts,
  onDraftFactsChange,
  onReadinessChange,
  actionEmailData,
  supportNeeds,
  onSupportNeedsChange,
}: ActionFormalitiesWorkflowPanelProps) {
  const [draftFactsOverride, setDraftFactsOverride] = useState<ActionFormalitiesFacts | null>(null);

  const effectiveDraftFacts = draftFactsOverride ?? draftFacts ?? null;
  const draftData = useMemo(
    () => buildDraftFormalitiesData(effectiveDraftFacts, actionEmailData),
    [actionEmailData, effectiveDraftFacts],
  );

  const notifyReadiness = useActionFormalitiesReadiness(onReadinessChange);

  const { data, setData, facts, setFacts, error, setError } = useActionFormalitiesData({
    actionId,
    draftData,
    notifyReadiness,
  });

  const visibleData = actionId ? data : draftData;
  const visibleFacts = actionId ? facts : effectiveDraftFacts;
  const hasUnknown = useMemo(() => hasUnknownFacts(visibleFacts), [visibleFacts]);
  const { isSaving, saveFacts, applyTransition } = useActionFormalitiesPersistence({
    actionId,
    visibleFacts,
    notifyReadiness,
    setData,
    setFacts,
    setError,
  });

  function updateDraftFacts(next: ActionFormalitiesFacts) {
    setDraftFactsOverride(next);
    setFacts(next);
    if (!actionId) onDraftFactsChange?.(next);
  }

  if (!actionId && (!visibleData || !visibleFacts)) {
    return <p className="text-sm leading-6 text-emerald-950">Renseignez le lieu pour obtenir une qualification indicative. Elle sera recalculée et conservée après l&apos;enregistrement.</p>;
  }
  const isLoading = !visibleData || visibleData.actionId !== (actionId ?? "draft");
  if (error && isLoading) return <p className="text-sm text-rose-700">{error}</p>;
  if (isLoading) return <p className="text-sm text-emerald-900">Qualification en cours…</p>;
  if (!visibleData || !visibleFacts) return null;

  return <ActionFormalitiesWorkflowContent
    actionId={actionId}
    error={error}
    hasUnknown={hasUnknown}
    isSaving={isSaving}
    updateDraftFacts={updateDraftFacts}
    saveFacts={saveFacts}
    applyTransition={applyTransition}
    visibleData={visibleData}
    visibleFacts={visibleFacts}
    actionEmailData={visibleData.actionData ?? actionEmailData}
    supportNeeds={supportNeeds}
    onSupportNeedsChange={onSupportNeedsChange}
  />;
}

function ActionFormalitiesWorkflowContent({
  actionId,
  error,
  hasUnknown,
  isSaving,
  updateDraftFacts,
  saveFacts,
  applyTransition,
  visibleData,
  visibleFacts,
  actionEmailData,
  supportNeeds,
  onSupportNeedsChange,
}: {
  actionId?: string | null;
  error: string | null;
  hasUnknown: boolean;
  isSaving: boolean;
  updateDraftFacts: (next: ActionFormalitiesFacts) => void;
  saveFacts: () => Promise<void>;
  applyTransition: (formalityId: string, kind: "mark_prepared" | "declare_sent" | "record_receipt" | "record_authorization" | "record_refusal") => Promise<void>;
  visibleData: ActionFormalitiesResponse;
  visibleFacts: ActionFormalitiesFacts;
  actionEmailData?: FormalitiesEmailActionData;
  supportNeeds?: readonly SupportNeed[];
  onSupportNeedsChange?: (needs: SupportNeed[]) => void;
}) {
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

      <CmmDisclosure summary="Questions détaillées de qualification" tone="emerald" size="sm">
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
        <FactSelect description="Pour une cleanwalk, le fait d'emprunter une rue ne suffit pas à caractériser un cortège : répondez aussi à la question dédiée." label="Activité sur la voie publique" value={visibleFacts.isPublicRoadwayActivity} onChange={(value) => updateDraftFacts({ ...visibleFacts, isPublicRoadwayActivity: value })} />
        <FactSelect description="Le déplacement du groupe pendant le ramassage ne suffit pas à caractériser un cortège." label="Nettoyage avec déplacement du groupe" value={visibleFacts.isItinerant} onChange={(value) => updateDraftFacts({ ...visibleFacts, isItinerant: value })} />
        <FactSelect description="Oui seulement si l'opération organise un cortège, défilé ou rassemblement sur la voie publique. Une cleanwalk en déplacement ne devient pas un cortège pour ce seul motif." label="Cortège, défilé ou rassemblement organisé" value={visibleFacts.isCortegeOrGathering} onChange={(value) => updateDraftFacts({ ...visibleFacts, isCortegeOrGathering: value })} />
        <FactSelect description="Répondez oui en présence d'un objet ou message revendicatif organisé, pas simplement parce que l'action défend la propreté." label="Dimension revendicative" value={visibleFacts.isClaiming} onChange={(value) => updateDraftFacts({ ...visibleFacts, isClaiming: value })} />
        <FactSelect description="Exemples : tente, scène, stand ou structure. Les gants et sacs de collecte ne sont pas une installation événementielle." label="Installation ou structure événementielle" value={visibleFacts.hasInstallations} onChange={(value) => updateDraftFacts({ ...visibleFacts, hasInstallations: value })} />
        <FactSelect description="Emprise particulière ou espace immobilisé/réservé au-delà du simple passage et du ramassage." label="Emprise physique particulière" value={visibleFacts.requiresPhysicalOccupation} onChange={(value) => updateDraftFacts({ ...visibleFacts, requiresPhysicalOccupation: value })} />
        <FactSelect label="Foule importante ou installation complexe" value={visibleFacts.largeCrowdOrComplexInstallations} onChange={(value) => updateDraftFacts({ ...visibleFacts, largeCrowdOrComplexInstallations: value })} />
        <FactSelect label="Usage local établi" value={visibleFacts.localCustomaryUse} onChange={(value) => updateDraftFacts({ ...visibleFacts, localCustomaryUse: value })} />
      </div>
      </CmmDisclosure>

      <div className="flex flex-wrap items-center gap-3">
        {actionId ? <CmmButton tone="primary" variant="pill" size="sm" onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ saveFacts(); }} disabled={isSaving}>
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer les faits
        </CmmButton> : <span className="text-xs font-semibold text-sky-800">Qualification indicative · non persistée avant la création de l&apos;action</span>}
        {hasUnknown ? <span className="text-xs text-amber-800">Certaines données doivent encore être confirmées.</span> : null}
      </div>
      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      <ActionFormalitiesQualificationView actionId={actionId} qualification={visibleData.qualification} workflow={visibleData.workflow} facts={visibleFacts} actionEmailData={actionEmailData} supportNeeds={supportNeeds} onSupportNeedsChange={onSupportNeedsChange} isSaving={isSaving} readOnly={!actionId} onTransition={(formalityId, kind) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ applyTransition(formalityId, kind); }} />
    </div>
  );
}

function SelectField({
  label,
  description,
  descriptionId,
  value,
  onChange,
  options,
}: {
  label: string;
  description?: string;
  descriptionId?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-emerald-950">
      <span>{label}</span>
      {description ? <span id={descriptionId} className="text-xs font-normal leading-5 text-emerald-900">{description}</span> : null}
      <select aria-describedby={descriptionId} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-normal text-emerald-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
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
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean | "unknown";
  onChange: (value: boolean | "unknown") => void;
}) {
  const descriptionId = description ? `formalities-help-${label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}` : undefined;
  return <SelectField label={label} description={description} descriptionId={descriptionId} value={factValue(value)} onChange={(next) => onChange(next === "true" ? true : next === "false" ? false : "unknown")} options={TERNARY_OPTIONS} />;
}
