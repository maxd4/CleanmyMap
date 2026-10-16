import { ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { Locale } from "../feedback-section.shared";
import type { QuestionnaireConfig } from "./questionnaire-config";

export function QuestionnaireSubmissionStatus({
  locale,
  questionnaire,
  state,
  requestId,
  screenshotError,
  errorMessage,
}: {
  locale: Locale;
  questionnaire: QuestionnaireConfig;
  state: "idle" | "submitting" | "success" | "error";
  requestId: string | null;
  screenshotError: string | null;
  errorMessage: string | null;
}) {
  return (
    <>
      {state === "success" ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50" role="status" aria-live="polite">
          {questionnaire.success[locale]}
          {questionnaire.id !== "collaboration" ? (
            <span className="mt-1 block text-emerald-100/90">
              {locale === "fr"
                ? "Il sera examiné pour déterminer s'il peut être comptabilisé dans votre progression Amélioration du produit."
                : "It will be reviewed to determine whether it can count toward your Product improvement progression."}
            </span>
          ) : null}
          {requestId ? (
            <span className="mt-1 block text-emerald-100/80">
              {locale === "fr" ? "Référence" : "Reference"}: {requestId}
            </span>
          ) : null}
          <CmmButton
            href="/sections/feedback#mes-retours"
            tone="secondary"
            variant="pill"
            className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-emerald-200/50 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-50 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60"
          >
            {locale === "fr" ? "Voir mes retours" : "View my feedback"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </CmmButton>
          {screenshotError ? (
            <span className="mt-2 block text-amber-100" role="alert">
              Le retour a été transmis, mais la capture n&apos;a pas pu être jointe : {screenshotError}
            </span>
          ) : null}
        </div>
      ) : null}

      {state === "error" ? (
        <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          {errorMessage ?? (locale === "fr" ? "Impossible d'envoyer le questionnaire." : "Unable to send the questionnaire.")}
        </div>
      ) : null}
    </>
  );
}
