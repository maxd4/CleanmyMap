"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

type Team = { id: string; team_number: number; public_name: string };

export function SpogomiTeamAccessLinks({ eventId, teams }: { eventId: string; teams: Team[] }) {
  const [links, setLinks] = useState<Record<string, { url: string; expiresAt: string }>>({});
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function issue(teamId: string) {
    setBusyTeamId(teamId); setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/teams/${teamId}/access`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Le lien n’a pas pu être créé.");
      setLinks((current) => ({ ...current, [teamId]: { url: String(body.accessUrl), expiresAt: String(body.expiresAt) } }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Le lien n’a pas pu être créé."); }
    finally { setBusyTeamId(null); }
  }

  async function revoke(teamId: string) {
    setBusyTeamId(teamId); setError(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/teams/${teamId}/access`, { method: "DELETE" });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? "Le lien n’a pas pu être révoqué."); }
      setLinks((current) => { const next = { ...current }; delete next[teamId]; return next; });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Le lien n’a pas pu être révoqué."); }
    finally { setBusyTeamId(null); }
  }

  return <section className="space-y-3" aria-labelledby="spogomi-team-links-title"><div><h2 id="spogomi-team-links-title" className="cmm-text-h3">Liens de saisie par équipe</h2><p className="cmm-text-small">Chaque génération révoque le lien précédent. Le lien est limité à cette équipe, expire automatiquement et ne donne aucun accès aux autres équipes.</p></div>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<div className="grid gap-3 md:grid-cols-2">{teams.map((team) => { const link = links[team.id]; return <div key={team.id} className="rounded-xl border border-black/10 bg-white/70 p-3"><div className="flex items-center justify-between gap-3"><p className="font-bold text-slate-900">Équipe {team.team_number} · {team.public_name}</p><CmmButton type="button" tone="secondary" disabled={busyTeamId === team.id} onClick={() => void issue(team.id)}>{link ? "Regénérer" : "Générer"}</CmmButton></div>{link ? <div className="mt-3 space-y-2"><textarea readOnly value={link.url} rows={2} className="w-full rounded-lg border border-black/10 bg-white p-2 text-xs" aria-label={`Lien de saisie de ${team.public_name}`} /><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Expire le {new Date(link.expiresAt).toLocaleString("fr-FR")}</p><div className="flex flex-wrap gap-2"><CmmButton href={link.url} prefetch={false} tone="primary" size="sm">Ouvrir la saisie équipe</CmmButton><CmmButton type="button" tone="critical" disabled={busyTeamId === team.id} onClick={() => void revoke(team.id)}>Révoquer</CmmButton></div></div></div> : null}</div>; })}</div></section>;
}
