"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { computeNextSRSState, type SRSQuality, type SRSStats } from "@/lib/gamification/quiz-srs";
import { loadQuizSRSData, saveQuizSRSState } from "@/lib/services/quiz-srs-service";
import {
  buildMixedQuizOrder,
  formatCognitiveDate,
  getQuizStateFromStats,
  summarizeQuizStates,
} from "@/lib/learning/cognitive-principles";
import { QuizReasoningPicker } from "@/components/learn/quiz-reasoning-picker";
import { QuizSessionPanel } from "@/components/learn/quiz-session-panel";
import { insertAdaptiveReinforcement } from "@/components/learn/quiz-adaptive";
import {
  QUIZ_REVIEW_TARGETS,
  getQuizReviewTarget,
  type QuizReviewTarget,
  type QuizQuestionCategory,
} from "@/components/learn/quiz-review-targets";
import {
  getNextReasoningType,
  type QuizReasoningType,
} from "@/components/learn/quiz-reasoning-types";
import type { QuizQuestionFormatId } from "@/components/learn/quiz-question-formats";

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "true-false" | "flashcard";
  category: QuizQuestionCategory;
  question: string;
  answer: string;
  options?: string[];
  explanation: string;
  review?: QuizReviewTarget;
  format?: QuizQuestionFormatId;
  reasoningType: QuizReasoningType;
}

export type QuizThemeSummary = {
  label: string;
  href: string;
  total: number;
  correct: number;
  accuracy: number;
};

export type QuizSessionSummary = {
  score: number;
  totalQuestions: number;
  totalAnswered: number;
  themesSucceeded: QuizThemeSummary[];
  themesToReview: QuizThemeSummary[];
  nextReviewTarget: QuizReviewTarget | null;
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "e1",
    type: "true-false",
    category: "tri-recyclage",
    question: "Tous les emballages plastiques portant un symbole de recyclage sont effectivement recyclés.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Le symbole indique souvent qu'un matériau peut être recyclable dans certaines filières, pas qu'il sera forcément recyclé partout. La consigne locale et la filière disponible restent décisives.",
    reasoningType: "idée reçue",
  },
  {
    id: "e3",
    type: "true-false",
    category: "tri-recyclage",
    question: "Un emballage propre et vide peut être trié sans regarder la consigne locale.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "La propreté aide, mais la bonne filière dépend aussi de la commune et du type d'emballage. La consigne locale reste la référence.",
    reasoningType: "idée reçue",
  },
  {
    id: "e2",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Les arbres rejettent uniquement du dioxyde de carbone et jamais d'oxygène.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les arbres participent à la photosynthèse et produisent aussi de l'oxygène. La phrase est trop absolue et inverse mal leur rôle.",
    reasoningType: "idée reçue",
  },
  {
    id: "n1",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Le dioxyde de carbone est le seul gaz à effet de serre qui compte pour le réchauffement climatique humain.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Le CO2 est central, mais le méthane, le protoxyde d'azote et d'autres gaz contribuent aussi au réchauffement.",
    reasoningType: "idée reçue",
  },
  {
    id: "n2",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Réduire seulement les douches suffit en général à agir sur la plus grande part de l'eau douce consommée dans le monde.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "L'agriculture concentre la plus grande part des usages d'eau douce; les gestes domestiques comptent, mais ils ne couvrent pas tout le levier.",
    reasoningType: "comparaison",
  },
  {
    id: "n3",
    type: "true-false",
    category: "tri-recyclage",
    question: "Un carton de pizza très gras peut rejoindre les papiers propres sans risque majeur pour la filière.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Le gras perturbe le recyclage du papier-carton et peut contaminer la filière. Quand le support est trop souillé, il vaut mieux éviter de le mettre avec les papiers propres.",
    reasoningType: "terrain",
  },
  {
    id: "n4",
    type: "true-false",
    category: "tri-recyclage",
    question: "Si ta commune propose une collecte dédiée, les déchets alimentaires peuvent être mélangés aux emballages pour aller plus vite.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les biodéchets suivent leur propre filière lorsqu'elle existe localement. Les mélanger aux emballages augmente le risque de contamination et de mauvaise orientation.",
    reasoningType: "terrain",
  },
  {
    id: "n5",
    type: "true-false",
    category: "impact-methodologie",
    question: "Une requête IA courte est si légère qu'on peut l'ignorer même quand elle est répétée massivement.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Une requête isolée pèse peu, mais l'impact devient significatif quand on additionne des milliers ou des millions d'appels. Le bon réflexe est de raisonner à l'échelle d'usage, pas à l'unité.",
    reasoningType: "questions contre-intuitives",
  },
  {
    id: "v1",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Pourquoi commence-t-on souvent par le contexte avant de donner un chiffre ?",
    answer: "Pour éviter de faire dire trop au chiffre",
    options: [
      "Pour éviter de faire dire trop au chiffre",
      "Pour faire paraître le chiffre plus scientifique",
      "Pour cacher les limites de la méthode",
      "Pour rallonger le texte sans valeur ajoutée",
    ],
    explanation:
      "Un chiffre isolé peut sembler énorme ou minuscule sans référence. Le contexte fixe l'échelle, la comparaison utile et la limite de lecture.",
    review: QUIZ_REVIEW_TARGETS.comprendre,
    reasoningType: "questions contre-intuitives",
  },
  {
    id: "v2",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Qu'apporte surtout un ordre de grandeur dans CleanMyMap ?",
    answer: "Une comparaison rapide avant d'entrer dans le détail",
    options: [
      "Une comparaison rapide avant d'entrer dans le détail",
      "Une mesure exacte valable dans tous les cas",
      "Une façon de remplacer toute explication",
      "Une alerte pour éviter tout calcul",
    ],
    explanation:
      "L'ordre de grandeur sert à situer un impact rapidement. Il évite de se perdre dans une précision qui ne change pas la décision.",
    review: QUIZ_REVIEW_TARGETS.comprendre,
    reasoningType: "estimation",
  },
  {
    id: "v3",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Quel réflexe protège le mieux un proxy de la surinterprétation ?",
    answer: "Préciser qu'il s'agit d'une estimation et rappeler sa limite",
    options: [
      "Préciser qu'il s'agit d'une estimation et rappeler sa limite",
      "Le présenter comme une mesure exacte",
      "Supprimer toute comparaison",
      "Le répéter sans source pour le rendre plus convaincant",
    ],
    explanation:
      "Un proxy simplifie un phénomène. Sans sa limite et son usage visé, on peut le lire comme une mesure exacte alors qu'il sert surtout à éclairer une décision.",
    review: QUIZ_REVIEW_TARGETS.comprendre,
    reasoningType: "questions contre-intuitives",
  },
  {
    id: "v4",
    type: "true-false",
    category: "impact-methodologie",
    question:
      "Une bouteille plastique abandonnée dans la nature disparaît complètement au bout de quelques siècles.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Elle ne disparaît pas complètement: elle se fragmente souvent en microplastiques et persiste dans l'environnement.",
    review: QUIZ_REVIEW_TARGETS.comprendre,
    reasoningType: "idée reçue",
  },
  {
    id: "v5",
    type: "true-false",
    category: "impact-methodologie",
    question: "Un chiffre sans contexte suffit souvent à comprendre un impact environnemental.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Sans échelle, comparaison ni limite de méthode, un chiffre peut être trompeur ou mal interprété.",
    review: QUIZ_REVIEW_TARGETS.comprendre,
    reasoningType: "questions contre-intuitives",
  },
  {
    id: "t1",
    type: "multiple-choice",
    category: "tri-recyclage",
    question: "Que faire d'un emballage propre et vide quand la consigne locale ne dit rien d'autre ?",
    answer: "Le mettre dans la filière de tri des emballages",
    options: [
      "Le mettre dans la filière de tri des emballages",
      "Le jeter systématiquement au compost",
      "Le mettre avec le verre",
      "Le laisser de côté sans consigne",
    ],
    explanation:
      "Un emballage propre et vide suit généralement la filière des emballages. En cas de doute local, on vérifie la consigne de la commune avant d'improviser.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "t2",
    type: "multiple-choice",
    category: "tri-recyclage",
    question: "Que faire d'un carton de pizza très gras ?",
    answer: "Le mettre en résiduel",
    options: [
      "Le mettre en résiduel",
      "Le mettre avec les papiers propres",
      "Le mettre au verre",
      "Le mettre au compost sans vérifier",
    ],
    explanation:
      "Le gras perturbe le recyclage du papier-carton et peut contaminer la filière. Le résiduel reste la solution la plus sûre quand le support est trop souillé.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "t3",
    type: "multiple-choice",
    category: "tri-recyclage",
    question: "Quel déchet peut aller au compost dans une collecte biodéchets classique ?",
    answer: "Des épluchures ou restes alimentaires autorisés localement",
    options: [
      "Des épluchures ou restes alimentaires autorisés localement",
      "Du verre cassé",
      "Des emballages plastiques",
      "Des piles usagées",
    ],
    explanation:
      "Le compost accepte surtout des biodéchets organiques. Les plastiques, métaux et verre restent hors filière pour éviter la contamination.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "t4",
    type: "multiple-choice",
    category: "tri-recyclage",
    question: "Quel message de sensibilisation est le plus efficace sur le terrain ?",
    answer: "Un message court, concret et non culpabilisant",
    options: [
      "Un message court, concret et non culpabilisant",
      "Un message très long avec plusieurs règles à la fois",
      "Une consigne abstraite sans geste attendu",
      "Un rappel sec sans explication",
    ],
    explanation:
      "Les consignes courtes avec un geste précis sont plus faciles à retenir et moins susceptibles de braquer le public. On cherche l'adhésion, pas la contrainte.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "t5",
    type: "multiple-choice",
    category: "tri-recyclage",
    question: "Quelle est la meilleure réaction face à un geste de tri incertain pendant une action ?",
    answer: "Rappeler calmement le bon geste et proposer une consigne claire",
    options: [
      "Rappeler calmement le bon geste et proposer une consigne claire",
      "Ignorer le geste pour éviter de perdre du temps",
      "Réagir de façon culpabilisante",
      "Laisser chacun décider sans repère",
    ],
    explanation:
      "La correction doit rester utile et respectueuse pour éviter de casser l'adhésion. On vise l'apprentissage, pas le jugement.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "t6",
    type: "true-false",
    category: "tri-recyclage",
    question: "Sur une plage, quand un déchet est trop sale pour être identifié vite, le mieux est de le mettre à part.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Isoler l'objet limite la contamination de la filière et évite de deviner sa destination trop vite.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "t7",
    type: "true-false",
    category: "tri-recyclage",
    question: "Si la consigne locale est ambiguë, il vaut mieux improviser pour ne pas ralentir l'action.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Quand la consigne est floue, on privilégie la règle la plus locale et la plus précise plutôt que l'improvisation.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "t8",
    type: "true-false",
    category: "tri-recyclage",
    question: "Si le compost domestique n'est pas possible, forcer malgré tout un mauvais geste reste la meilleure option.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Quand le compost n'est pas tenable, il vaut mieux garder une filière simple et lisible que d'imposer un geste inadapté.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "c1",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Pendant une action terrain, quelle consigne garde le groupe efficace ?",
    answer: "Préparer un point de tri clair et isoler les déchets douteux",
    options: [
      "Préparer un point de tri clair et isoler les déchets douteux",
      "Tout mélanger pour aller plus vite",
      "Demander à chacun d'improviser son tri",
      "Attendre la fin pour trier sans repère",
    ],
    explanation:
      "Sur le terrain, la lisibilité du point de tri et la séparation des objets douteux évitent les erreurs et gardent le rythme du groupe.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "c2",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Sur une plage, que faire d'un déchet trop sale ou difficile à identifier ?",
    answer: "Le mettre à part plutôt que de deviner sa filière",
    options: [
      "Le mettre à part plutôt que de deviner sa filière",
      "Le jeter directement dans le premier bac venu",
      "Le mélanger avec les plastiques propres",
      "Le laisser au sable si on hésite",
    ],
    explanation:
      "Les déchets souillés ou ambiguës risquent de contaminer la filière si on les attribue au hasard. L'isolement temporaire est plus sûr.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "c3",
    type: "multiple-choice",
    category: "action-terrain",
    question: "En ville, que faire si deux panneaux de tri se contredisent ?",
    answer: "Suivre la consigne locale la plus précise et demander confirmation ensuite",
    options: [
      "Suivre la consigne locale la plus précise et demander confirmation ensuite",
      "Choisir au hasard pour ne pas perdre de temps",
      "Appliquer la règle d'une autre commune",
      "Tout mettre en résiduel sans vérifier",
    ],
    explanation:
      "Quand des consignes se contredisent, on privilégie le message le plus local et le plus précis. C'est plus fiable qu'une règle générale appliquée trop vite.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "c4",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Sur un événement, quel dispositif aide le plus à éviter les erreurs de tri ?",
    answer: "Un point de tri central avec une seule consigne répétée",
    options: [
      "Un point de tri central avec une seule consigne répétée",
      "Plusieurs consignes différentes selon les bénévoles",
      "Des bacs cachés pour ne pas ralentir le public",
      "Aucune indication pour laisser chacun deviner",
    ],
    explanation:
      "Les événements marchent mieux avec un message unique, visible et répété. La simplicité réduit les hésitations et les erreurs de flux.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "c5",
    type: "multiple-choice",
    category: "tri-recyclage",
    question: "Si le compost domestique n'est pas possible, quel réflexe est le plus robuste ?",
    answer: "Garder une filière simple et lisible sans forcer un mauvais geste",
    options: [
      "Garder une filière simple et lisible sans forcer un mauvais geste",
      "Mettre tous les biodéchets dans le premier bac disponible",
      "Mélanger compost et plastique pour gagner du temps",
      "Attendre que le compost soit possible sans rien changer",
    ],
    explanation:
      "Quand le compost n'est pas tenable, il vaut mieux choisir une solution claire et stable que d'improviser un compost imparfait.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "c6",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Quel réflexe adopter face à un déchet non identifiable et trop abîmé ?",
    answer: "Ne pas deviner et l'isoler avant de choisir la meilleure filière",
    options: [
      "Ne pas deviner et l'isoler avant de choisir la meilleure filière",
      "Le jeter dans le bac le plus proche",
      "Le classer dans le plastique par défaut",
      "Le laisser sans traitement",
    ],
    explanation:
      "Un objet trop abîmé ne doit pas être interprété à vue. Le mettre à part permet de limiter la contamination et de vérifier la bonne consigne.",
    review: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
    reasoningType: "terrain",
  },
  {
    id: "i1",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Les limites planétaires servent surtout à repérer un espace de sécurité pour l'humanité, pas à produire un chiffre décoratif.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Le concept aide à comprendre des seuils de sécurité et leurs interactions. L'intérêt est de guider l'action, pas de mémoriser un nombre isolé.",
    reasoningType: "conséquences indirectes",
  },
  {
    id: "i2",
    type: "true-false",
    category: "impact-methodologie",
    question: "Les énergies renouvelables fournissent déjà la majorité de l'électricité mondiale.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Elles progressent, mais ne dominent pas encore la production mondiale. L'ordre de grandeur reste loin d'une majorité.",
    reasoningType: "estimation",
  },
  {
    id: "i5",
    type: "true-false",
    category: "tri-recyclage",
    question: "Une bouteille en verre vide peut aller avec les plastiques parce qu'elle est recyclable.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Le verre suit une filière dédiée et ne doit pas être mélangé aux emballages plastiques. Le recyclage ne veut pas dire même bac.",
    reasoningType: "terrain",
  },
  {
    id: "i6",
    type: "true-false",
    category: "tri-recyclage",
    question: "Une pile usagée peut être jetée avec les déchets ordinaires si elle est bien isolée dans un sac.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les piles et batteries suivent une collecte dédiée pour limiter les risques et sécuriser le traitement. Le bon geste est de les déposer dans une filière adaptée.",
    reasoningType: "terrain",
  },
  {
    id: "i3",
    type: "true-false",
    category: "impact-methodologie",
    question: "Un proxy de litres d'eau pour quelques mégots sert surtout à donner un ordre de grandeur, pas une vérité exacte.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Le proxy aide à comparer et à visualiser un impact. Il doit être lu comme un repère pédagogique, pas comme une mesure absolue.",
    reasoningType: "estimation",
  },
  {
    id: "i4",
    type: "true-false",
    category: "impact-methodologie",
    question: "Une estimation de CO2eq construite avec un proxy doit être lue comme un ordre de grandeur, pas comme une mesure universelle.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "L'intérêt est de comparer et d'orienter l'action. L'exactitude dépend toujours des hypothèses retenues.",
    reasoningType: "estimation",
  },
  {
    id: "i7",
    type: "true-false",
    category: "impact-methodologie",
    question: "Les comparaisons d'impact IA en kilomètres de voiture restent utiles sans préciser le périmètre, le véhicule et le contexte.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les équivalences sont utiles seulement si l'on précise les hypothèses. Sans cela, on surinterprète un proxy et on perd la nuance.",
    reasoningType: "comparaison",
  },
  {
    id: "i8",
    type: "true-false",
    category: "impact-methodologie",
    question: "Une équivalence en jours d'électricité reste stable quelle que soit la taille du foyer ou le mix électrique.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Le résultat dépend du foyer de référence, des usages et du contexte électrique. C'est un repère pédagogique, pas une conversion fixe.",
    reasoningType: "comparaison",
  },
  {
    id: "x1",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Le budget carbone compatible avec 1,5 °C laisse encore une large marge de manœuvre au rythme actuel.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Le budget restant est limité; au rythme actuel, il s'épuise rapidement. Le point clé est la contrainte temporelle, pas un chiffre à retenir par cœur.",
    reasoningType: "conséquences indirectes",
  },
  {
    id: "x2",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Le rythme actuel d'extinction des espèces est proche du rythme naturel de fond.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "L'activité humaine accélère fortement les extinctions; on parle d'une sixième extinction de masse. Le décalage avec le rythme naturel est majeur.",
    reasoningType: "questions contre-intuitives",
  },
  {
    id: "x6",
    type: "true-false",
    category: "impact-methodologie",
    question: "Une équivalence d'impact IA en kilomètres de voiture reste fiable sans préciser le modèle, le périmètre et le contexte d'usage.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les équivalences sont des repères pédagogiques utiles, pas des conversions universelles. Sans hypothèses précises, on risque de surinterpréter le résultat.",
    reasoningType: "comparaison",
  },
  {
    id: "x3",
    type: "true-false",
    category: "impact-methodologie",
    question: "Une estimation de surface nettoyée à partir du temps passé doit être lue comme un repère de comparaison, pas comme une mesure exacte.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Le proxy sert à rendre l'impact lisible et comparable. Il ne remplace pas une mesure terrain détaillée.",
    reasoningType: "estimation",
  },
  {
    id: "x5",
    type: "true-false",
    category: "tri-recyclage",
    question: "Même un tri rapide peut dégrader une filière si les matériaux restent mélangés ou souillés.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Vider, séparer et limiter la souillure améliorent la qualité des matières collectées et réduisent les refus. La vitesse ne doit pas faire perdre la qualité du geste.",
    reasoningType: "terrain",
  },
  {
    id: "x4",
    type: "true-false",
    category: "impact-methodologie",
    question: "Une économie estimée à partir d'un proxy doit être lue comme un repère, pas comme un gain garanti.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "La valeur dépend des hypothèses de départ; l'intérêt est surtout d'aider à comparer les ordres de grandeur et à orienter l'action.",
    reasoningType: "estimation",
  },

  // === BATCH A — climat-biodiversite ===
  {
    id: "cb1",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Un déchet plastique jeté dans une rue en ville ne finit jamais dans l'océan.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les déchets mal gérés rejoignent les réseaux d'eaux pluviales, les rivières puis la mer. Une grande partie des plastiques marins provient de sources terrestres, y compris urbaines.",
    reasoningType: "idée reçue",
    format: "vrai-faux-piegeux",
  },
  {
    id: "cb2",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Les microplastiques ont été détectés dans le sang humain et le lait maternel.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Des études récentes ont trouvé des microplastiques dans le sang, les poumons, le placenta et le lait maternel. La chaîne alimentaire et l'air sont les deux voies d'exposition principales.",
    reasoningType: "questions contre-intuitives",
    format: "questions-contre-intuitives",
  },
  {
    id: "cb3",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Un déchet organique comme une peau de banane se dégrade rapidement dans un milieu marin, sans impact notable.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "En mer froide et faiblement oxygénée, la dégradation ralentit considérablement. Le processus consomme de l'oxygène et peut libérer des nutriments qui perturbent localement l'écosystème.",
    reasoningType: "idée reçue",
    format: "vrai-faux-piegeux",
  },
  {
    id: "cb4",
    type: "true-false",
    category: "climat-biodiversite",
    question: "L'acidification des océans est un phénomène indépendant du réchauffement climatique.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les deux phénomènes partagent la même cause principale : l'excès de CO2 atmosphérique. Les océans absorbent environ 25 % du CO2 émis, ce qui abaisse leur pH et fragilise les organismes à coquilles calcaires.",
    reasoningType: "idée reçue",
    format: "vrai-faux-piegeux",
  },
  {
    id: "cb5",
    type: "multiple-choice",
    category: "climat-biodiversite",
    question: "Un mégot de cigarette peut rendre impropre à la vie aquatique environ combien de litres d'eau ?",
    answer: "500 litres",
    options: ["500 litres", "5 litres", "50 000 litres", "5 000 litres"],
    explanation:
      "Un seul mégot peut polluer jusqu'à 500 litres d'eau. Il libère nicotine, métaux lourds et microplastiques provenant du filtre en acétate de cellulose.",
    reasoningType: "estimation",
    format: "estimations",
  },
  {
    id: "cb6",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Environ 10 fleuves dans le monde transportent la majorité du plastique qui atteint les océans.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Des études publiées dans Science estiment que 10 fleuves très peuplés (Asie et Afrique principalement) concentrent jusqu'à 90 % des apports plastiques fluviaux vers les mers.",
    reasoningType: "questions contre-intuitives",
    format: "questions-contre-intuitives",
  },
  {
    id: "cb7",
    type: "multiple-choice",
    category: "climat-biodiversite",
    question: "Qu'est-ce qui explique que les fonds marins contiennent davantage de déchets plastiques que la surface ?",
    answer: "Les plastiques se fragmentent et coulent une fois colonisés par des microorganismes",
    options: [
      "Les plastiques se fragmentent et coulent une fois colonisés par des microorganismes",
      "Les courants poussent tout vers le fond à terme",
      "Les déchets sont volontairement immergés par les industries de pêche",
      "L'eau de mer dissout rapidement les matériaux légers en surface",
    ],
    explanation:
      "Les biofilms formés par des bactéries alourdissent les plastiques flottants. Ils coulent ensuite et s'accumulent dans les zones abyssales, souvent loin des zones de dépôt d'origine.",
    reasoningType: "questions contre-intuitives",
    format: "questions-contre-intuitives",
  },
  {
    id: "cb8",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Les espèces invasives peuvent se propager en se fixant sur des déchets flottants.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Les radeaux de plastique en mer servent de vecteur de dispersion pour des espèces animales et végétales. Ce phénomène, appelé rafting, perturbe des écosystèmes insulaires ou côtiers éloignés.",
    reasoningType: "conséquences indirectes",
    format: "consequences-indirectes",
  },
  {
    id: "cb9",
    type: "multiple-choice",
    category: "climat-biodiversite",
    question: "Un bidon de produit chimique abandonné en forêt représente quel type de risque indirect le plus documenté ?",
    answer: "Infiltration dans la nappe phréatique via le sol",
    options: [
      "Infiltration dans la nappe phréatique via le sol",
      "Explosion spontanée au contact de la pluie",
      "Contamination uniquement de l'air environnant",
      "Impact limité car le sol filtre tous les polluants",
    ],
    explanation:
      "Les polluants organiques et métaux lourds peuvent traverser les couches du sol et atteindre la nappe. Certains contaminants persistent des décennies et touchent des zones d'eau potable éloignées.",
    reasoningType: "conséquences indirectes",
    format: "consequences-indirectes",
  },
  {
    id: "cb10",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Le brûlage à l'air libre de déchets plastiques est moins polluant que leur enfouissement.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "La combustion incomplète libère des dioxines, furannes et particules fines très toxiques. L'enfouissement est loin d'être idéal, mais le brûlage sauvage est systématiquement plus dangereux pour la santé humaine et l'environnement.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites",
  },
  {
    id: "cb11",
    type: "true-false",
    category: "climat-biodiversite",
    question: "La décomposition des déchets organiques en décharge produit du méthane, un gaz à effet de serre plus puissant que le CO2 sur 20 ans.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Le méthane (CH4) a un pouvoir de réchauffement global environ 80 fois supérieur au CO2 sur un horizon de 20 ans. Les décharges non captées sont une source significative de méthane à l'échelle mondiale.",
    reasoningType: "conséquences indirectes",
    format: "consequences-indirectes",
  },
  {
    id: "cb12",
    type: "multiple-choice",
    category: "climat-biodiversite",
    question: "Pourquoi dit-on que l'océan est le plus grand 'puits de carbone', et pourquoi cela devient un problème ?",
    answer: "Il absorbe trop de CO2, ce qui l'acidifie et fragilise les coraux et coquillages",
    options: [
      "Il absorbe trop de CO2, ce qui l'acidifie et fragilise les coraux et coquillages",
      "Il produit du CO2 la nuit et compense le jour, ce qui équilibre la balance",
      "Il est trop salé pour continuer à absorber des gaz à effet de serre",
      "Il émet lui-même du méthane qui annule le CO2 absorbé",
    ],
    explanation:
      "En absorbant environ 25 % du CO2 humain, l'océan voit son pH baisser. Cette acidification dissout les coquilles des mollusques et fragilise les récifs coralliens, réduisant à terme sa propre capacité d'absorption.",
    reasoningType: "conséquences indirectes",
    format: "consequences-indirectes",
  },
  {
    id: "cb13",
    type: "true-false",
    category: "climat-biodiversite",
    question: "Les tortues marines confondent les sacs plastiques avec des méduses à cause de leur mauvaise vue sous l'eau.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "La vision des tortues marines est adaptée au milieu aquatique. La confusion vient du mouvement et de la forme des sacs dans l'eau, pas d'une mauvaise acuité visuelle. C'est le comportement de chasse qui est mis en défaut.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites",
  },
  {
    id: "cb14",
    type: "multiple-choice",
    category: "climat-biodiversite",
    question: "Que montre principalement l'indicateur 'Living Planet Index' du WWF ?",
    answer: "L'effondrement moyen des populations de vertébrés sauvages dans le temps",
    options: [
      "L'effondrement moyen des populations de vertébrés sauvages dans le temps",
      "Le taux de pollution plastique par pays",
      "La progression des énergies renouvelables dans le mix mondial",
      "Le nombre de nouvelles espèces découvertes chaque année",
    ],
    explanation:
      "Le Living Planet Index suit l'évolution moyenne des populations de mammifères, oiseaux, poissons, reptiles et amphibiens. Il a chuté d'environ 69 % entre 1970 et 2018.",
    reasoningType: "questions contre-intuitives",
    format: "questions-contre-intuitives",
  },
  {
    id: "cb15",
    type: "true-false",
    category: "climat-biodiversite",
    question: "L'océan se nettoie naturellement de ses plastiques en quelques décennies grâce à l'action des UV et des vagues.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les UV fragmentent les plastiques en microplastiques, mais ne les font pas disparaître. Ces fragments persistent des centaines à des milliers d'années. La quantité en mer augmente chaque année.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites",
  },

  // === BATCH B — action-terrain ===
  {
    id: "at1",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Pendant une cleanwalk, un bénévole trouve une seringue usagée sur le sol. Quelle est la conduite à tenir ?",
    answer: "Ne pas toucher, signaler au responsable et utiliser le matériel prévu pour les objets piquants",
    options: [
      "Ne pas toucher, signaler au responsable et utiliser le matériel prévu pour les objets piquants",
      "La ramasser avec des gants épais et la jeter dans le premier sac disponible",
      "La laisser sur place et continuer l'action sans la signaler",
      "L'enterrer pour éviter que d'autres bénévoles ne la voient",
    ],
    explanation:
      "Les déchets piquants représentent un risque de blessure et d'exposition à des agents biologiques. Le protocole prévoit un matériel dédié (boîte à objets piquants, pince rigide) et une remontée au référent de l'action.",
    reasoningType: "terrain",
    format: "situations-terrain",
  },
  {
    id: "at2",
    type: "true-false",
    category: "action-terrain",
    question: "Un bénévole veut ouvrir un bidon fermé pour identifier son contenu avant de le trier. C'est la bonne approche.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Ouvrir un contenant inconnu expose à des risques chimiques ou biologiques immédiats. La règle est de ne jamais ouvrir un contenant non identifié : le signaler au responsable et, si nécessaire, alerter les services compétents.",
    reasoningType: "terrain",
    format: "situations-terrain",
  },
  {
    id: "at3",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Un déchet est à moitié enfoui dans la terre et difficile à extraire. Quelle est la meilleure approche ?",
    answer: "Évaluer si l'extraction est sans risque, sinon le signaler et le géolocaliser",
    options: [
      "Évaluer si l'extraction est sans risque, sinon le signaler et le géolocaliser",
      "L'ignorer car il ne pollue plus s'il est enterré",
      "Le déterrer à la main quoi qu'il arrive pour compléter le nettoyage",
      "Le couvrir de terre pour qu'il disparaisse plus vite",
    ],
    explanation:
      "Un déchet enfoui peut être cassant, tranchant ou contaminé. Si l'extraction est risquée, la géolocalisation et le signalement permettent une intervention adaptée. L'enfouissement n'arrête pas la pollution.",
    reasoningType: "cas-limites",
    format: "cas-limites",
  },
  {
    id: "at4",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Sur un site de dépôt sauvage : emballages de chantier avec logo, traces de pneus larges, résidus de béton. Quelle origine est la plus probable ?",
    answer: "Un artisan ou une entreprise du bâtiment",
    options: [
      "Un artisan ou une entreprise du bâtiment",
      "Des riverains qui font leur ménage de printemps",
      "Un prestataire de collecte officiel qui déborde",
      "Des enfants du quartier",
    ],
    explanation:
      "Les indices (emballages professionnels, pneus larges, béton) pointent vers un professionnel du bâtiment. Ce diagnostic guide le signalement vers le bon acteur.",
    reasoningType: "terrain",
    format: "mini-enquetes",
  },
  {
    id: "at5",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Un vêtement trouvé pendant l'action est imbibé d'une substance inconnue à l'odeur âcre. Que faire ?",
    answer: "Le mettre dans un sac séparé hermétique et le signaler comme déchet potentiellement dangereux",
    options: [
      "Le mettre dans un sac séparé hermétique et le signaler comme déchet potentiellement dangereux",
      "Le jeter dans le sac textile pour les dons",
      "Le laisser sur place car les vêtements ne sont pas du ressort de la cleanwalk",
      "L'emballer normalement dans le sac poubelle principal",
    ],
    explanation:
      "Une substance inconnue peut être toxique ou corrosive. L'isolement hermétique limite l'exposition des bénévoles et permet une identification ou un traitement spécifique.",
    reasoningType: "cas-limites",
    format: "cas-limites",
  },
  {
    id: "at6",
    type: "true-false",
    category: "action-terrain",
    question: "Des déchets stockés en zone inondable présentent un risque environnemental accru lors des crues.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Les crues dispersent les déchets sur de larges zones et dans les cours d'eau. Des déchets concentrés peuvent contaminer des sites distants et être très difficiles à collecter a posteriori.",
    reasoningType: "conséquences indirectes",
    format: "consequences-indirectes",
  },
  {
    id: "at7",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Sur une plage, un déchet est à moitié enfoui dans le sable et trop dégradé pour identifier le matériau. Quelle décision ?",
    answer: "L'extraire avec précaution, le mettre à part et l'orienter en résiduel si non identifiable",
    options: [
      "L'extraire avec précaution, le mettre à part et l'orienter en résiduel si non identifiable",
      "Le laisser en place car on ne peut pas le trier",
      "Le mettre directement dans le sac plastique en espérant que le centre de tri fera le reste",
      "Le reboucher dans le sable pour ne pas risquer de blessure",
    ],
    explanation:
      "Un déchet non identifiable sur une plage continue de polluer s'il reste en place. L'isolement en résiduel est la solution par défaut quand la filière ne peut pas être déterminée avec certitude.",
    reasoningType: "cas-limites",
    format: "cas-limites",
  },
  {
    id: "at8",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Un même site est resalé chaque semaine malgré les nettoyages. Indices : poubelle débordante à 50 m, vent dominant, passage fréquent d'un camion. Cause la plus probable ?",
    answer: "La poubelle débordante : source locale permanente non maîtrisée",
    options: [
      "La poubelle débordante : source locale permanente non maîtrisée",
      "Le camion de livraison : dépôt délibéré depuis le véhicule",
      "Le vent : transport depuis une zone lointaine",
      "Les nettoyages eux-mêmes qui créent un appel d'air",
    ],
    explanation:
      "Une source permanente non traitée (poubelle débordante) explique mieux un resalissage systématique qu'un facteur aléatoire. Identifier et traiter la source est plus efficace que répéter le nettoyage.",
    reasoningType: "terrain",
    format: "mini-enquetes",
  },
  {
    id: "at9",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Pourquoi est-il important de photographier un dépôt avant de le ramasser ?",
    answer: "Pour documenter la preuve, faciliter le signalement et alimenter les données cartographiques",
    options: [
      "Pour documenter la preuve, faciliter le signalement et alimenter les données cartographiques",
      "Pour se souvenir quelle filière utiliser",
      "Car la loi l'exige avant tout nettoyage citoyen",
      "Pour prouver que le bénévole a bien travaillé",
    ],
    explanation:
      "La photo géolocalisée avant ramassage constitue une preuve en cas de dépôt illégal, enrichit la base de données de terrain et permet d'analyser les types de déchets. Une fois ramassé, l'information contextuelle est perdue.",
    reasoningType: "questions contre-intuitives",
    format: "questions-contre-intuitives",
  },
  {
    id: "at10",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Fin d'action : trois sacs sans étiquette, contenu mélangé, deux filières possibles. Quelle décision ?",
    answer: "Tout orienter en résiduel plutôt que de risquer de contaminer une filière valorisable",
    options: [
      "Tout orienter en résiduel plutôt que de risquer de contaminer une filière valorisable",
      "Ouvrir chaque sac et trier à vue malgré le mélange",
      "Répartir les sacs au hasard entre les filières disponibles",
      "Attendre le lendemain pour contacter le centre de tri",
    ],
    explanation:
      "Un sac contaminé oriente tout son contenu en refus. Envoyer du résiduel en résiduel ne crée pas de dégât ; envoyer du résiduel dans une filière valorisable la pénalise. L'étiquetage dès le départ est la vraie solution préventive.",
    reasoningType: "cas-limites",
    format: "cas-limites",
  },
  {
    id: "at11",
    type: "true-false",
    category: "action-terrain",
    question: "Face à un passant qui conteste l'utilité de l'action, le mieux est d'entrer dans un débat pour le convaincre sur place.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Un débat improvisé en pleine action mobilise du temps et peut se dégrader. La meilleure réponse est une phrase courte et positive, avec proposition d'échanger après. L'exemple visible du nettoyage est souvent plus convaincant que les mots.",
    reasoningType: "terrain",
    format: "situations-terrain",
  },
  {
    id: "at12",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Une bonbonne de gaz vide est trouvée sur le site. Quelle est la conduite appropriée ?",
    answer: "Ne pas la manipuler seul, signaler au responsable et orienter vers une déchetterie ou un professionnel",
    options: [
      "Ne pas la manipuler seul, signaler au responsable et orienter vers une déchetterie ou un professionnel",
      "La vider complètement avant de la jeter dans le sac résiduel",
      "La percer pour neutraliser la pression résiduelle",
      "L'emporter dans sa voiture pour la déposer chez soi en attendant",
    ],
    explanation:
      "Même 'vide', une bonbonne peut contenir du gaz résiduel sous pression. Elle ne doit pas être percée ni chauffée. Les déchetteries et revendeurs de gaz ont des protocoles de collecte adaptés.",
    reasoningType: "terrain",
    format: "situations-terrain",
  },
  {
    id: "at13",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Un bénévole se blesse légèrement (coupure superficielle) pendant l'action. Priorité immédiate ?",
    answer: "Stopper l'activité de ce bénévole, nettoyer et couvrir la plaie, documenter l'incident",
    options: [
      "Stopper l'activité de ce bénévole, nettoyer et couvrir la plaie, documenter l'incident",
      "Lui dire de continuer en faisant attention",
      "Attendre la fin de l'action pour s'occuper de la blessure",
      "Envoyer immédiatement aux urgences quelle que soit la gravité",
    ],
    explanation:
      "Même une blessure légère nécessite un soin immédiat pour prévenir l'infection en milieu extérieur. La documentation (heure, circonstances) est obligatoire pour les associations.",
    reasoningType: "terrain",
    format: "situations-terrain",
  },
  {
    id: "at14",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Indices sur un site : emballages de supermarché, jouets usagés, sacs poubelle noués. Quelle origine est la plus probable ?",
    answer: "Des particuliers du quartier, probablement faute d'accès facile à la collecte",
    options: [
      "Des particuliers du quartier, probablement faute d'accès facile à la collecte",
      "Une entreprise de nettoyage qui évite les frais de collecte",
      "Un marché illégal de revente de déchets",
      "Un camion de collecte qui a perdu sa cargaison",
    ],
    explanation:
      "Les déchets ménagers classiques (jouets, emballages courants, sacs noués) évoquent un usage domestique. La cause fréquente est l'absence ou l'éloignement d'un point de collecte pratique.",
    reasoningType: "terrain",
    format: "mini-enquetes",
  },
  {
    id: "at15",
    type: "true-false",
    category: "action-terrain",
    question: "Si les bacs de tri sont absents ou pleins pendant une action, il vaut mieux tout mettre en résiduel que de mélanger sans certitude.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Un mélange incertain risque de contaminer une filière entière. Le résiduel est la solution par défaut quand le doute est trop grand. On signale le problème des bacs pour la prochaine action.",
    reasoningType: "terrain",
    format: "situations-terrain",
  },

  // === BATCH C — impact-methodologie ===
  {
    id: "im1",
    type: "true-false",
    category: "impact-methodologie",
    question: "La mention 'recyclable' sur un emballage garantit qu'il sera effectivement recyclé.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Recyclable signifie que le matériau peut techniquement être recyclé. Cela ne tient pas compte de la disponibilité de la filière locale, du tri effectif ni de la qualité après collecte.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites",
  },
  {
    id: "im2",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Quelle est la différence principale entre une Analyse de Cycle de Vie (ACV) et un bilan carbone ?",
    answer: "L'ACV couvre plusieurs impacts environnementaux ; le bilan carbone se concentre sur les gaz à effet de serre",
    options: [
      "L'ACV couvre plusieurs impacts environnementaux ; le bilan carbone se concentre sur les gaz à effet de serre",
      "Le bilan carbone est plus précis car il intègre aussi l'eau et les sols",
      "L'ACV s'applique uniquement aux produits industriels, pas aux services",
      "Ce sont deux noms différents pour le même outil",
    ],
    explanation:
      "Une ACV analyse le cycle de vie complet sur plusieurs dimensions (climat, eau, toxicité, ressources). Le bilan carbone ne mesure que les GES, ce qui peut masquer d'autres impacts significatifs.",
    reasoningType: "comparaison",
    format: "comparaisons",
  },
  {
    id: "im3",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Depuis 1950, quelle proportion du plastique produit dans le monde a été recyclée ?",
    answer: "Moins de 10 %",
    options: ["Moins de 10 %", "Environ 30 %", "Environ 50 %", "Plus de 60 %"],
    explanation:
      "Selon l'étude de Geyer et al. (2017), seulement 9 % du plastique produit depuis 1950 a été recyclé. 12 % a été incinéré et 79 % est encore dans des décharges ou dans l'environnement.",
    reasoningType: "estimation",
    format: "estimations",
  },
  {
    id: "im4",
    type: "true-false",
    category: "impact-methodologie",
    question: "L'incinération avec valorisation énergétique est une solution neutre sur le plan environnemental.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "L'incinération émet du CO2 et d'autres polluants même avec récupération d'énergie. Elle détruit la matière, empêchant tout recyclage ultérieur. C'est une solution de dernier recours, pas un équivalent du recyclage matière.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites",
  },
  {
    id: "im5",
    type: "true-false",
    category: "impact-methodologie",
    question: "Un taux de recyclage affiché à 60 % peut masquer un taux de valorisation matière réel de seulement 20 %.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Les méthodes de calcul varient : certains pays comptent les déchets collectés en entrée de tri, d'autres les matières réellement transformées. L'écart entre 'collecté pour recyclage' et 'effectivement recyclé' peut être très important.",
    reasoningType: "questions contre-intuitives",
    format: "questions-contre-intuitives",
  },
  {
    id: "im6",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Le vrac est-il toujours plus écologique que l'emballage ?",
    answer: "Non, cela dépend des pertes alimentaires, du transport et de la durée de conservation",
    options: [
      "Non, cela dépend des pertes alimentaires, du transport et de la durée de conservation",
      "Oui, toujours, car l'absence d'emballage réduit systématiquement l'empreinte",
      "Oui, sauf pour les liquides qui nécessitent un contenant",
      "Non, le vrac est plus polluant car il nécessite plus de passages en magasin",
    ],
    explanation:
      "Un emballage peut réduire les pertes alimentaires et prolonger la durée de vie du produit. Si le vrac génère plus de gaspillage, son bilan peut être moins favorable. L'analyse dépend du cycle complet.",
    reasoningType: "comparaison",
    format: "comparaisons",
  },
  {
    id: "im7",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Quelle est la différence entre recyclage matière et recyclage chimique ?",
    answer: "Le recyclage matière retraite le matériau ; le recyclage chimique le décompose en molécules de base",
    options: [
      "Le recyclage matière retraite le matériau ; le recyclage chimique le décompose en molécules de base",
      "Le recyclage chimique est interdit en Europe pour raisons de sécurité",
      "Le recyclage matière consomme plus d'énergie que le chimique dans tous les cas",
      "Ce sont deux termes équivalents utilisés par des pays différents",
    ],
    explanation:
      "Le recyclage matière (mécanique) fond ou broie le plastique. Le recyclage chimique (pyrolyse, dépolymérisation) revient à la molécule d'origine. Le chimique est encore peu développé à grande échelle.",
    reasoningType: "comparaison",
    format: "comparaisons",
  },
  {
    id: "im8",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Quelle part approximative représentent les emballages dans les déchets ménagers en Europe ?",
    answer: "Environ un tiers",
    options: ["Environ un tiers", "Moins de 10 %", "Plus de 60 %", "La moitié exactement"],
    explanation:
      "En Europe, les emballages représentent environ 30 à 35 % des déchets ménagers en masse. Déchets alimentaires, textiles et encombrants ont aussi un poids significatif.",
    reasoningType: "estimation",
    format: "estimations",
  },
  {
    id: "im9",
    type: "true-false",
    category: "impact-methodologie",
    question: "Lire un chiffre d'impact environnemental sans connaître sa méthode de calcul peut conduire à de mauvaises décisions.",
    answer: "Vrai",
    options: ["Vrai", "Faux"],
    explanation:
      "Les périmètres, hypothèses et sources varient fortement d'une étude à l'autre. Un chiffre isolé sans méthode peut être honnête mais mal comparé, ou orienté pour valider une conclusion préexistante.",
    reasoningType: "conséquences indirectes",
    format: "consequences-indirectes",
  },

  // === BATCH D — tri-recyclage ===
  {
    id: "tr1",
    type: "true-false",
    category: "tri-recyclage",
    question: "Les vêtements déposés dans les bornes de collecte textile sont tous réutilisés ou recyclés.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Une partie est revendue en seconde main ou transformée en chiffons ou isolants. Mais une fraction significative, notamment les textiles très usés ou mélangés, finit incinérée ou en décharge.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites",
  },
  {
    id: "tr2",
    type: "true-false",
    category: "tri-recyclage",
    question: "Une pile ordinaire peut être jetée à la poubelle ordinaire si elle ne coule pas.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Quelle que soit son état apparent, une pile contient des métaux lourds (mercure, cadmium, plomb) qui contaminent sols et eaux en décharge. La filière de collecte dédiée est obligatoire partout en Europe.",
    reasoningType: "idée reçue",
    format: "vrai-faux-piegeux",
  },
  {
    id: "tr3",
    type: "multiple-choice",
    category: "tri-recyclage",
    question: "Classez ces déchets électroniques du plus au moins dangereux en décharge : smartphone, ampoule fluocompacte, télécommande, câble USB.",
    answer: "Ampoule fluocompacte > smartphone > câble USB > télécommande",
    options: [
      "Ampoule fluocompacte > smartphone > câble USB > télécommande",
      "Smartphone > télécommande > câble USB > ampoule fluocompacte",
      "Câble USB > smartphone > ampoule fluocompacte > télécommande",
      "Télécommande > câble USB > ampoule fluocompacte > smartphone",
    ],
    explanation:
      "L'ampoule fluocompacte contient du mercure, un neurotoxique majeur. Le smartphone contient des métaux rares et du cobalt. Tous sont des DEEE et doivent aller en filière dédiée.",
    reasoningType: "comparaison",
    format: "classements",
  },
  {
    id: "tr4",
    type: "true-false",
    category: "tri-recyclage",
    question: "Une brique alimentaire vide (jus, lait) se recycle comme du carton ordinaire.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Les briques alimentaires sont des matériaux composites (carton + polyéthylène + aluminium). Elles nécessitent une filière spécialisée pour séparer les couches, différente du recyclage du carton seul.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites",
  },
  {
    id: "tr5",
    type: "true-false",
    category: "tri-recyclage",
    question: "Un verre cassé peut être déposé dans le conteneur à verre ordinaire.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation:
      "Le verre cassé présente un risque de blessure pour les agents de collecte. Certains types (pyrex, cristal, vitres) ont des températures de fusion différentes du verre d'emballage et perturbent le recyclage. La déchetterie est le bon endroit.",
    reasoningType: "idée reçue",
    format: "vrai-faux-piegeux",
  },
];


const QUIZ_QUESTION_IDS = QUIZ_QUESTIONS.map((question) => question.id);

export function EnvironmentalQuiz() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const [srsData, setSrsData] = useState<Record<string, SRSStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedReasoningType, setSelectedReasoningType] = useState<QuizReasoningType | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [lastCheckResult, setLastCheckResult] = useState<boolean | null>(null);
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>({});
  const [sessionErrorCounts, setSessionErrorCounts] = useState<Record<string, number>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const questionIds = QUIZ_QUESTIONS.map((q) => q.id);
        const data = await loadQuizSRSData(user?.id || null, questionIds, getToken);
        if (cancelled) {
          return;
        }
        setSrsData(data);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [getToken, user?.id]);

  const filteredQuestions = useMemo(() => {
    if (!selectedReasoningType) return [];
    return QUIZ_QUESTIONS.filter((q) => q.reasoningType === selectedReasoningType);
  }, [selectedReasoningType]);

  const initialQuestions = useMemo(() => {
    if (loading || filteredQuestions.length === 0) return [];
    return buildMixedQuizOrder(filteredQuestions, srsData);
  }, [srsData, loading, filteredQuestions]);

  useEffect(() => {
    if (!selectedReasoningType || loading || sessionQuestions.length > 0) {
      return;
    }

    setSessionQuestions(initialQuestions);
    setCurrentQuestionIdx(0);
  }, [initialQuestions, loading, selectedReasoningType, sessionQuestions.length]);

  const question = sessionQuestions[currentQuestionIdx];
  const quizSummary = useMemo(() => summarizeQuizStates(srsData, QUIZ_QUESTION_IDS), [srsData]);
  const currentQuestionStats = question ? srsData[question.id] : undefined;
  const currentQuestionState = useMemo(
    () => (question ? getQuizStateFromStats(currentQuestionStats) : null),
    [question, currentQuestionStats],
  );
  const nextReasoningType = useMemo(() => getNextReasoningType(selectedReasoningType), [selectedReasoningType]);
  const shouldOfferMiniChallenge = correctStreak >= 2 && nextReasoningType !== null;
  const currentQuestionReviewDate = useMemo(
    () => formatCognitiveDate(currentQuestionStats?.next_review_at ?? null, locale),
    [currentQuestionStats, locale],
  );
  const currentQuestionSeenToday = useMemo(() => {
    if (!currentQuestionStats?.last_seen_at) {
      return false;
    }
    return currentQuestionStats.last_seen_at.includes(new Date().toISOString().split("T")[0]);
  }, [currentQuestionStats]);
  const sessionSummary = useMemo<QuizSessionSummary | null>(() => {
    if (!sessionCompleted) {
      return null;
    }

    const answeredEntries = Object.entries(sessionResults);
    if (answeredEntries.length === 0) {
      return null;
    }

    const questionsById = new Map(QUIZ_QUESTIONS.map((item) => [item.id, item] as const));
    const groupedThemes = new Map<
      string,
      QuizThemeSummary & { answeredCount: number }
    >();

    for (const [questionId, isCorrect] of answeredEntries) {
      const answeredQuestion = questionsById.get(questionId);
      if (!answeredQuestion) {
        continue;
      }

      const reviewTarget = getQuizReviewTarget(answeredQuestion.category, answeredQuestion.review);
      const currentTheme =
        groupedThemes.get(reviewTarget.href) ??
        ({
          label: reviewTarget.label,
          href: reviewTarget.href,
          total: 0,
          correct: 0,
          accuracy: 0,
          answeredCount: 0,
        } satisfies QuizThemeSummary & { answeredCount: number });

      currentTheme.total += 1;
      currentTheme.answeredCount += 1;
      if (isCorrect) {
        currentTheme.correct += 1;
      }
      currentTheme.accuracy = currentTheme.total > 0 ? currentTheme.correct / currentTheme.total : 0;
      groupedThemes.set(reviewTarget.href, currentTheme);
    }

    const themes = Array.from(groupedThemes.values()).map(({ answeredCount: _answeredCount, ...theme }) => theme);
    const themesSucceeded = themes.filter((theme) => theme.total > 0 && theme.correct === theme.total);
    const themesToReview = themes
      .filter((theme) => theme.total > 0 && theme.correct < theme.total)
      .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
    const nextReviewTarget = themesToReview[0]
      ? { label: themesToReview[0].label, href: themesToReview[0].href }
      : themesSucceeded[0]
        ? { label: themesSucceeded[0].label, href: themesSucceeded[0].href }
        : null;

    return {
      score,
      totalQuestions: sessionQuestions.length,
      totalAnswered: answeredEntries.length,
      themesSucceeded,
      themesToReview,
      nextReviewTarget,
    };
  }, [score, sessionCompleted, sessionResults, sessionQuestions.length]);

  const handleSRSUpdate = async (quality: SRSQuality) => {
    if (!question) return;

    const currentStats = srsData[question.id
  // === BATCH E — expertise-et-debats ===
  {
    id: "ec1",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Une commune dépense beaucoup pour ramasser les emballages abandonnés dans la rue. Qui paie théoriquement pour la fin de vie de ces produits ?",
    answer: "Les producteurs via l'éco-contribution (Responsabilité Élargie du Producteur - REP)",
    options: [
      "Les producteurs via l'éco-contribution (Responsabilité Élargie du Producteur - REP)",
      "Uniquement les contribuables locaux via la taxe d'enlèvement des ordures",
      "Les supermarchés qui les distribuent",
      "L'État central via l'impôt sur le revenu"
    ],
    explanation: "Le principe de Responsabilité Élargie du Producteur (REP) oblige les fabricants à financer la fin de vie de leurs produits. Comprendre cela permet d'orienter le plaidoyer vers la source plutôt que de se limiter au nettoyage bénévole.",
    reasoningType: "conséquences indirectes",
    format: "mini-enquetes"
  },
  {
    id: "ec2",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Selon la hiérarchie européenne de traitement des déchets, quelle est l'action prioritaire absolue ?",
    answer: "La prévention et la réduction à la source",
    options: [
      "La prévention et la réduction à la source",
      "Le réemploi et la réparation",
      "Le recyclage matière",
      "La valorisation énergétique (incinération)"
    ],
    explanation: "Le meilleur déchet est celui qu'on ne produit pas. Le recyclage n'arrive qu'en 3ème position après la prévention et le réemploi. C'est un argument clé pour s'opposer au 'tout-recyclable' comme solution miracle.",
    reasoningType: "comparaison",
    format: "classements"
  },
  {
    id: "rc1",
    type: "true-false",
    category: "tri-recyclage",
    question: "Un gobelet portant la mention 'Plastique biosourcé et compostable' (PLA) peut être jeté sans problème dans un composteur de quartier.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "La majorité du PLA nécessite un compostage industriel (plus de 60°C pendant des semaines). Dans un composteur domestique, il ne se dégrade pas, et dans le bac de tri jaune, il perturbe le recyclage du PET classique.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites"
  },
  {
    id: "rc2",
    type: "true-false",
    category: "tri-recyclage",
    question: "Le recyclage du plastique fonctionne sur un cycle infini, au même titre que le verre ou le métal.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "Contrairement au verre ou à l'aluminium, le plastique subit un 'décyclage' (downcycling). Ses chaînes de polymères se cassent à chaque fonte. Il finit souvent par être incinéré ou enfoui après 1 ou 2 cycles.",
    reasoningType: "idée reçue",
    format: "vrai-faux-piegeux"
  },
  {
    id: "hb1",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Pendant un tri, un bénévole hésite sur un emballage complexe et dit : 'Je le mets au recyclage au cas où, ils feront le tri là-bas'. Comment s'appelle ce biais très dommageable ?",
    answer: "Le tri optimiste (wishcycling)",
    options: [
      "Le tri optimiste (wishcycling)",
      "Le syndrome du sauveur environnemental",
      "L'effet rebond",
      "Le paradoxe de Jevons"
    ],
    explanation: "Le 'wishcycling' augmente les coûts de traitement, abîme les machines et risque de faire refuser toute la balle de recyclage. Le bon réflexe en cas de doute persistant reste le bac résiduel.",
    reasoningType: "questions contre-intuitives",
    format: "situations-terrain"
  },
  {
    id: "hb2",
    type: "true-false",
    category: "impact-methodologie",
    question: "Remplacer systématiquement un sac plastique à usage unique par un tote bag en coton est toujours une victoire écologique nette.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "À cause de l'impact colossal de la culture du coton (eau, pesticides), un tote bag doit être utilisé des centaines, voire des milliers de fois pour amortir son bilan écologique par rapport au plastique. C'est un exemple de transfert d'impact.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites"
  },
  {
    id: "reg1",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Quel est l'avantage principal d'un système de consigne pour réemploi par rapport au tri sélectif classique ?",
    answer: "Il garantit une boucle fermée très propre et évite l'extraction de nouvelle matière",
    options: [
      "Il garantit une boucle fermée très propre et évite l'extraction de nouvelle matière",
      "Il permet aux communes de gagner plus d'argent sur la revente des matériaux",
      "Il nécessite beaucoup moins de camions sur les routes",
      "Il autorise les consommateurs à jeter les bouteilles n'importe où"
    ],
    explanation: "La consigne (notamment du verre) évite de refondre la matière à 1500°C. Elle nécessite juste un lavage, économisant jusqu'à 75% d'énergie par rapport au recyclage classique, tout en évitant la contamination.",
    reasoningType: "comparaison",
    format: "questions-contre-intuitives"
  },
  {
    id: "co1",
    type: "true-false",
    category: "action-terrain",
    question: "Dans un composteur partagé, la présence de nombreux moucherons et une forte odeur d'ammoniaque prouvent que la décomposition est optimale.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "C'est le signe d'un déséquilibre : excès d'humidité et d'azote (trop de restes alimentaires, manque d'air). Il faut rééquilibrer en ajoutant de la matière sèche carbonée (feuilles, broyat, carton) et aérer.",
    reasoningType: "terrain",
    format: "vrai-faux-piegeux"
  },
  {
    id: "bd1",
    type: "true-false",
    category: "climat-biodiversite",
    question: "La pollution plastique dans les sols agricoles est moins préoccupante que dans l'océan car les déchets n'y bougent pas.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "Les microplastiques (issus de bâches, boues d'épuration) modifient la porosité du sol, impactent la faune du sol (vers de terre) et peuvent être absorbés par les cultures, entrant ainsi directement dans la chaîne alimentaire humaine.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites"
  },
  {
    id: "id1",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Sur le terrain, comment différencier rapidement un plastique souple (films) d'un plastique rigide pour bien orienter le tri ?",
    answer: "Le test de la poignée : si on le froisse dans le poing et qu'il reprend sa forme, il est rigide",
    options: [
      "Le test de la poignée : si on le froisse dans le poing et qu'il reprend sa forme, il est rigide",
      "Le test de l'eau : le rigide coule toujours, le souple flotte",
      "La couleur : les plastiques souples sont toujours transparents ou blancs",
      "Le bruit : un plastique rigide ne fait jamais de bruit quand on le plie"
    ],
    explanation: "Le 'test de la poignée de main' est une astuce de terrain. Si le plastique garde la forme de boule, c'est un film (souple). S'il se déplie tout seul (comme un pot de yaourt ou une barquette), il compte comme rigide.",
    reasoningType: "terrain",
    format: "situations-terrain"
  }

];
    const nextStats = computeNextSRSState(currentStats, quality);

    setSrsData((prev) => ({ ...prev, [question.id]: nextStats }));
    await saveQuizSRSState(user?.id || null, nextStats, getToken);
  };

  const checkAnswer = () => {
    if (!question) return;

    const isCorrect = selectedOption === question.answer;
    setLastCheckResult(isCorrect);
    setShowAnswer(true);
    setSessionResults((prev) =>
      prev[question.id] === undefined ? { ...prev, [question.id]: isCorrect } : prev,
    );

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setCorrectStreak((prev) => prev + 1);
    } else {
      setCorrectStreak(0);
      const nextErrorCount = (sessionErrorCounts[question.category] ?? 0) + 1;
      setSessionErrorCounts((prev) => ({
        ...prev,
        [question.category as string]: nextErrorCount,
      }));
      setSessionQuestions((prev) =>
        insertAdaptiveReinforcement(
          prev,
          currentQuestionIdx,
          question,
          nextErrorCount,
          (item) => getQuizReviewTarget(item.category, item.review).href,
        ),
      );
      handleSRSUpdate(0);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < sessionQuestions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedOption("");
      setShowAnswer(false);
      setLastCheckResult(null);
      return;
    }

    setSessionCompleted(true);
  };

  const resetQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption("");
    setShowAnswer(false);
    setScore(0);
    setCorrectStreak(0);
    setLastCheckResult(null);
    setSelectedReasoningType(null);
    setSessionResults({});
    setSessionErrorCounts({});
    setSessionQuestions([]);
    setSessionCompleted(false);
  };

  const startMiniChallenge = () => {
    if (!nextReasoningType) return;

    setSelectedReasoningType(nextReasoningType);
    setCurrentQuestionIdx(0);
    setSelectedOption("");
    setShowAnswer(false);
    setScore(0);
    setCorrectStreak(0);
    setLastCheckResult(null);
    setSessionResults({});
    setSessionErrorCounts({});
    setSessionQuestions([]);
    setSessionCompleted(false);
  };

  if (selectedReasoningType && !question && !loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="cmm-text-secondary font-medium italic">
          {locale === "fr"
            ? "Préparation de la session de raisonnement..."
            : "Preparing the reasoning session..."}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="cmm-text-secondary font-medium italic">
          Chargement de votre parcours adaptatif...
        </p>
      </div>
    );
  }

  if (!selectedReasoningType) {
    return (
      <QuizReasoningPicker
        locale={locale}
        quizSummary={quizSummary}
        onSelectReasoningType={setSelectedReasoningType}
      />
    );
  }

  if (!question) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="font-medium italic cmm-text-secondary">
          {locale === "fr"
            ? "Aucune question disponible pour ce type de raisonnement."
            : "No question available for this reasoning type."}
        </p>
        <button
          onClick={resetQuiz}
          className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-muted)] px-4 py-2 font-semibold cmm-text-primary"
        >
          {locale === "fr" ? "Revenir au choix" : "Back to selection"}
        </button>
      </div>
    );
  }

  return (
    <QuizSessionPanel
      locale={locale}
      question={question}
      questionIndex={currentQuestionIdx}
      totalQuestions={sessionQuestions.length}
      currentQuestionState={currentQuestionState}
      currentQuestionReviewDate={currentQuestionReviewDate}
      currentQuestionStreak={currentQuestionStats?.streak ?? 0}
      currentQuestionMasteryLevel={currentQuestionStats?.mastery_level ?? 0}
      selectedOption={selectedOption}
      showAnswer={showAnswer}
      lastCheckResult={lastCheckResult}
      score={score}
      shouldOfferMiniChallenge={shouldOfferMiniChallenge}
      nextReasoningType={nextReasoningType}
      hasReviewedToday={currentQuestionSeenToday}
      sessionSummary={sessionSummary}
      onSelectOption={setSelectedOption}
      onCheckAnswer={checkAnswer}
      onNextQuestion={nextQuestion}
      onResetQuiz={resetQuiz}
      onStartMiniChallenge={startMiniChallenge}
      onHandleSRSUpdate={handleSRSUpdate}
    />
  );
}
