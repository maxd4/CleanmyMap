"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  countAssignedParticipants,
  getValidRosterRows,
  summarizeSelectedImport,
  validateTeamPreview,
} from "./spogomi-preparation-workspace.model";
import { fetchWorkspaceData, requestRosterPreview, requestTeamPreview, requestWorkspaceAction, type RosterPreviewOptions } from "./spogomi-preparation-workspace.network";

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
  const requestSequence = useRef(0);
  const beginRequest = () => ({ id: ++requestSequence.current });
  const isCurrentRequest = (request: { id: number }) => request.id === requestSequence.current;
  const refresh = async (request: { id: number }) => {
    const nextData = await fetchWorkspaceData(eventId, activeDivisionId);
    if (isCurrentRequest(request)) setData(nextData);
    return isCurrentRequest(request) ? nextData : null;
  };
  async function runWorkspaceRequest<T, R>(request: { id: number }, operation: () => Promise<T>, onSuccess: (value: T) => Promise<R> | R, fallback: string, onFailure?: () => void): Promise<R | null> {
    try {
      const value = await operation();
      if (!isCurrentRequest(request)) return null;
      return await onSuccess(value);
    } catch (reason) {
      if (isCurrentRequest(request)) {
        onFailure?.();
        setError(reason instanceof Error ? reason.message : fallback);
      }
      return null;
    } finally {
      if (isCurrentRequest(request)) setBusy(false);
    }
  }
  useEffect(() => {
    const request = { id: ++requestSequence.current };
    void fetchWorkspaceData(eventId, activeDivisionId).then((nextData) => {
      if (!isCurrentRequest(request)) return;
      setData(nextData);
      if (!activeDivisionId && nextData.divisions[0]?.id) setActiveDivisionId(nextData.divisions[0].id);
    }).catch((reason) => {
      if (isCurrentRequest(request)) setError(reason instanceof Error ? reason.message : "Événement indisponible.");
    });
    return () => { requestSequence.current += 1; };
  }, [eventId, activeDivisionId]);
  const assignedCount = useMemo(() => countAssignedParticipants(data), [data]);
  const compositionEditable = data ? ["draft", "registration_open"].includes(data.event.state) : false;
  const compositionLocked = !compositionEditable;
  const teamPreviewError = useMemo(() => validateTeamPreview(data, activeDivisionId, teamPreview), [activeDivisionId, data, teamPreview]);
  async function action(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
    const request = beginRequest();
    setBusy(true);
    setError(null);
    setMessage(null);
    return runWorkspaceRequest(request, () => requestWorkspaceAction(activeDivisionId, url, init), async (body) => {
      setMessage("Opération enregistrée.");
      await refresh(request);
      return isCurrentRequest(request) ? body : null;
    }, "Opération refusée.");
  }
  async function issueIdentityCode(participantId: string) { const body = await action(`/api/spogomi/events/${eventId}/participants/${participantId}/identity-code`, { method: "POST" }); const code = body?.code; if (typeof code === "string") setIdentityCodes((current) => ({ ...current, [participantId]: code })); }
  async function previewRoster(file: File, options?: RosterPreviewOptions) {
    const request = beginRequest();
    setRosterFile(file);
    setBusy(true);
    setError(null);
    await runWorkspaceRequest(request, () => requestRosterPreview(eventId, activeDivisionId, file, options), (nextPreview) => {
      setPreview(nextPreview);
      setMappingSelection(nextPreview.mapping);
      setSheetSelection(nextPreview.sheetName ?? "");
      setHeaderRowSelection(nextPreview.headerRow || undefined);
      setRosterPage(0);
      setAcceptedRowNumbers(getValidRosterRows(nextPreview).map((row) => row.rowNumber));
    }, "Aperçu impossible.", () => setPreview(null));
  }
  async function confirmRoster() { if (!preview || !rosterFile || !acceptedRowNumbers.length) return; const form = new FormData(); form.set("file", rosterFile); form.set("mapping", JSON.stringify(mappingSelection)); if (activeDivisionId) form.set("divisionId", activeDivisionId); if (preview.sheetName) form.set("sheetName", preview.sheetName); if (preview.headerRow) form.set("headerRow", String(preview.headerRow)); form.set("acceptedRowNumbers", JSON.stringify(acceptedRowNumbers)); const result = await action(`/api/spogomi/events/${eventId}/imports/confirm`, { method: "POST", body: form }); if (result) { setPreview(null); setRosterFile(null); setAcceptedRowNumbers([]); } }
  function toggleAcceptedRow(rowNumber: number) { setAcceptedRowNumbers((current) => current.includes(rowNumber) ? current.filter((value) => value !== rowNumber) : [...current, rowNumber].sort((a, b) => a - b)); }
  const validRosterRows = useMemo(() => getValidRosterRows(preview), [preview]);
  const visibleRosterRows = useMemo(() => validRosterRows.slice(rosterPage * ROSTER_PAGE_SIZE, (rosterPage + 1) * ROSTER_PAGE_SIZE), [rosterPage, validRosterRows]);
  const rosterPageCount = Math.max(1, Math.ceil(validRosterRows.length / ROSTER_PAGE_SIZE));
  const selectedImportSummary = useMemo(() => summarizeSelectedImport(acceptedRowNumbers, preview), [acceptedRowNumbers, preview]);
  async function previewTeams() {
    const request = beginRequest();
    setBusy(true);
    setError(null);
    await runWorkspaceRequest(request, () => requestTeamPreview(eventId, activeDivisionId), async (nextPreview) => {
      setMessage("Opération enregistrée.");
      await refresh(request);
      if (isCurrentRequest(request)) setTeamPreview(nextPreview);
    }, "Aperçu impossible.");
  }
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
