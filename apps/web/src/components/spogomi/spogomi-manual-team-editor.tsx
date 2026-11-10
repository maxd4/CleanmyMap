"use client";

import { useState, type FormEvent } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { WorkspaceData } from "./spogomi-preparation-workspace-contract";
import type { SpogomiCompositionDraft, DraftParticipant, DraftTeam } from "./spogomi-composition-draft";

type Props = {
  data: WorkspaceData;
  draft: SpogomiCompositionDraft;
  activeDivisionId: string | null;
  divisionType: "casual" | "world_cup";
  busy: boolean;
  compositionEditable: boolean;
  compositionEligibilityWarning: string;
  identityCodes: Record<string, string>;
  issueIdentityCode: (participantId: string) => Promise<void>;
  onCreateTeam: (publicName: string) => void;
  onCreatePlace: (privateLabel: string) => void;
  onRenameTeam: (teamId: string, publicName: string) => void;
  onChangePrivateLabel: (participantId: string, privateLabel: string) => void;
  onAssignParticipant: (participantId: string, teamId: string | null) => void;
};

function participantLabel(participant: DraftParticipant): string { return participant.display_name?.trim() || "Place à identifier"; }

function TeamSizeNotice({ divisionType, count, minMembers, maxMembers }: { divisionType: Props["divisionType"]; count: number; minMembers: number | null; maxMembers: number | null }) {
  const invalidWorldCup = divisionType === "world_cup" && count !== 3;
  const invalidCasual = divisionType === "casual" && ((minMembers !== null && count < minMembers) || (maxMembers !== null && count > maxMembers));
  if (!invalidWorldCup && !invalidCasual) return null;
  return <p role="status" className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-900">{invalidWorldCup ? "World Cup : une équipe doit compter exactement 3 places avant verrouillage. Le brouillon reste modifiable." : "Casual : cette équipe est hors des bornes configurées ; le brouillon reste modifiable."}</p>;
}

function PlaceRow({ participant, teams, props }: { participant: DraftParticipant; teams: DraftTeam[]; props: Props }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(participant.display_name ?? "");
  const assignedTeam = participant.team_id ? teams.find((team) => team.id === participant.team_id) : undefined;
  const teamLocked = Boolean(assignedTeam && assignedTeam.composition_state !== "draft");
  const persistLabel = () => { if (label.trim()) { props.onChangePrivateLabel(participant.id, label); setEditing(false); } };
  return <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-2">{editing ? <label className="min-w-0 flex-1 font-bold">Libellé privé de la place<input aria-label={`Libellé privé de ${participantLabel(participant)}`} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" maxLength={160} value={label} onChange={(event) => setLabel(event.target.value)} disabled={props.busy || !props.compositionEditable} /></label> : <div className="min-w-0 flex-1"><p className="font-bold">{participantLabel(participant)}</p><p className="mt-1 text-xs text-slate-600">Place réservée · présence {participant.attendance_status} · compte {participant.account_link_status}</p></div>}{editing ? <div className="flex gap-2"><CmmButton type="button" size="sm" tone="primary" disabled={props.busy || !props.compositionEditable || !label.trim()} onClick={persistLabel}>Appliquer</CmmButton><CmmButton type="button" size="sm" tone="secondary" disabled={props.busy} onClick={() => { setLabel(participant.display_name ?? ""); setEditing(false); }}>Annuler</CmmButton></div> : <CmmButton type="button" size="sm" tone="secondary" disabled={props.busy || !props.compositionEditable || teamLocked} onClick={() => setEditing(true)}>Modifier la place</CmmButton>}</div>
    {participant.composition_eligible === false ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-900">{props.compositionEligibilityWarning}. Une résolution organisateur est requise.</p> : null}
    <div className="mt-2 flex flex-wrap items-center gap-2"><label className="min-w-[12rem] flex-1 text-xs font-bold">Équipe<select aria-label={`Affectation de ${participantLabel(participant)}`} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal" value={participant.team_id ?? ""} disabled={props.busy || !props.compositionEditable || teamLocked || participant.composition_eligible === false} onChange={(event) => props.onAssignParticipant(participant.id, event.target.value || null)}><option value="">Places à affecter</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.public_name}</option>)}</select></label>{!participant.clientKey ? <CmmButton type="button" size="sm" tone="secondary" disabled={props.busy || participant.account_link_status === "verified"} onClick={() => void props.issueIdentityCode(participant.id)}>Émettre un code de liaison</CmmButton> : null}</div>
    {!participant.clientKey && props.identityCodes[participant.id] ? <p className="mt-2 rounded-lg bg-emerald-50 p-2 font-mono text-xs text-emerald-900">{props.identityCodes[participant.id]}<br /><span className="font-sans">À remettre directement, sans le publier.</span></p> : null}
  </div>;
}

function TeamEditor({ team, members, props, minMembers, maxMembers }: { team: DraftTeam; members: DraftParticipant[]; props: Props; minMembers: number | null; maxMembers: number | null }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.public_name);
  const applyName = () => { if (name.trim()) { props.onRenameTeam(team.id, name); setEditing(false); } };
  return <section className="rounded-xl border border-slate-200 bg-white/80 p-3" aria-label={`${team.public_name}, ${members.length} places`}><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1">{editing ? <label className="text-sm font-bold">Nom public de l’équipe<input aria-label={`Nom public de l’équipe ${team.team_number}`} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" maxLength={60} value={name} onChange={(event) => setName(event.target.value)} disabled={props.busy || !props.compositionEditable} /></label> : <h4 className="font-black">{team.public_name}</h4>}<span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{members.length} place(s)</span></div>{editing ? <div className="flex gap-2"><CmmButton type="button" size="sm" tone="primary" disabled={props.busy || !name.trim()} onClick={applyName}>Appliquer</CmmButton><CmmButton type="button" size="sm" tone="secondary" disabled={props.busy} onClick={() => { setName(team.public_name); setEditing(false); }}>Annuler</CmmButton></div> : <CmmButton type="button" size="sm" tone="secondary" disabled={props.busy || !props.compositionEditable || team.composition_state !== "draft"} onClick={() => setEditing(true)}>Renommer</CmmButton>}</div><TeamSizeNotice divisionType={props.divisionType} count={members.length} minMembers={minMembers} maxMembers={maxMembers} /><div className="mt-3 space-y-2">{members.length ? members.map((participant) => <PlaceRow key={participant.id} participant={participant} teams={props.draft.teams} props={props} />) : <p className="text-sm text-slate-600">Équipe vide : vous pouvez y affecter une place.</p>}</div></section>;
}

export function SpogomiManualTeamEditor(props: Props) {
  const [teamName, setTeamName] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");
  const participants = props.draft.participants;
  const teams = props.draft.teams;
  const minMembers = props.data.divisions.find((division) => division.id === props.activeDivisionId)?.team_size_config?.casual?.minMembers ?? props.data.event.team_size_config?.casual?.minMembers ?? null;
  const maxMembers = props.data.divisions.find((division) => division.id === props.activeDivisionId)?.team_size_config?.casual?.maxMembers ?? props.data.event.team_size_config?.casual?.maxMembers ?? null;
  const unassigned = participants.filter((participant) => !participant.team_id);
  const submitTeam = (event: FormEvent) => { event.preventDefault(); if (teamName.trim()) { props.onCreateTeam(teamName); setTeamName(""); } };
  const submitPlace = (event: FormEvent) => { event.preventDefault(); if (placeLabel.trim()) { props.onCreatePlace(placeLabel); setPlaceLabel(""); } };
  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4" aria-label="Former les équipes">
      <div>
        <h3 className="text-lg font-black text-emerald-950">Former les équipes</h3>
        <p className="mt-1 text-sm text-emerald-900">
          Les éditions restent locales jusqu’à « Enregistrer les modifications ».
          Les compositions enregistrées ici restent des brouillons jusqu’au
          verrouillage officiel.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <form className="rounded-xl bg-white/80 p-3" onSubmit={submitTeam}>
          <h4 className="font-black">Créer une équipe</h4>
          <p className="mt-1 text-xs text-slate-600">Disponible même sans import ni participant.</p>
          <label className="mt-2 block text-sm font-bold">
            Nom public facultatif
            <input aria-label="Nom public de la nouvelle équipe" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" maxLength={60} value={teamName} onChange={(event) => setTeamName(event.target.value)} disabled={props.busy || !props.compositionEditable} placeholder="Équipe suivante" />
          </label>
          <CmmButton type="submit" size="sm" tone="primary" className="mt-3" disabled={props.busy || !props.compositionEditable || !teamName.trim()}>Créer une équipe</CmmButton>
        </form>
        <form className="rounded-xl bg-white/80 p-3" onSubmit={submitPlace}>
          <h4 className="font-black">Ajouter une place</h4>
          <p className="mt-1 text-xs text-slate-600">Ce libellé est privé et ne crée pas de compte Clerk.</p>
          <label className="mt-2 block text-sm font-bold">
            Prénom ou libellé privé
            <input aria-label="Prénom ou libellé privé de la nouvelle place" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal" maxLength={160} required value={placeLabel} onChange={(event) => setPlaceLabel(event.target.value)} disabled={props.busy || !props.compositionEditable} placeholder="Place manuelle" />
          </label>
          <CmmButton type="submit" size="sm" tone="primary" className="mt-3" disabled={props.busy || !props.compositionEditable || !placeLabel.trim()}>Ajouter la place</CmmButton>
        </form>
      </div>
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">
        <p className="font-black">Places à affecter · {unassigned.length}</p>
        {unassigned.length ? <div className="mt-3 space-y-2">{unassigned.map((participant) => <PlaceRow key={participant.id} participant={participant} teams={teams} props={props} />)}</div> : <p className="mt-1 text-sm text-slate-700">Aucune place en attente.</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {teams.map((team) => <TeamEditor key={team.id} team={team} members={participants.filter((participant) => participant.team_id === team.id)} props={props} minMembers={minMembers} maxMembers={maxMembers} />)}
      </div>
    </div>
  );
}
