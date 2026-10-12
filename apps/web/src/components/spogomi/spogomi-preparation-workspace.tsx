"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { PageHeader } from "@/components/ui/page-header";
import type { SpogomiRosterPreview } from "@/lib/spogomi/types";
import { SpogomiTeamAccessLinks } from "./spogomi-team-access-links";
import { SpogomiResultReviewPanel } from "./spogomi-result-review-panel";
import { SpogomiReviewerManagement } from "./spogomi-reviewer-management";

const OfficialRouteMap = dynamic(() => import("./spogomi-official-route-map").then((module) => module.SpogomiOfficialRouteMap), { ssr: false });

type WorkspaceData = { event: { id: string; event_slug: string | null; public_visibility: "private" | "published"; name: string; location_label: string; mode: string; state: string; starts_at: string; ends_at: string | null }; participants: Array<{ id: string; display_name: string | null; group_preference: string | null; team_id: string | null }>; teams: Array<{ id: string; team_number: number; public_name: string; composition_state: string }>; route: { file_name: string; reference_distance_km: number; geometry_geojson: { coordinates: [number, number][] } } | null };

export function SpogomiPreparationWorkspace({ eventId }: { eventId: string }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [preview, setPreview] = useState<SpogomiRosterPreview | null>(null);
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = async () => { const response = await fetch(`/api/spogomi/events/${eventId}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Événement indisponible."); setData(body); };
  useEffect(() => {
    let active = true;
    void fetch(`/api/spogomi/events/${eventId}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Événement indisponible.");
        if (active) setData(body);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Événement indisponible."); });
    return () => { active = false; };
  }, [eventId]);
  const assignedCount = useMemo(() => data?.participants.filter((participant) => participant.team_id).length ?? 0, [data]);
  async function action(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> { setBusy(true); setError(null); setMessage(null); try { const response = await fetch(url, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? "Opération refusée."); setMessage("Opération enregistrée."); await refresh(); return body as Record<string, unknown>; } catch (reason) { setError(reason instanceof Error ? reason.message : "Opération refusée."); return null; } finally { setBusy(false); } }
  async function previewRoster(file: File) { const form = new FormData(); form.set("file", file); setRosterFile(file); setBusy(true); setError(null); try { const response = await fetch(`/api/spogomi/events/${eventId}/imports/preview`, { method: "POST", body: form }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Aperçu impossible."); setPreview(body as SpogomiRosterPreview); } catch (reason) { setPreview(null); setError(reason instanceof Error ? reason.message : "Aperçu impossible."); } finally { setBusy(false); } }
  async function confirmRoster() { if (!preview || !rosterFile) return; const form = new FormData(); form.set("file", rosterFile); form.set("mapping", JSON.stringify(preview.mapping)); const result = await action(`/api/spogomi/events/${eventId}/imports/confirm`, { method: "POST", body: form }); if (result) { setPreview(null); setRosterFile(null); } }
  if (!data) return <main className="p-8">Chargement de l’événement…</main>;
  return <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 px-4 py-10"><div className="cmm-page-width space-y-6"><PageHeader tone="stone" title={data.event.name} subtitle={`${data.event.location_label} · ${data.event.mode === "world_cup" ? "World Cup — 3 par équipe" : "Casual"} · ${data.event.public_visibility === "published" ? "publication publique" : "brouillon privé"}`} />
    <CmmCard tone="slate" variant="glass" className="space-y-3 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-slate-900">Publication publique</h2><p className="text-sm text-slate-600">URL stable : {data.event.event_slug ? `/spogomi/${data.event.event_slug}` : "en attente"}. La publication n’expose jamais le roster.</p></div><CmmButton type="button" tone={data.event.public_visibility === "published" ? "secondary" : "primary"} disabled={busy || !data.event.event_slug} onClick={() => void action(`/api/spogomi/events/${eventId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicVisibility: data.event.public_visibility === "published" ? "private" : "published" }) })}>{data.event.public_visibility === "published" ? "Rendre privé" : "Publier l’événement"}</CmmButton></div></CmmCard>
    {message ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <div className="grid gap-6 lg:grid-cols-2">
      <CmmCard tone="amber" variant="glass" className="space-y-4 p-5"><h2 className="cmm-text-h3">Roster privé</h2><p className="cmm-text-small">CSV ou XLSX, sans création de compte Clerk ni inscription CleanMyMap. Le fichier brut n’est pas conservé par défaut. La confirmation reparcourt le fichier original côté serveur.</p><input type="file" accept=".csv,.xlsx" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void previewRoster(file); }} />{preview ? <div className="space-y-3 rounded-xl bg-white/75 p-4"><p className="cmm-text-small">{preview.rows.length} lignes valides · {preview.unknownHeaders.length} colonnes inconnues · {preview.errors.length} erreurs</p><div className="max-h-44 overflow-auto text-sm">{preview.rows.slice(0, 8).map((row) => <p key={row.rowNumber}>{row.rowNumber} — {row.name}{row.groupPreference ? ` · ${row.groupPreference}` : ""}</p>)}</div><CmmButton type="button" tone="primary" disabled={busy || preview.errors.length > 0 || !rosterFile} onClick={() => void confirmRoster()}>Confirmer l’import</CmmButton></div> : null}</CmmCard>
      <CmmCard tone="amber" variant="glass" className="space-y-4 p-5"><h2 className="cmm-text-h3">Parcours officiel</h2><p className="cmm-text-small">La distance affichée est calculée depuis le fichier de référence. Elle n’est pas une distance observée sur le terrain.</p><input type="file" accept=".gpx,application/gpx+xml" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) { const form = new FormData(); form.set("file", file); void action(`/api/spogomi/events/${eventId}/route-gpx`, { method: "POST", body: form }); } }} />{data.route ? <><p className="cmm-text-small">{data.route.file_name} · {data.route.reference_distance_km} km de référence</p><OfficialRouteMap coordinates={data.route.geometry_geojson.coordinates} /></> : <p className="cmm-text-small">Aucun GPX officiel associé.</p>}</CmmCard>
    </div>
    <CmmCard tone="amber" variant="glass" className="space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="cmm-text-h3">Composition des équipes</h2><p className="cmm-text-small">{assignedCount}/{data.participants.length} participants affectés. Les échanges manuels restent possibles avant verrouillage.</p></div><div className="flex gap-2"><CmmButton type="button" tone="important" disabled={busy} onClick={() => void action(`/api/spogomi/events/${eventId}/teams/auto`, { method: "POST" })}>Former automatiquement</CmmButton><CmmButton type="button" tone="critical" disabled={busy} onClick={() => void action(`/api/spogomi/events/${eventId}/teams/lock`, { method: "POST" })}>Verrouiller</CmmButton></div></div><div className="grid gap-3 md:grid-cols-2">{data.participants.map((participant) => <label key={participant.id} className="rounded-xl border border-black/10 bg-white/70 p-3 text-sm">{participant.display_name ?? "Participant sans nom"}{participant.group_preference ? <span className="ml-2 text-slate-500">({participant.group_preference})</span> : null}<select className="mt-2 w-full rounded-lg border border-black/10 bg-white p-2" value={participant.team_id ?? ""} disabled={busy || data.event.state === "composition_locked"} onChange={(event) => void action(`/api/spogomi/events/${eventId}/teams/move`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ participantId: participant.id, teamId: event.target.value || null }) })}><option value="">À affecter</option>{data.teams.map((team) => <option key={team.id} value={team.id}>{team.public_name}</option>)}</select></label>)}</div></CmmCard>
    <CmmCard tone="amber" variant="glass" className="space-y-4 p-5"><SpogomiTeamAccessLinks eventId={eventId} teams={data.teams} /></CmmCard>
    <CmmCard tone="slate" variant="glass" className="space-y-4 p-5"><SpogomiReviewerManagement eventId={eventId} /></CmmCard>
    <CmmCard tone="emerald" variant="glass" className="space-y-4 p-5"><SpogomiResultReviewPanel eventId={eventId} /></CmmCard>
  </div></main>;
}
