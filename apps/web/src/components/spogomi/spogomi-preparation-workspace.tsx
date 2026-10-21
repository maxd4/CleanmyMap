"use client";

import { useEffect, useMemo, useState } from "react";
import { validateProposedTeamFormation } from "@/lib/spogomi/preparation";
import { spogomiModeLabel, type SpogomiDivisionType, type SpogomiRosterPreview, type SpogomiTeamFormation } from "@/lib/spogomi/types";
import type { SpogomiTeamCompositionPreview } from "@/lib/spogomi/preparation-service";
import { SpogomiPreparationWorkspaceView } from "./spogomi-preparation-workspace-view";

export type WorkspaceData = { event: { id: string; event_slug: string | null; public_visibility: "private" | "published"; public_results_visibility: "hidden" | "provisional" | "certified"; name: string; location_label: string; mode: "casual" | "world_cup" | "mixed"; state: string; starts_at: string; ends_at: string | null; composition_revision?: number; team_size_config?: { casual?: { minMembers?: number | null; maxMembers?: number | null } } }; divisions: Array<{ id: string; event_id: string; division_type: SpogomiDivisionType; division_key: SpogomiDivisionType; regulation_version?: string; regulation_status?: "incomplete" | "complete"; regulation_source_reference?: string | null; regulation_config?: { [key: string]: unknown }; team_size_config?: { casual?: { minMembers?: number | null; maxMembers?: number | null } } }>; participants: Array<{ id: string; division_id: string; display_name: string | null; external_reference: string | null; group_preference: string | null; team_id: string | null; attendance_status: "unknown" | "present" | "absent"; account_link_status: "unlinked" | "pending" | "verified" | "rejected"; source_system?: string | null; ticket_status?: string | null; ticket_deleted?: boolean; composition_eligible?: boolean }>; teams: Array<{ id: string; division_id: string; team_number: number; public_name: string; composition_state: string }>; route: { file_name: string; reference_distance_km: number; geometry_geojson: { coordinates: [number, number][] } } | null; categoryRules: Array<{ division_id: string; label: string; measurement_kind: string; unit: string; is_complete: boolean }>; eventAccess: Array<{ role: string; revoked_at: string | null }> };

export type SpogomiPreparationWorkspaceSection = "teams" | "attendance" | "results" | "arbitration" | "bilan" | "settings";

export const ROSTER_PAGE_SIZE = 50;
export const ROSTER_MAPPING_FIELDS = [
  ["ticketReference", "Référence billet"],
  ["orderReference", "Référence commande"],
  ["orderAlternativeReference", "Référence commande avancée"],
  ["ticketStatus", "Statut du billet"],
  ["ticketDeleted", "Supprimé"],
  ["name", "Nom / occupant"],
  ["participantLastName", "Nom participant"],
  ["participantFirstName", "Prénom participant"],
  ["group", "Groupe"],
  ["sourceRowId", "Identifiant de ligne"],
] as const;
export const SPOGOMI_PUBLIC_TEAM_NAME_TEMPLATE = "Équipe {team.team_number} — {team.public_name}";
export const SPOGOMI_COMPOSITION_ARBITRATION_MESSAGE = "Une absence ou un remplacement nécessite une procédure d’arbitrage versionnée";
export const SPOGOMI_COMPOSITION_ELIGIBILITY_WARNING = "Billet annulé ou supprimé : affectation bloquée";
export const SPOGOMI_TEAM_EDITOR_LABELS = { edit: "Modifier", save: "Enregistrer", cancel: "Annuler" } as const;

export function SpogomiTeamNameInput({ value, disabled, onChange, label }: { value: string; disabled: boolean; onChange: (value: string) => void; label: string }) {
  return <input aria-label={label} className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2 font-normal" maxLength={60} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />;
}

export function buildSpogomiCompositionRevision(data: WorkspaceData): { expectedRevision: number } {
  return { expectedRevision: data.event.composition_revision ?? 0 };
}

type ImportSummary = { created: number; unchanged: number; changed: number; conflicts: number; excluded: number };

function countAssignedParticipants(data: WorkspaceData | null): number {
  return data?.participants.filter((participant) => participant.team_id).length ?? 0;
}

function getValidRosterRows(preview: SpogomiRosterPreview | null): SpogomiRosterPreview["rows"] {
  if (!preview) return [];
  const invalidRows = new Set(preview.errors.map((item) => item.rowNumber));
  return preview.rows.filter((row) => !invalidRows.has(row.rowNumber));
}

function summarizeSelectedImport(acceptedRowNumbers: number[], preview: SpogomiRosterPreview | null): ImportSummary {
  const summary: ImportSummary = { created: 0, unchanged: 0, changed: 0, conflicts: 0, excluded: 0 };
  for (const rowNumber of acceptedRowNumbers) {
    const effect = preview?.rowEffects?.[String(rowNumber)];
    if (effect === "created") summary.created += 1;
    else if (effect === "unchanged") summary.unchanged += 1;
    else if (effect === "changed") summary.changed += 1;
    else if (effect === "conflict") summary.conflicts += 1;
    else summary.excluded += 1;
  }
  return summary;
}

function teamPreviewValidationInput(data: WorkspaceData, activeDivisionId: string | null, teamPreview: SpogomiTeamCompositionPreview) {
  const division = data.divisions.find((candidate) => candidate.id === activeDivisionId);
  const mode = division?.division_type ?? (data.event.mode === "mixed" ? "casual" : data.event.mode);
  const bounds = {
    minMembers: division?.team_size_config?.casual?.minMembers ?? data.event.team_size_config?.casual?.minMembers ?? null,
    maxMembers: division?.team_size_config?.casual?.maxMembers ?? data.event.team_size_config?.casual?.maxMembers ?? null,
  };
  return { formation: teamPreview.formation, participantIds: teamPreview.formation.teams.flatMap((team) => team.participantIds).concat(teamPreview.formation.unassignedParticipantIds), mode, casualTeamBounds: bounds };
}

function validateTeamPreview(data: WorkspaceData | null, activeDivisionId: string | null, teamPreview: SpogomiTeamCompositionPreview | null): string | null {
  if (!data || !teamPreview) return null;
  try {
    validateProposedTeamFormation(teamPreviewValidationInput(data, activeDivisionId, teamPreview));
    return null;
  } catch (reason) {
    return reason instanceof Error ? reason.message : "La composition est invalide.";
  }
}

export function SpogomiPreparationWorkspace({ eventId, section = "teams", showHeader = true, showAdminTeamJoinRequests = false }: { eventId: string; section?: SpogomiPreparationWorkspaceSection; showHeader?: boolean; showAdminTeamJoinRequests?: boolean }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<SpogomiRosterPreview | null>(null);
  const [teamPreview, setTeamPreview] = useState<SpogomiTeamCompositionPreview | null>(null);
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [identityCodes, setIdentityCodes] = useState<Record<string, string>>({});
  const [acceptedRowNumbers, setAcceptedRowNumbers] = useState<number[]>([]);
  const [mappingSelection, setMappingSelection] = useState<Record<string, string>>({});
  const [sheetSelection, setSheetSelection] = useState("");
  const [headerRowSelection, setHeaderRowSelection] = useState<number | undefined>(undefined);
  const [rosterPage, setRosterPage] = useState(0);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const divisionQuery = activeDivisionId ? `?divisionId=${encodeURIComponent(activeDivisionId)}` : "";
  const scopedUrl = (url: string) => activeDivisionId ? `${url}${url.includes("?") ? "&" : "?"}divisionId=${encodeURIComponent(activeDivisionId)}` : url;
  const refresh = async () => { const response = await fetch(`/api/spogomi/events/${eventId}${divisionQuery}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Événement indisponible."); setData(body); };
  useEffect(() => {
    let active = true;
    void fetch(`/api/spogomi/events/${eventId}`, { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Événement indisponible."); if (active) { setData(body); if (!activeDivisionId && body.divisions?.[0]?.id) setActiveDivisionId(body.divisions[0].id); } }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Événement indisponible."); });
    return () => { active = false; };
  }, [eventId, activeDivisionId]);
  const assignedCount = useMemo(() => countAssignedParticipants(data), [data]);
  const compositionEditable = data ? ["draft", "registration_open"].includes(data.event.state) : false;
  const compositionLocked = !compositionEditable;
  const teamPreviewError = useMemo(() => validateTeamPreview(data, activeDivisionId, teamPreview), [activeDivisionId, data, teamPreview]);
  async function action(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> { setBusy(true); setError(null); setMessage(null); try { const response = await fetch(scopedUrl(url), init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? "Opération refusée."); setMessage("Opération enregistrée."); await refresh(); return body as Record<string, unknown>; } catch (reason) { setError(reason instanceof Error ? reason.message : "Opération refusée."); return null; } finally { setBusy(false); } }
  async function issueIdentityCode(participantId: string) { const body = await action(`/api/spogomi/events/${eventId}/participants/${participantId}/identity-code`, { method: "POST" }); if (body && typeof body.code === "string") setIdentityCodes((current) => ({ ...current, [participantId]: body.code as string })); }
  async function previewRoster(file: File, options?: { mapping?: Record<string, string>; sheetName?: string; headerRow?: number; allowIncompatibleMapping?: boolean }) { const form = new FormData(); form.set("file", file); if (activeDivisionId) form.set("divisionId", activeDivisionId); if (options?.mapping) form.set("mapping", JSON.stringify(options.mapping)); if (options?.sheetName) form.set("sheetName", options.sheetName); if (options?.headerRow) form.set("headerRow", String(options.headerRow)); if (options?.allowIncompatibleMapping) form.set("allowIncompatibleMapping", "true"); setRosterFile(file); setBusy(true); setError(null); try { const response = await fetch(`/api/spogomi/events/${eventId}/imports/preview`, { method: "POST", body: form }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Aperçu impossible."); const nextPreview = body as SpogomiRosterPreview; setPreview(nextPreview); setMappingSelection(nextPreview.mapping); setSheetSelection(nextPreview.sheetName ?? ""); setHeaderRowSelection(nextPreview.headerRow || undefined); setRosterPage(0); const invalidRows = new Set(nextPreview.errors.map((item) => item.rowNumber)); setAcceptedRowNumbers(nextPreview.rows.filter((row) => !invalidRows.has(row.rowNumber)).map((row) => row.rowNumber)); } catch (reason) { setPreview(null); setError(reason instanceof Error ? reason.message : "Aperçu impossible."); } finally { setBusy(false); } }
  async function confirmRoster() { if (!preview || !rosterFile || !acceptedRowNumbers.length) return; const form = new FormData(); form.set("file", rosterFile); form.set("mapping", JSON.stringify(mappingSelection)); if (activeDivisionId) form.set("divisionId", activeDivisionId); if (preview.sheetName) form.set("sheetName", preview.sheetName); if (preview.headerRow) form.set("headerRow", String(preview.headerRow)); form.set("acceptedRowNumbers", JSON.stringify(acceptedRowNumbers)); const result = await action(`/api/spogomi/events/${eventId}/imports/confirm`, { method: "POST", body: form }); if (result) { setPreview(null); setRosterFile(null); setAcceptedRowNumbers([]); } }
  function toggleAcceptedRow(rowNumber: number) { setAcceptedRowNumbers((current) => current.includes(rowNumber) ? current.filter((value) => value !== rowNumber) : [...current, rowNumber].sort((a, b) => a - b)); }
  const validRosterRows = useMemo(() => getValidRosterRows(preview), [preview]);
  const visibleRosterRows = useMemo(() => validRosterRows.slice(rosterPage * ROSTER_PAGE_SIZE, (rosterPage + 1) * ROSTER_PAGE_SIZE), [rosterPage, validRosterRows]);
  const rosterPageCount = Math.max(1, Math.ceil(validRosterRows.length / ROSTER_PAGE_SIZE));
  const selectedImportSummary = useMemo(() => summarizeSelectedImport(acceptedRowNumbers, preview), [acceptedRowNumbers, preview]);
  async function previewTeams() { const result = await action(`/api/spogomi/events/${eventId}/teams/auto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId: activeDivisionId }) }); if (result) setTeamPreview(result as unknown as SpogomiTeamCompositionPreview); }
  function movePreviewParticipant(participantId: string, teamNumber: number | null) { setTeamPreview((current) => { if (!current) return current; const teams = current.formation.teams.map((team) => ({ ...team, participantIds: team.participantIds.filter((id) => id !== participantId) })); let unassignedParticipantIds = current.formation.unassignedParticipantIds.filter((id) => id !== participantId); if (teamNumber === null) unassignedParticipantIds = [...unassignedParticipantIds, participantId]; else { const target = teams.find((team) => team.teamNumber === teamNumber); if (!target) return current; target.participantIds = [...target.participantIds, participantId]; } const formation: SpogomiTeamFormation = { ...current.formation, teams, unassignedParticipantIds }; return { ...current, formation }; }); }
  async function confirmTeams() { if (!teamPreview || teamPreviewError) return; const result = await action(`/api/spogomi/events/${eventId}/teams/auto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true, divisionId: activeDivisionId, expectedRevision: teamPreview.expectedRevision, proposalFingerprint: teamPreview.proposalFingerprint, formation: teamPreview.formation }) }); if (result) setTeamPreview(null); }
  function beginTeamNameEdit(team: WorkspaceData["teams"][number]) { setEditingTeamId(team.id); setTeamNameDraft(team.public_name); setError(null); setMessage(null); }
  function cancelTeamNameEdit() { setEditingTeamId(null); setTeamNameDraft(""); }
  async function saveTeamName(team: WorkspaceData["teams"][number]) { const result = await action(`/api/spogomi/events/${eventId}/teams/${team.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedPublicName: team.public_name, publicName: teamNameDraft, divisionId: team.division_id }) }); if (result) cancelTeamNameEdit(); }
  if (!data) return <main className="p-8">Chargement de l’événement…</main>;
  const activeDivision = data.divisions.find((division) => division.id === activeDivisionId) ?? data.divisions[0] ?? null;
  const divisionLabel = activeDivision ? (activeDivision.division_type === "world_cup" ? "World Cup" : "Casual") : spogomiModeLabel(data.event.mode);
  return <SpogomiPreparationWorkspaceView eventId={eventId} section={section} showHeader={showHeader} showAdminTeamJoinRequests={showAdminTeamJoinRequests} data={data} activeDivisionId={activeDivisionId} activeDivision={activeDivision} divisionLabel={divisionLabel} busy={busy} message={message} error={error} compositionEditable={compositionEditable} compositionLocked={compositionLocked} publicTeamNameTemplate={SPOGOMI_PUBLIC_TEAM_NAME_TEMPLATE} compositionArbitrationMessage={SPOGOMI_COMPOSITION_ARBITRATION_MESSAGE} compositionEligibilityWarning={SPOGOMI_COMPOSITION_ELIGIBILITY_WARNING} compositionRevision={() => buildSpogomiCompositionRevision(data)} teamEditorLabels={SPOGOMI_TEAM_EDITOR_LABELS} teamNameInput={SpogomiTeamNameInput} assignedCount={assignedCount} preview={preview} rosterFile={rosterFile} acceptedRowNumbers={acceptedRowNumbers} mappingSelection={mappingSelection} sheetSelection={sheetSelection} headerRowSelection={headerRowSelection} rosterPage={rosterPage} validRosterRows={validRosterRows} visibleRosterRows={visibleRosterRows} rosterPageCount={rosterPageCount} selectedImportSummary={selectedImportSummary} teamPreview={teamPreview} teamPreviewError={teamPreviewError} identityCodes={identityCodes} editingTeamId={editingTeamId} teamNameDraft={teamNameDraft} action={action} setActiveDivisionId={setActiveDivisionId} setTeamPreview={setTeamPreview} setAcceptedRowNumbers={setAcceptedRowNumbers} setMappingSelection={setMappingSelection} setSheetSelection={setSheetSelection} setRosterPage={setRosterPage} previewRoster={previewRoster} confirmRoster={confirmRoster} toggleAcceptedRow={toggleAcceptedRow} previewTeams={previewTeams} movePreviewParticipant={movePreviewParticipant} confirmTeams={confirmTeams} beginTeamNameEdit={beginTeamNameEdit} cancelTeamNameEdit={cancelTeamNameEdit} saveTeamName={saveTeamName} issueIdentityCode={issueIdentityCode} setTeamNameDraft={setTeamNameDraft} />;
}
