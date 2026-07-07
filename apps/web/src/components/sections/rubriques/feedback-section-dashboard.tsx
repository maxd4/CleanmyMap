"use client";

import { ArrowRight, ChevronRight, Heart, MessageSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  FEEDBACK_METRICS,
  FEEDBACK_ROADMAP_ITEMS,
  FEEDBACK_STEPS,
  FEEDBACK_SUPPORT_LINKS,
  FEEDBACK_TOPICS,
  FEEDBACK_TRACKER_ITEMS,
  buildPrefillText,
  buildSubmissionTitle,
  getStatusTone,
  getTopicById,
  localize,
  type FeedbackSectionProps,
  type FeedbackTopicId,
  type Locale,
  type StatusFilter,
} from "./feedback-section.shared";

type FeedbackSectionDashboardProps = {
  pagePath: string;
  source: FeedbackSectionProps["source"];
  supportPrefill: Partial<Record<string, string>> | null;
  locale: Locale;
};

export function FeedbackSectionDashboard({
  pagePath,
  source,
  supportPrefill,
  locale,
}: FeedbackSectionDashboardProps) {
  return (
    <FeedbackDashboardMode
      pagePath={pagePath}
      source={source}
      supportPrefill={supportPrefill}
      locale={locale}
    />
  );
}

function FeedbackDashboardMode({
  pagePath,
  source,
  supportPrefill,
  locale,
}: FeedbackSectionDashboardProps) {
  const fr = locale === "fr";
  const { isLoaded, isSignedIn } = useUser();
  const [topicId, setTopicId] = useState<FeedbackTopicId>(supportPrefill ? "signalement" : "all");
  const [message, setMessage] = useState<string>(() => buildPrefillText(supportPrefill, locale));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [honeypot, setHoneypot] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedTitle, setLastSubmittedTitle] = useState<string | null>(null);

  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const activeTopic = getTopicById(topicId);
  const visibleTrackerItems = FEEDBACK_TRACKER_ITEMS.filter(
    (item) => statusFilter === "all" || item.statusId === statusFilter,
  );
  const canSubmit = message.trim().length >= 10 && submitState !== "submitting";

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  useEffect(() => {
    if (!supportPrefill) {
      return;
    }

    setMessage((current) =>
      current.trim().length > 0 ? current : buildPrefillText(supportPrefill, locale),
    );
    setTopicId("signalement");
  }, [locale, supportPrefill]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !isSignedIn || !canSubmit) {
      return;
    }

    setSubmitState("submitting");
    setErrorMessage(null);

    try {
      const title = buildSubmissionTitle(message, localize(locale, activeTopic.label));
      const response = await fetch("/api/community/bug-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportType: activeTopic.reportType,
          title,
          description: [
            `${fr ? "Catégorie" : "Category"}: ${localize(locale, activeTopic.label)}`,
            `Page: ${pagePath}`,
            "",
            message.trim(),
          ].join("\n"),
          pagePath,
          source,
          honeypot,
          submittedAt: formStartedAt ?? Date.now(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; kind?: string }
          | null;
        throw new Error(
          body?.message ??
            body?.error ??
            (fr ? "Impossible d'envoyer le retour." : "Unable to send the feedback."),
        );
      }

      setSubmitState("success");
      setLastSubmittedTitle(title);
      setMessage("");
    } catch (error) {
      setSubmitState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : fr
            ? "Une erreur inattendue est survenue."
            : "An unexpected error occurred.",
      );
    }
  }

  return (
    <div className="space-y-10 pb-20 pt-2 text-slate-950">
      <header className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/70 bg-pink-50 px-4 py-2 text-pink-600 shadow-sm">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              {fr ? "Feedback & qualité" : "Feedback & quality"}
            </span>
          </div>

          <div className="space-y-4">
            <h1
              ref={titleRef}
              className="text-[clamp(2.3rem,4.8vw,4.5rem)] font-black leading-[0.92] tracking-[-0.04em] text-slate-950"
            >
              {fr ? "Retours & Qualité" : "Feedback & Quality"}
            </h1>
            <p className="max-w-2xl text-[1rem] leading-[1.7] text-slate-600">
              {fr
                ? "Vos retours nous aident à améliorer CleanMyMap en continu et à garantir des données fiables et utiles pour tous."
                : "Your feedback helps us improve CleanMyMap continuously and keep the data reliable and useful for everyone."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEEDBACK_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={localize(locale, metric.label)}
                className="rounded-[1.5rem] border border-rose-200/70 bg-white/90 p-5 shadow-[0_18px_48px_-42px_rgba(236,72,153,0.35)] backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-500">
                  <Icon size={18} />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {localize(locale, metric.label)}
                </p>
                <p className="mt-3 text-[clamp(2rem,2.6vw,2.6rem)] font-black leading-none tracking-[-0.04em] text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-2 text-[0.84rem] leading-relaxed text-slate-500">
                  {localize(locale, metric.detail)}
                </p>
              </div>
            );
          })}
        </div>
      </header>

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

          <form onSubmit={handleSubmit} className="mt-2 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-[0.95rem] font-black tracking-[-0.02em] text-slate-950">
                  {fr ? "Quel est votre retour ?" : "What is your feedback?"}
                </span>
                <textarea
                  value={message}
                  onChange={(event) => {
                    if (submitState !== "idle") {
                      setSubmitState("idle");
                      setErrorMessage(null);
                    }
                    setMessage(event.target.value);
                  }}
                  rows={8}
                  placeholder={localize(locale, activeTopic.placeholder)}
                  className="min-h-[188px] w-full rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 text-[0.98rem] leading-[1.7] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                />
                <span className="text-[0.78rem] leading-relaxed text-slate-500">
                  {localize(locale, activeTopic.helper)}
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-pink-200 bg-white px-4 py-3 text-sm font-medium text-pink-500">
                  <ArrowRight size={16} />
                  {fr
                    ? "Ajouter une capture d'écran (facultatif)"
                    : "Add a screenshot (optional)"}
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
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
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

              {isLoaded && !isSignedIn ? (
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-medium text-amber-950">
                    {fr
                      ? "Connecte-toi pour envoyer ce retour."
                      : "Sign in to submit this feedback."}
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
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div
          id="improvement"
          className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)] backdrop-blur-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
                {fr ? "Suivi des retours" : "Feedback tracking"}
              </h2>
              <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
                {fr
                  ? "Consultez l'état d'avancement des sujets que vous avez signalés ou suivis."
                  : "Track the progress of the issues you submitted or follow."}
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-12 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
            >
              <option value="all">{fr ? "Tous les statuts" : "All statuses"}</option>
              <option value="en_cours">{fr ? "En cours" : "In progress"}</option>
              <option value="traite">{fr ? "Traité" : "Resolved"}</option>
              <option value="planifie">{fr ? "Planifié" : "Planned"}</option>
            </select>
          </div>

          <div className="mt-6 space-y-3">
            {visibleTrackerItems.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={localize(locale, item.title)}
                  className="grid gap-4 rounded-[1.5rem] border border-rose-100 bg-white p-4 transition hover:border-rose-200 hover:shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-pink-500">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-[0.94rem] font-bold leading-tight text-slate-950">
                      {localize(locale, item.title)}
                    </h3>
                    <p className="mt-1 text-[0.78rem] leading-relaxed text-slate-500">
                      {localize(locale, item.category)}
                    </p>
                    <p className="mt-3 text-[0.96rem] leading-[1.65] text-slate-600">
                      {localize(locale, item.summary)}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end md:justify-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusTone(item.statusId)}`}
                    >
                      {localize(locale, item.status)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-pink-400" />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center">
            <CmmButton
              href="/sections/feedback#bug"
              tone="secondary"
              variant="pill"
              className="h-12 px-8 text-[0.72rem] font-black uppercase tracking-[0.16em] text-pink-600"
            >
              {fr ? "Voir tous mes retours" : "See all my feedback"}
              <ArrowRight size={16} />
            </CmmButton>
          </div>
        </div>

        <aside
          id="collaboration"
          className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)] backdrop-blur-sm"
        >
          <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
            {fr ? "Comment ça marche ?" : "How it works"}
          </h2>
          <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
            {fr
              ? "Consultez notre centre d'aide ou contactez-nous."
              : "Check our help center or contact us."}
          </p>

          <div className="mt-5 space-y-4">
            {FEEDBACK_STEPS.map((step) => (
              <div key={step.index} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-lg font-black text-pink-600">
                  {step.index}
                </div>
                <div>
                  <p className="text-[0.95rem] font-bold leading-tight text-slate-950">
                    {localize(locale, step.title)}
                  </p>
                  <p className="mt-1 text-[0.96rem] leading-[1.65] text-slate-600">
                    {localize(locale, step.body)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <CmmButton
              href="/learn/comprendre"
              tone="secondary"
              variant="pill"
              className="h-12 w-full px-6 text-xs font-black uppercase tracking-[0.18em] text-pink-600"
            >
              {fr ? "En savoir plus" : "Learn more"}
              <ArrowRight size={16} />
            </CmmButton>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)] backdrop-blur-sm">
          <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
            {fr ? "Vos idées, notre feuille de route" : "Your ideas, our roadmap"}
          </h2>
          <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
            {fr
              ? "Les suggestions les plus demandées par la communauté."
              : "The most requested suggestions by the community."}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {FEEDBACK_ROADMAP_ITEMS.map((item, index) => (
              <article
                key={localize(locale, item.title)}
                className="rounded-[1.5rem] border border-rose-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-sm font-black text-pink-600">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[0.94rem] font-bold leading-tight text-slate-950">
                      {localize(locale, item.title)}
                    </h3>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="text-pink-500">{item.score}</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-rose-100">
                  <div
                    className="h-2 rounded-full bg-pink-500"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-slate-500">
                  {localize(locale, item.state)}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <CmmButton
              href="/sections/feedback#improvement"
              tone="secondary"
              variant="pill"
              className="h-12 px-8 text-xs font-black uppercase tracking-[0.18em] text-pink-600"
            >
              {fr ? "Voir toutes les idées" : "See all ideas"}
              <ArrowRight size={16} />
            </CmmButton>
          </div>
        </div>

        <div className="space-y-6">
          <aside className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)] backdrop-blur-sm">
            <h2 className="text-[0.9rem] font-black uppercase tracking-[0.18em] text-pink-600">
              {fr ? "Une question ?" : "A question?"}
            </h2>
            <p className="mt-2 text-[0.96rem] leading-[1.65] text-slate-600">
              {fr
                ? "Consultez notre centre d'aide ou contactez-nous."
                : "Check our help center or contact us."}
            </p>

            <div className="mt-5 space-y-3">
              {FEEDBACK_SUPPORT_LINKS.map((item) => {
                const Icon = item.icon;
                const rowClassName =
                  "group flex items-center justify-between rounded-[1.35rem] border border-rose-100 bg-white p-4 transition hover:border-rose-200 hover:shadow-sm";

                const rowContent = (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-pink-500">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-[0.94rem] font-bold leading-tight text-slate-950">
                          {localize(locale, item.title)}
                        </p>
                        <p className="text-[0.78rem] leading-relaxed text-slate-500">
                          {localize(locale, item.description)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-pink-400 transition group-hover:translate-x-0.5" />
                  </>
                );

                if (item.href.startsWith("mailto:")) {
                  return (
                    <a key={item.href} href={item.href} className={rowClassName}>
                      {rowContent}
                    </a>
                  );
                }

                return (
                  <Link key={item.href} href={item.href} className={rowClassName}>
                    {rowContent}
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2.5rem] bg-[linear-gradient(135deg,#f42d74_0%,#d61f6b_48%,#c81d62_100%)] p-6 text-white shadow-[0_30px_100px_-54px_rgba(244,45,116,0.95)]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/95 text-pink-500 shadow-2xl">
              <Heart size={34} />
            </div>
            <div className="max-w-2xl space-y-2">
              <h2 className="text-[1.2rem] font-black leading-tight tracking-[-0.03em] sm:text-[1.35rem]">
                {fr ? "Votre avis fait la différence" : "Your feedback makes a difference"}
              </h2>
              <p className="max-w-xl text-[0.96rem] leading-[1.7] text-white/90">
                {fr
                  ? "Ensemble, améliorons CleanMyMap pour un impact toujours plus fort et des données toujours plus fiables."
                  : "Together, let's improve CleanMyMap for stronger impact and more reliable data."}
              </p>
            </div>
          </div>

          <CmmButton
            href="/sections/community?tab=partners"
            tone="secondary"
            variant="pill"
            className="h-14 rounded-full bg-white px-6 text-xs font-black uppercase tracking-[0.18em] text-pink-600 shadow-2xl"
          >
            {fr ? "Devenir contributeur" : "Become a contributor"}
            <ArrowRight size={16} />
          </CmmButton>
        </div>
      </section>
    </div>
  );
}
