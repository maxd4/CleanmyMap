import { Bug, Handshake, Lightbulb, MessageSquare } from "lucide-react";

export type L10n = { fr: string; en: string };
export type FeedbackType = "bug" | "idea" | "improvement" | "collaboration";

export type FeedbackField = {
  key: string;
  label: L10n;
  placeholder: L10n;
  helper?: L10n;
  rows?: number;
  minLength?: number;
};

export type QuestionnaireConfig = {
  id: FeedbackType;
  title: L10n;
  intro: L10n;
  success: L10n;
  icon: typeof Bug;
  accent: "rose" | "amber" | "emerald";
  fields: FeedbackField[];
};

export const QUESTIONNAIRES = [
  {
    id: "bug",
    title: { fr: "Bug signalé", en: "Reported bug" },
    intro: {
      fr: "Décris précisément ce qui casse pour qu'on puisse reproduire et corriger vite.",
      en: "Describe what breaks so we can reproduce it and fix it quickly.",
    },
    success: {
      fr: "Merci. Le signalement bug a bien été transmis.",
      en: "Thanks. The bug report has been sent.",
    },
    icon: Bug,
    accent: "rose",
    fields: [
      {
        key: "subject",
        label: { fr: "Titre (facultatif)", en: "Title (optional)" },
        placeholder: {
          fr: "Laissez vide pour utiliser un titre proposé",
          en: "Leave blank to use a suggested title",
        },
        helper: {
          fr: "Vous pouvez le modifier ou le laisser vide.",
          en: "You can edit it or leave it blank.",
        },
        minLength: 0,
      },
      {
        key: "context",
        label: { fr: "Quelle action effectuiez-vous ?", en: "What action were you taking?" },
        placeholder: {
          fr: "Ex: J'ouvrais la carte depuis la rubrique Missions",
          en: "E.g. I opened the map from the Missions section",
        },
        minLength: 3,
      },
      {
        key: "steps",
        label: { fr: "Qu'est-ce qui s'est produit ?", en: "What happened?" },
        placeholder: {
          fr: "Décrivez brièvement ce que vous avez vu",
          en: "Briefly describe what you saw",
        },
        rows: 4,
        minLength: 3,
      },
      {
        key: "expected",
        label: { fr: "Qu'auriez-vous dû observer ?", en: "What should you have observed?" },
        placeholder: {
          fr: "Ce qui devrait se passer normalement",
          en: "What should happen normally",
        },
        rows: 3,
        minLength: 3,
      },
    ],
  },
  {
    id: "idea",
    title: { fr: "Idée proposée", en: "Suggested idea" },
    intro: {
      fr: "Partage une idée ou une observation en quelques réponses.",
      en: "Share an idea or observation in a few answers.",
    },
    success: {
      fr: "Merci. Votre idée a été transmise.",
      en: "Thanks. Your idea has been sent.",
    },
    icon: MessageSquare,
    accent: "rose",
    fields: [
      {
        key: "subject",
        label: { fr: "Sujet", en: "Subject" },
        placeholder: {
          fr: "Ex: Ajouter un filtre par quartier",
          en: "E.g. Add a neighbourhood filter",
        },
        minLength: 0,
      },
      {
        key: "proposal",
        label: { fr: "Votre idée", en: "Your idea" },
        placeholder: {
          fr: "Décrivez simplement ce que vous aimeriez voir.",
          en: "Briefly describe what you would like to see.",
        },
        rows: 4,
        minLength: 3,
      },
      {
        key: "benefit",
        label: { fr: "Bénéfice attendu", en: "Expected benefit" },
        placeholder: {
          fr: "À qui cette idée serait-elle utile ?",
          en: "Who would this idea help?",
        },
        rows: 3,
        minLength: 0,
      },
    ],
  },
  {
    id: "improvement",
    title: { fr: "Amélioration proposée", en: "Suggested improvement" },
    intro: {
      fr: "Partage une idée concrète pour simplifier une action ou augmenter l'impact.",
      en: "Share a concrete idea to simplify an action or increase impact.",
    },
    success: {
      fr: "Merci. La proposition d'amélioration a été envoyée.",
      en: "Thanks. The improvement proposal has been sent.",
    },
    icon: Lightbulb,
    accent: "amber",
    fields: [
      {
        key: "subject",
        label: { fr: "Sujet de l'idée", en: "Idea subject" },
        placeholder: {
          fr: "Ex: Raccourcir le formulaire de déclaration",
          en: "E.g. Shorten the declaration form",
        },
        minLength: 0,
      },
      {
        key: "friction",
        label: { fr: "Ce qui bloque aujourd'hui", en: "Current friction" },
        placeholder: {
          fr: "Ce qui prend trop de temps ou crée de la confusion",
          en: "What takes too long or creates confusion",
        },
        rows: 3,
        minLength: 3,
      },
      {
        key: "proposal",
        label: { fr: "Amélioration proposée", en: "Proposed improvement" },
        placeholder: {
          fr: "Décris le changement que tu veux voir",
          en: "Describe the change you want to see",
        },
        rows: 4,
        minLength: 3,
      },
      {
        key: "impact",
        label: { fr: "Impact attendu", en: "Expected impact" },
        placeholder: {
          fr: "Ce que cela améliorerait pour le terrain ou l'équipe",
          en: "What it would improve for the field or the team",
        },
        rows: 3,
        minLength: 0,
      },
    ],
  },
  {
    id: "collaboration",
    title: { fr: "Collaboration proposée", en: "Suggested collaboration" },
    intro: {
      fr: "Propose un partenariat, une mise en lien ou un échange terrain.",
      en: "Propose a partnership, introduction or field exchange.",
    },
    success: {
      fr: "Merci. La demande de collaboration a été transmise.",
      en: "Thanks. The collaboration request has been sent.",
    },
    icon: Handshake,
    accent: "emerald",
    fields: [
      {
        key: "subject",
        label: { fr: "Titre (facultatif)", en: "Title (optional)" },
        placeholder: {
          fr: "Laissez vide pour utiliser un titre proposé",
          en: "Leave blank to use a suggested title",
        },
        helper: {
          fr: "Vous pouvez le modifier ou le laisser vide.",
          en: "You can edit it or leave it blank.",
        },
        minLength: 0,
      },
      {
        key: "organization",
        label: { fr: "Structure ou personne", en: "Organization or person" },
        placeholder: {
          fr: "Nom de l'association, collectivité, école ou collectif",
          en: "Association, city, school or collective name",
        },
        minLength: 3,
      },
      {
        key: "purpose",
        label: { fr: "Objet de la collaboration", en: "Collaboration purpose" },
        placeholder: {
          fr: "Ex: sensibilisation, logistique, contenu, événement",
          en: "E.g. awareness, logistics, content, event",
        },
        rows: 3,
        minLength: 3,
      },
      {
        key: "contribution",
        label: { fr: "Ce que vous apportez", en: "What you bring" },
        placeholder: {
          fr: "Ressource, lieu, réseau, compétence, soutien",
          en: "Resource, venue, network, skill or support",
        },
        rows: 4,
        minLength: 3,
      },
      {
        key: "nextStep",
        label: { fr: "Prochaine étape souhaitée", en: "Desired next step" },
        placeholder: {
          fr: "Appel, rendez-vous, échange mail, mise en lien",
          en: "Call, meeting, email exchange, warm introduction",
        },
        rows: 3,
        minLength: 3,
      },
    ],
  },
] as const satisfies readonly QuestionnaireConfig[];
