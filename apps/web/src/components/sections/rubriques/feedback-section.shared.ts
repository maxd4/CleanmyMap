import {
  BookOpen,
  HelpCircle,
  Heart,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { resolvePublicContactEmail } from "@/lib/email-config";
import type { FeedbackType } from "./feedback/questionnaire-config";

export type Locale = "fr" | "en";
export type FeedbackSource = "feedback_section" | "feedback_discussion";
export type L10n = { fr: string; en: string };

export type SupportLink = {
  title: L10n;
  description: L10n;
  href: string;
  icon: LucideIcon;
};

export type FeedbackSectionProps = {
  pagePath?: string;
  source?: FeedbackSource;
  initialSearchParams?: FeedbackSectionSearchParams;
};

export type FeedbackSectionSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type FeedbackSectionUrlState = {
  pathname?: string;
  searchParams?: URLSearchParams | FeedbackSectionSearchParams;
  hash?: string;
};

export type FeedbackSectionContext = {
  pagePath: string;
  supportPrefill: Partial<Record<string, string>> | null;
  initialType: FeedbackType;
  source: FeedbackSource;
};

export const FEEDBACK_STEPS = [
  {
    index: "1",
    title: { fr: "Vous choisissez un sujet", en: "You choose a topic" },
    body: {
      fr: "Bug, idée, amélioration ou collaboration.",
      en: "Bug, idea, improvement or collaboration.",
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

function parseFeedbackType(value: string | null | undefined): FeedbackType | null {
  return value === "bug" ||
    value === "idea" ||
    value === "improvement" ||
    value === "collaboration"
    ? value
    : null;
}

export function buildFeedbackCanonicalHref(params: {
  type: FeedbackType;
  supportPrefill?: Partial<Record<string, string>> | null;
  source?: FeedbackSource;
}): string {
  const searchParams = new URLSearchParams({ type: params.type });
  const prefill = params.supportPrefill;

  for (const key of ["subject", "context", "steps", "expected"]) {
    const value = prefill?.[key]?.trim();
    if (value) searchParams.set(key, value);
  }

  if (params.source) searchParams.set("source", params.source);

  return `/sections/feedback?${searchParams.toString()}#${params.type}`;
}

function toSearchParams(
  input: FeedbackSectionUrlState["searchParams"],
): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(input ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) searchParams.append(key, item);
    } else if (value !== undefined) {
      searchParams.set(key, value);
    }
  }
  return searchParams;
}

export function resolveFeedbackSectionContext(
  pagePathOverride?: string,
  urlState: FeedbackSectionUrlState = {},
): FeedbackSectionContext {
  const pagePath = pagePathOverride ?? urlState.pathname ?? "/sections/feedback";
  const params = toSearchParams(urlState.searchParams);
  const hasPrefill =
    params.has("subject") ||
    params.has("context") ||
    params.has("steps") ||
    params.has("expected");
  const hashType = parseFeedbackType((urlState.hash ?? "").replace(/^#/, ""));

  return {
    pagePath,
    supportPrefill: hasPrefill
      ? {
          subject: params.get("subject") ?? "",
          context: params.get("context") ?? "",
          steps: params.get("steps") ?? "",
          expected: params.get("expected") ?? "",
        }
      : null,
    initialType:
      parseFeedbackType(params.get("type")) ??
      hashType ??
      (hasPrefill ? "bug" : "idea"),
    source:
      params.get("source") === "feedback_discussion"
        ? "feedback_discussion"
        : "feedback_section",
  };
}

export function localize(locale: Locale, value: L10n): string {
  return value[locale];
}
