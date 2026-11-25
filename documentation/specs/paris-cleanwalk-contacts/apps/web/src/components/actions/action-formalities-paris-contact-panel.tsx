"use client";

import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { ActionFormality } from "@/lib/actions/formalities/qualification";
import type { FormalitiesEmailActionData } from "@/lib/actions/formalities/email-draft";
import { PARIS_CLEANING_FORM_URL } from "@/lib/actions/formalities/paris-cleaning-contacts";
import { resolveParisFormalitiesSupport, type ParisFormalitiesSupport } from "@/lib/actions/formalities/paris-support";
import type { ParisContactSource } from "@/lib/partners/paris-cleanwalk-network.contacts";
import { ActionFormalitiesEmailComposer } from "./action-formalities-email-composer";

const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => i + 1);

function SourceLink({ source }: { source: ParisContactSource }) {
  return <p className="break-words text-xs text-emerald-900/75">Source : <a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · vérifiée le {source.verifiedOn}</p>;
}

function areaLabel(numbers: readonly number[]) {
  return numbers.map(n => `${n}e`).join(", ");
}

export function ActionFormalitiesParisContactPanel({
  actionData, contactFormality, selectedArrondissements, onArrondissementsChange,
  support = resolveParisFormalitiesSupport(selectedArrondissements),
}: {
  actionData?: FormalitiesEmailActionData;
  contactFormality: ActionFormality | undefined;
  selectedArrondissements: number[];
  onArrondissementsChange: (arrondissements: number[]) => void;
  support?: ParisFormalitiesSupport;
}) {
  const action = actionData ?? {};
  const draftKey = JSON.stringify(action);
  const areaUnknown = support.arrondissements.length === 0;
  return (
    <section className="min-w-0 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4" aria-labelledby="paris-cleaning-contact-title">
      <div>
        <h4 id="paris-cleaning-contact-title" className="font-bold text-emerald-950">Contacts, matériel et reprise des déchets</h4>
        <p className="mt-1 text-sm text-emerald-950/80">Coordination recommandée pour un nettoyage participatif municipal. Elle ne remplace pas les démarches éventuellement obligatoires.</p>
      </div>
      <CmmDisclosure summary={areaUnknown ? "Préciser les arrondissements concernés" : `Arrondissements concernés : ${areaLabel(support.arrondissements)}`} tone="emerald" size="sm" defaultOpen={areaUnknown}>
        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <legend className="mb-2 text-sm">Sélectionnez uniquement les territoires de l’action.</legend>
          {ARRONDISSEMENTS.map(n => <label key={n} className="flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-2 text-sm">
            <input type="checkbox" checked={selectedArrondissements.includes(n)} onChange={e => onArrondissementsChange((e.target.checked ? [...selectedArrondissements,n] : selectedArrondissements.filter(v => v !== n)).sort((a,b)=>a-b))} className="size-4 accent-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" />
            <span>{n}e</span>
          </label>)}
        </fieldset>
      </CmmDisclosure>
      <a href={PARIS_CLEANING_FORM_URL} target="_blank" rel="noreferrer" className="cmm-button max-w-full whitespace-normal" data-cmm-button-tone="primary" data-cmm-button-size="sm" data-cmm-button-variant="pill">Ouvrir le formulaire officiel Paris.fr</a>
      {areaUnknown || !support.divisions.length ? <p role="status" className="text-sm text-amber-950">Aucune division identifiée. Précisez le secteur ou utilisez le formulaire officiel.</p> :
        <div className="space-y-2" aria-label="Contacts des divisions concernées">
          {support.divisions.map(contact => {
            const covered = contact.arrondissements.filter(n => support.arrondissements.includes(n));
            const emailScope = contact.emailArrondissements ?? [];
            const uncovered = covered.filter(n => !emailScope.includes(n));
            return <article key={contact.id} className="min-w-0 space-y-1 rounded-xl border border-emerald-200 bg-white p-3">
              <h5 className="font-semibold text-emerald-950">{contact.label}</h5>
              <p className="text-sm">Téléphone : <a className="underline" href={`tel:${contact.phone.replaceAll(" ","")}`}>{contact.phone}</a></p>
              <p className="text-sm break-words">Adresse administrative (pas un dépôt) : {contact.administrativeAddress}</p>
              <SourceLink source={contact.phoneSource} />
              {contact.addressSource.url !== contact.phoneSource.url ? <SourceLink source={contact.addressSource} /> : null}
              {contact.email && contact.emailSource && emailScope.length ? <>
                <p className="break-all text-sm">Courriel publié pour {areaLabel(emailScope)} : <a className="underline" href={`mailto:${contact.email}`}>{contact.email}</a></p>
                <SourceLink source={contact.emailSource} />
                {contactFormality ? <CmmDisclosure summary="Prévenir la division de propreté" tone="sky" size="sm">
                  <ActionFormalitiesEmailComposer key={`${draftKey}:${contact.id}:${areaLabel(emailScope)}`} formality={contactFormality} actionData={action} recipientEmail={contact.email} contactScope={areaLabel(emailScope)} />
                </CmmDisclosure> : null}
              </> : null}
              {uncovered.length ? <p className="text-xs">Pas de courriel vérifié pour {areaLabel(uncovered)}. Téléphone ou <a href={contact.officialChannel.url} target="_blank" rel="noreferrer" className="underline">canal officiel</a>.</p> : null}
            </article>;
          })}
        </div>}
      <CmmDisclosure summary={`Mairies · relais facultatifs (${support.townHalls.length})`} tone="emerald" size="sm">
        {support.townHalls.length ? <ul className="space-y-2">{support.townHalls.map(hall => <li key={hall.id} className="min-w-0 rounded-lg bg-white p-2 text-sm"><p className="font-semibold">{hall.label} · {areaLabel(hall.arrondissements)}</p><p>{hall.administrativeAddress} (administrative)</p><p><a href={`tel:${hall.phone.replaceAll(" ","")}`} className="underline">{hall.phone}</a> · <a href={hall.officialChannel} target="_blank" rel="noreferrer" className="underline">Site officiel</a></p><SourceLink source={hall.source}/></li>)}</ul> : <p role="status" className="text-sm">Aucune mairie identifiée pour la sélection.</p>}
      </CmmDisclosure>
      <CmmDisclosure summary={`Associations et réseaux pertinents (${support.associations.length})`} tone="emerald" size="sm">
        <p className="mb-2 text-xs">Pistes de contact selon le périmètre documenté. Aucun partenariat ni prêt de matériel présumé.</p>
        {support.associations.length ? <ul className="space-y-2">{support.associations.map(({actor,contact,matchedArrondissements}) => <li key={actor.id} className="min-w-0 space-y-1 rounded-lg bg-white p-2 text-sm">
          <p className="font-semibold">{actor.name}</p>
          <p>{actor.parisZone.label} · secteur concerné : {areaLabel(matchedArrondissements)}</p>
          <p className="text-xs">{actor.activities.join(" · ")}</p>
          <SourceLink source={{title:actor.provenance.sourceLabel,url:actor.provenance.sourceUrl,verifiedOn:actor.verifiedAt}}/>
          <a href={contact.url} className="underline" target="_blank" rel="noreferrer">{contact.label}</a>
          {contact.email ? <p className="break-all"><a href={`mailto:${contact.email}`} className="underline">{contact.email}</a></p> : <p className="text-xs">Aucun courriel vérifié ; utiliser le canal officiel.</p>}
          <SourceLink source={contact.source}/>
          {contact.equipmentNote ? <p className="text-xs">{contact.equipmentNote}</p> : null}
          {contact.email && contactFormality ? <CmmDisclosure summary="Proposer une collaboration" tone="sky" size="sm"><ActionFormalitiesEmailComposer key={`${draftKey}:${actor.id}:${areaLabel(matchedArrondissements)}`} formality={contactFormality} actionData={action} recipientEmail={contact.email} purpose="collaboration" contactScope={areaLabel(matchedArrondissements)} /></CmmDisclosure> : null}
        </li>)}</ul> : <p role="status" className="text-sm">Aucun contact associatif suffisamment documenté pour ce secteur.</p>}
      </CmmDisclosure>
      <section className="space-y-1 rounded-xl border border-emerald-200 bg-white p-3 text-sm">
        <h5 className="font-semibold">Matériel potentiellement disponible</h5>
        <p>Sur demande : {support.logistics.offeredOnRequest.join(", ")}. Selon disponibilité : {support.logistics.subjectToAvailability.join(", ")}.</p>
        <p>Quantités, stock et retrait à confirmer. Aucun autre matériel ni lieu de retrait confirmé.</p>
        <SourceLink source={support.logistics.source}/>
      </section>
      <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm" aria-label="Consignes de reprise des déchets">
        <h5 className="font-semibold">Organiser l’enlèvement</h5>
        {support.guidance.map(item => <div key={item.label}><p><strong>{item.label} :</strong> {item.text}</p><SourceLink source={item.source}/>{item.additionalSource ? <SourceLink source={item.additionalSource}/> : null}</div>)}
        <p className="font-semibold">Une adresse de mairie ou de division n’est jamais un point de dépôt confirmé.</p>
        <p>Après confirmation réelle du service, reporter la consigne (date, interlocuteur, lieu, horaire et flux) dans Équipe et logistique, notes logistiques internes. Cette note reste spécifique à l’action.</p>
      </section>
    </section>
  );
}
