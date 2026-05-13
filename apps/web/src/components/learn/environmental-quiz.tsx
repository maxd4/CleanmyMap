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
import { QuizDifficultyPicker } from "@/components/learn/quiz-difficulty-picker";
import { QuizSessionPanel } from "@/components/learn/quiz-session-panel";

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "flashcard";
  category: string;
  question: string;
  answer: string;
  options?: string[];
  explanation: string;
  difficulty: "enfant" | "novice" | "intermédiaire" | "expert";
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "e1",
    type: "multiple-choice",
    category: "Déchets",
    question: "Dans quelle poubelle doit-on jeter une bouteille en plastique ?",
    answer: "La poubelle jaune",
    options: ["La poubelle jaune", "La poubelle grise", "Par terre", "Dans le compost"],
    explanation: "Le plastique se recycle et doit être mis dans la poubelle jaune.",
    difficulty: "enfant",
  },
  {
    id: "e3",
    type: "multiple-choice",
    category: "Tri",
    question: "Que faire d'un emballage propre et vide ?",
    answer: "Le mettre dans le bac de tri",
    options: ["Le mettre dans le bac de tri", "Le jeter au compost", "Le mettre en déchèterie", "Le garder chez soi"],
    explanation: "Un emballage propre et vide suit en général la filière de tri des emballages de ta commune.",
    difficulty: "enfant",
  },
  {
    id: "e2",
    type: "multiple-choice",
    category: "Nature",
    question: "Que rejettent les arbres qui nous permet de respirer ?",
    answer: "De l'oxygène",
    options: ["De l'oxygène", "De l'eau", "Du sucre", "Du vent"],
    explanation: "Grâce à la photosynthèse, les arbres produisent l'oxygène que nous respirons.",
    difficulty: "enfant",
  },
  {
    id: "n1",
    type: "multiple-choice",
    category: "Changement climatique",
    question: "Quel gaz est le principal responsable du réchauffement climatique dû à l'homme ?",
    answer: "Le Dioxyde de carbone (CO2)",
    options: ["Le Dioxyde de carbone (CO2)", "L'Oxygène", "L'Azote", "L'Hydrogène"],
    explanation: "Le CO2 issu des énergies fossiles est le principal gaz à effet de serre.",
    difficulty: "novice",
  },
  {
    id: "n2",
    type: "multiple-choice",
    category: "Eau",
    question: "Quelle activité consomme le plus d'eau douce dans le monde ?",
    answer: "L'agriculture",
    options: ["L'agriculture", "L'industrie", "L'usage domestique (douches, etc.)", "Les piscines"],
    explanation: "L'agriculture représente environ 70% de la consommation d'eau douce mondiale.",
    difficulty: "novice",
  },
  {
    id: "n3",
    type: "multiple-choice",
    category: "Tri",
    question: "Que faire d'un carton de pizza très gras ?",
    answer: "Le jeter en résiduel",
    options: ["Le jeter en résiduel", "Le mettre au verre", "Le mettre au compost", "Le mettre avec les papiers propres"],
    explanation: "Un carton très gras contamine le recyclage du papier-carton; il vaut mieux le mettre en résiduel.",
    difficulty: "novice",
  },
  {
    id: "n4",
    type: "multiple-choice",
    category: "Compost",
    question: "Où vont les déchets alimentaires si ta commune propose une collecte dédiée ?",
    answer: "Dans la collecte biodéchets ou au compost",
    options: [
      "Dans la collecte biodéchets ou au compost",
      "Dans la poubelle verre",
      "Dans la déchèterie uniquement",
      "Avec les emballages plastiques",
    ],
    explanation: "Les déchets alimentaires suivent une filière compost ou biodéchets lorsqu'elle existe localement.",
    difficulty: "novice",
  },
  {
    id: "n5",
    type: "multiple-choice",
    category: "IA & environnement",
    question:
      "Quel est l'effet réel d'une requête IA courte sur l'électricité consommée ? (0,24 Wh, soit environ 2 secondes de consommation électrique d'un foyer français moyen)",
    answer: "C'est très faible à l'unité, mais cela compte quand on multiplie les requêtes",
    options: [
      "C'est très faible à l'unité, mais cela compte quand on multiplie les requêtes",
      "C'est équivalent à une journée entière d'un foyer",
      "C'est plus élevé qu'un trajet en voiture de 100 km",
      "C'est négligeable même à grande échelle",
    ],
    explanation:
      "Une requête isolée pèse peu, mais l'impact devient significatif quand on additionne des milliers ou des millions d'appels.",
    difficulty: "novice",
  },
  {
    id: "i1",
    type: "multiple-choice",
    category: "Limites planétaires",
    question: "Combien y a-t-il de limites planétaires définies par les scientifiques ?",
    answer: "9",
    options: ["6", "9", "12", "15"],
    explanation: "Il existe 9 limites planétaires qui définissent un espace de sécurité pour l'humanité.",
    difficulty: "intermédiaire",
  },
  {
    id: "i2",
    type: "multiple-choice",
    category: "Énergie",
    question: "Quelle est la part des énergies renouvelables dans la production électrique mondiale ?",
    answer: "Environ 30%",
    options: ["Environ 10%", "Environ 30%", "Environ 50%", "Environ 75%"],
    explanation: "La part du renouvelable augmente rapidement mais reste autour de 30% en 2023.",
    difficulty: "intermédiaire",
  },
  {
    id: "i5",
    type: "multiple-choice",
    category: "Recyclage",
    question: "Une bouteille en verre vide doit-elle aller avec le plastique ?",
    answer: "Non, elle va dans le conteneur verre",
    options: ["Non, elle va dans le conteneur verre", "Oui, dans la poubelle jaune", "Oui, au compost", "Non, toujours à la déchèterie"],
    explanation: "Le verre a sa propre filière et ne doit pas être mélangé avec les emballages plastiques.",
    difficulty: "intermédiaire",
  },
  {
    id: "i6",
    type: "multiple-choice",
    category: "Collecte dédiée",
    question: "Que faire d'une pile usagée ?",
    answer: "La déposer dans une borne dédiée",
    options: ["La déposer dans une borne dédiée", "La mettre dans la poubelle grise", "La mettre au verre", "La mettre avec les papiers"],
    explanation: "Les piles et batteries suivent une collecte spécifique pour éviter les risques et permettre le recyclage.",
    difficulty: "intermédiaire",
  },
  {
    id: "i3",
    type: "multiple-choice",
    category: "Méthodologie",
    question: "Avec le proxy actuel, combien de litres d'eau représente 10 mégots ?",
    answer: "5 000 L",
    options: ["500 L", "5 000 L", "50 000 L", "500 000 L"],
    explanation: "10 mégots × 500 L = 5 000 L. L'ordre de grandeur aide à comparer avant d'ouvrir la méthode détaillée.",
    difficulty: "intermédiaire",
  },
  {
    id: "i4",
    type: "multiple-choice",
    category: "Méthodologie",
    question: "Avec 20 kg de déchets, quel ordre de grandeur de CO2eq est utilisé ?",
    answer: "24 kg CO2eq",
    options: ["2,4 kg CO2eq", "24 kg CO2eq", "240 kg CO2eq", "2 400 kg CO2eq"],
    explanation: "20 kg × 1,2 kg CO2eq = 24 kg CO2eq.",
    difficulty: "intermédiaire",
  },
  {
    id: "i7",
    type: "multiple-choice",
    category: "IA & environnement",
    question: "À quoi correspondent 20 kgCO2e en voiture moyenne ? (≈ 100 km à 193 gCO2e/km)",
    answer: "Environ 100 km",
    options: ["Environ 10 km", "Environ 100 km", "Environ 1 000 km", "Environ 10 000 km"],
    explanation:
      "Avec un facteur moyen de 193,2 gCO2e/km, 20 kgCO2e correspondent à un peu plus de 100 km de voiture. C'est un ordre de grandeur pédagogique, pas une équivalence universelle.",
    difficulty: "intermédiaire",
  },
  {
    id: "i8",
    type: "multiple-choice",
    category: "IA & environnement",
    question: "À quoi correspondent 100 kWh pour un foyer français moyen ? (≈ 9 jours sur la base de 4 111 kWh/an)",
    answer: "Environ 9 jours",
    options: ["Environ 1 jour", "Environ 9 jours", "Environ 1 mois", "Environ 1 an"],
    explanation:
      "Sur une base moyenne de 4 111 kWh par an, 100 kWh représentent un peu moins de 9 jours de consommation électrique d'un foyer. L'équivalence varie selon la taille du foyer et ses usages.",
    difficulty: "intermédiaire",
  },
  {
    id: "x1",
    type: "multiple-choice",
    category: "GIEC",
    question:
      "Dans le rapport AR6 du GIEC, quel budget carbone reste-t-il pour avoir 50% de chance de limiter le réchauffement à 1,5°C ?",
    answer: "Environ 500 GtCO2",
    options: ["Environ 200 GtCO2", "Environ 500 GtCO2", "Environ 1000 GtCO2", "Environ 2000 GtCO2"],
    explanation: "Au rythme actuel, ce budget sera épuisé en moins d'une décennie.",
    difficulty: "expert",
  },
  {
    id: "x2",
    type: "multiple-choice",
    category: "Biodiversité",
    question: "Quel est le taux actuel d'extinction des espèces par rapport au taux naturel ?",
    answer: "100 à 1000 fois supérieur",
    options: ["10 fois supérieur", "50 fois supérieur", "100 à 1000 fois supérieur", "Plus de 5000 fois supérieur"],
    explanation: "Nous traversons la sixième extinction de masse, causée par l'activité humaine.",
    difficulty: "expert",
  },
  {
    id: "x6",
    type: "multiple-choice",
    category: "IA & environnement",
    question:
      "Pourquoi les comparaisons d'impact IA en km de voiture ou en jours d'électricité doivent-elles rester prudentes ?",
    answer: "Parce que le résultat dépend du périmètre, du véhicule, du foyer et du mix électrique",
    options: [
      "Parce que le résultat dépend du périmètre, du véhicule, du foyer et du mix électrique",
      "Parce que ces équivalences sont toujours exactes à 100 %",
      "Parce que l'énergie d'une IA ne peut jamais être comparée",
      "Parce que la voiture et l'électricité n'ont aucun lien avec le climat",
    ],
    explanation:
      "Ce sont des repères pédagogiques utiles, pas des conversions universelles. Le bon chiffre dépend du modèle, du contexte d'usage, de la région du datacenter et du type de véhicule ou de foyer retenu.",
    difficulty: "expert",
  },
  {
    id: "x3",
    type: "multiple-choice",
    category: "Méthodologie",
    question: "Avec 30 minutes de bénévolat, quelle surface nettoyée est estimée ?",
    answer: "3,6 m²",
    options: ["0,36 m²", "3,6 m²", "36 m²", "360 m²"],
    explanation: "30 min × 0,12 m² = 3,6 m².",
    difficulty: "expert",
  },
  {
    id: "x5",
    type: "multiple-choice",
    category: "Tri",
    question: "Pourquoi faut-il vider et séparer les matériaux avant de trier ?",
    answer: "Pour éviter de contaminer la filière",
    options: [
      "Pour éviter de contaminer la filière",
      "Pour remplir plus vite la poubelle",
      "Pour que tout parte au compost",
      "Pour éviter de recycler",
    ],
    explanation: "Un tri propre améliore la qualité des matières collectées et limite les refus de recyclage.",
    difficulty: "expert",
  },
  {
    id: "x4",
    type: "multiple-choice",
    category: "Méthodologie",
    question: "Avec 80 kg de déchets, quelle économie estimée donne le proxy ?",
    answer: "120 €",
    options: ["12 €", "60 €", "120 €", "1 200 €"],
    explanation: "80 kg × 1,5 € = 120 €.",
    difficulty: "expert",
  },
];

const QUIZ_QUESTION_IDS = QUIZ_QUESTIONS.map((question) => question.id);
const DIFFICULTY_ORDER: QuizQuestion["difficulty"][] = [
  "enfant",
  "novice",
  "intermédiaire",
  "expert",
];

function getNextDifficulty(
  difficulty: QuizQuestion["difficulty"] | null,
): QuizQuestion["difficulty"] | null {
  if (!difficulty) {
    return "novice";
  }

  const index = DIFFICULTY_ORDER.indexOf(difficulty);
  return DIFFICULTY_ORDER[index + 1] ?? null;
}

export function EnvironmentalQuiz() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const [srsData, setSrsData] = useState<Record<string, SRSStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizQuestion["difficulty"] | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [lastCheckResult, setLastCheckResult] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      const questionIds = QUIZ_QUESTIONS.map((q) => q.id);
      const data = await loadQuizSRSData(user?.id || null, questionIds, getToken);
      setSrsData(data);
      setLoading(false);
    }

    init();
  }, [getToken, user?.id]);

  const filteredQuestions = useMemo(() => {
    if (!selectedDifficulty) return [];
    return QUIZ_QUESTIONS.filter((q) => q.difficulty === selectedDifficulty);
  }, [selectedDifficulty]);

  const sortedQuestions = useMemo(() => {
    if (loading || filteredQuestions.length === 0) return [];
    return buildMixedQuizOrder(filteredQuestions, srsData);
  }, [srsData, loading, filteredQuestions]);

  const question = sortedQuestions[currentQuestionIdx];
  const quizSummary = useMemo(() => summarizeQuizStates(srsData, QUIZ_QUESTION_IDS), [srsData]);
  const currentQuestionStats = question ? srsData[question.id] : undefined;
  const currentQuestionState = useMemo(
    () => (question ? getQuizStateFromStats(currentQuestionStats) : null),
    [question, currentQuestionStats],
  );
  const nextDifficulty = useMemo(() => getNextDifficulty(selectedDifficulty), [selectedDifficulty]);
  const shouldOfferMiniChallenge = correctStreak >= 2 && nextDifficulty !== null;
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

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setCorrectStreak((prev) => prev + 1);
    } else {
      setCorrectStreak(0);
      handleSRSUpdate(0);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < sortedQuestions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedOption("");
      setShowAnswer(false);
      setLastCheckResult(null);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption("");
    setShowAnswer(false);
    setScore(0);
    setCorrectStreak(0);
    setLastCheckResult(null);
    setSelectedDifficulty(null);
  };

  const startMiniChallenge = () => {
    if (!nextDifficulty) return;

    setSelectedDifficulty(nextDifficulty);
    setCurrentQuestionIdx(0);
    setSelectedOption("");
    setShowAnswer(false);
    setScore(0);
    setCorrectStreak(0);
    setLastCheckResult(null);
  };

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

  if (!selectedDifficulty) {
    return (
      <QuizDifficultyPicker
        locale={locale}
        quizSummary={quizSummary}
        onSelectDifficulty={setSelectedDifficulty}
      />
    );
  }

  if (!question) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Zap className="animate-pulse text-emerald-500" size={48} />
        <p className="font-medium italic cmm-text-secondary">
          {locale === "fr"
            ? "Aucune question disponible pour ce niveau."
            : "No question available for this level."}
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
      totalQuestions={sortedQuestions.length}
      currentQuestionState={currentQuestionState}
      currentQuestionReviewDate={currentQuestionReviewDate}
      currentQuestionStreak={currentQuestionStats?.streak ?? 0}
      currentQuestionMasteryLevel={currentQuestionStats?.mastery_level ?? 0}
      selectedOption={selectedOption}
      showAnswer={showAnswer}
      lastCheckResult={lastCheckResult}
      score={score}
      shouldOfferMiniChallenge={shouldOfferMiniChallenge}
      nextDifficulty={nextDifficulty}
      hasReviewedToday={currentQuestionSeenToday}
      onSelectOption={setSelectedOption}
      onCheckAnswer={checkAnswer}
      onNextQuestion={nextQuestion}
      onResetQuiz={resetQuiz}
      onStartMiniChallenge={startMiniChallenge}
      onHandleSRSUpdate={handleSRSUpdate}
    />
  );
}
