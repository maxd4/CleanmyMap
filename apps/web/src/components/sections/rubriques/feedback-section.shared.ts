import {
  BookOpen,
  Database,
  Flag,
  HelpCircle,
  Heart,
  Lightbulb,
  Mail,
  MessageSquare,
  Monitor,
  Users,
  type LucideIcon,
} from "lucide-react";
import { resolvePublicContactEmail } from "@/lib/email-config";

export type Locale = "fr" | "en";
type FeedbackReportType = "bug" | "idea" | "improvement" | "collaboration";
type FeedbackSource = "feedback_section" | "feedback_discussion";
export type FeedbackTopicId =
  | "all"
  | "signalement"
  | "amelioration"
  | "donnees"
  | "interface"
  | "partenariats"
  | "autre";

export type L10n = { fr: string; en: string };

export type FeedbackTopic = {
  id: FeedbackTopicId;
  label: L10n;
  helper: L10n;
  placeholder: L10n;
  reportType: FeedbackReportType;
  icon: LucideIcon;
};

export type SupportLink = {
  title: L10n;
  description: L10n;
  href: string;
  icon: LucideIcon;
};

export type FeedbackSectionProps = {
  pagePath?: string;
  source?: FeedbackSource;
};

export type FeedbackSectionContext = {
  pagePath: string;
  supportPrefill: Partial<Record<string, string>> | null;
};

export const FEEDBACK_TOPICS: FeedbackTopic[] = [
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
    icon: MessageSquare,
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

export const FEEDBACK_STEPS = [
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
    title: { fr: "Votre retour est transmis", en: "Your feedback is sent" },
    body: {
      fr: "Le retour est transmis à CleanMyMap pour examen.",
      en: "Your feedback is sent to CleanMyMap for review.",
    },
  },
];

export const FEEDBACK_SUPPORT_LINKS: SupportLink[] = [
  {
    title: { fr: "Centre d'aide", en: "Help center" },
    description: {
      fr: "Accéder à la documentation",
      en: "Access the documentation",
    },
    href: "/learn/comprendre",
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
    href: "/learn/bonnes-pratiques#guides-courts",
    icon: HelpCircle,
  },
  {
    title: { fr: "Soutenir le projet", en: "Support the project" },
    description: {
      fr: "Contribuer aux actions et au développement",
      en: "Support field actions and development",
    },
    href: "/sections/funding",
    icon: Heart,
  },
];

export function resolveFeedbackSectionContext(
  pagePathOverride?: string,
): FeedbackSectionContext {
  const pagePath =
    pagePathOverride ??
    (typeof window === "undefined" ? "/sections/feedback" : window.location.pathname);

  if (typeof window === "undefined") {
    return {
      pagePath,
      supportPrefill: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const hasPrefill =
    params.has("subject") ||
    params.has("context") ||
    params.has("steps") ||
    params.has("expected");

  if (!hasPrefill) {
    return {
      pagePath,
      supportPrefill: null,
    };
  }

  return {
    pagePath,
    supportPrefill: {
      subject: params.get("subject") ?? "",
      context: params.get("context") ?? "",
      steps: params.get("steps") ?? "",
      expected: params.get("expected") ?? "",
    },
  };
}

export function localize(locale: Locale, value: L10n): string {
  return value[locale];
}

export function buildPrefillText(
  prefill: Partial<Record<string, string>> | null,
  locale: Locale,
): string {
  if (!prefill) {
    return "";
  }

  const lines = [
    prefill["subject"] ? `${locale === "fr" ? "Sujet" : "Subject"}: ${prefill["subject"]}` : null,
    prefill["context"] ? `${locale === "fr" ? "Contexte" : "Context"}: ${prefill["context"]}` : null,
    prefill["steps"] ? `${locale === "fr" ? "Étapes" : "Steps"}: ${prefill["steps"]}` : null,
    prefill["expected"]
      ? `${locale === "fr" ? "Résultat attendu" : "Expected"}: ${prefill["expected"]}`
      : null,
  ].filter(Boolean) as string[];

  return lines.join("\n\n");
}

export function buildSubmissionTitle(message: string, fallback: string): string {
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

export function getTopicById(topicId: FeedbackTopicId): FeedbackTopic {
  return FEEDBACK_TOPICS.find((topic) => topic.id === topicId) ?? FEEDBACK_TOPICS[0];
}
