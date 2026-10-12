"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

export function SpogomiCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", locationLabel: "", startsAt: "", endsAt: "", mode: "casual", casualTeamSize: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/spogomi/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, idempotencyKey, mode: form.mode, startsAt: new Date(form.startsAt).toISOString(), endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null, casualTeamSize: form.casualTeamSize ? Number(form.casualTeamSize) : null }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setError(body.error ?? "L'événement n'a pas pu être créé."); return; }
      router.push(`/spogomi/${body.eventId}`);
    } catch {
      setError("Erreur de connexion. La même intention sera réessayée avec la même clé.");
    } finally {
      setSaving(false);
    }
  }
  function startNewIntent() {
    setIdempotencyKey(crypto.randomUUID());
    setError(null);
  }
  return (
    <CmmCard tone="amber" variant="glass" className="space-y-5 p-6">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <label className="cmm-text-body">Nom de l’événement<input required maxLength={160} className="mt-2 w-full rounded-xl border border-black/15 bg-white/80 p-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="cmm-text-body">Lieu<input required maxLength={200} className="mt-2 w-full rounded-xl border border-black/15 bg-white/80 p-3" value={form.locationLabel} onChange={(e) => setForm({ ...form, locationLabel: e.target.value })} /></label>
        <label className="cmm-text-body">Début<input required type="datetime-local" className="mt-2 w-full rounded-xl border border-black/15 bg-white/80 p-3" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
        <label className="cmm-text-body">Fin (facultative)<input type="datetime-local" className="mt-2 w-full rounded-xl border border-black/15 bg-white/80 p-3" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
        <label className="cmm-text-body">Mode<select className="mt-2 w-full rounded-xl border border-black/15 bg-white/80 p-3" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option value="casual">Casual</option><option value="world_cup">World Cup (3 par équipe)</option></select></label>
        <label className="cmm-text-body">Taille d’équipe casual<input type="number" min={1} max={20} placeholder="Optionnelle" className="mt-2 w-full rounded-xl border border-black/15 bg-white/80 p-3" value={form.casualTeamSize} onChange={(e) => setForm({ ...form, casualTeamSize: e.target.value })} /></label>
        <div className="md:col-span-2 rounded-xl bg-amber-50 p-3 cmm-text-small">La structure juridique SPOGOMI France reste provisoire tant que le répertoire canonique ne la configure pas. Le brouillon sera lié à une seule action CleanMyMap.</div>
        {error ? <div className="md:col-span-2 space-y-2"><p role="alert" className="text-sm text-red-700">{error}</p><CmmButton type="button" tone="secondary" onClick={startNewIntent}>Commencer une nouvelle intention</CmmButton></div> : null}
        <CmmButton type="submit" tone="primary" loading={saving} disabled={saving} className="md:col-span-2">{saving ? "Création…" : "Créer le brouillon"}</CmmButton>
      </form>
    </CmmCard>
  );
}
