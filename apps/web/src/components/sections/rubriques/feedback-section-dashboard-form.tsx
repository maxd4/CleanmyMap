import { localize, FEEDBACK_TOPICS, type Locale } from "./feedback-section.shared";
import type { FeedbackDashboardController } from "./use-feedback-dashboard-controller";
import { FeedbackSectionDashboardHeader } from "./feedback-section-dashboard-header";
import { FeedbackSectionDashboardSubmissionForm } from "./feedback-section-dashboard-submission-form";

type FeedbackDashboardFormProps = Pick<
  FeedbackDashboardController,
  | "fr"
  | "isLoaded"
  | "isSignedIn"
  | "topicId"
  | "message"
  | "setTopicId"
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

export function FeedbackSectionDashboardForm({
  pagePath,
  locale,
  fr,
  isLoaded,
  isSignedIn,
  topicId,
  message,
  setTopicId,
  setMessage,
  activeTopic,
  canSubmit,
  submitState,
  errorMessage,
  lastSubmittedTitle,
  honeypot,
  setHoneypot,
  handleSubmit,
}: FeedbackDashboardFormProps) {
  return (
    <>
      <FeedbackSectionDashboardHeader locale={locale} fr={fr} />

      <section
        id="bug"
        className="rounded-[2.2rem] border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,248,250,0.99)_100%)] p-6 shadow-[0_28px_80px_-64px_rgba(236,72,153,0.6)]"
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
              {fr ? "Donnez votre avis" : "Give your feedback"}
            </h2>
            <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
              {fr
                ? "Partagez votre expérience, signalez un problème ou proposez une amélioration."
                : "Share your experience, flag a problem or suggest an improvement."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {FEEDBACK_TOPICS.map((topic) => {
              const Icon = topic.icon;
              const isSelected = topic.id === topicId;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setTopicId(topic.id)}
                  className={[
                    "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                    isSelected
                      ? "border-pink-500 bg-pink-500 text-white shadow-[0_18px_32px_-20px_rgba(236,72,153,0.65)]"
                      : "border-rose-200 bg-white text-slate-700 hover:border-pink-300 hover:bg-pink-50",
                  ].join(" ")}
                >
                  <Icon size={16} />
                  <span>{localize(locale, topic.label)}</span>
                </button>
              );
            })}
          </div>

          <FeedbackSectionDashboardSubmissionForm
            pagePath={pagePath}
            locale={locale}
            fr={fr}
            isLoaded={isLoaded}
            isSignedIn={isSignedIn}
            message={message}
            setMessage={setMessage}
            activeTopic={activeTopic}
            canSubmit={canSubmit}
            submitState={submitState}
            errorMessage={errorMessage}
            lastSubmittedTitle={lastSubmittedTitle}
            honeypot={honeypot}
            setHoneypot={setHoneypot}
            handleSubmit={handleSubmit}
          />
        </div>
      </section>
    </>
  );
}
