"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import {
  buildFeedbackCanonicalHref,
  FEEDBACK_SUPPORT_LINKS,
  type FeedbackSource,
  type Locale,
} from "./feedback-section.shared";
import { PageHeader } from "@/components/ui/page-header";
import { QUESTIONNAIRES, type FeedbackType } from "./feedback/questionnaire-config";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { CmmButton } from "@/components/ui/cmm-button";

function FeedbackDiscussionMode({
  fr,
  source,
  supportPrefill,
}: {
  fr: boolean;
  source: FeedbackSource;
  supportPrefill: Partial<Record<string, string>> | null;
}) {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <section
      id="feedback"
      className="space-y-5 rounded-[2.25rem] border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,249,251,0.98)_0%,rgba(255,255,255,0.98)_100%)] p-4 text-slate-950 shadow-[0_26px_90px_-72px_rgba(236,72,153,0.6)] sm:p-5"
    >
      <div>
        <div className="space-y-4">
          <PageHeader
            title={fr ? "Retours & Qualité" : "Feedback & Quality"}
            subtitle={
              fr
                ? "Vos retours nous aident à améliorer CleanMyMap en continu et à garantir des données fiables et utiles pour tous."
                : "Your feedback helps us improve CleanMyMap continuously and keep the data reliable and useful for everyone."
            }
          />
        </div>

      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.8rem] border border-rose-200/70 bg-white/90 p-5 shadow-[0_22px_62px_-54px_rgba(236,72,153,0.48)]">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-pink-600">
            {fr ? "Choisir un type de retour" : "Choose a feedback type"}
          </p>
          <p className="mt-2 max-w-2xl text-[0.96rem] leading-[1.65] text-slate-600">
            {fr
              ? "Le formulaire complet s’ouvre sur la page Feedback afin de garder un seul parcours de saisie."
              : "The complete form opens on the Feedback page so there is one submission flow."}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {QUESTIONNAIRES.map((questionnaire) => {
              const Icon = questionnaire.icon;
              const type = questionnaire.id as FeedbackType;
              return (
                <Link
                  key={questionnaire.id}
                  id={questionnaire.id}
                  href={buildFeedbackCanonicalHref({
                    type,
                    supportPrefill: questionnaire.id === "bug" ? supportPrefill : null,
                    source,
                  })}
                  className="flex min-h-24 items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 transition hover:border-pink-300 hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  <Icon className="mt-0.5 shrink-0 text-pink-500" size={18} aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-bold text-slate-950">
                      {fr ? questionnaire.title.fr : questionnaire.title.en}
                    </span>
                    <span className="cmm-text-small mt-1 block leading-relaxed text-slate-500">
                      {fr ? questionnaire.intro.fr : questionnaire.intro.en}
                    </span>
                  </span>
                  <ArrowRight className="ml-auto mt-1 shrink-0 text-pink-400" size={16} aria-hidden="true" />
                </Link>
              );
            })}
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

          <CmmButton
            asChild
            tone="important"
            variant="pill"
            className="relative z-10 mt-5 h-12 px-6 text-[11px] font-black uppercase tracking-[0.18em]"
          >
            <a href={`mailto:${contactEmail}`}>
            {fr ? "Écrire un mail" : "Write an email"}
            <ArrowRight size={18} />
            </a>
          </CmmButton>
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

      </div>
      </div>
    </section>
  );
}

export function FeedbackSectionDiscussion({
  source,
  supportPrefill,
  locale,
}: {
  source: FeedbackSource;
  supportPrefill: Partial<Record<string, string>> | null;
  locale: Locale;
}) {
  return (
    <FeedbackDiscussionMode
      fr={locale === "fr"}
      source={source ?? "feedback_discussion"}
      supportPrefill={supportPrefill}
    />
  );
}
