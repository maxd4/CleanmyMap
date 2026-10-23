"use client";

import { useEffect, useMemo, useState } from "react";
import { validateProposedTeamFormation } from "@/lib/spogomi/preparation";
import { spogomiModeLabel, type SpogomiRosterPreview, type SpogomiTeamFormation } from "@/lib/spogomi/types";
import type { SpogomiTeamCompositionPreview } from "@/lib/spogomi/preparation-service";
import {
  ROSTER_PAGE_SIZE,
  SPOGOMI_COMPOSITION_ARBITRATION_MESSAGE,
  SPOGOMI_COMPOSITION_ELIGIBILITY_WARNING,
  SPOGOMI_PUBLIC_TEAM_NAME_TEMPLATE,
  SPOGOMI_TEAM_EDITOR_LABELS,
  type SpogomiPreparationWorkspaceSection,
  type WorkspaceData,
} from "./spogomi-preparation-workspace-contract";
import { SpogomiPreparationWorkspaceView } from "./spogomi-preparation-workspace-view";

export {
  ROSTER_MAPPING_FIELDS,
  ROSTER_PAGE_SIZE,
  SPOGOMI_COMPOSITION_ARBITRATION_MESSAGE,
  SPOGOMI_COMPOSITION_ELIGIBILITY_WARNING,
  SPOGOMI_PUBLIC_TEAM_NAME_TEMPLATE,
  SPOGOMI_TEAM_EDITOR_LABELS,
} from "./spogomi-preparation-workspace-contract";
export type {
  SpogomiPreparationWorkspaceSection,
  WorkspaceData,
} from "./spogomi-preparation-workspace-contract";

export function SpogomiTeamNameInput({ value, disabled, onChange, label }: { value: string; disabled: boolean; onChange: (value: string) => void; label: string }) {
  return <input aria-label={label} className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2 font-normal" maxLength={60} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />;
}

export function buildSpogomiCompositionRevision(data: WorkspaceData): { expectedRevision: number } {
  return { expectedRevision: data.event.composition_revision ?? 0 };
}

type ImportSummary = { created: number; unchanged: number; changed: number; conflicts: number; excluded: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJsonRecord(response: Response): Promise<Record<string, unknown>> {
  let raw: unknown;
  try { raw = await response.json(); } catch { throw new Error("Le serveur a renvoyé une réponse illisible."); }
  if (!isRecord(raw)) throw new Error("Le serveur a renvoyé une réponse invalide.");
  return raw;
}

function parseWorkspaceData(value: unknown): WorkspaceData | null {
  if (!isRecord(value) || !isRecord(value.event) || !Array.isArray(value.divisions) || !Array.isArray(value.participants) || !Array.isArray(value.teams) || !Array.isArray(value.categoryRules) || !Array.isArray(value.eventAccess)) return null;
  return value as WorkspaceData;
}

function parseRosterPreview(value: unknown): SpogomiRosterPreview | null {
  if (!isRecord(value) || typeof value.contentHash !== "string" || typeof value.importKey !== "string" || !isRecord(value.mapping) || !Array.isArray(value.rows) || !Array.isArray(value.errors)) return null;
  return value as SpogomiRosterPreview;
}

function parseTeamPreview(value: unknown): SpogomiTeamCompositionPreview | null {
  if (!isRecord(value) || !isRecord(value.formation) || typeof value.proposalFingerprint !== "string" || typeof value.expectedRevision !== "number" || typeof value.participantCount !== "number" || typeof value.assignedParticipantCount !== "number" || !Array.isArray(value.preservedTeamIds) || !Array.isArray(value.explanation)) return null;
  return value as SpogomiTeamCompositionPreview;
}

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
  const refresh = async () => { const response = await fetch(`/api/spogomi/events/${eventId}${divisionQuery}`, { cache: "no-store" }); const body = await readJsonRecord(response); if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Événement indisponible."); const nextData = parseWorkspaceData(body); if (!nextData) throw new Error("Événement renvoyé dans un format invalide."); setData(nextData); };
  useEffect(() => {
    let active = true;
    void fetch(`/api/spogomi/events/${eventId}`, { cache: "no-store" }).then(async (response) => { const body = await readJsonRecord(response); if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Événement indisponible."); const nextData = parseWorkspaceData(body); if (!nextData) throw new Error("Événement renvoyé dans un format invalide."); if (active) { setData(nextData); if (!activeDivisionId && nextData.divisions[0]?.id) setActiveDivisionId(nextData.divisions[0].id); } }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Événement indisponible."); });
    return () => { active = false; };
  }, [eventId, activeDivisionId]);
  const assignedCount = useMemo(() => countAssignedParticipants(data), [data]);
  const compositionEditable = data ? ["draft", "registration_open"].includes(data.event.state) : false;
  const compositionLocked = !compositionEditable;
  const teamPreviewError = useMemo(() => validateTeamPreview(data, activeDivisionId, teamPreview), [activeDivisionId, data, teamPreview]);
  async function action(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> { setBusy(true); setError(null); setMessage(null); try { const response = await fetch(scopedUrl(url), init); const body = await readJsonRecord(response); if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Opération refusée."); setMessage("Opération enregistrée."); await refresh(); return body; } catch (reason) { setError(reason instanceof Error ? reason.message : "Opération refusée."); return null; } finally { setBusy(false); } }
  async function issueIdentityCode(participantId: string) { const body = await action(`/api/spogomi/events/${eventId}/participants/${participantId}/identity-code`, { method: "POST" }); const code = body?.code; if (typeof code === "string") setIdentityCodes((current) => ({ ...current, [participantId]: code })); }
  async function previewRoster(file: File, options?: { mapping?: Record<string, string>; sheetName?: string; headerRow?: number; allowIncompatibleMapping?: boolean }) { const form = new FormData(); form.set("file", file); if (activeDivisionId) form.set("divisionId", activeDivisionId); if (options?.mapping) form.set("mapping", JSON.stringify(options.mapping)); if (options?.sheetName) form.set("sheetName", options.sheetName); if (options?.headerRow) form.set("headerRow", String(options.headerRow)); if (options?.allowIncompatibleMapping) form.set("allowIncompatibleMapping", "true"); setRosterFile(file); setBusy(true); setError(null); try { const response = await fetch(`/api/spogomi/events/${eventId}/imports/preview`, { method: "POST", body: form }); const body = await readJsonRecord(response); if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Aperçu impossible."); const nextPreview = parseRosterPreview(body); if (!nextPreview) throw new Error("Aperçu renvoyé dans un format invalide."); setPreview(nextPreview); setMappingSelection(nextPreview.mapping); setSheetSelection(nextPreview.sheetName ?? ""); setHeaderRowSelection(nextPreview.headerRow || undefined); setRosterPage(0); const invalidRows = new Set(nextPreview.errors.map((item) => item.rowNumber)); setAcceptedRowNumbers(nextPreview.rows.filter((row) => !invalidRows.has(row.rowNumber)).map((row) => row.rowNumber)); } catch (reason) { setPreview(null); setError(reason instanceof Error ? reason.message : "Aperçu impossible."); } finally { setBusy(false); } }
  async function confirmRoster() { if (!preview || !rosterFile || !acceptedRowNumbers.length) return; const form = new FormData(); form.set("file", rosterFile); form.set("mapping", JSON.stringify(mappingSelection)); if (activeDivisionId) form.set("divisionId", activeDivisionId); if (preview.sheetName) form.set("sheetName", preview.sheetName); if (preview.headerRow) form.set("headerRow", String(preview.headerRow)); form.set("acceptedRowNumbers", JSON.stringify(acceptedRowNumbers)); const result = await action(`/api/spogomi/events/${eventId}/imports/confirm`, { method: "POST", body: form }); if (result) { setPreview(null); setRosterFile(null); setAcceptedRowNumbers([]); } }
  function toggleAcceptedRow(rowNumber: number) { setAcceptedRowNumbers((current) => current.includes(rowNumber) ? current.filter((value) => value !== rowNumber) : [...current, rowNumber].sort((a, b) => a - b)); }
  const validRosterRows = useMemo(() => getValidRosterRows(preview), [preview]);
  const visibleRosterRows = useMemo(() => validRosterRows.slice(rosterPage * ROSTER_PAGE_SIZE, (rosterPage + 1) * ROSTER_PAGE_SIZE), [rosterPage, validRosterRows]);
  const rosterPageCount = Math.max(1, Math.ceil(validRosterRows.length / ROSTER_PAGE_SIZE));
  const selectedImportSummary = useMemo(() => summarizeSelectedImport(acceptedRowNumbers, preview), [acceptedRowNumbers, preview]);
  async function previewTeams() { const result = await action(`/api/spogomi/events/${eventId}/teams/auto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId: activeDivisionId }) }); const nextPreview = result ? parseTeamPreview(result) : null; if (result && !nextPreview) setError("La prévisualisation des équipes est invalide."); if (nextPreview) setTeamPreview(nextPreview); }
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
