"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Crown, UsersRound } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

type RoleOption = { code: string; label: string; description: string };
type Assignment = { id: string; user_id: string; role_code: string; assignment_status: "active" | "revoked" };
type Participant = { userId: string; displayName: string; handle: string | null; registrationStatus: string };
type Organizer = { userId: string; displayName: string; handle: string | null; isPrimary: boolean };
type TransferProposal = { id: string; current_primary_user_id: string; successor_user_id: string; status: "pending" | "accepted" | "rejected" | "cancelled" | "expired" | string; expires_at?: string; decision_reason?: string | null };
type PanelData = { roleOptions: RoleOption[]; assignments: Assignment[]; confirmedParticipants: Participant[]; organizers: Organizer[]; currentUserId?: string; canProposeTransfer?: boolean; canRejectTransfer?: boolean; pendingTransfer: TransferProposal | null; transferProposals: TransferProposal[] };

function draftsFromAssignments(assignments: Assignment[]) {
  const drafts = new Map<string, string[]>();
  for (const assignment of assignments) {
    if (assignment.assignment_status !== "active") continue;
    drafts.set(assignment.user_id, [...(drafts.get(assignment.user_id) ?? []), assignment.role_code]);
  }
  return drafts;
}

function transferStatusLabel(status: TransferProposal["status"]) {
  return { pending: "En attente", accepted: "Acceptée", rejected: "Refusée", expired: "Expirée", cancelled: "Annulée" }[status] ?? status;
}

export function ActionFieldRolesPanel({ actionId }: { actionId?: string | null }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [drafts, setDrafts] = useState<Map<string, string[]>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const [successorUserId, setSuccessorUserId] = useState("");

  const applyServerState = useCallback((body: PanelData) => {
    setData(body);
    setDrafts(draftsFromAssignments(body.assignments));
  }, []);

  const load = useCallback(async () => {
    if (!actionId) return;
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/field-roles`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as PanelData & { error?: string };
      if (!response.ok) throw new Error(body?.error ?? "Les responsabilités sont indisponibles.");
      applyServerState(body);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Les responsabilités sont indisponibles.");
    }
  }, [actionId, applyServerState]);

  // The effect bridges the authenticated API response into local UI state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  if (!actionId) return null;
  if (error && !data) return <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{error}</p>;
  if (!data) return <p role="status" className="text-sm text-emerald-800">Chargement des responsabilités…</p>;

  const participants = data.confirmedParticipants;
  const saveRoles = async (userId: string) => {
    const roleCodes = [...(drafts.get(userId) ?? [])];
    setBusyUserId(userId);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/field-roles`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, roleCodes }) });
      const body = await response.json().catch(() => null) as PanelData & { error?: string };
      if (!response.ok) throw new Error(body?.error ?? "La responsabilité n’a pas été enregistrée.");
      setData(body);
      setDrafts((current) => {
        const next = new Map(current);
        next.set(userId, body.assignments.filter((assignment) => assignment.user_id === userId && assignment.assignment_status === "active").map((assignment) => assignment.role_code));
        return next;
      });
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La responsabilité n’a pas été enregistrée.");
    } finally {
      setBusyUserId(null);
    }
  };

  const updateDraft = (userId: string, roleCode: string, checked: boolean) => {
    setDrafts((current) => {
      const next = new Map(current);
      const roles = new Set(next.get(userId) ?? []);
      if (checked) roles.add(roleCode); else roles.delete(roleCode);
      next.set(userId, [...roles]);
      return next;
    });
  };

  const proposeTransfer = async () => {
    if (!successorUserId) return;
    setTransferBusy(true);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/field-roles/transfer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ successorUserId }) });
      const body = await response.json().catch(() => null) as { error?: string };
      if (!response.ok) throw new Error(body?.error ?? "La demande de transfert n’a pas été créée.");
      await load();
      setSuccessorUserId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La demande de transfert n’a pas été créée.");
    } finally {
      setTransferBusy(false);
    }
  };

  const respondTransfer = async (proposal: TransferProposal, decision: "accept" | "reject") => {
    setTransferBusy(true);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/field-roles/transfer`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposalId: proposal.id, decision }) });
      const body = await response.json().catch(() => null) as { error?: string };
      if (!response.ok) throw new Error(body?.error ?? "La décision de transfert n’a pas été enregistrée.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La décision de transfert n’a pas été enregistrée.");
    } finally {
      setTransferBusy(false);
    }
  };

  const canAccept = (proposal: TransferProposal) => proposal.status === "pending" && proposal.successor_user_id === data.currentUserId;
  const canReject = (proposal: TransferProposal) => proposal.status === "pending" && (Boolean(data.canRejectTransfer) || proposal.successor_user_id === data.currentUserId);
  const coorganizers = data.organizers.filter((organizer) => !organizer.isPrimary);

  const roleEditor = (participant: Participant) => {
    const selected = new Set(drafts.get(participant.userId) ?? []);
    return <div key={participant.userId} className="rounded-2xl border border-emerald-100 bg-white/80 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-emerald-950">{participant.displayName}</p>{participant.handle ? <p className="text-xs text-emerald-700">@{participant.handle}</p> : null}</div><CmmButton type="button" tone="primary" variant="pill" size="sm" disabled={busyUserId === participant.userId} onClick={() => void saveRoles(participant.userId)}>{busyUserId === participant.userId ? "Enregistrement…" : "Enregistrer"}</CmmButton></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.roleOptions.map((role) => { const checked = selected.has(role.code); return <label key={role.code} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm ${checked ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}><input type="checkbox" className="mt-1" checked={checked} onChange={(event) => updateDraft(participant.userId, role.code, event.target.checked)} /><span><span className="font-semibold text-slate-900">{role.label}</span><span className="block text-xs text-slate-600">{role.description}</span></span></label>; })}</div></div>;
  };

  return <CmmCard tone="emerald" variant="outlined" size="md" data-testid="action-field-roles-panel"><div className="space-y-4"><div><h3 className="flex items-center gap-2 text-lg font-black text-emerald-950"><UsersRound size={18} />Responsabilités terrain</h3><p className="mt-1 text-sm text-emerald-800">Ces responsabilités sont propres à cette action et ne donnent aucun droit d’organisation.</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Organisation</p>{data.organizers.length === 0 ? <p className="mt-1 text-sm text-slate-700">Aucun organisateur de compte désigné.</p> : <ul className="mt-2 space-y-1 text-sm text-emerald-950">{data.organizers.map((organizer) => <li key={organizer.userId} className="flex items-center gap-2"><Crown size={14} className={organizer.isPrimary ? "text-amber-600" : "text-slate-400"} />{organizer.displayName}{organizer.isPrimary ? <span className="text-xs font-bold text-amber-700">Principal</span> : null}</li>)}</ul>}</div>{participants.length === 0 ? <p className="text-sm text-slate-600">Aucun bénévole confirmé ne peut encore choisir une responsabilité.</p> : <div className="space-y-3">{participants.map(roleEditor)}</div>}{coorganizers.length > 0 && data.canProposeTransfer ? <div className="border-t border-emerald-100 pt-4"><p className="flex items-center gap-2 text-sm font-black text-emerald-950"><Check size={16} />Transfert explicite du primaire</p>{data.pendingTransfer ? <p className="mt-2 text-sm text-amber-800">Demande en attente pour {data.organizers.find((organizer) => organizer.userId === data.pendingTransfer?.successor_user_id)?.displayName ?? data.pendingTransfer.successor_user_id}. Le successeur doit l’accepter.</p> : <div className="mt-2 flex flex-wrap gap-2"><select value={successorUserId} onChange={(event) => setSuccessorUserId(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Choisir un coorganisateur</option>{coorganizers.map((organizer) => <option key={organizer.userId} value={organizer.userId}>{organizer.displayName}</option>)}</select><CmmButton type="button" tone="secondary" variant="pill" size="sm" disabled={!successorUserId || transferBusy} onClick={() => void proposeTransfer()}>Proposer le transfert</CmmButton></div>}</div> : null}{data.transferProposals.length > 0 ? <div className="border-t border-emerald-100 pt-4"><p className="text-sm font-black text-emerald-950">Historique des transferts</p><ul className="mt-2 space-y-2 text-sm">{data.transferProposals.map((proposal) => <li key={proposal.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2"><div className="flex flex-wrap items-center justify-between gap-2"><span>{proposal.successor_user_id} — {transferStatusLabel(proposal.status)}</span><span className="flex gap-2">{canAccept(proposal) ? <CmmButton type="button" tone="primary" variant="pill" size="sm" disabled={transferBusy} onClick={() => void respondTransfer(proposal, "accept")}>Accepter</CmmButton> : null}{canReject(proposal) ? <CmmButton type="button" tone="secondary" variant="pill" size="sm" disabled={transferBusy} onClick={() => void respondTransfer(proposal, "reject")}>Refuser</CmmButton> : null}</span></div></li>)}</ul></div> : null}{error ? <p role="alert" className="text-sm text-amber-800">{error}</p> : null}</div></CmmCard>;
}
