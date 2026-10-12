"use client";

import { useCallback, useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { SpogomiConsolidationProjection, SpogomiEnvironmentalMapping } from "@/lib/spogomi/consolidation";

type SpogomiConsolidationPreview = {
  event: { id: string; action_id: string; name: string; location_label: string; starts_at: string; ends_at: string | null; state: string; environmental_mapping_version: string };
  mappings: SpogomiEnvironmentalMapping[];
  currentProjection: { id: string; projectionRevision: number; sourceHash: string; status: string } | null;
  projection: SpogomiConsolidationProjection;
};

function grams(value: number | null): string {
  return value === null ? "non renseigné" : `${value.toLocaleString("fr-FR")} g`;
}

async function fetchSpogomiConsolidationPreview(eventId: string): Promise<SpogomiConsolidationPreview> {
  const response = await fetch(`/api/spogomi/events/${eventId}/consolidation`, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Aperçu du bilan impossible.");
  return body as SpogomiConsolidationPreview;
}

export function SpogomiConsolidationPanel({ eventId }: { eventId: string }) {
  const [preview, setPreview] = useState<SpogomiConsolidationPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setPreview(await fetchSpogomiConsolidationPreview(eventId));
  }, [eventId]);

  useEffect(() => {
    let active = true;
    void fetchSpogomiConsolidationPreview(eventId)
      .then((body) => { if (active) setPreview(body); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Aperçu du bilan impossible."); });
    return () => { active = false; };
  }, [eventId]);

  async function publish() {
    if (!preview || !preview.projection.readyForPublication) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${eventId}/consolidation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", sourceHash: preview.projection.sourceHash }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Publication du bilan refusée.");
      setMessage("Bilan consolidé publié dans l’action CleanMyMap cible.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Publication du bilan refusée.");
    } finally {
      setBusy(false);
    }
  }

  if (!preview && !error) return <p className="cmm-text-small">Chargement de l’aperçu du bilan…</p>;
  if (!preview) return <p role="alert" className="cmm-text-small text-red-800">{error}</p>;
  const projection = preview.projection;
  return <div className="space-y-4" data-testid="spogomi-consolidation-panel">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="cmm-text-h3">Bilan environnemental consolidé</h2>
        <p className="cmm-text-small">Une seule action CleanMyMap · cible {projection.actionId} · version {projection.projectionVersion}</p>
      </div>
      <div className="flex gap-2">
        <CmmButton type="button" tone="secondary" disabled={busy} onClick={() => void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Aperçu du bilan impossible."))}>Actualiser</CmmButton>
        <CmmButton type="button" tone="primary" disabled={busy || !projection.readyForPublication} onClick={() => void publish()}>Publier le bilan</CmmButton>
      </div>
    </div>
    {message ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p> : null}
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-white/75 p-3"><p className="cmm-text-small">Équipes certifiées</p><p className="text-xl font-black text-slate-950">{projection.teamsIncluded}</p></div>
      <div className="rounded-xl bg-white/75 p-3"><p className="cmm-text-small">Présents vérifiés</p><p className="text-xl font-black text-slate-950">{projection.participantsPresent}</p></div>
      <div className="rounded-xl bg-white/75 p-3"><p className="cmm-text-small">Déchets hors mégots</p><p className="text-xl font-black text-slate-950">{grams(projection.totalWasteMassGrams)}</p></div>
      <div className="rounded-xl bg-white/75 p-3"><p className="cmm-text-small">Mégots</p><p className="text-xl font-black text-slate-950">{grams(projection.cigaretteButtsMassGrams)} · {projection.cigaretteButtsCount ?? "non comptés"} objets</p></div>
    </div>
    <p className={projection.readyForPublication ? "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900" : "rounded-xl bg-amber-50 p-3 text-sm text-amber-950"}>
      {projection.readyForPublication ? "Toutes les mesures certifiées disposent d’une correspondance exploitable." : "Publication bloquée : le bilan doit être complet et chaque mesure doit être explicitement correspondue."}
    </p>
    {projection.organizer ? <p className="cmm-text-small">Organisateur canonique : {projection.organizer.name} ({projection.organizer.organizerType}).</p> : <p className="cmm-text-small">Organisateur SPOGOMI France non résolu dans le registre courant : aucune identité n’est inventée.</p>}
    {projection.officialRoute ? <p className="cmm-text-small">GPX de référence : {projection.officialRoute.fileName} · {projection.officialRoute.referenceDistanceKm} km · non observé sur le terrain.</p> : <p className="cmm-text-small">Aucun GPX officiel de référence associé.</p>}
    {projection.categoriesWithoutMapping.length > 0 ? <div><h3 className="font-black text-slate-950">Catégories sans correspondance</h3><p className="cmm-text-small">{projection.categoriesWithoutMapping.join(", ")}</p></div> : null}
    {projection.excludedMeasures.length > 0 ? <div><h3 className="font-black text-slate-950">Mesures exclues</h3><ul className="list-disc space-y-1 pl-5 text-sm text-slate-900">{projection.excludedMeasures.map((measure, index) => <li key={`${measure.teamId}-${measure.categoryCode}-${measure.reason}-${index}`}>{measure.teamId} · {measure.categoryCode} · {measure.reason}</li>)}</ul></div> : null}
    {preview.currentProjection ? <p className="cmm-text-small">Projection courante : révision {preview.currentProjection.projectionRevision}, statut {preview.currentProjection.status}. Une correction remplacera cette projection.</p> : null}
  </div>;
}
