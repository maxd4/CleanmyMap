"use client";

import { useState, type FormEvent } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import type { AttendanceRegistryMutationRequest } from "@/lib/actions/participation/attendance-registry-http";
import type { ActionAttendanceEntryRow, ActionAttendanceTeamSnapshot } from "@/types/database";

type Mutation = Omit<AttendanceRegistryMutationRequest, "requestId">;

type Props = {
  entries: ActionAttendanceEntryRow[];
  teams: ActionAttendanceTeamSnapshot[];
  busyKey: string | null;
  onMutate: (mutation: Mutation) => Promise<unknown>;
};

function runMutation(onMutate: Props["onMutate"], mutation: Mutation, onSuccess?: () => void) {
  void onMutate(mutation).then(() => onSuccess?.()).catch(() => undefined);
}

function expectedRevisions(teams: ActionAttendanceTeamSnapshot[], ...teamIds: Array<string | null | undefined>) {
  return [...new Set(teamIds.filter((id): id is string => Boolean(id)))].flatMap((teamId) => {
    const team = teams.find((candidate) => candidate.id === teamId);
    return team ? [{ teamId, revision: team.revision }] : [];
  });
}

function statusCounts(members: ActionAttendanceEntryRow[]) {
  return members.reduce((counts, member) => {
    counts[member.attendance_status] += 1;
    return counts;
  }, { unknown: 0, present: 0, absent: 0 });
}

function TeamMemberRow({
  entry,
  teams,
  currentTeamId,
  busy,
  onMutate,
}: {
  entry: ActionAttendanceEntryRow;
  teams: ActionAttendanceTeamSnapshot[];
  currentTeamId: string;
  busy: boolean;
  onMutate: Props["onMutate"];
}) {
  return <li className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)] sm:items-center">
    <span className="min-w-0 break-words"><strong>{entry.display_label}</strong><span className="ml-2 text-xs text-slate-600">{entry.attendance_status === "unknown" ? "À confirmer" : entry.attendance_status === "present" ? "Présent" : "Absent"}</span></span>
    <label className="text-xs font-bold text-slate-700">
      Équipe
      <select aria-label={`Équipe de ${entry.display_label}`} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-normal" value={currentTeamId} disabled={busy} onChange={(event) => {
        const targetTeamId = event.target.value || null;
        runMutation(onMutate, {
          operation: "member_assign",
          entryId: entry.id,
          targetTeamId,
          expectedRevisions: expectedRevisions(teams, currentTeamId, targetTeamId),
        });
      }}>
        <option value="">Sans équipe</option>
        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
    </label>
  </li>;
}

function TeamCard({
  team,
  members,
  entries,
  teams,
  busy,
  onMutate,
}: {
  team: ActionAttendanceTeamSnapshot;
  members: ActionAttendanceEntryRow[];
  entries: ActionAttendanceEntryRow[];
  teams: ActionAttendanceTeamSnapshot[];
  busy: boolean;
  onMutate: Props["onMutate"];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const counts = statusCounts(members);
  const expected = expectedRevisions(teams, team.id);
  const saveName = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    runMutation(onMutate, { operation: "team_rename", teamId: team.id, teamName: name, expectedRevisions: expected }, () => setEditing(false));
  };
  const chooseLeader = (leaderEntryId: string) => {
    runMutation(onMutate, { operation: "leader_set", teamId: team.id, leaderEntryId: leaderEntryId || null, expectedRevisions: expected });
  };

  return <section className="space-y-3 rounded-xl border border-violet-200 bg-white p-3" aria-label={`Équipe ${team.name}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      {editing ? (
        <form className="flex min-w-0 flex-1 gap-2" onSubmit={saveName}>
          <CmmField label="Nom privé de l’équipe" className="min-w-0 flex-1">
            <CmmInput maxLength={80} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
          </CmmField>
          <CmmButton type="submit" size="sm" disabled={busy || !name.trim()}>Enregistrer</CmmButton>
          <CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => { setName(team.name); setEditing(false); }}>
            Annuler
          </CmmButton>
        </form>
      ) : (
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-black text-violet-950">{team.name}</h3>
          <p className="mt-1 text-xs text-slate-700">
            {members.length} personne{members.length === 1 ? "" : "s"} attendue{members.length === 1 ? "" : "s"}
            {" · "}{counts.present} présente{counts.present === 1 ? "" : "s"}
            {" · "}{counts.absent} absente{counts.absent === 1 ? "" : "s"}
            {" · "}{counts.unknown} à confirmer
          </p>
        </div>
      )}
      {!editing ? (
        <div className="flex flex-wrap gap-2">
          <CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => { setName(team.name); setEditing(true); }}>
            Renommer
          </CmmButton>
          <CmmButton type="button" size="sm" tone="destructive" disabled={busy} onClick={() => setConfirmDelete((current) => !current)}>
            Retirer l’équipe
          </CmmButton>
        </div>
      ) : null}
    </div>
    {confirmDelete ? <div className="rounded-lg bg-amber-50 p-3 text-sm" role="group" aria-label={`Confirmation de suppression de ${team.name}`}><p>Retirer cette équipe rendra ses membres disponibles dans « Sans équipe ». Les personnes et leur pointage seront conservés.</p><div className="mt-2 flex flex-wrap gap-2"><CmmButton type="button" size="sm" tone="destructive" disabled={busy} onClick={() => { runMutation(onMutate, { operation: "team_delete", teamId: team.id, expectedRevisions: expected }, () => setConfirmDelete(false)); }}>Confirmer le retrait</CmmButton><CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Annuler</CmmButton></div></div> : null}
    <label className="block text-sm font-bold text-slate-800">Chef d’équipe
      <select aria-label={`Chef d’équipe ${team.name}`} className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 font-normal" value={team.leader_entry_id ?? ""} disabled={busy || members.length === 0} onChange={(event) => chooseLeader(event.target.value)}>
        <option value="">À désigner</option>
        {members.map((member) => <option key={member.id} value={member.id}>{member.display_label}</option>)}
      </select>
    </label>
    {members.length ? <ul className="space-y-2">{members.map((member) => <TeamMemberRow key={member.id} entry={member} teams={teams} currentTeamId={team.id} busy={busy} onMutate={onMutate} />)}</ul> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Aucun membre affecté.</p>}
    {team.leader_entry_id && !entries.some((entry) => entry.id === team.leader_entry_id) ? <p role="status" className="text-sm text-amber-800">Le chef d’équipe doit être désigné parmi les membres actifs.</p> : null}
  </section>;
}

export function ActionAttendanceTeamsEditor({ entries, teams, busyKey, onMutate }: Props) {
  const [newTeamName, setNewTeamName] = useState("");
  const unassigned = entries.filter((entry) => !teams.some((team) => team.member_entry_ids.includes(entry.id)));
  const createTeam = (event: FormEvent) => {
    event.preventDefault();
    if (!newTeamName.trim()) return;
    runMutation(onMutate, { operation: "team_create", teamName: newTeamName }, () => setNewTeamName(""));
  };
  return <section className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4" aria-labelledby="action-attendance-teams-title" data-testid="action-attendance-teams">
    <header><h3 id="action-attendance-teams-title" className="text-lg font-black text-violet-950">Équipes (facultatif)</h3><p className="mt-1 text-sm text-violet-900">Équipes privées d’organisation. Le rôle de chef ne modifie ni les droits ni la participation.</p></header>
    <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={createTeam}>
      <CmmField label="Nom privé de la nouvelle équipe" hint="Aucune taille minimale ou maximale n’est imposée."><CmmInput maxLength={80} value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} disabled={Boolean(busyKey)} /></CmmField>
      <CmmButton type="submit" tone="primary" disabled={Boolean(busyKey) || !newTeamName.trim()}>Créer une équipe</CmmButton>
    </form>
    {teams.length ? <div className="space-y-3">{teams.map((team) => <TeamCard key={team.id} team={team} teams={teams} entries={entries} members={entries.filter((entry) => team.member_entry_ids.includes(entry.id))} busy={Boolean(busyKey)} onMutate={onMutate} />)}</div> : <p className="rounded-lg bg-white p-3 text-sm text-slate-700">Aucune équipe créée.</p>}
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"><h4 className="font-black text-slate-900">Sans équipe ({unassigned.length})</h4>{unassigned.length ? <ul className="space-y-2">{unassigned.map((entry) => <TeamMemberRow key={entry.id} entry={entry} teams={teams} currentTeamId="" busy={Boolean(busyKey)} onMutate={onMutate} />)}</ul> : <p className="text-sm text-slate-600">Toutes les personnes actives sont affectées à une équipe.</p>}</div>
  </section>;
}
