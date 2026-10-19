"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

type RoleOption = { code: string; label: string; description: string };
type RoleAssignment = { role_code: string; assignment_status: string };
type Attestation = {
  id: string;
  role_code: string;
  verification_status: "pending" | "confirmed" | "rejected";
  reviewer_clerk_id: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  responsibility_provenance: "planned_assignment" | "retrospective";
  revision: number;
};
type Participant = {
  userId: string;
  displayName: string;
  handle: string | null;
  plannedRoles: RoleAssignment[];
  attestations: Attestation[];
};
type State = {
  canReview: boolean;
  roleOptions: RoleOption[];
  participants: Participant[];
};

function statusLabel(status: Attestation["verification_status"]): string {
  if (status === "confirmed") return "Confirmée";
  if (status === "rejected") return "Rejetée";
  return "En attente d’un reviewer indépendant";
}

function formatDecisionDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : ` · ${date.toLocaleDateString("fr-FR")}`;
}

export function ActionRoleAttestationsPanel({ actionId }: { actionId: string }) {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, string>>({});
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/role-attestations`, { cache: "no-store" });
      const payload = (await response.json()) as State & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Les missions ne sont pas disponibles.");
      setState(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Les missions ne sont pas disponibles.");
    } finally {
      setLoading(false);
    }
  }, [actionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function review(userId: string, roleCode: string, decision: "confirm" | "reject") {
    const reason = reasonByUser[userId]?.trim() || null;
    if (decision === "reject" && !reason) {
      setNotice("Un motif est requis pour rejeter une mission.");
      return;
    }
    const key = `${userId}:${roleCode}:${decision}`;
    if (busyKey) return;
    setBusyKey(key);
    setNotice(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/role-attestations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleCode, decision, reason }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "La décision n’a pas été enregistrée.");
      setNotice("Décision enregistrée après confirmation transactionnelle.");
      setReasonByUser((current) => ({ ...current, [userId]: "" }));
      await load();
    } catch (reviewError) {
      setNotice(reviewError instanceof Error ? reviewError.message : "La décision n’a pas été enregistrée.");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) return <CmmCard tone="sky" variant="outlined" size="sm"><p className="cmm-text-small cmm-text-secondary">Chargement des missions réalisées…</p></CmmCard>;
  if (error) return <CmmCard tone="amber" variant="outlined" size="sm"><p className="cmm-text-small text-amber-900">{error}</p></CmmCard>;
  if (!state) return null;

  return (
    <CmmCard tone="emerald" variant="glass" size="lg" data-testid="action-role-attestations-panel">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Missions réalisées</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-emerald-950">Attester les missions réellement exercées</h2>
          <p className="mt-1 cmm-text-small cmm-text-secondary">Une affectation prévue et une présence confirmée ne valent pas, à elles seules, attestation de mission.</p>
        </div>
        {notice ? <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">{notice}</p> : null}
        {state.participants.length === 0 ? <p className="cmm-text-small cmm-text-secondary">Aucun participant final confirmé n’est disponible pour cette action.</p> : null}
        <div className="space-y-3">
          {state.participants.map((participant) => {
            const selectedRole = selectedRoleByUser[participant.userId] || participant.plannedRoles[0]?.role_code || state.roleOptions[0]?.code || "";
            const plannedCodes = new Set(participant.plannedRoles.map((role) => role.role_code));
            return (
              <article key={participant.userId} className="rounded-xl border border-emerald-100 bg-white/80 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-bold text-emerald-950">{participant.displayName}</h3>
                    {participant.handle ? <p className="text-xs text-slate-500">@{participant.handle}</p> : null}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Participation confirmée</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Missions prévues</p>
                    <p className="mt-1 text-sm text-slate-800">{participant.plannedRoles.length ? participant.plannedRoles.map((role) => state.roleOptions.find((option) => option.code === role.role_code)?.label || role.role_code).join(", ") : "Aucune mission sélectionnée avant l’action."}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Décisions</p>
                    <div className="mt-1 space-y-1">
                      {participant.attestations.length ? participant.attestations.map((attestation) => (
                        <p key={attestation.id} className="text-sm text-slate-800">
                          <span className="font-semibold">{state.roleOptions.find((option) => option.code === attestation.role_code)?.label || attestation.role_code}</span>{" — "}{statusLabel(attestation.verification_status)}{formatDecisionDate(attestation.decided_at)}{attestation.reviewer_clerk_id ? ` · Reviewer ${attestation.reviewer_clerk_id}` : ""}
                          {attestation.decision_reason ? <span className="block text-xs text-slate-500">Motif : {attestation.decision_reason}</span> : null}
                        </p>
                      )) : <p className="text-sm text-slate-500">Aucune décision enregistrée.</p>}
                    </div>
                  </div>
                </div>
                {state.canReview ? (
                  <div className="mt-3 border-t border-emerald-100 pt-3">
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <label className="text-sm font-semibold text-slate-800">Mission à examiner
                        <select className="cmm-input mt-1 w-full" value={selectedRole} onChange={(event) => setSelectedRoleByUser((current) => ({ ...current, [participant.userId]: event.target.value }))}>
                          {state.roleOptions.map((option) => <option key={option.code} value={option.code}>{option.label}{plannedCodes.has(option.code) ? " · prévue" : " · rétrospective"}</option>)}
                        </select>
                      </label>
                      <label className="text-sm font-semibold text-slate-800">Motif de correction ou de rejet
                        <textarea className="cmm-input mt-1 min-h-20 w-full" value={reasonByUser[participant.userId] || ""} onChange={(event) => setReasonByUser((current) => ({ ...current, [participant.userId]: event.target.value }))} placeholder="Requis pour une mission rétrospective, un rejet ou une correction." />
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <CmmButton tone="primary" variant="pill" size="sm" loading={busyKey === `${participant.userId}:${selectedRole}:confirm`} onClick={() => void review(participant.userId, selectedRole, "confirm")}>Confirmer</CmmButton>
                      <CmmButton tone="destructive" variant="ghost" size="sm" loading={busyKey === `${participant.userId}:${selectedRole}:reject`} onClick={() => void review(participant.userId, selectedRole, "reject")}>Rejeter</CmmButton>
                    </div>
                    {!plannedCodes.has(selectedRole) ? <p className="mt-2 text-xs text-amber-800">Cette mission n’était pas prévue : la justification sera conservée dans la provenance auditée.</p> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </CmmCard>
  );
}
