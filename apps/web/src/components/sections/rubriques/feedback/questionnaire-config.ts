import { Bug, Handshake, Lightbulb } from "lucide-react";

export type L10n = { fr: string; en: string };
export type FeedbackType = "bug" | "improvement" | "collaboration";

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
    title: { fr: "Bug", en: "Bug" },
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
        label: { fr: "Sujet", en: "Subject" },
        placeholder: {
          fr: "Ex: La carte se fige sur mobile",
          en: "E.g. The map freezes on mobile",
        },
        minLength: 4,
      },
      {
        key: "context",
        label: { fr: "Contexte", en: "Context" },
        placeholder: {
          fr: "Page, profil, appareil ou navigateur concerné",
          en: "Page, profile, device or browser involved",
        },
        minLength: 4,
      },
      {
        key: "steps",
        label: { fr: "Étapes pour reproduire", en: "Steps to reproduce" },
        placeholder: {
          fr: "1. ... 2. ... 3. ...",
          en: "1. ... 2. ... 3. ...",
        },
        rows: 4,
        minLength: 10,
      },
      {
        key: "expected",
        label: { fr: "Résultat attendu", en: "Expected result" },
        placeholder: {
          fr: "Ce qui devrait se passer normalement",
          en: "What should happen normally",
        },
        rows: 3,
        minLength: 10,
      },
    ],
  },
  {
    id: "improvement",
    title: { fr: "Amélioration", en: "Improvement" },
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
        minLength: 4,
      },
      {
        key: "friction",
        label: { fr: "Ce qui bloque aujourd'hui", en: "Current friction" },
        placeholder: {
          fr: "Ce qui prend trop de temps ou crée de la confusion",
          en: "What takes too long or creates confusion",
        },
        rows: 3,
        minLength: 10,
      },
      {
        key: "proposal",
        label: { fr: "Amélioration proposée", en: "Proposed improvement" },
        placeholder: {
          fr: "Décris le changement que tu veux voir",
          en: "Describe the change you want to see",
        },
        rows: 4,
        minLength: 10,
      },
      {
        key: "impact",
        label: { fr: "Impact attendu", en: "Expected impact" },
        placeholder: {
          fr: "Ce que cela améliorerait pour le terrain ou l'équipe",
          en: "What it would improve for the field or the team",
        },
        rows: 3,
        minLength: 10,
      },
    ],
  },
  {
    id: "collaboration",
    title: { fr: "Collaboration", en: "Collaboration" },
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
        key: "organization",
        label: { fr: "Structure ou personne", en: "Organization or person" },
        placeholder: {
          fr: "Nom de l'association, collectivité, école ou collectif",
          en: "Association, city, school or collective name",
        },
        minLength: 4,
      },
      {
        key: "purpose",
        label: { fr: "Objet de la collaboration", en: "Collaboration purpose" },
        placeholder: {
          fr: "Ex: sensibilisation, logistique, contenu, événement",
          en: "E.g. awareness, logistics, content, event",
        },
        rows: 3,
        minLength: 10,
      },
      {
        key: "contribution",
        label: { fr: "Ce que vous apportez", en: "What you bring" },
        placeholder: {
          fr: "Ressource, lieu, réseau, compétence, soutien",
          en: "Resource, venue, network, skill or support",
        },
        rows: 4,
        minLength: 10,
      },
      {
        key: "nextStep",
        label: { fr: "Prochaine étape souhaitée", en: "Desired next step" },
        placeholder: {
          fr: "Appel, rendez-vous, échange mail, mise en lien",
          en: "Call, meeting, email exchange, warm introduction",
        },
        rows: 3,
        minLength: 10,
      },
    ],
  },
] as const satisfies readonly QuestionnaireConfig[];
