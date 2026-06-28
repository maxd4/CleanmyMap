import type { ReactNode } from "react";
import { Calculator, MapPin, Megaphone, Repeat2 } from "lucide-react";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import type { QuizUiCopyKey } from "@/lib/learning/quiz-i18n";
import { getQuizUiCopy } from "@/lib/learning/quiz-i18n";

export type QuizSchoolTrackId =
  | "debat-classe"
  | "mission-terrain"
  | "ordres-de-grandeur"
  | "gestes-du-quotidien";

export type QuizSchoolTrackDefinition = {
  id: QuizSchoolTrackId;
  label: string;
  labelKey: QuizUiCopyKey;
  description: Record<SupportedLocale, string>;
  focus: Record<SupportedLocale, string[]>;
  keyMessages: Record<SupportedLocale, string[]>;
  tone: string;
  icon: ReactNode;
};

export const QUIZ_SCHOOL_TRACKS: readonly QuizSchoolTrackDefinition[] = [
  {
    id: "debat-classe",
    label: "Débat en classe",
    labelKey: "school.debat-classe.label",
    description: {
      fr: "Questions qui font voter, hésiter et argumenter avant de révéler la réponse.",
      en: "Questions that invite a vote, hesitation and discussion before the answer is revealed.",
    },
    focus: {
      fr: ["Idées reçues et affirmations nuancées", "Vrai / Faux piégeux mais justes"],
      en: ["Misconceptions and nuanced statements", "Tricky but fair true/false"],
    },
    keyMessages: {
      fr: [
        "On vote d'abord, puis on explique.",
        "Une réponse plausible mérite d'être discutée.",
        "Le doute utile fait partie de l'apprentissage.",
      ],
      en: [
        "Vote first, then explain.",
        "A plausible answer deserves discussion.",
        "Useful doubt is part of learning.",
      ],
    },
    tone: "bg-rose-100 text-rose-700",
    icon: <Megaphone size={28} />,
  },
  {
    id: "mission-terrain",
    label: "Mission terrain",
    labelKey: "school.mission-terrain.label",
    description: {
      fr: "Situations concrètes de cleanwalk, sécurité et organisation sur le terrain.",
      en: "Concrete cleanwalk situations, safety and field organization.",
    },
    focus: {
      fr: ["Déchets inconnus, tri et sécurité", "Organisation d'une action efficace"],
      en: ["Unknown waste, sorting and safety", "Organizing an effective action"],
    },
    keyMessages: {
      fr: [
        "Le contexte compte autant que l'objet.",
        "La sécurité passe avant la vitesse.",
        "En cas de doute, on isole et on signale.",
      ],
      en: [
        "Context matters as much as the object.",
        "Safety comes before speed.",
        "When in doubt, isolate and report.",
      ],
    },
    tone: "bg-emerald-100 text-emerald-700",
    icon: <MapPin size={28} />,
  },
  {
    id: "ordres-de-grandeur",
    label: "Ordres de grandeur",
    labelKey: "school.ordres-de-grandeur.label",
    description: {
      fr: "Estimations de durée, masse, volume et pollution pour raisonner approximativement.",
      en: "Estimates of time, mass, volume and pollution to reason approximately.",
    },
    focus: {
      fr: ["Comparer sans chiffre exact", "Lire une échelle avant de conclure"],
      en: ["Compare without an exact figure", "Read the scale before concluding"],
    },
    keyMessages: {
      fr: [
        "Un bon ordre de grandeur vaut mieux qu'un faux chiffre précis.",
        "La méthode compte plus que la précision apparente.",
        "Une estimation doit rester crédible.",
      ],
      en: [
        "A good order of magnitude beats a false exact number.",
        "The method matters more than apparent precision.",
        "An estimate must stay credible.",
      ],
    },
    tone: "bg-blue-100 text-blue-700",
    icon: <Calculator size={28} />,
  },
  {
    id: "gestes-du-quotidien",
    label: "Gestes du quotidien",
    labelKey: "school.gestes-du-quotidien.label",
    description: {
      fr: "Consommation, emballages, habitudes et réduction des déchets au quotidien.",
      en: "Consumption, packaging, habits and daily waste reduction.",
    },
    focus: {
      fr: ["Lien entre geste individuel et impact collectif", "Réemploi, emballages et sobriété"],
      en: ["Link individual action to collective impact", "Reuse, packaging and moderation"],
    },
    keyMessages: {
      fr: [
        "Un geste visible n'est pas toujours le meilleur choix.",
        "Le cycle complet compte plus qu'un seul détail.",
        "Réduire à la source reste souvent le premier levier.",
      ],
      en: [
        "A visible gesture is not always the best one.",
        "The full cycle matters more than one detail.",
        "Reducing at the source is often the first lever.",
      ],
    },
    tone: "bg-amber-100 text-amber-800",
    icon: <Repeat2 size={28} />,
  },
] as const;

const QUIZ_SCHOOL_TRACK_BY_ID: Record<QuizSchoolTrackId, QuizSchoolTrackDefinition> = Object.fromEntries(
  QUIZ_SCHOOL_TRACKS.map((track) => [track.id, track]),
) as Record<QuizSchoolTrackId, QuizSchoolTrackDefinition>;

export function getQuizSchoolTrack(trackId: QuizSchoolTrackId): QuizSchoolTrackDefinition {
  return QUIZ_SCHOOL_TRACK_BY_ID[trackId];
}

export function listQuizSchoolTrackIds(): QuizSchoolTrackId[] {
  return QUIZ_SCHOOL_TRACKS.map((track) => track.id);
}

export function getQuizSchoolKeyMessages(trackId: QuizSchoolTrackId, locale: SupportedLocale): string[] {
  return QUIZ_SCHOOL_TRACK_BY_ID[trackId].keyMessages[locale];
}

export function getQuizSchoolTrackLabel(trackId: QuizSchoolTrackId, locale: SupportedLocale): string {
  return getQuizUiCopy(locale, QUIZ_SCHOOL_TRACK_BY_ID[trackId].labelKey);
}

export function getQuizSchoolTrackDescription(trackId: QuizSchoolTrackId, locale: SupportedLocale): string {
  return QUIZ_SCHOOL_TRACK_BY_ID[trackId].description[locale];
}
