"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { WorkspaceData } from "./spogomi-preparation-workspace-contract";

type Props = {
  eventId: string;
  data: WorkspaceData;
  activeDivisionId: string | null;
  divisionType: "casual" | "world_cup";
  busy: boolean;
  compositionEditable: boolean;
  compositionRevision: () => { expectedRevision: number };
  compositionEligibilityWarning: string;
  identityCodes: Record<string, string>;
  action: (url: string, init?: RequestInit, expectedDivisionId?: string | null) => Promise<Record<string, unknown> | null>;
  issueIdentityCode: (participantId: string) => Promise<void>;
  createTeam: (publicName: string) => Promise<void>;
  createPlace: (privateLabel: string) => Promise<void>;
  savePrivateLabel: (participant: WorkspaceData["participants"][number], privateLabel: string) => Promise<void>;
};

function participantLabel(participant: WorkspaceData["participants"][number]): string {
  return participant.display_name?.trim() || "Place à identifier";
}

function TeamSizeNotice({ divisionType, count, minMembers, maxMembers }: { divisionType: Props["divisionType"]; count: number; minMembers: number | null; maxMembers: number | null }) {
  const invalidWorldCup = divisionType === "world_cup" && count !== 3;
  const invalidCasual = divisionType === "casual" && ((minMembers !== null && count < minMembers) || (maxMembers !== null && count > maxMembers));
  if (!invalidWorldCup && !invalidCasual) return null;
  return <p role="status" className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-900">{invalidWorldCup ? "World Cup : une équipe doit compter exactement 3 places avant verrouillage. Le brouillon reste modifiable." : "Casual : cette équipe est hors des bornes configurées ; le brouillon reste modifiable."}</p>;
}

function PlaceRow({ participant, teams, busy, compositionEditable, activeDivisionId, eventId, compositionRevision, compositionEligibilityWarning, identityCodes, issueIdentityCode, action, onSavePrivateLabel }: Pick<Props, "busy" | "compositionEditable" | "activeDivisionId" | "eventId" | "compositionRevision" | "compositionEligibilityWarning" | "identityCodes" | "issueIdentityCode" | "action"> & { participant: WorkspaceData["participants"][number]; teams: WorkspaceData["teams"]; onSavePrivateLabel: Props["savePrivateLabel"]; }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(participantLabel(participant));
  const saveLabel = async () => {
    await onSavePrivateLabel(participant, draft);
    setEditing(false);
  };
  const teamLocked = Boolean(participant.team_id && teams.find((team) => team.id === participant.team_id)?.composition_state !== "draft");
  return <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-2">
      {editing ? <label className="min-w-0 flex-1 font-bold">Libellé privé de la place<input aria-label={`Libellé privé de ${participantLabel(participant)}`} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" maxLength={160} value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy || !compositionEditable} /></label> : <div className="min-w-0 flex-1"><p className="font-bold">{participantLabel(participant)}</p><p className="mt-1 text-xs text-slate-600">Place réservée · présence {participant.attendance_status} · compte {participant.account_link_status}</p></div>}
      {editing ? <div className="flex gap-2"><CmmButton type="button" size="sm" tone="primary" disabled={busy || !compositionEditable || !draft.trim()} onClick={() => void saveLabel()}>Enregistrer</CmmButton><CmmButton type="button" size="sm" tone="secondary" disabled={busy} onClick={() => { setDraft(participantLabel(participant)); setEditing(false); }}>Annuler</CmmButton></div> : <CmmButton type="button" size="sm" tone="secondary" disabled={busy || !compositionEditable || teamLocked} onClick={() => setEditing(true)}>Modifier la place</CmmButton>}
    </div>
    {participant.composition_eligible === false ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-900">{compositionEligibilityWarning}. Une résolution organisateur est requise.</p> : null}
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="min-w-[12rem] flex-1 text-xs font-bold">Équipe<select aria-label={`Affectation de ${participantLabel(participant)}`} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal" value={participant.team_id ?? ""} disabled={busy || !compositionEditable || teamLocked || participant.composition_eligible === false} onChange={(event) => { void action(`/api/spogomi/events/${eventId}/teams/move`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ participantId: participant.id, teamId: event.target.value || null, ...compositionRevision() }) }, activeDivisionId); }}><option value="">Places à affecter</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.public_name}</option>)}</select></label>
      <CmmButton type="button" size="sm" tone="secondary" disabled={busy || participant.account_link_status === "verified"} onClick={() => void issueIdentityCode(participant.id)}>Émettre un code de liaison</CmmButton>
    </div>
    {identityCodes[participant.id] ? <p className="mt-2 rounded-lg bg-emerald-50 p-2 font-mono text-xs text-emerald-900">{identityCodes[participant.id]}<br /><span className="font-sans">À remettre directement, sans le publier.</span></p> : null}
  </div>;
}

export function SpogomiManualTeamEditor(props: Props) {
  const [teamName, setTeamName] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");
  const divisionParticipants = props.data.participants.filter((participant) => participant.division_id === props.activeDivisionId);
  const divisionTeams = props.data.teams.filter((team) => team.division_id === props.activeDivisionId);
  const minMembers = props.data.divisions.find((division) => division.id === props.activeDivisionId)?.team_size_config?.casual?.minMembers ?? props.data.event.team_size_config?.casual?.minMembers ?? null;
  const maxMembers = props.data.divisions.find((division) => division.id === props.activeDivisionId)?.team_size_config?.casual?.maxMembers ?? props.data.event.team_size_config?.casual?.maxMembers ?? null;
  const unassigned = divisionParticipants.filter((participant) => !participant.team_id);
  const submitTeam = async () => { await props.createTeam(teamName); setTeamName(""); };
  const submitPlace = async () => { await props.createPlace(placeLabel); setPlaceLabel(""); };
  return <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4" aria-label="Former les équipes">
    <div><h3 className="text-lg font-black text-emerald-950">Former les équipes</h3><p className="mt-1 text-sm text-emerald-900">Les places restent des réservations privées tant qu’une identité n’est pas vérifiée. Les compositions enregistrées ici restent des brouillons jusqu’au verrouillage officiel.</p></div>
    <div className="grid gap-3 lg:grid-cols-2">
      <form className="rounded-xl bg-white/80 p-3" onSubmit={(event) => { event.preventDefault(); void submitTeam(); }}><h4 className="font-black">Créer une équipe</h4><p className="mt-1 text-xs text-slate-600">Disponible même sans import ni participant.</p><label className="mt-2 block text-sm font-bold">Nom public facultatif<input aria-label="Nom public de la nouvelle équipe" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" maxLength={60} value={teamName} onChange={(event) => setTeamName(event.target.value)} disabled={props.busy || !props.compositionEditable} placeholder="Équipe suivante" /></label><CmmButton type="submit" size="sm" tone="primary" className="mt-3" disabled={props.busy || !props.compositionEditable}>Créer une équipe</CmmButton></form>
      <form className="rounded-xl bg-white/80 p-3" onSubmit={(event) => { event.preventDefault(); void submitPlace(); }}><h4 className="font-black">Ajouter une place</h4><p className="mt-1 text-xs text-slate-600">Ce libellé est privé et ne crée pas de compte Clerk.</p><label className="mt-2 block text-sm font-bold">Prénom ou libellé privé<input aria-label="Prénom ou libellé privé de la nouvelle place" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" maxLength={160} required value={placeLabel} onChange={(event) => setPlaceLabel(event.target.value)} disabled={props.busy || !props.compositionEditable} placeholder="Place manuelle" /></label><CmmButton type="submit" size="sm" tone="primary" className="mt-3" disabled={props.busy || !props.compositionEditable || !placeLabel.trim()}>Ajouter la place</CmmButton></form>
    </div>
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3"><p className="font-black">Places à affecter · {unassigned.length}</p>{unassigned.length ? <div className="mt-3 space-y-2">{unassigned.map((participant) => <PlaceRow key={participant.id} participant={participant} teams={divisionTeams} {...props} onSavePrivateLabel={props.savePrivateLabel} />)}</div> : <p className="mt-1 text-sm text-slate-700">Aucune place en attente.</p>}</div>
    <div className="grid gap-3 md:grid-cols-2">{divisionTeams.map((team) => { const members = divisionParticipants.filter((participant) => participant.team_id === team.id); return <section key={team.id} className="rounded-xl border border-slate-200 bg-white/80 p-3" aria-label={`${team.public_name}, ${members.length} places`}><div className="flex items-center justify-between gap-2"><h4 className="font-black">{team.public_name}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{members.length} place(s)</span></div><TeamSizeNotice divisionType={props.divisionType} count={members.length} minMembers={minMembers} maxMembers={maxMembers} /><div className="mt-3 space-y-2">{members.length ? members.map((participant) => <PlaceRow key={participant.id} participant={participant} teams={divisionTeams} {...props} onSavePrivateLabel={props.savePrivateLabel} />) : <p className="text-sm text-slate-600">Équipe vide : vous pouvez y affecter une place.</p>}</div></section>; })}</div>
  </div>;
}
