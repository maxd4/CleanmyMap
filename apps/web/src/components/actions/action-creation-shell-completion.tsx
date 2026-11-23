"use client";

import { useEffect, useState } from "react";
import { ActionDeclarationForm } from "./action-declaration/form";
import { ActionLifecycleNavigation } from "./action-creation-shell-navigation";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { ActionRoleAttestationsPanel } from "@/components/actions/action-role-attestations-panel";
import type { ActionCreationSectionFormProps } from "./action-creation-shell.types";
import { ActionAttendanceRegistryEntryPoint, ActionAttendanceRegistryPanel } from "./action-attendance-registry-panel";
import { fetchActionById, updateAction, type ActionEditorRecord } from "@/lib/actions/http";

type SearchParams = Record<string, string | string[] | undefined>;

function ActionFinalizationEntry({
  actionId,
  formProps,
  onActionPersisted,
}: {
  actionId: string | null;
  formProps: ActionCreationSectionFormProps;
  onActionPersisted?: (actionId: string) => void;
}) {
  const [action, setAction] = useState<ActionEditorRecord | null>(null);
  const [loadedActionId, setLoadedActionId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = Boolean(actionId && loadedActionId !== actionId);

  useEffect(() => {
    if (!actionId) return;
    let active = true;
    fetchActionById(actionId).then((record) => {
      if (active) {
        setAction(record);
        setError(null);
        setLoadedActionId(actionId);
      }
    }).catch((cause: unknown) => {
      if (active) {
        setError(cause instanceof Error ? cause.message : "Impossible de vérifier l’accès au bilan.");
        setLoadedActionId(actionId);
      }
    });
    return () => { active = false; };
  }, [actionId]);

  if (!actionId) return <ActionDeclarationForm {...formProps} initialActionId={null} onActionPersisted={onActionPersisted} />;
  if (loading) return <p role="status" className="rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-900">Vérification de l’échéance de l’action…</p>;
  if (error || !action) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error ?? "Cette action est indisponible."}</p>;

  if (action.actionPhase === "post_action_complete") {
    return <ActionDeclarationForm {...formProps} initialActionId={actionId} onActionPersisted={onActionPersisted} />;
  }
  if (action.status === "cancelled" || action.status === "rejected") {
    return <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Cette action est terminée administrativement et ne peut pas être finalisée.</p>;
  }
  if (!action.finalizationEligible) {
    return <CmmCard tone="emerald" variant="glass" size="md"><div className="space-y-3"><h2 className="text-lg font-black text-emerald-950">La pré-action reste ouverte</h2><p className="cmm-text-body cmm-text-primary">Les inscriptions et les informations de préparation restent accessibles. Le bilan pourra être complété après la fin de l’action.</p><CmmButton tone="secondary" variant="pill" size="md" href={`/actions/new?space=prepare&actionId=${encodeURIComponent(actionId)}`}>Retourner à Préparer</CmmButton></div></CmmCard>;
  }
  if (action.actionPhase === "post_action_draft") {
    return <ActionDeclarationForm {...formProps} initialActionId={actionId} onActionPersisted={onActionPersisted} />;
  }

  const beginFinalization = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await updateAction(actionId, { actionPhase: "post_action_draft" });
      if (result.actionId !== actionId) throw new Error("La mise à jour a retourné une action différente.");
      setAction({ ...action, actionPhase: "post_action_draft" });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible d’ouvrir le bilan pour le moment.");
    } finally {
      setPending(false);
    }
  };

  return <CmmCard tone="emerald" variant="glass" size="md"><div className="space-y-3"><h2 className="text-lg font-black text-emerald-950">L’action est terminée</h2><p className="cmm-text-body cmm-text-primary">Les données déjà enregistrées seront reprises. Les mesures finales restent à renseigner explicitement.</p><CmmButton tone="primary" variant="pill" size="md" onClick={() => { void beginFinalization(); }} disabled={pending}>{pending ? "Ouverture…" : "Compléter le bilan"}</CmmButton>{error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}</div></CmmCard>;
}

export function AfterActionCreationView({
  formProps,
  actionId,
  searchParams,
  fr,
  onActionPersisted,
}: {
  formProps: ActionCreationSectionFormProps;
  actionId: string | null;
  searchParams?: SearchParams;
  fr: boolean;
  onActionPersisted?: (actionId: string) => void;
}) {
  return <div data-testid="action-creation-shell" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">Bilan d’une action réalisée</h1></CmmCard><ActionLifecycleNavigation actionId={actionId} activeSpace="bilan" fr={fr} searchParams={searchParams} /><ActionAttendanceRegistryEntryPoint actionId={actionId} mode="bilan" /><div role="tabpanel" aria-labelledby={actionId ? "action-creation-space-bilan" : "action-creation-tab-after"}><ActionFinalizationEntry actionId={actionId} formProps={formProps} onActionPersisted={onActionPersisted} /></div></div></div>;
}

export function ActionBilanView({
  formProps,
  actionId,
  searchParams,
  fr,
}: {
  formProps: ActionCreationSectionFormProps;
  actionId: string;
  searchParams?: SearchParams;
  fr: boolean;
}) {
  return <div data-testid="action-bilan-view" className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#ECF8EF] via-white to-[#F7FCF8] px-3 py-4 md:px-5 md:py-6"><div className="cmm-page-width space-y-4"><CmmCard tone="emerald" variant="glass" size="lg"><div className="space-y-2"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Bilan</p><h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tight text-emerald-950">Finaliser la même action</h1><p className="cmm-text-body cmm-text-primary">Les photos, mesures, présences confirmées et règles de validation restent ceux du formulaire final existant.</p></div></CmmCard><ActionLifecycleNavigation actionId={actionId} activeSpace="bilan" fr={fr} searchParams={searchParams} /><ActionAttendanceRegistryPanel actionId={actionId} mode="bilan" /><ActionRoleAttestationsPanel actionId={actionId} /><div role="tabpanel" aria-labelledby="action-creation-space-bilan"><ActionFinalizationEntry actionId={actionId} formProps={formProps} /></div></div></div>;
}
