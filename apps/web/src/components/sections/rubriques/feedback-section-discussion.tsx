"use client";

import { ArrowRight, Mail, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  FEEDBACK_METRICS,
  FEEDBACK_SUPPORT_LINKS,
  type FeedbackSectionProps,
  type Locale,
} from "./feedback-section.shared";
import { QuestionnaireCard } from "./feedback/questionnaire-card";
import { QUESTIONNAIRES } from "./feedback/questionnaire-config";
import { resolvePublicContactEmail } from "@/lib/email-config";

function FeedbackDiscussionMode({
  fr,
  pagePath,
  source,
  supportPrefill,
}: {
  fr: boolean;
  pagePath: string;
  source: FeedbackSectionProps["source"];
  supportPrefill: Partial<Record<string, string>> | null;
}) {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <section
      id="feedback"
      className="space-y-5 rounded-[2.25rem] border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,249,251,0.98)_0%,rgba(255,255,255,0.98)_100%)] p-4 text-slate-950 shadow-[0_26px_90px_-72px_rgba(236,72,153,0.6)] sm:p-5"
    >
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr] xl:items-end">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/80 bg-pink-50 px-4 py-2 text-pink-600 shadow-sm">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">
              {fr ? "Feedback & qualité" : "Feedback & quality"}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-[clamp(2rem,4.2vw,3.6rem)] font-black leading-[0.92] tracking-[-0.04em] text-slate-950">
              {fr ? "Retours & Qualité" : "Feedback & Quality"}
            </h1>
            <p className="max-w-2xl text-[0.98rem] leading-[1.7] text-slate-600">
              {fr
                ? "Vos retours nous aident à améliorer CleanMyMap en continu et à garantir des données fiables et utiles pour tous."
                : "Your feedback helps us improve CleanMyMap continuously and keep the data reliable and useful for everyone."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {FEEDBACK_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label.fr}
                className="rounded-[1.35rem] border border-rose-200/70 bg-white/90 p-4 shadow-[0_16px_42px_-36px_rgba(236,72,153,0.38)] backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-500">
                  <Icon size={18} />
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {fr ? metric.label.fr : metric.label.en}
                </p>
                <p className="mt-2 text-[clamp(1.65rem,2.8vw,2.3rem)] font-black leading-none tracking-[-0.04em] text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-slate-500">
                  {fr ? metric.detail.fr : metric.detail.en}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.8rem] border border-rose-200/70 bg-white/90 p-5 shadow-[0_22px_62px_-54px_rgba(236,72,153,0.48)]">
          <div className="grid gap-4 xl:grid-cols-3">
            {QUESTIONNAIRES.map((questionnaire) => (
              <div key={questionnaire.id} id={questionnaire.id}>
                <QuestionnaireCard
                  questionnaire={questionnaire}
                  pagePath={pagePath}
                  source={source ?? "feedback_discussion"}
                  initialValues={questionnaire.id === "bug" ? supportPrefill ?? undefined : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[1.8rem] border border-rose-200/70 bg-[linear-gradient(135deg,rgba(255,247,250,0.98)_0%,rgba(255,255,255,0.98)_100%)] p-5 shadow-[0_22px_62px_-54px_rgba(236,72,153,0.48)]">
            <div className="pointer-events-none absolute -right-16 -bottom-16 opacity-10">
              <Mail size={220} className="text-rose-400" />
            </div>

            <div className="relative z-10 flex items-start gap-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-500 shadow-sm">
                <Mail size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black leading-tight tracking-[-0.03em] text-slate-950">
                  {fr ? "Besoin d'un contact direct ?" : "Need a direct contact?"}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {fr ? "Support & partenariats" : "Support & partnerships"}
                </p>
                <p className="max-w-md text-[0.96rem] leading-[1.65] text-slate-600">
                  {fr
                    ? "Le mail reste disponible si le retour doit sortir du cadre des formulaires standardisés."
                    : "Email remains available if the reply needs to go beyond standardized forms."}
                </p>
              </div>
            </div>

          <a
            href={`mailto:${contactEmail}`}
            className="relative z-10 mt-5 inline-flex h-12 items-center gap-3 rounded-full bg-pink-500 px-6 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_-22px_rgba(236,72,153,0.9)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {fr ? "Écrire un mail" : "Write an email"}
            <ArrowRight size={18} />
          </a>
        </div>

        <div className="rounded-[1.5rem] border border-rose-200/70 bg-white/92 p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-600">
            {fr ? "Centre d'aide" : "Help center"}
          </p>
          <div className="mt-4 space-y-3">
            {FEEDBACK_SUPPORT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-start gap-3 rounded-[1.15rem] border border-rose-100 bg-rose-50/70 px-4 py-3 transition hover:border-rose-200 hover:bg-rose-50"
              >
                <div className="rounded-2xl border border-rose-200 bg-white p-2 text-rose-500 shadow-sm">
                  <link.icon size={16} />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-slate-950">
                    {fr ? link.title.fr : link.title.en}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {fr ? link.description.fr : link.description.en}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-[1.5rem] border border-rose-200/70 bg-white/92 p-4 shadow-sm">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-500">
              <Sparkles size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-950">
                  {fr ? "Traitement prioritaire" : "Priority processing"}
                </h4>
                <p className="text-xs leading-relaxed text-slate-500">
                  {fr ? "Réponse garantie sous 48h" : "Response guaranteed within 48h"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-[1.5rem] border border-rose-200/70 bg-white/92 p-4 shadow-sm">
              <div className="rounded-2xl border border-pink-200 bg-pink-50 p-3 text-pink-500">
                <MessageSquare size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-950">
                  {fr ? "Amélioration continue" : "Continuous improvement"}
                </h4>
                <p className="text-xs leading-relaxed text-slate-500">
                  {fr ? "100% des retours sont analysés" : "100% of feedback is analyzed"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeedbackSectionDiscussion({
  pagePath,
  source,
  supportPrefill,
  locale,
}: {
  pagePath: string;
  source: FeedbackSectionProps["source"];
  supportPrefill: Partial<Record<string, string>> | null;
  locale: Locale;
}) {
  return (
    <FeedbackDiscussionMode
      fr={locale === "fr"}
      pagePath={pagePath}
      source={source}
      supportPrefill={supportPrefill}
    />
  );
}
