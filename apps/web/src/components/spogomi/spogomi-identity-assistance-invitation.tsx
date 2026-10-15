"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

export function SpogomiIdentityAssistanceInvitation({ eventId, token, signInHref }: { eventId: string; token: string; signInHref: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [context, setContext] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assistance: true, context, invitationToken: token }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Le lien d’assistance n’est plus disponible.");
      setMessage("Demande transmise à l’organisateur. Vous recevrez le code directement après sa vérification.");
      setContext("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le lien d’assistance n’est plus disponible.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width">
        <CmmCard
          tone="emerald"
          variant="glass"
          className="mx-auto max-w-2xl space-y-4 p-6"
        >
          <h1 className="text-2xl font-black text-emerald-950">
            Assistance de rattachement SPOGOMI
          </h1>
          <p className="text-sm text-slate-800">
            Ce lien privé ne révèle pas le nom de la compétition ni son roster.
            Il sert uniquement à transmettre une demande à l’organisateur qui
            vous l’a remis.
          </p>
          {!isLoaded ? (
            <p className="text-sm text-slate-600">Vérification de la session…</p>
          ) : !isSignedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-800">
                Connectez-vous ou créez votre compte pour envoyer la demande.
              </p>
              <CmmButton href={signInHref} tone="primary">
                Se connecter
              </CmmButton>
            </div>
          ) : message ? (
            <p
              role="status"
              className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
            >
              {message}
            </p>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label
                className="block text-sm font-bold text-slate-800"
                htmlFor="spogomi-assistance-context"
              >
                Élément utile à la recherche
                <span className="font-normal text-slate-500"> (facultatif)</span>
              </label>
              <textarea
                id="spogomi-assistance-context"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                maxLength={1200}
                rows={5}
                placeholder="Expliquez brièvement comment l’organisateur peut vous recontacter ou vérifier votre participation. Ne saisissez pas de code secret."
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2"
              />
              <CmmButton
                type="submit"
                tone="primary"
                disabled={busy}
                loading={busy}
              >
                {busy ? "Transmission…" : "Envoyer la demande"}
              </CmmButton>
              {error ? (
                <p role="alert" className="text-sm font-semibold text-rose-700">
                  {error}
                </p>
              ) : null}
            </form>
          )}
          <p className="text-xs text-slate-600">
            La demande ne lie pas votre compte, ne confirme pas votre présence
            et ne donne aucun classement ni récompense. Un code individuel sera
            émis uniquement après vérification manuelle.
          </p>
        </CmmCard>
      </div>
    </main>
  );
}
