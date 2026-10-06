import { ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

type FeedbackDashboardSubmitStateProps = {
  fr: boolean;
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  canSubmit: boolean;
  submitState: "idle" | "submitting" | "success" | "error";
  errorMessage: string | null;
  lastSubmittedTitle: string | null;
};

export function FeedbackSectionDashboardSubmitState({
  fr,
  isLoaded,
  isSignedIn,
  canSubmit,
  submitState,
  errorMessage,
  lastSubmittedTitle,
}: FeedbackDashboardSubmitStateProps) {
  return (
    <>
      {isLoaded && !isSignedIn ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-950">
            {fr ? "Connecte-toi pour envoyer ce retour." : "Sign in to submit this feedback."}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800/80">
            {fr
              ? "Le retour sera enregistré dans l'espace de suivi interne."
              : "The reply will be stored in the internal follow-up queue."}
          </p>
          <CmmButton
            href="/sign-in"
            tone="secondary"
            variant="pill"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-pink-200 bg-white px-4 py-3 text-sm font-bold text-pink-600"
          >
            {fr ? "Se connecter" : "Sign in"}
          </CmmButton>
        </div>
      ) : (
        <CmmButton
          type="submit"
          disabled={!canSubmit}
          tone="primary"
          variant="pill"
          className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-pink-500 px-6 text-[0.78rem] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_-20px_rgba(236,72,153,0.85)] disabled:opacity-50"
        >
          {submitState === "submitting"
            ? fr
              ? "Envoi..."
              : "Sending..."
            : fr
              ? "Envoyer mon retour"
              : "Send my feedback"}
          <ArrowRight size={18} />
        </CmmButton>
      )}

      {submitState === "success" ? (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {fr
            ? `Merci. ${lastSubmittedTitle ? `« ${lastSubmittedTitle} » ` : ""}a bien été transmis.`
            : `Thanks. ${lastSubmittedTitle ? `“${lastSubmittedTitle}” ` : ""}has been sent.`}
        </div>
      ) : null}

      {submitState === "error" ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage ?? (fr ? "Impossible d'envoyer le retour." : "Unable to send the feedback.")}
        </div>
      ) : null}
    </>
  );
}
