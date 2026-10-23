"use client";

import { useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

type AttendanceRow = { id: string; divisionId: string; displayName: string | null; externalReference: string | null; place: number | null; team: { number: number; publicName: string } | null; attendanceStatus: "unknown" | "present" | "absent"; registrationStatus: string; updatedAt: string };

type AttendanceResponse = { participants: AttendanceRow[]; total: number; error?: string };
type AttendanceMutationResponse = { changed: boolean; eventId: string; divisionId: string; participantId: string; previousStatus: AttendanceRow["attendanceStatus"]; attendanceStatus: AttendanceRow["attendanceStatus"]; updatedAt: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseAttendanceTeam(value: unknown): AttendanceRow["team"] | undefined {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || typeof value.number !== "number" || typeof value.publicName !== "string") return undefined;
  return { number: value.number, publicName: value.publicName };
}

function parseAttendanceRow(value: unknown): AttendanceRow | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.divisionId !== "string" || typeof value.registrationStatus !== "string" || typeof value.updatedAt !== "string" || !["unknown", "present", "absent"].includes(String(value.attendanceStatus))) return null;
  const team = parseAttendanceTeam(value.team);
  if (team === undefined) return null;
  if (value.displayName !== null && value.displayName !== undefined && typeof value.displayName !== "string") return null;
  if (value.externalReference !== null && value.externalReference !== undefined && typeof value.externalReference !== "string") return null;
  if (value.place !== null && value.place !== undefined && typeof value.place !== "number") return null;
  return {
    id: value.id,
    divisionId: value.divisionId,
    displayName: value.displayName === undefined ? null : value.displayName,
    externalReference: value.externalReference === undefined ? null : value.externalReference,
    place: value.place === undefined ? null : value.place,
    team,
    attendanceStatus: value.attendanceStatus as AttendanceRow["attendanceStatus"],
    registrationStatus: value.registrationStatus,
    updatedAt: value.updatedAt,
  };
}

async function readAttendanceResponse(response: Response): Promise<AttendanceResponse> {
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new Error("Le pointage a renvoyé une réponse illisible.");
  }
  if (!isRecord(raw)) throw new Error("Le pointage a renvoyé une réponse invalide.");
  if (!response.ok) throw new Error(typeof raw.error === "string" ? raw.error : "Le pointage est indisponible.");
  if (!Array.isArray(raw.participants) || typeof raw.total !== "number") throw new Error("Le pointage a renvoyé des données incomplètes.");
  const participants = raw.participants.map(parseAttendanceRow);
  if (participants.some((row) => row === null)) throw new Error("Le pointage a renvoyé un participant invalide.");
  return { participants: participants as AttendanceRow[], total: raw.total };
}

async function readAttendanceMutationResponse(response: Response): Promise<AttendanceMutationResponse> {
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new Error("La confirmation du pointage a renvoyé une réponse illisible.");
  }
  if (!isRecord(raw)) throw new Error("La confirmation du pointage a renvoyé une réponse invalide.");
  if (!response.ok) throw new Error(typeof raw.error === "string" ? raw.error : "La décision de présence a été refusée.");
  const attendance = raw.attendance;
  if (!isRecord(attendance) || typeof attendance.changed !== "boolean" || typeof attendance.eventId !== "string" || typeof attendance.divisionId !== "string" || typeof attendance.participantId !== "string" || !["unknown", "present", "absent"].includes(String(attendance.previousStatus)) || !["unknown", "present", "absent"].includes(String(attendance.attendanceStatus)) || typeof attendance.updatedAt !== "string") {
    throw new Error("La confirmation du pointage a renvoyé des données incomplètes.");
  }
  return {
    changed: attendance.changed,
    eventId: attendance.eventId,
    divisionId: attendance.divisionId,
    participantId: attendance.participantId,
    previousStatus: attendance.previousStatus as AttendanceMutationResponse["previousStatus"],
    attendanceStatus: attendance.attendanceStatus as AttendanceMutationResponse["attendanceStatus"],
    updatedAt: attendance.updatedAt,
  };
}

export function SpogomiAttendancePanel({ eventId, divisionId }: { eventId: string; divisionId?: string | null }) {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [reason, setReason] = useState("Constat d’accueil");
  const [provenance, setProvenance] = useState("onsite_identity_check");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pageSize = 25;
  const load = async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (divisionId) params.set("divisionId", divisionId);
    if (search.trim()) params.set("q", search.trim());
    const response = await fetch(`/api/spogomi/events/${eventId}/attendance?${params.toString()}`, { cache: "no-store" });
    const body = await readAttendanceResponse(response);
    setRows(body.participants); setTotal(body.total);
  };
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (divisionId) params.set("divisionId", divisionId);
    if (search.trim()) params.set("q", search.trim());
    void fetch(`/api/spogomi/events/${eventId}/attendance?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await readAttendanceResponse(response);
        if (active) { setRows(body.participants); setTotal(body.total); setError(null); }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Le pointage est indisponible."); });
    return () => { active = false; };
  }, [eventId, divisionId, page, search]);
  async function setStatus(row: AttendanceRow, status: AttendanceRow["attendanceStatus"]) {
    setBusyId(row.id); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/attendance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId: row.divisionId, participantId: row.id, status, reason, provenance, expectedUpdatedAt: row.updatedAt }) });
      const mutation = await readAttendanceMutationResponse(response);
      if (mutation.eventId !== eventId || mutation.divisionId !== row.divisionId || mutation.participantId !== row.id || mutation.attendanceStatus !== status) {
        throw new Error("La confirmation du pointage ne correspond pas à la décision demandée.");
      }
      setMessage(mutation.changed ? "Présence enregistrée avec sa provenance." : "Statut déjà à jour. Aucune nouvelle modification enregistrée.");
      try {
        await load();
      } catch {
        setError(mutation.changed ? "Présence enregistrée, mais l’affichage n’a pas pu être actualisé." : "Statut déjà à jour, mais l’affichage n’a pas pu être actualisé.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "La décision de présence a été refusée."); }
    finally { setBusyId(null); }
  }
  function runStatus(row: AttendanceRow, status: AttendanceRow["attendanceStatus"]): void {
    void setStatus(row, status).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "La décision de présence a été refusée."));
  }
  return <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
    <div><h2 className="cmm-text-h3">Accueil et présences</h2><p className="cmm-text-small">Recherche privée par identité, référence, numéro de place ou équipe. Un participant n’a pas besoin de compte Clerk pour être pointé.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-bold">Recherche<input className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-normal" value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} placeholder="Nom, référence, place ou équipe" /></label><label className="text-sm font-bold">Contexte<select className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-normal" value={provenance} onChange={(event) => setProvenance(event.target.value)}><option value="onsite_identity_check">Vérification sur place</option><option value="late_arrival">Arrivée tardive</option><option value="absence_report">Absence signalée</option><option value="unidentified_participant">Participant non identifié</option><option value="replacement_requested">Remplacement demandé</option><option value="incomplete_team">Équipe incomplète</option><option value="roster_divergence">Divergence roster</option><option value="controlled_correction">Correction contrôlée</option></select></label><label className="text-sm font-bold">Motif<input className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-normal" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></label></div>
    {message ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-xl border border-black/10 bg-white/80 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-black">{row.displayName ?? "Participant non identifié"}</p><p className="text-xs text-slate-600">Place {row.place ?? "—"} · {row.externalReference ?? "référence absente"} · {row.team ? `Équipe ${row.team.number} — ${row.team.publicName}` : "équipe non affectée"}</p><p className="mt-1 text-sm">Statut : <span className="font-bold">{row.attendanceStatus}</span>{row.registrationStatus !== "registered" ? ` · inscription ${row.registrationStatus}` : ""}</p></div><div className="flex flex-wrap gap-2"><CmmButton type="button" size="sm" tone={row.attendanceStatus === "present" ? "primary" : "secondary"} disabled={busyId === row.id} onClick={() => runStatus(row, "present")}>Présent</CmmButton><CmmButton type="button" size="sm" tone={row.attendanceStatus === "absent" ? "critical" : "secondary"} disabled={busyId === row.id} onClick={() => runStatus(row, "absent")}>Absent</CmmButton><CmmButton type="button" size="sm" tone={row.attendanceStatus === "unknown" ? "important" : "secondary"} disabled={busyId === row.id} onClick={() => runStatus(row, "unknown")}>Non vérifiée</CmmButton></div></div></div>)}{!rows.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">Aucun participant dans cette page.</p> : null}</div>
    <div className="flex items-center justify-between gap-3 text-sm"><span>{total} participant(s)</span><div className="flex gap-2"><CmmButton type="button" size="sm" tone="secondary" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Page précédente</CmmButton><CmmButton type="button" size="sm" tone="secondary" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Page suivante</CmmButton></div></div>
  </CmmCard>;
}
