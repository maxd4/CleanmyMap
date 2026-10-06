import { ArrowRight, ShieldCheck } from "lucide-react";
import { localize, type Locale } from "./feedback-section.shared";
import type { FeedbackDashboardController } from "./use-feedback-dashboard-controller";
import { FeedbackSectionDashboardSubmitState } from "./feedback-section-dashboard-submit-state";

type FeedbackDashboardSubmissionFormProps = Pick<
  FeedbackDashboardController,
  | "fr"
  | "isLoaded"
  | "isSignedIn"
  | "message"
  | "setMessage"
  | "activeTopic"
  | "canSubmit"
  | "submitState"
  | "errorMessage"
  | "lastSubmittedTitle"
  | "honeypot"
  | "setHoneypot"
  | "handleSubmit"
> & {
  pagePath: string;
  locale: Locale;
};

export function FeedbackSectionDashboardSubmissionForm({
  pagePath,
  locale,
  fr,
  isLoaded,
  isSignedIn,
  message,
  setMessage,
  activeTopic,
  canSubmit,
  submitState,
  errorMessage,
  lastSubmittedTitle,
  honeypot,
  setHoneypot,
  handleSubmit,
}: FeedbackDashboardSubmissionFormProps) {
  return (
    <form onSubmit={handleSubmit} className="mt-2 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-[0.95rem] font-black tracking-[-0.02em] text-slate-950">
            {fr ? "Quel est votre retour ?" : "What is your feedback?"}
          </span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={8}
            placeholder={localize(locale, activeTopic.placeholder)}
            className="min-h-[188px] w-full rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 text-[0.98rem] leading-[1.7] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
          />
          <span className="cmm-text-caption leading-relaxed text-slate-500">
            {localize(locale, activeTopic.helper)}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-pink-200 bg-white px-4 py-3 text-sm font-medium text-pink-500">
            <ArrowRight size={16} />
            {fr ? "Ajouter une capture d'écran (facultatif)" : "Add a screenshot (optional)"}
          </div>
          <div className="text-xs font-medium text-slate-500">
            {fr
              ? "Votre envoi reste confidentiel et traçable."
              : "Your submission stays private and traceable."}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50/80 p-5">
          <div className="flex items-center gap-2 text-pink-600">
            <ShieldCheck size={18} />
            <h3 className="text-sm font-black uppercase tracking-[0.14em]">
              {fr ? "Votre retour compte !" : "Your feedback matters!"}
            </h3>
          </div>
          <p className="mt-3 text-[0.96rem] leading-[1.65] text-slate-600">
            {fr
              ? "Chaque message est lu par notre équipe. Nous nous engageons à vous répondre sous 48h maximum."
              : "Each message is read by our team. We commit to replying within 48 hours maximum."}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">
            {fr ? "Résumé" : "Summary"}
          </div>
          <div className="mt-3 space-y-2">
            <p className="text-sm font-bold leading-tight text-slate-950">
              {localize(locale, activeTopic.label)}
            </p>
            <p className="text-sm leading-[1.65] text-slate-600">
              {localize(locale, activeTopic.helper)}
            </p>
            <p className="text-xs text-slate-500">
              {fr ? "Page" : "Page"}: {pagePath}
            </p>
          </div>
        </div>

        <FeedbackSectionDashboardSubmitState
          fr={fr}
          isLoaded={isLoaded}
          isSignedIn={isSignedIn}
          canSubmit={canSubmit}
          submitState={submitState}
          errorMessage={errorMessage}
          lastSubmittedTitle={lastSubmittedTitle}
        />
      </div>

      <input
        type="text"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0"
      />
    </form>
  );
}
