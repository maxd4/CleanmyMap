"use client";

import { useId, useMemo, useState } from "react";
import type { SupportNeed } from "@/lib/actions/formalities/accompaniment";
import type { ActionFormality } from "@/lib/actions/formalities/qualification";
import {
  buildReviewableFormalityEmailDraft,
  type FormalitiesEmailActionData,
  type FormalitiesEmailPurpose,
} from "@/lib/actions/formalities/email-draft";

export function ActionFormalitiesEmailComposer({
  formality,
  actionData,
  recipientEmail,
  purpose = "participatory_cleaning",
  contactScope,
  needs,
}: {
  formality: ActionFormality;
  actionData: FormalitiesEmailActionData;
  recipientEmail: string;
  purpose?: FormalitiesEmailPurpose;
  contactScope?: string;
  needs?: readonly SupportNeed[];
}) {
  const titleId = useId();
  const draft = useMemo(
    () => buildReviewableFormalityEmailDraft({
      formality,
      action: actionData,
      purpose,
      contactScope,
      needs,
      verifiedRecipientEmail: recipientEmail,
    }),
    [actionData, formality, recipientEmail, purpose, contactScope, needs],
  );
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  if (!draft) return null;
  const currentDraft = draft;

  const mailto = `mailto:${currentDraft.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  async function copyMail() {
    try {
      await navigator.clipboard.writeText(`À : ${currentDraft.to}\nObjet : ${subject}\n\n${body}`);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3" aria-labelledby={titleId}>
      <div>
        <h4 id={titleId} className="font-bold text-sky-950">{purpose === "complementary" ? "Courriel complémentaire" : purpose === "collaboration" ? "Proposer une collaboration" : "Préparer une demande"}</h4>
        <p className="mt-1 text-xs leading-5 text-sky-950">Le texte est modifiable. Copier ou ouvrir votre messagerie ne marque pas la démarche comme envoyée.</p>
      </div>
      <p className="break-all text-xs text-sky-950"><span className="font-semibold">À :</span> {currentDraft.to}</p>
      <label className="grid gap-1 text-sm font-semibold text-sky-950">
        <span>Objet</span>
        <input value={subject} onChange={(event) => setSubject(event.target.value)} className="min-h-10 rounded-lg border border-sky-200 bg-white px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-sky-500" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-sky-950">
        <span>Corps du message</span>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={10} className="min-h-48 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 font-normal leading-5 outline-none focus-visible:ring-2 focus-visible:ring-sky-500" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { void copyMail(); }} className="cmm-button" data-cmm-button-tone="secondary" data-cmm-button-size="sm" data-cmm-button-variant="pill">Copier le courriel</button>
        <a href={mailto} className="cmm-button" data-cmm-button-tone="primary" data-cmm-button-size="sm" data-cmm-button-variant="pill">Ouvrir la messagerie</a>
      </div>
      <p role="status" aria-live="polite" className="text-xs text-sky-950">
        {copyState === "copied" ? "Courriel copié." : copyState === "failed" ? "Copie indisponible. Sélectionnez le texte du message pour le copier." : "Aucun courriel n’est envoyé automatiquement."}
      </p>
    </section>
  );
}
