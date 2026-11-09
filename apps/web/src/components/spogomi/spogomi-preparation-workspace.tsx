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
import type { DivisionRegulationInput } from "@/lib/spogomi/division-regulation-service";

type DivisionScopedPreview<T> = { divisionId: string; value: T };
type DivisionScopedWorkspaceData = { eventId: string; divisionId: string | null; value: WorkspaceData };

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
  const [data, setData] = useState<DivisionScopedWorkspaceData | null>(null);
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DivisionScopedPreview<SpogomiRosterPreview> | null>(null);
  const [teamPreview, setTeamPreview] = useState<DivisionScopedPreview<SpogomiTeamCompositionPreview> | null>(null);
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [identityCodes, setIdentityCodes] = useState<Record<string, string>>({});
  const [acceptedRowNumbers, setAcceptedRowNumbers] = useState<number[]>([]);
  const [mappingSelection, setMappingSelection] = useState<Record<string, string>>({});
  const [sheetSelection, setSheetSelection] = useState("");
  const [headerRowSelection, setHeaderRowSelection] = useState<number | undefined>(undefined);
  const [rosterPage, setRosterPage] = useState(0);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const activeDivisionIdRef = useRef<string | null>(null);
  const requestSequence = useRef(0);
  const beginRequest = () => ({ id: ++requestSequence.current });
  const isCurrentRequest = (request: { id: number }) => request.id === requestSequence.current;
  const refresh = async (request: { id: number }) => {
    const divisionId = activeDivisionIdRef.current;
    const nextData = await fetchWorkspaceData(eventId, divisionId);
    if (isCurrentRequest(request)) setData({ eventId, divisionId, value: nextData });
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
    activeDivisionIdRef.current = activeDivisionId;
    const request = { id: ++requestSequence.current };
    void fetchWorkspaceData(eventId, activeDivisionId).then((nextData) => {
      if (!isCurrentRequest(request)) return;
      setData({ eventId, divisionId: activeDivisionId, value: nextData });
      if (!activeDivisionId && nextData.divisions[0]?.id) setActiveDivisionId(nextData.divisions[0].id);
    }).catch((reason) => {
      if (isCurrentRequest(request)) setError(reason instanceof Error ? reason.message : "Événement indisponible.");
    }).finally(() => {
      if (isCurrentRequest(request)) setBusy(false);
    });
    return () => {
      requestSequence.current += 1;
    };
  }, [eventId, activeDivisionId, loadAttempt]);
  const currentData = data?.eventId === eventId && data.divisionId === activeDivisionId ? data.value : null;
  const assignedCount = useMemo(() => countAssignedParticipants(currentData), [currentData]);
  const compositionEditable = currentData ? ["draft", "registration_open"].includes(currentData.event.state) : false;
  const compositionLocked = !compositionEditable;
  const activeRosterPreview = preview?.divisionId === activeDivisionId ? preview.value : null;
  const activeTeamPreview = teamPreview?.divisionId === activeDivisionId ? teamPreview.value : null;
  const teamPreviewError = useMemo(() => validateTeamPreview(currentData, activeDivisionId, activeTeamPreview), [activeDivisionId, activeTeamPreview, currentData]);
  async function action(url: string, init?: RequestInit, expectedDivisionId?: string | null): Promise<Record<string, unknown> | null> {
    if (!currentData || (expectedDivisionId !== undefined && expectedDivisionId !== activeDivisionIdRef.current)) return null;
    const request = beginRequest();
    setBusy(true);
    setError(null);
    setMessage(null);
    return runWorkspaceRequest(request, () => requestWorkspaceAction(activeDivisionIdRef.current, url, init), async (body) => {
      setMessage("Opération enregistrée.");
      await refresh(request);
      return isCurrentRequest(request) ? body : null;
    }, "Opération refusée.");
  }
  async function saveDivisionRegulation(input: DivisionRegulationInput): Promise<WorkspaceData | null> {
    if (!activeDivisionId || activeDivisionId !== activeDivisionIdRef.current) return null;
    const request = beginRequest();
    setBusy(true);
    setError(null);
    setMessage(null);
    return runWorkspaceRequest(request, () => requestWorkspaceAction(activeDivisionId, `/api/spogomi/events/${eventId}/divisions/${activeDivisionId}/regulation`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), async () => {
      setMessage("Opération enregistrée.");
      return refresh(request);
    }, "Opération refusée.");
  }
  async function issueIdentityCode(participantId: string) {
    if (!currentData?.participants.some((participant) => participant.id === participantId && participant.division_id === activeDivisionIdRef.current)) return;
    const body = await action(`/api/spogomi/events/${eventId}/participants/${participantId}/identity-code`, { method: "POST" });
    const code = body?.code;
    if (typeof code === "string") setIdentityCodes((current) => ({ ...current, [participantId]: code }));
  }
  async function previewRoster(file: File, options?: RosterPreviewOptions) {
    const divisionId = activeDivisionIdRef.current;
    if (!divisionId) return;
    const request = beginRequest();
    setRosterFile(file);
    setBusy(true);
    setError(null);
    await runWorkspaceRequest(request, () => requestRosterPreview(eventId, divisionId, file, options), (nextPreview) => {
      setPreview({ divisionId, value: nextPreview });
      setMappingSelection(nextPreview.mapping);
      setSheetSelection(nextPreview.sheetName ?? "");
      setHeaderRowSelection(nextPreview.headerRow || undefined);
      setRosterPage(0);
      setAcceptedRowNumbers(getValidRosterRows(nextPreview).map((row) => row.rowNumber));
    }, "Aperçu impossible.", () => setPreview(null));
  }
  async function confirmRoster() {
    const divisionId = activeDivisionIdRef.current;
    const scopedPreview = preview?.divisionId === divisionId ? preview.value : null;
    if (!divisionId || !scopedPreview || !rosterFile || !acceptedRowNumbers.length) {
      if (preview && preview.divisionId !== divisionId) setError("L’aperçu du roster doit être recréé pour cette division.");
      return;
    }
    const form = new FormData();
    form.set("file", rosterFile);
    form.set("mapping", JSON.stringify(mappingSelection));
    form.set("divisionId", divisionId);
    if (scopedPreview.sheetName) form.set("sheetName", scopedPreview.sheetName);
    if (scopedPreview.headerRow) form.set("headerRow", String(scopedPreview.headerRow));
    form.set("acceptedRowNumbers", JSON.stringify(acceptedRowNumbers));
    const result = await action(`/api/spogomi/events/${eventId}/imports/confirm`, { method: "POST", body: form });
    if (result) { setPreview(null); setRosterFile(null); setAcceptedRowNumbers([]); }
  }
  function toggleAcceptedRow(rowNumber: number) { setAcceptedRowNumbers((current) => current.includes(rowNumber) ? current.filter((value) => value !== rowNumber) : [...current, rowNumber].sort((a, b) => a - b)); }
  const validRosterRows = useMemo(() => getValidRosterRows(activeRosterPreview), [activeRosterPreview]);
  const visibleRosterRows = useMemo(() => validRosterRows.slice(rosterPage * ROSTER_PAGE_SIZE, (rosterPage + 1) * ROSTER_PAGE_SIZE), [rosterPage, validRosterRows]);
  const rosterPageCount = Math.max(1, Math.ceil(validRosterRows.length / ROSTER_PAGE_SIZE));
  const selectedImportSummary = useMemo(() => summarizeSelectedImport(acceptedRowNumbers, activeRosterPreview), [acceptedRowNumbers, activeRosterPreview]);
  async function previewTeams() {
    const divisionId = activeDivisionIdRef.current;
    if (!divisionId) return;
    const request = beginRequest();
    setBusy(true);
    setError(null);
    await runWorkspaceRequest(request, () => requestTeamPreview(eventId, divisionId), async (nextPreview) => {
      setMessage("Opération enregistrée.");
      await refresh(request);
      if (isCurrentRequest(request)) setTeamPreview({ divisionId, value: nextPreview });
    }, "Aperçu impossible.");
  }
  function movePreviewParticipant(participantId: string, teamNumber: number | null) { setTeamPreview((current) => { if (!current || current.divisionId !== activeDivisionIdRef.current) return current; const teams = current.value.formation.teams.map((team) => ({ ...team, participantIds: team.participantIds.filter((id) => id !== participantId) })); let unassignedParticipantIds = current.value.formation.unassignedParticipantIds.filter((id) => id !== participantId); if (teamNumber === null) unassignedParticipantIds = [...unassignedParticipantIds, participantId]; else { const target = teams.find((team) => team.teamNumber === teamNumber); if (!target) return current; target.participantIds = [...target.participantIds, participantId]; } const formation: SpogomiTeamFormation = { ...current.value.formation, teams, unassignedParticipantIds }; return { ...current, value: { ...current.value, formation } }; }); }
  async function confirmTeams() {
    const divisionId = activeDivisionIdRef.current;
    const scopedPreview = teamPreview?.divisionId === divisionId ? teamPreview.value : null;
    if (!divisionId || !scopedPreview || teamPreviewError) return;
    const result = await action(`/api/spogomi/events/${eventId}/teams/auto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true, divisionId, expectedRevision: scopedPreview.expectedRevision, proposalFingerprint: scopedPreview.proposalFingerprint, formation: scopedPreview.formation }) });
    if (result) setTeamPreview(null);
  }
  function changeDivision(nextDivisionId: string) {
    if (nextDivisionId === activeDivisionIdRef.current) return;
    activeDivisionIdRef.current = nextDivisionId;
    requestSequence.current += 1;
    setBusy(true);
    setData(null);
    setMessage(null);
    setError(null);
    setPreview(null);
    setTeamPreview(null);
    setRosterFile(null);
    setAcceptedRowNumbers([]);
    setMappingSelection({});
    setSheetSelection("");
    setHeaderRowSelection(undefined);
    setRosterPage(0);
    setIdentityCodes({});
    setEditingTeamId(null);
    setTeamNameDraft("");
    setActiveDivisionId(nextDivisionId);
  }
  function beginTeamNameEdit(team: WorkspaceData["teams"][number]) { setEditingTeamId(team.id); setTeamNameDraft(team.public_name); setError(null); setMessage(null); }
  function cancelTeamNameEdit() { setEditingTeamId(null); setTeamNameDraft(""); }
  async function saveTeamName(team: WorkspaceData["teams"][number]) {
    if (team.division_id !== activeDivisionIdRef.current) {
      setError("Cette équipe n’appartient plus à la division active.");
      return;
    }
    const result = await action(`/api/spogomi/events/${eventId}/teams/${team.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedPublicName: team.public_name, publicName: teamNameDraft, divisionId: team.division_id }) });
    if (result) cancelTeamNameEdit();
  }
  function retryWorkspaceLoad() {
    setBusy(true);
    setError(null);
    setLoadAttempt((attempt) => attempt + 1);
  }
  if (!currentData) return <main className="space-y-3 p-8"><p>{busy ? "Chargement de la division…" : "La division n’est pas disponible."}</p>{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}{!busy ? <button type="button" className="rounded-lg border border-black/10 bg-white px-4 py-2 font-bold" onClick={retryWorkspaceLoad}>Réessayer</button> : null}</main>;
  const activeDivision = currentData.divisions.find((division) => division.id === activeDivisionId) ?? currentData.divisions[0] ?? null;
  const divisionLabel = activeDivision ? (activeDivision.division_type === "world_cup" ? "World Cup" : "Casual") : spogomiModeLabel(currentData.event.mode);
  return <SpogomiPreparationWorkspaceView eventId={eventId} section={section} showHeader={showHeader} showAdminTeamJoinRequests={showAdminTeamJoinRequests} data={currentData} activeDivisionId={activeDivisionId} activeDivision={activeDivision} divisionLabel={divisionLabel} busy={busy} message={message} error={error} compositionEditable={compositionEditable} compositionLocked={compositionLocked} publicTeamNameTemplate={SPOGOMI_PUBLIC_TEAM_NAME_TEMPLATE} compositionArbitrationMessage={SPOGOMI_COMPOSITION_ARBITRATION_MESSAGE} compositionEligibilityWarning={SPOGOMI_COMPOSITION_ELIGIBILITY_WARNING} compositionRevision={() => buildSpogomiCompositionRevision(currentData)} teamEditorLabels={SPOGOMI_TEAM_EDITOR_LABELS} teamNameInput={SpogomiTeamNameInput} assignedCount={assignedCount} preview={activeRosterPreview} rosterFile={activeRosterPreview ? rosterFile : null} acceptedRowNumbers={acceptedRowNumbers} mappingSelection={mappingSelection} sheetSelection={sheetSelection} headerRowSelection={headerRowSelection} rosterPage={rosterPage} validRosterRows={validRosterRows} visibleRosterRows={visibleRosterRows} rosterPageCount={rosterPageCount} selectedImportSummary={selectedImportSummary} teamPreview={activeTeamPreview} teamPreviewError={teamPreviewError} identityCodes={identityCodes} editingTeamId={editingTeamId} teamNameDraft={teamNameDraft} action={action} saveDivisionRegulation={saveDivisionRegulation} onDivisionChange={changeDivision} clearTeamPreview={() => setTeamPreview(null)} setAcceptedRowNumbers={setAcceptedRowNumbers} setMappingSelection={setMappingSelection} setSheetSelection={setSheetSelection} setRosterPage={setRosterPage} previewRoster={previewRoster} confirmRoster={confirmRoster} toggleAcceptedRow={toggleAcceptedRow} previewTeams={previewTeams} movePreviewParticipant={movePreviewParticipant} confirmTeams={confirmTeams} beginTeamNameEdit={beginTeamNameEdit} cancelTeamNameEdit={cancelTeamNameEdit} saveTeamName={saveTeamName} issueIdentityCode={issueIdentityCode} setTeamNameDraft={setTeamNameDraft} />;
}
