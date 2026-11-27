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
  async function lookup() {
    if (!actionId || state === "loading") return;
    setResult(null);
    setState("loading");
    try { setResult(await fetchMetropolitanFormalitiesContacts(actionId)); setState("success"); }
    catch { setState("error"); }
  }
  const resources = nationalSupportResources(needs);
  return <section className="space-y-3 rounded-xl border border-emerald-200 p-3 text-sm">
    <h4 className="font-semibold">Interlocuteurs locaux et réseaux nationaux</h4>
    <p>Recherche des contacts administratifs associés aux communes identifiées, en France métropolitaine. Aucun accord de reprise ni soutien n'est présumé.</p>
    {actionId ? <CmmButton type="button" tone="secondary" size="sm" disabled={state === "loading"} onClick={() => { void /* fire-and-forget -- explicit UI event */ lookup(); }}>{state === "loading" ? "Recherche en cours…" : "Rechercher les contacts du lieu enregistré"}</CmmButton> : <p>Enregistrez le lieu pour rechercher les services compétents.</p>}
    {state === "error" ? <p role="alert">Annuaire indisponible. Réessayez ou utilisez le lien officiel.</p> : null}
    {result ? <div role="status" className="space-y-2">
      <p>{result.coverage.status === "resolved_point" ? "Commune du point résolue" : "Couverture du parcours à vérifier"} : {result.coverage.communeCodes.join(", ") || "à préciser"}</p>
      {result.coverage.reason ? <p>{result.coverage.reason}</p> : null}
      {result.status !== "complete" ? <p>Recherche incomplète. {result.unresolvedCommuneCodes.length ? "Communes à compléter : " + result.unresolvedCommuneCodes.join(", ") : ""}</p> : null}
      {result.contacts.length ? <ul className="space-y-2">{result.contacts.map(contact => <li key={contact.id} className="rounded-lg border p-2">
        <p className="font-semibold">{contact.name}</p><p className="text-xs">Communes de compétence : {contact.communeCodes.join(", ")}</p>
        <a href={contact.directoryUrl} target="_blank" rel="noreferrer" className="underline">Fiche officielle DILA</a>
        {contact.phones.map(phone => <p key={phone}>Téléphone : <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`} className="underline">{phone}</a></p>)}
        {contact.emails.map(email => <p className="break-all" key={email}>Courriel : <a href={`mailto:${email}`} className="underline">{email}</a></p>)}
        {contact.formUrl ? <p><a href={contact.formUrl} target="_blank" rel="noreferrer" className="underline">Formulaire de contact</a></p> : null}
        {contact.websites.map(site => <p className="break-all" key={site}><a href={site} target="_blank" rel="noreferrer" className="underline">{site}</a></p>)}
        <p className="text-xs">Annuaire consulté le {contact.retrievedAt.slice(0,10)}.</p>
      </li>)}</ul> : <p>Aucun contact suffisamment documenté par cette recherche.</p>}
    </div> : null}
    <a href={DILA_DIRECTORY} target="_blank" rel="noreferrer" className="underline">Annuaire officiel des services publics</a>
    {resources.length ? <CmmDisclosure summary="Autres ressources selon vos besoins" tone="slate" size="sm"><ul className="space-y-2">{resources.map(resource => <li key={resource.id}><a href={resource.url} target="_blank" rel="noreferrer" className="font-semibold underline">{resource.label}</a><p>{resource.guidance}</p></li>)}</ul></CmmDisclosure> : null}
  </section>;
}
