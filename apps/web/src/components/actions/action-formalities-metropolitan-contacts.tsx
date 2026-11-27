"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { fetchMetropolitanFormalitiesContacts } from "@/lib/actions/http-action-formalities";
import type { MetropolitanContacts } from "@/lib/actions/formalities/metropolitan-contacts-contract";
import { DILA_DIRECTORY } from "@/lib/actions/formalities/metropolitan-contacts-contract";
import { nationalSupportResources } from "@/lib/actions/formalities/national-support-directory";
import type { SupportNeed } from "@/lib/actions/formalities/accompaniment";

export function ActionFormalitiesMetropolitanContacts({ actionId, needs }: { actionId?: string | null; needs: readonly SupportNeed[] }) {
  const [result, setResult] = useState<MetropolitanContacts | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [visibleCount, setVisibleCount] = useState(8);
  async function lookup() {
    if (!actionId || state === "loading") return;
    setVisibleCount(8);
    setResult(null);
    setState("loading");
    try { setResult(await fetchMetropolitanFormalitiesContacts(actionId)); setState("success"); }
    catch { setState("error"); }
  }
  const resources = nationalSupportResources(needs);
  return <section className="min-w-0 space-y-3 text-sm" aria-labelledby="metropolitan-contact-title" aria-busy={state === "loading"}>
    <h4 id="metropolitan-contact-title" className="font-semibold">Services publics du lieu</h4>
    <p>Recherche à la demande dans l’annuaire officiel. Un service trouvé ne confirme ni sa compétence de collecte ni son accord.</p>
    {actionId ? <CmmButton type="button" tone="secondary" size="sm" disabled={state === "loading"} onClick={() => { void /* fire-and-forget -- explicit UI event */ lookup(); }}>{state === "loading" ? "Recherche en cours…" : result ? "Actualiser les services" : "Rechercher les services"}</CmmButton> : <p>Enregistrez l’action pour rechercher les services associés à ses communes.</p>}
    {state === "error" ? <p role="alert">Annuaire indisponible. Réessayez ou utilisez le lien officiel.</p> : null}
    {state === "loading" ? <p role="status">Recherche des services…</p> : null}
    {result ? <div className="space-y-2">
      <p aria-live="polite">{result.coverage.status === "resolved_point" ? "Commune du point" : result.coverage.status === "intersections" ? "Communes traversées par la géométrie" : result.coverage.status === "partial" ? "Couverture partielle" : "Commune non déterminée"} : {result.coverage.communeCodes.join(", ") || "à préciser"}</p>
      {result.coverage.reason ? <p>{result.coverage.reason}</p> : null}
      {result.status === "unavailable" ? <p role="alert">L’annuaire n’a pas répondu pour cette recherche.</p> : result.status !== "complete" ? <p>Recherche partielle. {result.unresolvedCommuneCodes.length ? "Communes à compléter : " + result.unresolvedCommuneCodes.join(", ") : ""}</p> : null}
      {result.contacts.length ? <ul className="divide-y divide-emerald-200">{result.contacts.slice(0, visibleCount).map(contact => <li key={contact.id} className="space-y-1 py-3 first:pt-0">
        <p className="font-semibold">{contact.name}</p><p className="text-xs">Communes de compétence : {contact.communeCodes.join(", ")}</p>
        {contact.types.length ? <p className="text-xs">Types DILA : {contact.types.join(", ")}</p> : null}
        <a href={contact.directoryUrl} target="_blank" rel="noreferrer" className="underline">Fiche officielle DILA</a>
        {contact.phones.map(phone => <p key={phone}>Téléphone : <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`} className="underline">{phone}</a></p>)}
        {contact.emails.map(email => <p className="break-all" key={email}>Courriel : <a href={`mailto:${email}`} className="underline">{email}</a></p>)}
        {contact.formUrl ? <p><a href={contact.formUrl} target="_blank" rel="noreferrer" className="underline">Formulaire de contact</a></p> : null}
        {contact.websites.map(site => <p className="break-all" key={site}><a href={site} target="_blank" rel="noreferrer" className="underline">{site}</a></p>)}
        <p className="text-xs">Annuaire consulté le {contact.retrievedAt.slice(0,10)}.</p>
      </li>)}</ul> : <p aria-live="polite">Aucun service suffisamment documenté pour cette recherche. Consultez l’annuaire officiel.</p>}
      {visibleCount < result.contacts.length ? <CmmButton tone="tertiary" size="sm" onClick={() => setVisibleCount(value => value + 8)}>Afficher d’autres services ({result.contacts.length - visibleCount})</CmmButton> : null}
    </div> : null}
    <a href={DILA_DIRECTORY} target="_blank" rel="noreferrer" className="underline">Annuaire officiel des services publics</a>
    {resources.length ? <CmmDisclosure summary="Autres ressources selon vos besoins" tone="slate" size="sm"><ul className="space-y-2">{resources.map(resource => <li key={resource.id}><a href={resource.url} target="_blank" rel="noreferrer" className="font-semibold underline">{resource.label}</a><p>{resource.guidance}</p></li>)}</ul></CmmDisclosure> : null}
  </section>;
}
