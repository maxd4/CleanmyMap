"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  Flag,
  Heart,
  HelpCircle,
  Lightbulb,
  Mail,
  MessageSquare,
  Monitor,
  Paperclip,
  PencilLine,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { QuestionnaireCard } from "./feedback/questionnaire-card";
import { QUESTIONNAIRES } from "./feedback/questionnaire-config";

type Locale = "fr" | "en";
type FeedbackReportType = "bug" | "idea" | "improvement" | "collaboration";
type FeedbackSource = "feedback_section" | "feedback_discussion";
type FeedbackTopicId =
  | "all"
  | "signalement"
  | "amelioration"
  | "donnees"
  | "interface"
  | "partenariats"
  | "autre";
type StatusFilter = "all" | "en_cours" | "traite" | "planifie";

type L10n = { fr: string; en: string };

type FeedbackTopic = {
  id: FeedbackTopicId;
  label: L10n;
  helper: L10n;
  placeholder: L10n;
  reportType: FeedbackReportType;
  icon: typeof MessageSquare;
};

type FeedbackMetric = {
  label: L10n;
  value: string;
  detail: L10n;
  icon: typeof MessageSquare;
};

type TrackerItem = {
  title: L10n;
  category: L10n;
  status: L10n;
  statusId: Exclude<StatusFilter, "all">;
  summary: L10n;
  icon: typeof Flag;
};

type RoadmapItem = {
  title: L10n;
  score: number;
  state: L10n;
  progress: number;
};

type SupportLink = {
  title: L10n;
  description: L10n;
  href: string;
  icon: typeof HelpCircle;
};

const FEEDBACK_TOPICS: FeedbackTopic[] = [
  {
    id: "all",
    label: { fr: "Tous les sujets", en: "All topics" },
    helper: {
      fr: "Un retour libre pour signaler, proposer ou clarifier un point du produit.",
      en: "A free-form reply to report, suggest or clarify a product point.",
    },
    placeholder: {
      fr: "Décrivez votre expérience, votre suggestion ou le problème rencontré...",
      en: "Describe your experience, suggestion or issue...",
    },
    reportType: "idea",
    icon: PencilLine,
  },
  {
    id: "signalement",
    label: { fr: "Signalement", en: "Issue" },
    helper: {
      fr: "Décrivez ce qui casse, où cela arrive et ce que vous attendiez.",
      en: "Describe what breaks, where it happens and what you expected.",
    },
    placeholder: {
      fr: "Expliquez le problème rencontré, le contexte et l'impact...",
      en: "Explain the issue, the context and the impact...",
    },
    reportType: "bug",
    icon: Flag,
  },
  {
    id: "amelioration",
    label: { fr: "Amélioration", en: "Improvement" },
    helper: {
      fr: "Partagez une idée concrète pour simplifier un parcours ou gagner en clarté.",
      en: "Share a concrete idea to simplify a flow or improve clarity.",
    },
    placeholder: {
      fr: "Décrivez l'amélioration que vous souhaitez voir...",
      en: "Describe the improvement you want to see...",
    },
    reportType: "improvement",
    icon: Lightbulb,
  },
  {
    id: "donnees",
    label: { fr: "Données", en: "Data" },
    helper: {
      fr: "Remontez une incohérence, un manque ou une piste d'export utile.",
      en: "Flag an inconsistency, a missing piece or a useful export idea.",
    },
    placeholder: {
      fr: "Détaillez le besoin de données, d'export ou de précision...",
      en: "Detail the need for data, export or precision...",
    },
    reportType: "idea",
    icon: Database,
  },
  {
    id: "interface",
    label: { fr: "Interface", en: "Interface" },
    helper: {
      fr: "Remontez un problème d'ergonomie, d'affichage ou de lisibilité.",
      en: "Report a UX, display or readability issue.",
    },
    placeholder: {
      fr: "Précisez la zone de l'interface concernée...",
      en: "Specify the part of the interface involved...",
    },
    reportType: "bug",
    icon: Monitor,
  },
  {
    id: "partenariats",
    label: { fr: "Partenariats", en: "Partnerships" },
    helper: {
      fr: "Proposez une mise en lien, une collaboration ou une piste terrain.",
      en: "Propose an introduction, collaboration or field lead.",
    },
    placeholder: {
      fr: "Décrivez la structure, le sujet et la prochaine étape souhaitée...",
      en: "Describe the organization, topic and desired next step...",
    },
    reportType: "collaboration",
    icon: Users,
  },
  {
    id: "autre",
    label: { fr: "Autre", en: "Other" },
    helper: {
      fr: "Pour un retour utile qui ne rentre pas dans les catégories précédentes.",
      en: "For a useful reply that does not fit the previous categories.",
    },
    placeholder: {
      fr: "Ajoutez votre message ici...",
      en: "Add your message here...",
    },
    reportType: "idea",
    icon: MessageSquare,
  },
];

const FEEDBACK_METRICS: FeedbackMetric[] = [
  {
    label: { fr: "Avis reçus", en: "Reviews received" },
    value: "127",
    detail: { fr: "+18 ce mois", en: "+18 this month" },
    icon: MessageSquare,
  },
  {
    label: { fr: "Actions réalisées", en: "Actions completed" },
    value: "86",
    detail: { fr: "68% des retours traités", en: "68% of replies processed" },
    icon: CheckCircle2,
  },
  {
    label: { fr: "Note moyenne", en: "Average rating" },
    value: "4,6 / 5",
    detail: { fr: "Basée sur 89 avis", en: "Based on 89 reviews" },
    icon: Star,
  },
  {
    label: { fr: "Membres engagés", en: "Engaged members" },
    value: "64",
    detail: { fr: "Contributeurs actifs", en: "Active contributors" },
    icon: Users,
  },
];

const FEEDBACK_TRACKER_ITEMS: TrackerItem[] = [
  {
    title: { fr: "Ajouter un filtre par type de déchet", en: "Add a waste-type filter" },
    category: { fr: "Amélioration • Interface", en: "Improvement • Interface" },
    status: { fr: "En cours", en: "In progress" },
    statusId: "en_cours",
    summary: {
      fr: "Nous travaillons sur l'ajout d'un filtre avancé par catégorie de déchet dans la cartographie.",
      en: "We are working on adding an advanced waste category filter to the map.",
    },
    icon: PencilLine,
  },
  {
    title: { fr: "Signalement point noir", en: "Hotspot report" },
    category: { fr: "Signalement • Données", en: "Issue • Data" },
    status: { fr: "Traité", en: "Resolved" },
    statusId: "traite",
    summary: {
      fr: "Le point a été vérifié et supprimé de la carte. Merci pour votre vigilance !",
      en: "The point was verified and removed from the map. Thanks for the alert.",
    },
    icon: Flag,
  },
  {
    title: { fr: "Proposition : export des données", en: "Proposal: data export" },
    category: { fr: "Amélioration • Open Data", en: "Improvement • Open Data" },
    status: { fr: "Planifié", en: "Planned" },
    statusId: "planifie",
    summary: {
      fr: "Fonctionnalité validée. Intégration prévue dans la prochaine mise à jour.",
      en: "Feature approved. Integration planned for the next update.",
    },
    icon: Database,
  },
  {
    title: { fr: "Correction données collectées", en: "Collected data correction" },
    category: { fr: "Données • Qualité", en: "Data • Quality" },
    status: { fr: "Traité", en: "Resolved" },
    statusId: "traite",
    summary: {
      fr: "Les données ont été corrigées et la qualité mise à jour.",
      en: "The data was corrected and the quality was updated.",
    },
    icon: CheckCircle2,
  },
];

const FEEDBACK_ROADMAP_ITEMS: RoadmapItem[] = [
  {
    title: { fr: "Export des données en CSV", en: "CSV data export" },
    score: 128,
    state: { fr: "En développement", en: "In development" },
    progress: 80,
  },
  {
    title: { fr: "Filtre avancé par type de déchet", en: "Advanced waste filter" },
    score: 96,
    state: { fr: "En cours d'analyse", en: "Under analysis" },
    progress: 60,
  },
  {
    title: { fr: "Application mobile", en: "Mobile app" },
    score: 74,
    state: { fr: "À l'étude", en: "Under review" },
    progress: 40,
  },
  {
    title: { fr: "Tableau de bord personnalisé", en: "Personal dashboard" },
    score: 53,
    state: { fr: "À l'étude", en: "Under review" },
    progress: 20,
  },
];

const FEEDBACK_STEPS = [
  {
    index: "1",
    title: { fr: "Vous partagez un retour", en: "You share feedback" },
    body: {
      fr: "Idée, problème ou suggestion en quelques clics.",
      en: "Idea, issue or suggestion in a few clicks.",
    },
  },
  {
    index: "2",
    title: { fr: "Nous l'analysions", en: "We review it" },
    body: {
      fr: "Votre retour est étudié par l'équipe concernée.",
      en: "Your feedback is reviewed by the relevant team.",
    },
  },
  {
    index: "3",
    title: { fr: "Nous agissons", en: "We act" },
    body: {
      fr: "Les améliorations sont intégrées et vous êtes informés.",
      en: "Improvements are shipped and you are informed.",
    },
  },
  {
    index: "4",
    title: { fr: "Vous suivez l'évolution", en: "You track progress" },
    body: {
      fr: "Consultez l'état d'avancement de vos retours à tout moment.",
      en: "Track your feedback status anytime.",
    },
  },
];

const FEEDBACK_SUPPORT_LINKS: SupportLink[] = [
  {
    title: { fr: "Centre d'aide", en: "Help center" },
    description: {
      fr: "Accéder à la documentation",
      en: "Access the documentation",
    },
    href: "/learn/hub",
    icon: BookOpen,
  },
  {
    title: { fr: "Contacter le support", en: "Contact support" },
    description: {
      fr: "Nous répondre directement",
      en: "Reach us directly",
    },
    href: "mailto:" + (resolvePublicContactEmail() ?? "contact@cleanmymap.fr"),
    icon: Mail,
  },
  {
    title: { fr: "FAQ", en: "FAQ" },
    description: {
      fr: "Voir les questions fréquentes",
      en: "View frequently asked questions",
    },
    href: "/learn/ressources",
    icon: HelpCircle,
  },
];

type FeedbackSectionProps = {
  pagePath?: string;
  source?: FeedbackSource;
};

function localize(locale: Locale, value: L10n): string {
  return value[locale];
}

function buildPrefillText(prefill: Partial<Record<string, string>> | null, locale: Locale): string {
  if (!prefill) {
    return "";
  }

  const lines = [
    prefill.subject ? `${locale === "fr" ? "Sujet" : "Subject"}: ${prefill.subject}` : null,
    prefill.context ? `${locale === "fr" ? "Contexte" : "Context"}: ${prefill.context}` : null,
    prefill.steps ? `${locale === "fr" ? "Étapes" : "Steps"}: ${prefill.steps}` : null,
    prefill.expected ? `${locale === "fr" ? "Résultat attendu" : "Expected"}: ${prefill.expected}` : null,
  ].filter(Boolean) as string[];

  return lines.join("\n\n");
}

function buildSubmissionTitle(message: string, fallback: string): string {
  const firstLine = message
    .trim()
    .split(/\r?\n/)[0]
    ?.replace(/^Sujet\s*:\s*/i, "")
    .trim();

  if (firstLine && firstLine.length >= 4) {
    return firstLine.slice(0, 160);
  }

  const trimmed = message.replace(/\s+/g, " ").trim();
  if (trimmed.length >= 4) {
    return trimmed.slice(0, 160);
  }

  return fallback;
}

function getTopicById(topicId: FeedbackTopicId): FeedbackTopic {
  return FEEDBACK_TOPICS.find((topic) => topic.id === topicId) ?? FEEDBACK_TOPICS[0];
}

function getStatusTone(statusId: StatusFilter): string {
  switch (statusId) {
    case "en_cours":
      return "border-amber-200 bg-amber-50 text-amber-600";
    case "traite":
      return "border-emerald-200 bg-emerald-50 text-emerald-600";
    case "planifie":
      return "border-violet-200 bg-violet-50 text-violet-600";
    default:
      return "border-rose-200 bg-rose-50 text-rose-600";
  }
}

function FeedbackDiscussionMode({
  fr,
  pagePath,
  source,
  supportPrefill,
}: {
  fr: boolean;
  pagePath: string;
  source: FeedbackSource;
  supportPrefill: Partial<Record<string, string>> | null;
}) {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <SectionShell
      id="feedback"
      title={fr ? "Retours & Qualité" : "Feedback & Quality"}
      subtitle={fr
        ? "Votre avis nous permet d'ajuster les algorithmes et d'améliorer continuellement l'expérience utilisateur."
        : "Your feedback allows us to tune algorithms and continuously improve the user experience."}
      icon={MessageSquare}
      gradient="from-rose-500/20 via-pink-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        <div className="grid gap-6 xl:grid-cols-3">
          {QUESTIONNAIRES.map((questionnaire) => (
            <div key={questionnaire.id} id={questionnaire.id}>
              <QuestionnaireCard
                questionnaire={questionnaire}
                pagePath={pagePath}
                source={source}
                initialValues={questionnaire.id === "bug" ? supportPrefill ?? undefined : undefined}
              />
            </div>
          ))}
        </div>

        <div className="relative flex flex-col gap-10 overflow-hidden rounded-[3rem] border border-white/5 bg-slate-900/40 p-10 shadow-2xl backdrop-blur-3xl md:flex-row md:items-center md:justify-between">
          <div className="pointer-events-none absolute -right-20 -bottom-20 p-20 opacity-5 transition-all duration-1000 group-hover:scale-110 group-hover:opacity-10">
            <Mail size={300} className="text-cyan-400" />
          </div>

          <div className="relative z-10 flex items-center gap-8">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-400 shadow-2xl transition-transform duration-700">
              <Mail size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-white">
                {fr ? "Besoin d'un contact direct ?" : "Need a direct contact?"}
              </h3>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {fr ? "Support & Partenariats" : "Support & Partnerships"}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center">
            <p className="max-w-xs text-sm font-bold leading-relaxed text-slate-400 md:text-right">
              {fr
                ? "Le mail reste disponible si le retour doit sortir du cadre des formulaires standardisés."
                : "Email remains available if the reply needs to go beyond standardized forms."}
            </p>
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex h-16 items-center gap-4 rounded-2xl bg-rose-500 px-8 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              {fr ? "Écrire un mail" : "Write an email"}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex items-center gap-6 rounded-[2.5rem] border border-white/5 bg-slate-950/20 p-8 shadow-xl backdrop-blur-3xl">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400">
              <Sparkles size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-widest text-white">
                {fr ? "Traitement Prioritaire" : "Priority Processing"}
              </h4>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {fr ? "Réponse garantie sous 48h" : "Response guaranteed within 48h"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 rounded-[2.5rem] border border-white/5 bg-slate-950/20 p-8 shadow-xl backdrop-blur-3xl">
            <div className="rounded-2xl border border-pink-500/20 bg-pink-500/10 p-4 text-pink-400">
              <MessageSquare size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-widest text-white">
                {fr ? "Amélioration Continue" : "Continuous Improvement"}
              </h4>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {fr ? "100% des retours sont analysés" : "100% of feedback is analyzed"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function FeedbackDashboardMode({
  fr,
  locale,
  pagePath,
  supportPrefill,
  source,
}: {
  fr: boolean;
  locale: Locale;
  pagePath: string;
  supportPrefill: Partial<Record<string, string>> | null;
  source: FeedbackSource;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const [topicId, setTopicId] = useState<FeedbackTopicId>(supportPrefill ? "signalement" : "all");
  const [message, setMessage] = useState<string>(() => buildPrefillText(supportPrefill, locale));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [honeypot, setHoneypot] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedTitle, setLastSubmittedTitle] = useState<string | null>(null);

  const titleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  useEffect(() => {
    if (!supportPrefill) {
      return;
    }
    setMessage((current) => (current.trim().length > 0 ? current : buildPrefillText(supportPrefill, locale)));
    setTopicId("signalement");
  }, [locale, supportPrefill]);

  const activeTopic = getTopicById(topicId);
  const canSubmit = message.trim().length >= 10 && submitState !== "submitting";
  const visibleTrackerItems = FEEDBACK_TRACKER_ITEMS.filter(
    (item) => statusFilter === "all" || item.statusId === statusFilter,
  );

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
            <span className="text-[11px] font-black uppercase tracking-[0.22em]">
              {fr ? "Feedback & qualité" : "Feedback & quality"}
            </span>
          </div>

          <div className="space-y-4">
            <h1
              ref={titleRef}
              className="text-[clamp(2.4rem,5vw,4.6rem)] font-black leading-[0.95] tracking-tight text-slate-950"
            >
              {fr ? "Retours & Qualité" : "Feedback & Quality"}
            </h1>
            <p className="max-w-2xl text-[1.04rem] leading-relaxed text-slate-600">
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
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                  {localize(locale, metric.label)}
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">{localize(locale, metric.detail)}</p>
              </div>
            );
          })}
        </div>
      </header>

      <section
        id="bug"
        className="rounded-[2.2rem] border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,248,250,0.98)_100%)] p-6 shadow-[0_28px_80px_-64px_rgba(236,72,153,0.6)]"
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-[0.92rem] font-black uppercase tracking-[0.22em] text-pink-600">
              {fr ? "Donnez votre avis" : "Give your feedback"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
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
                <span className="text-sm font-black text-slate-950">
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
                  className="min-h-[188px] w-full rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 text-[0.98rem] leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                />
                <span className="text-xs text-slate-500">
                  {localize(locale, activeTopic.helper)}
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-pink-200 bg-white px-4 py-3 text-sm font-medium text-pink-500">
                  <Paperclip size={16} />
                  {fr
                    ? "Ajouter une capture d'écran (facultatif)"
                    : "Add a screenshot (optional)"}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {fr ? "Votre envoi reste confidentiel et traçable." : "Your submission stays private and traceable."}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50/80 p-5">
                <div className="flex items-center gap-2 text-pink-600">
                  <ShieldCheck size={18} />
                  <h3 className="text-sm font-black uppercase tracking-[0.16em]">
                    {fr ? "Votre retour compte !" : "Your feedback matters!"}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {fr
                    ? "Chaque message est lu par notre équipe. Nous nous engageons à vous répondre sous 48h maximum."
                    : "Each message is read by our team. We commit to replying within 48 hours maximum."}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  {fr ? "Résumé" : "Summary"}
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-bold text-slate-950">
                    {localize(locale, activeTopic.label)}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {activeTopic.helper[locale]}
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
                  <SignInButton mode="modal">
                    <CmmButton
                      type="button"
                      tone="secondary"
                      variant="pill"
                      className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-pink-200 bg-white px-4 py-3 text-sm font-bold text-pink-600"
                    >
                      {fr ? "Se connecter" : "Sign in"}
                    </CmmButton>
                  </SignInButton>
                </div>
              ) : (
                <CmmButton
                  type="submit"
                  disabled={!canSubmit}
                  tone="primary"
                  variant="pill"
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-pink-500 px-6 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_-20px_rgba(236,72,153,0.85)] disabled:opacity-50"
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
              <h2 className="text-[0.92rem] font-black uppercase tracking-[0.22em] text-pink-600">
                {fr ? "Suivi des retours" : "Feedback tracking"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
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
                    <h3 className="truncate text-sm font-bold text-slate-950">
                      {localize(locale, item.title)}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {localize(locale, item.category)}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {localize(locale, item.summary)}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end md:justify-center">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${getStatusTone(item.statusId)}`}
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
              className="h-12 px-8 text-xs font-black uppercase tracking-[0.18em] text-pink-600"
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
          <h2 className="text-[0.92rem] font-black uppercase tracking-[0.22em] text-pink-600">
            {fr ? "Comment ça marche ?" : "How it works"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
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
                  <p className="text-sm font-bold text-slate-950">{localize(locale, step.title)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{localize(locale, step.body)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <CmmButton
              href="/learn/hub"
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
        <div
          className="rounded-[2rem] border border-rose-200/70 bg-white/88 p-6 shadow-[0_24px_72px_-60px_rgba(236,72,153,0.55)] backdrop-blur-sm"
        >
          <h2 className="text-[0.92rem] font-black uppercase tracking-[0.22em] text-pink-600">
            {fr ? "Vos idées, notre feuille de route" : "Your ideas, our roadmap"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {fr ? "Les suggestions les plus demandées par la communauté." : "The most requested suggestions by the community."}
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
                    <h3 className="text-sm font-bold text-slate-950">
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
                <p className="mt-3 text-sm text-slate-500">{localize(locale, item.state)}</p>
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
            <h2 className="text-[0.92rem] font-black uppercase tracking-[0.22em] text-pink-600">
              {fr ? "Une question ?" : "A question?"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {fr ? "Consultez notre centre d'aide ou contactez-nous." : "Check our help center or contact us."}
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
                      <p className="text-sm font-bold text-slate-950">{localize(locale, item.title)}</p>
                      <p className="text-xs text-slate-500">{localize(locale, item.description)}</p>
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
              <h2 className="text-xl font-black tracking-tight">
                {fr ? "Votre avis fait la différence" : "Your feedback makes a difference"}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-white/90">
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

export function FeedbackSection({
  pagePath: pagePathOverride,
  source = "feedback_section",
}: FeedbackSectionProps = {}) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const pagePath = useMemo(() => {
    if (pagePathOverride) {
      return pagePathOverride;
    }
    if (typeof window === "undefined") {
      return "/sections/feedback";
    }
    return window.location.pathname;
  }, [pagePathOverride]);

  const supportPrefill = useMemo<Partial<Record<string, string>> | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const hasPrefill =
      params.has("subject") ||
      params.has("context") ||
      params.has("steps") ||
      params.has("expected");

    if (!hasPrefill) {
      return null;
    }

    return {
      subject: params.get("subject") ?? "",
      context: params.get("context") ?? "",
      steps: params.get("steps") ?? "",
      expected: params.get("expected") ?? "",
    };
  }, []);

  if (source === "feedback_discussion") {
    return (
      <FeedbackDiscussionMode
        fr={fr}
        pagePath={pagePath}
        source={source}
        supportPrefill={supportPrefill}
      />
    );
  }

  return (
    <SectionShell id="feedback" hideHeader gradient="from-rose-100/80 via-white to-transparent">
      <FeedbackDashboardMode
        fr={fr}
        locale={locale}
        pagePath={pagePath}
        supportPrefill={supportPrefill}
        source={source}
      />
    </SectionShell>
  );
}
