"use client";

import { useMemo, useRef, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { fetchParticipantPage } from "./action-participant-picker-search";
import { labelForUser, type ChatUserOption } from "./action-participant-picker-model";
import { ActionAttendanceTeamsEditor } from "./action-attendance-teams-editor";
import { useActionAttendanceRegistry } from "./use-action-attendance-registry";

const STATUS_LABELS = { unknown: "À confirmer", present: "Présent", absent: "Absent" } as const;

type AttendanceRegistryMode = "preparation" | "day" | "bilan";

export function ActionAttendanceRegistryEntryPoint({ actionId, mode }: { actionId: string | null | undefined; mode: "preparation" | "bilan" }) {
  if (!actionId) {
    return <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" data-testid="action-attendance-registry-not-persisted">
      La liste d’appel privée sera accessible après l’enregistrement de l’action. Cette étape ne crée pas l’action automatiquement.
    </p>;
  }
  return <ActionAttendanceRegistryPanel actionId={actionId} mode={mode} />;
}

export function ActionAttendanceRegistryPanel({ actionId, mode }: { actionId: string; mode: AttendanceRegistryMode }) {
  const { snapshot, loadState, errorMessage, busyKey, mutate, refresh } = useActionAttendanceRegistry(actionId);
  const [label, setLabel] = useState("");
  const [selectedUser, setSelectedUser] = useState<ChatUserOption | null>(null);
  const [accountResults, setAccountResults] = useState<ChatUserOption[]>([]);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [linkingEntryId, setLinkingEntryId] = useState<string | null>(null);
  const searchSequence = useRef(0);

  const activeEntries = useMemo(() => (snapshot?.entries ?? []).filter((entry) => entry.deleted_at === null), [snapshot]);
  const entries = useMemo(() => activeEntries.filter((entry) =>
    entry.display_label.toLocaleLowerCase("fr").includes(filter.trim().toLocaleLowerCase("fr"))), [activeEntries, filter]);
  const counts = useMemo(() => activeEntries.reduce((total, entry) => ({ ...total, [entry.attendance_status]: total[entry.attendance_status] + 1 }), { unknown: 0, present: 0, absent: 0 }), [activeEntries]);
  if (loadState === "forbidden") return null;

  async function searchAccounts(value: string) {
    const sequence = ++searchSequence.current;
    if (value.trim().length < 2) { setAccountResults([]); setAccountError(null); return; }
    try {
      const page = await fetchParticipantPage("/api/chat/users", value.trim(), 0, undefined, true);
      if (sequence === searchSequence.current) { setAccountResults(page.items); setAccountError(null); }
    } catch (error) {
      if (sequence === searchSequence.current) { setAccountResults([]); setAccountError(error instanceof Error ? error.message : "Recherche indisponible."); }
    }
  }

  async function add(status: "unknown" | "present") {
    if (!label.trim()) return;
    try {
      await mutate({ operation: "add", displayLabel: label.trim(), clerkUserId: selectedUser?.id, attendanceStatus: status });
      setLabel(""); setSelectedUser(null); setAccountResults([]);
    } catch { /* Keep the draft visible for retry. */ }
  }

  async function mark(entryId: string, expectedRevision: number, status: "unknown" | "present" | "absent") {
    try { await mutate({ operation: "mark", entryId, expectedRevision, attendanceStatus: status }); } catch { /* Error is announced by the shared hook. */ }
  }

  async function rename(entryId: string, expectedRevision: number) {
    try { await mutate({ operation: "rename", entryId, expectedRevision, displayLabel: editingLabel }); setEditingId(null); } catch { /* Keep editing state for correction. */ }
  }

  async function remove(entryId: string, expectedRevision: number) {
    try { await mutate({ operation: "delete", entryId, expectedRevision }); } catch { /* Error is announced by the shared hook. */ }
  }

  async function link(entryId: string, expectedRevision: number, clerkUserId: string) {
    try {
      await mutate({ operation: "link", entryId, expectedRevision, clerkUserId });
      setLinkingEntryId(null); setLabel(""); setSelectedUser(null); setAccountResults([]);
    } catch { /* Keep the target and search available for retry or correction. */ }
  }

  const declaredTotal = snapshot?.declared.total;
  const gap = declaredTotal === null || declaredTotal === undefined ? null : declaredTotal - counts.present;
  return <CmmCard as="section" tone="violet" variant="outlined" size="md" data-testid={`action-attendance-registry-${mode}`}>
    <div className="space-y-4">
      <header><p className="text-xs font-black uppercase tracking-wide text-violet-700">Registre privé</p><h2 className="mt-1 text-xl font-black text-violet-950">{mode === "day" ? "Feuille d’appel" : mode === "preparation" ? "Liste d’appel et personnes attendues" : "Présences identifiées"}</h2><p className="mt-1 text-sm text-violet-900">Ce suivi nominatif reste privé. Il ne valide pas la participation finale.</p>{mode === "preparation" ? <p className="mt-1 text-sm text-violet-900">Les inscriptions confirmées apparaissent ici après synchronisation. Une identité ajoutée librement ne crée ni inscription ni compte.</p> : null}</header>
      {loadState === "loading" ? <p role="status" className="text-sm">Chargement du registre…</p> : null}
      {loadState === "error" ? <div role="alert" className="space-y-2 text-sm"><p>Le registre privé est indisponible.</p><CmmButton type="button" size="sm" onClick={() => { void refresh(); }}>Réessayer</CmmButton></div> : null}
      {snapshot ? <>
        <dl className="grid grid-cols-3 gap-2 text-center text-sm" aria-label="Compteurs de présence"><div className="rounded-xl bg-slate-50 p-2"><dt>À confirmer</dt><dd className="text-lg font-black">{counts.unknown}</dd></div><div className="rounded-xl bg-emerald-50 p-2"><dt>Présents</dt><dd className="text-lg font-black">{counts.present}</dd></div><div className="rounded-xl bg-amber-50 p-2"><dt>Absents</dt><dd className="text-lg font-black">{counts.absent}</dd></div></dl>
        <ActionAttendanceTeamsEditor entries={activeEntries} teams={snapshot.teams ?? []} busyKey={busyKey} onMutate={mutate} />
        {mode === "bilan" ? <div className="rounded-xl bg-slate-50 p-3 text-sm"><p><strong>Présents identifiés :</strong> {counts.present}</p><p><strong>Effectif total déclaré :</strong> {declaredTotal ?? "non renseigné"}</p>{snapshot.declared.adults !== null ? <p>Adultes : {snapshot.declared.adults} · Retraités : {snapshot.declared.retired ?? "non renseigné"} · Enfants : {snapshot.declared.children ?? "non renseigné"}</p> : null}{gap !== null ? <p><strong>Écart non rapproché :</strong> {gap}. Un total déclaré ne permet pas d’identifier les personnes anonymes.</p> : <p>Écart non rapproché : non calculable sans effectif total déclaré.</p>}</div> : null}
        <div className="grid gap-3 sm:grid-cols-1">
          <div className="space-y-2"><CmmField label="Identité" hint="Nom, prénom, pseudo ou libellé distinctif. Saisissez librement ou recherchez un compte Clerk (facultatif) ; le lien n’est créé qu’après une sélection explicite."><CmmInput value={label} maxLength={160} autoComplete="off" onKeyDown={(event) => { if (event.key === "Enter" && !linkingEntryId) { event.preventDefault(); void add("unknown"); } }} onChange={(event) => { setLabel(event.target.value); setSelectedUser(null); void searchAccounts(event.target.value); }} /></CmmField>{selectedUser && !linkingEntryId ? <p className="text-sm">Compte choisi : {labelForUser(selectedUser)} <button type="button" className="underline" onClick={() => setSelectedUser(null)}>Retirer</button></p> : null}{linkingEntryId ? <p className="text-sm">Choisissez un compte pour l’associer à « {activeEntries.find((entry) => entry.id === linkingEntryId)?.display_label ?? "cette identité"} ». <button type="button" className="underline" onClick={() => { searchSequence.current += 1; setLinkingEntryId(null); setLabel(""); setAccountResults([]); }}>Annuler</button></p> : null}{accountError ? <p role="alert" className="text-sm text-amber-800">{accountError}</p> : null}{accountResults.length ? <ul className="max-h-36 space-y-1 overflow-y-auto rounded-xl border p-2" aria-label="Résultats des comptes">{accountResults.map((user) => <li key={user.id}><button type="button" className="min-h-10 w-full rounded-lg px-2 text-left hover:bg-violet-50 focus-visible:outline focus-visible:outline-2" onClick={() => { if (linkingEntryId) { const target = activeEntries.find((entry) => entry.id === linkingEntryId); if (target) void link(target.id, target.revision, user.id); } else { setSelectedUser(user); setLabel(labelForUser(user)); setAccountResults([]); } }}>{labelForUser(user)}{linkingEntryId ? " — associer" : " — utiliser ce compte"}</button></li>)}</ul> : null}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row"><CmmButton type="button" tone="primary" disabled={!label.trim() || Boolean(busyKey) || Boolean(linkingEntryId)} loading={busyKey !== null} onClick={() => { void add("unknown"); }}>Ajouter à la liste</CmmButton><CmmButton type="button" disabled={!label.trim() || !snapshot.canMarkPresent || Boolean(busyKey) || Boolean(linkingEntryId)} onClick={() => { void add("present"); }}>Ajouter comme présent</CmmButton>{!snapshot.canMarkPresent ? <span className="self-center text-xs text-slate-600">Le pointage sera possible à partir de l’heure de début prévue.</span> : null}</div>
        <CmmField label="Rechercher dans la liste"><CmmInput value={filter} onChange={(event) => setFilter(event.target.value)} /></CmmField>
        {entries.length === 0 ? <p className="text-sm text-slate-600">{activeEntries.length ? "Aucune identité ne correspond à la recherche." : "Aucune personne dans le registre."}</p> : <ul className="divide-y rounded-xl border">{entries.map((entry) => <li key={entry.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0">{editingId === entry.id ? <div className="flex gap-2"><CmmInput aria-label={`Renommer ${entry.display_label}`} value={editingLabel} onChange={(event) => setEditingLabel(event.target.value)} /><CmmButton type="button" size="sm" disabled={Boolean(busyKey)} onClick={() => { void rename(entry.id, entry.revision); }}>Enregistrer</CmmButton><CmmButton type="button" size="sm" onClick={() => setEditingId(null)}>Annuler</CmmButton></div> : <><p className="break-words font-bold">{entry.display_label}</p><p className="text-xs text-slate-600">{STATUS_LABELS[entry.attendance_status]}{entry.clerk_user_id ? " · compte associé" : " · sans compte associé"}</p></>}</div><div className="flex flex-wrap gap-2">{(["unknown", "present", "absent"] as const).map((status) => <CmmButton key={status} type="button" size="sm" variant={entry.attendance_status === status ? "default" : "ghost"} disabled={Boolean(busyKey) || (status !== "unknown" && !snapshot.canMarkPresent)} ariaPressed={entry.attendance_status === status} onClick={() => { void mark(entry.id, entry.revision, status); }}>{STATUS_LABELS[status]}</CmmButton>)}{!entry.clerk_user_id ? <CmmButton type="button" size="sm" disabled={Boolean(busyKey)} onClick={() => { searchSequence.current += 1; setLinkingEntryId(entry.id); setLabel(""); setAccountResults([]); setAccountError(null); }}>Associer un compte</CmmButton> : null}<CmmButton type="button" size="sm" onClick={() => { setEditingId(entry.id); setEditingLabel(entry.display_label); }}>Renommer</CmmButton><CmmButton type="button" tone="destructive" size="sm" disabled={Boolean(busyKey)} onClick={() => { void remove(entry.id, entry.revision); }}>Retirer</CmmButton></div></li>)}</ul>}
        {errorMessage ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{errorMessage}</p> : null}
      </> : null}
    </div>
  </CmmCard>;
}
