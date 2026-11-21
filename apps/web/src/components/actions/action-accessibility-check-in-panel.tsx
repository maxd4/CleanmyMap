"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ActionAccessibilitySupportRequest, ActionAccessibilityNeed } from "@/lib/actions/accessibility-support-contract";

const NEED_LABELS: Record<ActionAccessibilityNeed, string> = {
  step_free_route: "Parcours sans marche",
  shorter_route: "Parcours plus court",
  rest_breaks: "Pauses",
  adapted_equipment: "Matériel adapté",
  simplified_information: "Informations simplifiées",
  written_instructions: "Consignes écrites",
  oral_instructions: "Consignes orales",
  human_support: "Accompagnement humain",
  personal_companion: "Accompagnant personnel",
};

type OrganizerRequests = { audience: "organizer"; requests: ActionAccessibilitySupportRequest[] };
type CheckInField = "arrival_status" | "contact_status" | "departure_status";

async function fetchOrganizerRequests(url: string): Promise<OrganizerRequests> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json() as OrganizerRequests | { error?: string };
  if (!response.ok || !("requests" in payload) || payload.audience !== "organizer") {
    throw new Error("Suivi indisponible.");
  }
  return payload;
}

export function ActionAccessibilityCheckInPanel({ actionId }: { actionId: string }) {
  const endpoint = `/api/actions/${encodeURIComponent(actionId)}/accessibility-support`;
  const { data, error, isLoading, mutate } = useSWR(endpoint, fetchOrganizerRequests);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const requests = data?.requests ?? [];

  async function updateCheckIn(requestId: string, field: CheckInField, status: "completed" | "not_applicable") {
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/accessibility-support`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, field, status }),
      });
      if (!response.ok) throw new Error("update failed");
      setMutationError(null);
      await mutate();
    } catch {
      setMutationError("Le suivi n’a pas été enregistré. Vérifiez le consentement et réessayez.");
    }
  }

  return <section aria-label="Accueil et accessibilité" className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
    <h3 className="text-lg font-black text-violet-950">Accueil et accessibilité</h3>
    <p className="mt-1 text-sm text-violet-900">Demandes fonctionnelles privées des personnes inscrites. Aucun diagnostic ni géolocalisation; le suivi est manuel et limité aux personnes ayant consenti.</p>
    {isLoading ? <p role="status" className="mt-3 text-sm">Chargement…</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">Suivi indisponible.</p> : null}
    {mutationError ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">{mutationError}</p> : null}
    {!isLoading && !error && requests.length === 0 ? <p className="mt-3 text-sm text-violet-900">Aucune demande à afficher.</p> : null}
    <ul className="mt-3 space-y-3">{requests.map((request) => <li key={request.id} className="rounded-xl border border-white bg-white p-3">
      <p className="text-sm font-semibold">{request.requested_needs.map((need) => NEED_LABELS[need]).join(" · ")}</p>
      {request.day_tracking_consent ? <div className="mt-3 grid gap-2 sm:grid-cols-3">{([
        ["arrival_status", "Arrivée"], ["contact_status", "Point pendant l’action"], ["departure_status", "Fin de l’action"],
      ] as const).map(([field, label]) => <label key={field} className="text-xs font-semibold">{label}<select value={request[field] ?? ""} onChange={(event) => { if (event.target.value === "completed" || event.target.value === "not_applicable") void updateCheckIn(request.id, field, event.target.value); }} className="mt-1 min-h-10 w-full rounded-lg border border-violet-200 bg-white px-2 text-sm"><option value="">Non renseigné</option><option value="completed">Effectué</option><option value="not_applicable">Non applicable</option></select></label>)}</div> : <p className="mt-2 text-xs text-slate-600">La personne n’a pas consenti au suivi Jour J.</p>}
    </li>)}</ul>
    <p className="mt-3 text-xs text-violet-800">Ces mentions documentent un accueil proposé; elles ne certifient pas l’accessibilité et ne valent pas preuve de présence.</p>
  </section>;
}
