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

    const currentStats = srsData[question.id];
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
