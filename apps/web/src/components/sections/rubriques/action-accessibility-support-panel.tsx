"use client";

import useSWR from "swr";
import { useState } from "react";
import {
  ACTION_ACCESSIBILITY_NEEDS,
  type ActionAccessibilityNeed,
  type ActionAccessibilitySupportRequest,
} from "@/lib/actions/accessibility-support-contract";

const NEED_LABELS: Record<ActionAccessibilityNeed, { fr: string; en: string }> = {
  step_free_route: { fr: "Itinéraire sans marches", en: "Step-free route" },
  shorter_route: { fr: "Parcours plus court", en: "Shorter route" },
  rest_breaks: { fr: "Points de pause", en: "Rest breaks" },
  adapted_equipment: { fr: "Matériel adapté", en: "Adapted equipment" },
  simplified_information: { fr: "Informations simplifiées", en: "Simplified information" },
  written_instructions: { fr: "Consignes écrites", en: "Written instructions" },
  oral_instructions: { fr: "Consignes orales", en: "Spoken instructions" },
  human_support: { fr: "Aide humaine", en: "Human support" },
  personal_companion: { fr: "Venir avec mon accompagnant personnel", en: "Attend with my personal companion" },
};

type SupportResponse = {
  status: "ok";
  audience: "participant";
  request: ActionAccessibilitySupportRequest | null;
};

async function fetchSupportRequest(url: string): Promise<SupportResponse> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("La demande privée est momentanément indisponible.");
  return await response.json() as SupportResponse;
}

function useSupportMutation(actionId: string, mutate: () => Promise<unknown>) {
  return async (method: "PUT" | "DELETE", body?: unknown) => {
    const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/accessibility-support`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(method === "DELETE" ? "L’annulation n’a pas abouti." : "L’enregistrement n’a pas abouti.");
    await mutate();
  };
}

export function ActionAccessibilitySupportPanel({
  actionId,
  isRegistrationConfirmed,
  fr,
}: {
  actionId: string;
  isRegistrationConfirmed: boolean;
  fr: boolean;
}) {
  const endpoint = `/api/actions/${encodeURIComponent(actionId)}/accessibility-support`;
  const participantKey = `${endpoint}?audience=participant`;
  const { data, error, isLoading, mutate } = useSWR<SupportResponse>(
    isRegistrationConfirmed ? participantKey : null,
    fetchSupportRequest,
  );
  const request = data?.request ?? null;
  const [selectedNeedsOverride, setSelectedNeedsOverride] = useState<ActionAccessibilityNeed[] | null>(null);
  const [trackingConsentOverride, setTrackingConsentOverride] = useState<boolean | null>(null);
  const selectedNeeds = selectedNeedsOverride ?? request?.requested_needs ?? [];
  const trackingConsent = trackingConsentOverride ?? request?.day_tracking_consent ?? false;
  const [pending, setPending] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const change = useSupportMutation(actionId, mutate);

  const toggleNeed = (need: ActionAccessibilityNeed) => {
    setSelectedNeedsOverride((current) => {
      const selected = current ?? request?.requested_needs ?? [];
      return selected.includes(need)
        ? selected.filter((value) => value !== need)
        : [...selected, need];
    });
  };

  const save = async () => {
    setPending(true);
    setMutationError(null);
    try {
      await change("PUT", { requestedNeeds: selectedNeeds, dayTrackingConsent: trackingConsent });
    } catch (reason) {
      setMutationError(reason instanceof Error ? reason.message : "L’enregistrement n’a pas abouti.");
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    setPending(true);
    setMutationError(null);
    try {
      await change("DELETE");
      setSelectedNeedsOverride([]);
      setTrackingConsentOverride(false);
    } catch (reason) {
      setMutationError(reason instanceof Error ? reason.message : "L’annulation n’a pas abouti.");
    } finally {
      setPending(false);
    }
  };

  return <section aria-labelledby={`accessibility-support-${actionId}`} className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4" data-testid="action-accessibility-support">
    <h3 id={`accessibility-support-${actionId}`} className="text-base font-black text-violet-950">{fr ? "Participer avec des besoins d’accessibilité" : "Take part with accessibility needs"}</h3>
    <p className="mt-2 text-sm leading-6 text-violet-950/85">
      {fr
        ? "Consultez les conditions indiquées pour l’action ci-dessus. Vous n’avez pas à déclarer un handicap ni à fournir de renseignement médical."
        : "Review the action conditions shown above. You do not need to disclose a disability or medical information."}
    </p>
    {!isRegistrationConfirmed ? <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm text-violet-950">
      {fr
        ? "Pour partager une demande privée avec l’organisateur, rejoignez d’abord cette action et attendez la confirmation de votre inscription. Utilisez le parcours normal « Rejoindre »."
        : "To share a private request with the organizer, first join this action and wait for registration confirmation. Use the usual Join flow."}
    </p> : null}
    {isRegistrationConfirmed ? <div className="mt-3 space-y-3">
      {isLoading ? <p role="status" className="text-sm text-violet-900">Chargement de votre demande…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-800">La demande privée est momentanément indisponible.</p> : null}
      <fieldset disabled={pending || isLoading || Boolean(error)} className="space-y-2">
        <legend className="text-sm font-bold text-violet-950">{fr ? "De quoi avez-vous besoin pour cette action ? (facultatif)" : "What would help you take part? (optional)"}</legend>
        {ACTION_ACCESSIBILITY_NEEDS.map((need) => <label key={need} className="flex min-h-11 items-start gap-3 rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-slate-800">
          <input type="checkbox" className="mt-1 size-4 accent-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" checked={selectedNeeds.includes(need)} onChange={() => toggleNeed(need)} />
          <span>{NEED_LABELS[need][fr ? "fr" : "en"]}</span>
        </label>)}
      </fieldset>
      <label className="flex items-start gap-3 rounded-xl border border-violet-100 bg-white px-3 py-3 text-sm text-slate-800">
        <input type="checkbox" className="mt-1 size-4 accent-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" checked={trackingConsent} onChange={(event) => setTrackingConsentOverride(event.target.checked)} disabled={pending || isLoading || Boolean(error)} />
        <span>{fr ? "J’accepte un suivi manuel avec l’organisateur le jour de l’action (accueil, contact convenu et fin de participation)." : "I agree to manual check-ins with the organizer on the action day (welcome, agreed contact and end of participation)."}</span>
      </label>
      <p className="text-xs leading-5 text-violet-900/80">{fr ? "Votre demande est visible uniquement par vous et les organisateurs habilités. Elle est supprimée au plus tard 90 jours après la date de l’action. Ne saisissez aucun commentaire médical. Un accompagnement bénévole n’est pas un service professionnel ni une garantie de prise en charge." : "Your request is visible only to you and authorized organizers. It is deleted no later than 90 days after the action date. Do not enter medical notes. Volunteer support is not a professional service or a guarantee of assistance."}</p>
      {mutationError ? <p role="alert" className="text-sm text-rose-800">{mutationError}</p> : null}
      {data?.request ? <p role="status" className="text-xs font-semibold text-violet-900">{fr ? "Demande enregistrée." : "Request saved."}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending || selectedNeeds.length === 0} onClick={() => { void save(); }} className="min-h-11 rounded-full bg-violet-800 px-4 py-2 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50">{pending ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Enregistrer ma demande" : "Save my request")}</button>
        {request ? <button type="button" disabled={pending} onClick={() => { void remove(); }} className="min-h-11 rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50">{fr ? "Annuler et supprimer ma demande" : "Cancel and delete my request"}</button> : null}
      </div>
    </div> : null}
  </section>;
}
