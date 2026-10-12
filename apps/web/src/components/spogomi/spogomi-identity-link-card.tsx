"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Link2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";

type Props = { eventId: string; signInHref: string };

type LinkResponse = {
  error?: string;
  linkStatus?: "linked" | "already_linked";
  attendanceStatus?: "unknown" | "present" | "absent";
  participation?: { status: string; store: string | null };
};

export function SpogomiIdentityLinkCard({ eventId, signInHref }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/spogomi/events/${encodeURIComponent(eventId)}/identity-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => ({}))) as LinkResponse;
      if (!response.ok) throw new Error(payload.error ?? "La liaison n’a pas pu être vérifiée.");
      const participation = payload.participation?.status;
      const participationMessage = participation === "pending"
        ? "Une demande de participation CleanMyMap est maintenant en attente de validation organisateur."
        : participation === "confirmed"
          ? "Votre participation CleanMyMap est déjà confirmée ; les mécanismes habituels du site s’appliquent."
          : "La liaison ne confirme pas votre présence. La participation CleanMyMap reste soumise à la validation de l’organisateur habilité.";
      setMessage(`Compte lié. ${participationMessage}`);
      setCode("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "La liaison n’a pas pu être vérifiée.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CmmCard tone="emerald" variant="glass" className="space-y-3 p-5">
      <div className="flex items-start gap-3">
        <Link2 className="mt-1 text-emerald-700" size={20} aria-hidden="true" />
        <div>
          <h2 className="text-xl font-black text-emerald-950">Relier votre compte CleanMyMap</h2>
          <p className="cmm-text-body mt-1 text-slate-900">
            Utilisez le code individuel remis par l’organisateur. Il ne révèle pas le roster et ne confirme pas à lui seul votre présence.
          </p>
        </div>
      </div>
      {!isLoaded ? <p className="text-sm text-slate-600">Vérification de la session…</p> : !isSignedIn ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">Connectez-vous avec Clerk pour saisir votre code.</p>
          <CmmButton href={signInHref} tone="primary">Se connecter</CmmButton>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label className="block text-sm font-bold text-slate-800" htmlFor="spogomi-identity-code">Code individuel</label>
          <input
            id="spogomi-identity-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode="text"
            placeholder="SPOGOMI-…"
            className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2"
            maxLength={100}
          />
          <CmmButton type="submit" tone="primary" disabled={isSubmitting || code.trim().length < 16} loading={isSubmitting}>
            {isSubmitting ? "Vérification…" : "Relier le compte"}
          </CmmButton>
          {message ? <p role="status" className="text-sm font-semibold text-emerald-800">{message}</p> : null}
          {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
        </form>
      )}
      <p className="text-xs text-slate-600">Une personne sans compte CleanMyMap reste comptée dans le bilan environnemental de l’action, mais ne reçoit pas de crédit personnel.</p>
      <Link href="/politique-confidentialite" className="text-xs font-bold text-emerald-800 underline underline-offset-2">En savoir plus sur la confidentialité</Link>
    </CmmCard>
  );
}
