"use client";

import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import type { ActionFormality } from "@/lib/actions/formalities/qualification";
import type { FormalitiesEmailActionData } from "@/lib/actions/formalities/email-draft";
import {
  PARIS_CLEANING_CONTACTS_VERIFIED_ON,
  PARIS_CLEANING_DIRECTORY_SOURCE,
  PARIS_CLEANING_FORM_URL,
  resolveParisCleaningDivisionContacts,
} from "@/lib/actions/formalities/paris-cleaning-contacts";
import { ActionFormalitiesEmailComposer } from "./action-formalities-email-composer";

const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, index) => index + 1);

export function ActionFormalitiesParisContactPanel({
  actionData,
  contactFormality,
  selectedArrondissements,
  onArrondissementsChange,
}: {
  actionData?: FormalitiesEmailActionData;
  contactFormality: ActionFormality | undefined;
  selectedArrondissements: number[];
  onArrondissementsChange: (arrondissements: number[]) => void;
}) {
  const contacts = resolveParisCleaningDivisionContacts(selectedArrondissements);
  const areaNeedsConfirmation = selectedArrondissements.length === 0;

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4" aria-labelledby="paris-cleaning-contact-title">
      <div>
        <h4 id="paris-cleaning-contact-title" className="font-bold text-emerald-950">Nettoyage participatif · contact de propreté</h4>
        <p className="mt-1 text-sm leading-5 text-emerald-950/80">Le formulaire de Paris.fr est le canal à privilégier. Le contact de la division sert à coordonner le prêt de matériel et la prise en charge des déchets ; il reste recommandé.</p>
      </div>

      <CmmDisclosure summary={areaNeedsConfirmation ? "Préciser les arrondissements concernés · À confirmer" : "Vérifier les arrondissements concernés"} tone="emerald" size="sm" defaultOpen={areaNeedsConfirmation}>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-emerald-950">
            Cochez uniquement les arrondissements parcourus ou concernés par le nettoyage.
          </legend>
          {ARRONDISSEMENTS.map((arrondissement) => (
            <label key={arrondissement} className="flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-sm text-emerald-950">
              <input
                type="checkbox"
                checked={selectedArrondissements.includes(arrondissement)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selectedArrondissements, arrondissement]
                    : selectedArrondissements.filter((value) => value !== arrondissement);
                  onArrondissementsChange(next.sort((left, right) => left - right));
                }}
                className="size-4 accent-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              />
              <span>{arrondissement}ᵉ arrondissement</span>
            </label>
          ))}
        </fieldset>
      </CmmDisclosure>

      {areaNeedsConfirmation ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          Division territoriale à confirmer. Sélectionnez les seuls arrondissements concernés pour afficher leurs contacts. Le formulaire municipal reste disponible.
        </p>
      ) : (
        <div className="space-y-3" aria-label="Contacts des divisions concernées">
          {contacts.map((contact) => (
            <article key={contact.id} className="space-y-2 rounded-xl border border-emerald-200 bg-white p-3">
              <h5 className="font-semibold text-emerald-950">{contact.label}</h5>
              <p className="text-sm text-emerald-950">Téléphone : <a className="font-semibold underline" href={`tel:${contact.phone.replaceAll(" ", "")}`}>{contact.phone}</a></p>
              <p className="text-xs text-emerald-900/70">
                Source : <a className="font-semibold underline" href={contact.phoneSource.url} target="_blank" rel="noreferrer">{contact.phoneSource.title}</a> · vérifiée le {PARIS_CLEANING_CONTACTS_VERIFIED_ON}
              </p>
              {contact.email && contact.emailSource ? (
                <>
                  <p className="text-sm text-emerald-950">Courriel publié pour le 7e : <a className="font-semibold underline" href={`mailto:${contact.email}`}>{contact.email}</a></p>
                  <p className="text-xs text-emerald-900/70">
                    Source : <a className="font-semibold underline" href={contact.emailSource.url} target="_blank" rel="noreferrer">{contact.emailSource.title}</a> · vérifiée le {contact.emailSource.verifiedOn}
                  </p>
                  {contactFormality ? <ActionFormalitiesEmailComposer key={[
                    actionData?.title,
                    actionData?.description,
                    actionData?.location,
                    actionData?.date,
                    actionData?.startTime,
                    actionData?.endTime,
                    actionData?.participantCount,
                    actionData?.organizerName,
                    contact.email,
                  ].join("|")} formality={contactFormality} actionData={actionData ?? {}} recipientEmail={contact.email} /> : null}
                </>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <a href={PARIS_CLEANING_FORM_URL} target="_blank" rel="noreferrer" className="cmm-button" data-cmm-button-tone="primary" data-cmm-button-size="sm" data-cmm-button-variant="pill">
          Ouvrir le formulaire officiel Paris.fr
        </a>
      </div>
      <p className="text-xs text-emerald-900/70">Ce canal municipal est spécifique au nettoyage participatif. Les démarches réglementaires restent séparées et sont indiquées selon la qualification.</p>
      <p className="sr-only">Référence de l&apos;annuaire vérifiée le {PARIS_CLEANING_DIRECTORY_SOURCE.verifiedOn}.</p>
    </section>
  );
}
