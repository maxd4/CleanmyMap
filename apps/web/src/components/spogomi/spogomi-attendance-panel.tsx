"use client";

import { useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

type AttendanceRow = { id: string; divisionId: string; displayName: string | null; externalReference: string | null; place: number | null; team: { number: number; publicName: string } | null; attendanceStatus: "unknown" | "present" | "absent"; registrationStatus: string; updatedAt: string };

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
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Le pointage est indisponible.");
    setRows(body.participants ?? []); setTotal(body.total ?? 0);
  };
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (divisionId) params.set("divisionId", divisionId);
    if (search.trim()) params.set("q", search.trim());
    void fetch(`/api/spogomi/events/${eventId}/attendance?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Le pointage est indisponible.");
        if (active) { setRows(body.participants ?? []); setTotal(body.total ?? 0); setError(null); }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Le pointage est indisponible."); });
    return () => { active = false; };
  }, [eventId, divisionId, page, search]);
  async function setStatus(row: AttendanceRow, status: AttendanceRow["attendanceStatus"]) {
    setBusyId(row.id); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/attendance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId: row.divisionId, participantId: row.id, status, reason, provenance, expectedUpdatedAt: row.updatedAt }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "La décision de présence a été refusée.");
      setMessage("Présence enregistrée avec sa provenance."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "La décision de présence a été refusée."); }
    finally { setBusyId(null); }
  }
  return <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5">
    <div><h2 className="cmm-text-h3">Accueil et présences</h2><p className="cmm-text-small">Recherche privée par identité, référence, numéro de place ou équipe. Un participant n’a pas besoin de compte Clerk pour être pointé.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm font-bold">Recherche<input className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-normal" value={search} onChange={(event) => { setPage(0); setSearch(event.target.value); }} placeholder="Nom, référence, place ou équipe" /></label><label className="text-sm font-bold">Contexte<select className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-normal" value={provenance} onChange={(event) => setProvenance(event.target.value)}><option value="onsite_identity_check">Vérification sur place</option><option value="late_arrival">Arrivée tardive</option><option value="absence_report">Absence signalée</option><option value="unidentified_participant">Participant non identifié</option><option value="replacement_requested">Remplacement demandé</option><option value="incomplete_team">Équipe incomplète</option><option value="roster_divergence">Divergence roster</option><option value="controlled_correction">Correction contrôlée</option></select></label><label className="text-sm font-bold">Motif<input className="mt-1 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-normal" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></label></div>
    {message ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-xl border border-black/10 bg-white/80 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-black">{row.displayName ?? "Participant non identifié"}</p><p className="text-xs text-slate-600">Place {row.place ?? "—"} · {row.externalReference ?? "référence absente"} · {row.team ? `Équipe ${row.team.number} — ${row.team.publicName}` : "équipe non affectée"}</p><p className="mt-1 text-sm">Statut : <span className="font-bold">{row.attendanceStatus}</span>{row.registrationStatus !== "registered" ? ` · inscription ${row.registrationStatus}` : ""}</p></div><div className="flex flex-wrap gap-2"><CmmButton type="button" size="sm" tone={row.attendanceStatus === "present" ? "primary" : "secondary"} disabled={busyId === row.id} onClick={() => void setStatus(row, "present")}>Présent</CmmButton><CmmButton type="button" size="sm" tone={row.attendanceStatus === "absent" ? "critical" : "secondary"} disabled={busyId === row.id} onClick={() => void setStatus(row, "absent")}>Absent</CmmButton><CmmButton type="button" size="sm" tone={row.attendanceStatus === "unknown" ? "important" : "secondary"} disabled={busyId === row.id} onClick={() => void setStatus(row, "unknown")}>Non vérifiée</CmmButton></div></div></div>)}{!rows.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">Aucun participant dans cette page.</p> : null}</div>
    <div className="flex items-center justify-between gap-3 text-sm"><span>{total} participant(s)</span><div className="flex gap-2"><CmmButton type="button" size="sm" tone="secondary" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Page précédente</CmmButton><CmmButton type="button" size="sm" tone="secondary" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Page suivante</CmmButton></div></div>
  </CmmCard>;
}
