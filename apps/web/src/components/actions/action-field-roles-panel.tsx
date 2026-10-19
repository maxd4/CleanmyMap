"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Crown, UsersRound } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

type RoleOption = { code: string; label: string; description: string };
type Assignment = { id: string; user_id: string; role_code: string; assignment_status: "active" | "revoked" };
type Participant = { userId: string; displayName: string; handle: string | null; registrationStatus: string };
type Organizer = { userId: string; displayName: string; handle: string | null; isPrimary: boolean };
type PanelData = {
  roleOptions: RoleOption[];
  assignments: Assignment[];
  confirmedParticipants: Participant[];
  organizers: Organizer[];
  pendingTransfer: { id: string; successor_user_id: string; status: string } | null;
};

export function ActionFieldRolesPanel({ actionId }: { actionId?: string | null }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [successorUserId, setSuccessorUserId] = useState("");

  const load = useCallback(async () => {
    if (!actionId) return;
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/field-roles`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as PanelData & { error?: string };
      if (!response.ok) throw new Error(body?.error ?? "Les responsabilités sont indisponibles.");
      setData(body);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Les responsabilités sont indisponibles.");
    }
  }, [actionId]);

  // The effect bridges the authenticated API response into local UI state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const assignmentsByUser = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const assignment of data?.assignments ?? []) {
      if (assignment.assignment_status !== "active") continue;
      const roles = map.get(assignment.user_id) ?? new Set<string>();
      roles.add(assignment.role_code);
      map.set(assignment.user_id, roles);
    }
    return map;
  }, [data]);

  if (!actionId) return null;
  if (error) return <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{error}</p>;
  if (!data) return <p role="status" className="text-sm text-emerald-800">Chargement des responsabilités…</p>;

  const participants = data.confirmedParticipants;
  const saveRoles = async (userId: string, roleCodes: string[]) => {
    setBusyUserId(userId);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/field-roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleCodes }),
      });
      const body = await response.json().catch(() => null) as PanelData & { error?: string };
      if (!response.ok) throw new Error(body?.error ?? "La responsabilité n’a pas été enregistrée.");
      setData(body);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La responsabilité n’a pas été enregistrée.");
    } finally {
      setBusyUserId(null);
    }
  };

  const proposeTransfer = async () => {
    if (!successorUserId) return;
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/field-roles/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ successorUserId }),
      });
      const body = await response.json().catch(() => null) as { error?: string };
      if (!response.ok) throw new Error(body?.error ?? "La demande de transfert n’a pas été créée.");
      await load();
      setSuccessorUserId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La demande de transfert n’a pas été créée.");
    }
  };

  const roleEditor = (participant: Participant) => {
    const selected = assignmentsByUser.get(participant.userId) ?? new Set<string>();
    return (
      <div key={participant.userId} className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-bold text-emerald-950">{participant.displayName}</p>{participant.handle ? <p className="text-xs text-emerald-700">@{participant.handle}</p> : null}</div>
          <CmmButton type="button" tone="primary" variant="pill" size="sm" disabled={busyUserId === participant.userId} onClick={() => void saveRoles(participant.userId, [...selected])}>{busyUserId === participant.userId ? "Enregistrement…" : "Enregistrer"}</CmmButton>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.roleOptions.map((role) => {
            const checked = selected.has(role.code);
            return <label key={role.code} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm ${checked ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}><input type="checkbox" className="mt-1" checked={checked} onChange={(event) => { if (event.target.checked) selected.add(role.code); else selected.delete(role.code); setData({ ...data, assignments: [...data.assignments] }); }} /><span><span className="font-semibold text-slate-900">{role.label}</span><span className="block text-xs text-slate-600">{role.description}</span></span></label>;
          })}
        </div>
      </div>
    );
  };

  return (
    <CmmCard tone="emerald" variant="outlined" size="md" data-testid="action-field-roles-panel">
      <div className="space-y-4">
        <div><h3 className="flex items-center gap-2 text-lg font-black text-emerald-950"><UsersRound size={18} />Responsabilités terrain</h3><p className="mt-1 text-sm text-emerald-800">Ces responsabilités sont propres à cette action et ne donnent aucun droit d’organisation.</p></div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Organisation</p>{data.organizers.length === 0 ? <p className="mt-1 text-sm text-slate-700">Aucun organisateur de compte désigné.</p> : <ul className="mt-2 space-y-1 text-sm text-emerald-950">{data.organizers.map((organizer) => <li key={organizer.userId} className="flex items-center gap-2"><Crown size={14} className={organizer.isPrimary ? "text-amber-600" : "text-slate-400"} />{organizer.displayName}{organizer.isPrimary ? <span className="text-xs font-bold text-amber-700">Principal</span> : null}</li>)}</ul>}</div>
        {participants.length === 0 ? <p className="text-sm text-slate-600">Aucun bénévole confirmé ne peut encore choisir une responsabilité.</p> : <div className="space-y-3">{participants.map(roleEditor)}</div>}
        {data.organizers.filter((organizer) => !organizer.isPrimary).length > 0 ? <div className="border-t border-emerald-100 pt-4"><p className="flex items-center gap-2 text-sm font-black text-emerald-950"><Check size={16} />Transfert explicite du primaire</p>{data.pendingTransfer ? <p className="mt-2 text-sm text-amber-800">Demande en attente pour {data.organizers.find((organizer) => organizer.userId === data.pendingTransfer?.successor_user_id)?.displayName ?? data.pendingTransfer.successor_user_id}. Le successeur doit l’accepter.</p> : <div className="mt-2 flex flex-wrap gap-2"><select value={successorUserId} onChange={(event) => setSuccessorUserId(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Choisir un coorganisateur</option>{data.organizers.filter((organizer) => !organizer.isPrimary).map((organizer) => <option key={organizer.userId} value={organizer.userId}>{organizer.displayName}</option>)}</select><CmmButton type="button" tone="secondary" variant="pill" size="sm" disabled={!successorUserId} onClick={() => void proposeTransfer()}>Proposer le transfert</CmmButton></div>}</div> : null}
      </div>
    </CmmCard>
  );
}
