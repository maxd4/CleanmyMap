"use client";

import type { ActionFormalitiesQualification } from "@/lib/actions/formalities/qualification";
import type { FormalitiesEmailActionData } from "@/lib/actions/formalities/email-draft";
import type { ParisCleaningDivisionContact } from "@/lib/actions/formalities/paris-cleaning-contacts";

function printValue(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function handlePrint() {
  document.body.classList.add("cmm-print-formalities");
  const cleanup = () => document.body.classList.remove("cmm-print-formalities");
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}

export function ActionFormalitiesPrintSheet({
  summary,
  actionData,
  qualification,
  contacts,
}: {
  summary: string;
  actionData?: FormalitiesEmailActionData;
  qualification: ActionFormalitiesQualification;
  contacts: ParisCleaningDivisionContact[];
}) {
  const actionValues: Array<[string, string | null]> = [
    ["Titre", printValue(actionData?.title)],
    ["Organisateur", printValue(actionData?.organizerName)],
    ["Date", printValue(actionData?.date)],
    ["Horaires", [printValue(actionData?.startTime), printValue(actionData?.endTime)].filter(Boolean).join(" – ") || null],
    ["Lieu", printValue(actionData?.location)],
    ["Effectif prévu", typeof actionData?.participantCount === "number" ? String(actionData.participantCount) : null],
    ["Description", printValue(actionData?.description)],
  ] as const;

  return (
    <>
      <button type="button" onClick={handlePrint} className="cmm-button print:hidden" data-cmm-button-tone="secondary" data-cmm-button-size="sm" data-cmm-button-variant="pill">
        Imprimer la fiche d&apos;action
      </button>
      <article className="hidden" data-action-formalities-print-sheet>
        <header>
          <p>CleanMyMap · Préparation administrative</p>
          <h1>{printValue(actionData?.title) ?? "Fiche de préparation de l’action"}</h1>
          <p>Synthèse : {summary}</p>
        </header>
        <section>
          <h2>Informations de l’action</h2>
          <dl>{actionValues.map(([label, value]) => value ? <div key={label}><dt>{label}</dt><dd>{value}</dd></div> : null)}</dl>
        </section>
        {contacts.length ? <section>
          <h2>Divisions de propreté concernées</h2>
          <ul>{contacts.map((contact) => <li key={contact.id}>{contact.label} · {contact.phone}{contact.email ? ` · ${contact.email}` : ""}</li>)}</ul>
        </section> : null}
        <section>
          <h2>Démarches et pièces</h2>
          {qualification.formalities.map((formality) => (
            <div key={formality.id}>
              <h3>{formality.competentAuthority.label} — {formality.requirementStatus}</h3>
              <p>{formality.justification}</p>
              {formality.requestedDocuments.length ? <p>Pièces indiquées par la source pour cette procédure : {formality.requestedDocuments.join(" ; ")}</p> : formality.requirementStatus === "unknown" ? <p>Pièces à confirmer auprès de l’interlocuteur compétent.</p> : formality.procedureKind === "none" ? <p>Aucune pièce AOT n’est requise pour le cas ainsi qualifié.</p> : <p>Aucune pièce n’est déterminée par les éléments disponibles ; vérifier le dossier officiel si la démarche est engagée.</p>}
              {formality.source?.url ? <p>Source : {formality.source.title} · vérifiée le {formality.source.verifiedOn} · {formality.source.url}</p> : null}
            </div>
          ))}
        </section>
        <footer><p>Cette fiche réutilise les données présentes au moment de l’impression. Elle ne vaut ni demande déposée ni confirmation d’envoi.</p></footer>
      </article>
    </>
  );
}
