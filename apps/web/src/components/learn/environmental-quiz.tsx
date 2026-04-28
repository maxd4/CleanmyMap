"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  Trophy,
  Shuffle,
  Brain,
  History,
  Star,
  Zap,
  Sparkles
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { 
  SRSStats, 
  computeNextSRSState, 
  SRSQuality, 
} from "@/lib/gamification/quiz-srs";
import { loadQuizSRSData, saveQuizSRSState } from "@/lib/services/quiz-srs-service";
import { cn } from "@/lib/utils";

interface QuizQuestion {
 id: string;
 type: 'multiple-choice' | 'flashcard';
 category: string;
 question: string;
 answer: string;
 options?: string[];
 explanation: string;
 difficulty: 'enfant' | 'novice' | 'intermédiaire' | 'expert';
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  // --- ENFANT ---
  {
    id: "e1",
    type: "multiple-choice",
    category: "Déchets",
    question: "Dans quelle poubelle doit-on jeter une bouteille en plastique ?",
    answer: "La poubelle jaune",
    options: ["La poubelle jaune", "La poubelle grise", "Par terre", "Dans le compost"],
    explanation: "Le plastique se recycle et doit être mis dans la poubelle jaune.",
    difficulty: "enfant"
  },
  {
    id: "e2",
    type: "multiple-choice",
    category: "Nature",
    question: "Que rejettent les arbres qui nous permet de respirer ?",
    answer: "De l'oxygène",
    options: ["De l'oxygène", "De l'eau", "Du sucre", "Du vent"],
    explanation: "Grâce à la photosynthèse, les arbres produisent l'oxygène que nous respirons.",
    difficulty: "enfant"
  },
  // --- NOVICE ---
  {
    id: "n1",
    type: "multiple-choice",
    category: "Changement climatique",
    question: "Quel gaz est le principal responsable du réchauffement climatique dû à l'homme ?",
    answer: "Le Dioxyde de carbone (CO2)",
    options: ["Le Dioxyde de carbone (CO2)", "L'Oxygène", "L'Azote", "L'Hydrogène"],
    explanation: "Le CO2 issu des énergies fossiles est le principal gaz à effet de serre.",
    difficulty: "novice"
  },
  {
    id: "n2",
    type: "multiple-choice",
    category: "Eau",
    question: "Quelle activité consomme le plus d'eau douce dans le monde ?",
    answer: "L'agriculture",
    options: ["L'agriculture", "L'industrie", "L'usage domestique (douches, etc.)", "Les piscines"],
    explanation: "L'agriculture représente environ 70% de la consommation d'eau douce mondiale.",
    difficulty: "novice"
  },
  // --- INTERMÉDIAIRE ---
  {
    id: "i1",
    type: "multiple-choice",
    category: "Limites planétaires",
    question: "Combien y a-t-il de limites planétaires définies par les scientifiques ?",
    answer: "9",
    options: ["6", "9", "12", "15"],
    explanation: "Il existe 9 limites planétaires qui définissent un espace de sécurité pour l'humanité.",
    difficulty: "intermédiaire"
  },
  {
    id: "i2",
    type: "multiple-choice",
    category: "Énergie",
    question: "Quelle est la part des énergies renouvelables dans la production électrique mondiale ?",
    answer: "Environ 30%",
    options: ["Environ 10%", "Environ 30%", "Environ 50%", "Environ 75%"],
    explanation: "La part du renouvelable augmente rapidement mais reste autour de 30% en 2023.",
    difficulty: "intermédiaire"
  },
  // --- EXPERT ---
  {
    id: "x1",
    type: "multiple-choice",
    category: "GIEC",
    question: "Dans le rapport AR6 du GIEC, quel budget carbone reste-t-il pour avoir 50% de chance de limiter le réchauffement à 1,5°C ?",
    answer: "Environ 500 GtCO2",
    options: ["Environ 200 GtCO2", "Environ 500 GtCO2", "Environ 1000 GtCO2", "Environ 2000 GtCO2"],
    explanation: "Au rythme actuel, ce budget sera épuisé en moins d'une décennie.",
    difficulty: "expert"
  },
  {
    id: "x2",
    type: "multiple-choice",
    category: "Biodiversité",
    question: "Quel est le taux actuel d'extinction des espèces par rapport au taux naturel ?",
    answer: "100 à 1000 fois supérieur",
    options: ["10 fois supérieur", "50 fois supérieur", "100 à 1000 fois supérieur", "Plus de 5000 fois supérieur"],
    explanation: "Nous traversons la sixième extinction de masse, causée par l'activité humaine.",
    difficulty: "expert"
  }
];

export function EnvironmentalQuiz() {
  const { user } = useUser();
  const [srsData, setSrsData] = useState<Record<string, SRSStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizQuestion['difficulty'] | null>(null);
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [lastCheckResult, setLastCheckResult] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      const questionIds = QUIZ_QUESTIONS.map(q => q.id);
      const data = await loadQuizSRSData(user?.id || null, questionIds);
      setSrsData(data);
      setLoading(false);
    }
    init();
  }, [user?.id]);

  const filteredQuestions = useMemo(() => {
    if (!selectedDifficulty) return [];
    return QUIZ_QUESTIONS.filter(q => q.difficulty === selectedDifficulty);
  }, [selectedDifficulty]);

  const sortedQuestions = useMemo(() => {
    if (loading || filteredQuestions.length === 0) return [];
    
    return [...filteredQuestions].sort((a, b) => {
      const statsA = srsData[a.id];
      const statsB = srsData[b.id];
      
      const now = new Date().getTime();
      const isDueA = new Date(statsA.next_review_at).getTime() <= now;
      const isDueB = new Date(statsB.next_review_at).getTime() <= now;

      if (isDueA && !isDueB) return -1;
      if (!isDueA && isDueB) return 1;

      if (statsA.streak === 0 && statsB.streak > 0) return -1;
      if (statsA.streak > 0 && statsB.streak === 0) return 1;

      return new Date(statsA.next_review_at).getTime() - new Date(statsB.next_review_at).getTime();
    });
  }, [srsData, loading, filteredQuestions]);

  const question = sortedQuestions[currentQuestionIdx];

  const handleSRSUpdate = async (quality: SRSQuality) => {
    if (!question) return;
    
    const currentStats = srsData[question.id];
    const nextStats = computeNextSRSState(currentStats, quality);
    
    setSrsData(prev => ({ ...prev, [question.id]: nextStats }));
    await saveQuizSRSState(user?.id || null, nextStats);
  };

  const checkAnswer = () => {
    const isCorrect = selectedOption === question.answer;

    setLastCheckResult(isCorrect);
    setShowAnswer(true);

    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      handleSRSUpdate(0);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < sortedQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
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
    setLastCheckResult(null);
    setSelectedDifficulty(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Zap className="text-emerald-500 animate-pulse" size={48} />
        <p className="cmm-text-secondary font-medium italic">Chargement de votre parcours adaptatif...</p>
      </div>
    );
  }

  if (!selectedDifficulty) {
    return (
      <div className="space-y-12 py-10">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-50 rounded-full border border-emerald-100 mb-4"
          >
            <Brain className="text-emerald-600" size={20} />
            <span className="text-sm font-black text-emerald-800 uppercase tracking-widest">Parcours Adaptatif</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-black cmm-text-primary tracking-tight">Choisissez votre niveau</h2>
          <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium">
            Adaptez les questions à votre connaissance de l'écologie pour une meilleure expérience d'apprentissage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {(['enfant', 'novice', 'intermédiaire', 'expert'] as const).map((level, idx) => (
            <motion.button
              key={level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedDifficulty(level)}
              className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all text-left overflow-hidden"
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner",
                level === 'enfant' ? "bg-amber-100 text-amber-600" :
                level === 'novice' ? "bg-emerald-100 text-emerald-600" :
                level === 'intermédiaire' ? "bg-blue-100 text-blue-600" :
                "bg-violet-100 text-violet-600"
              )}>
                {level === 'enfant' ? <Sparkles size={28} /> :
                 level === 'novice' ? <Brain size={28} /> :
                 level === 'intermédiaire' ? <Trophy size={28} /> :
                 <Zap size={28} />}
              </div>
              <h3 className="text-xl font-black cmm-text-primary capitalize mb-2">{level}</h3>
              <p className="text-sm cmm-text-secondary font-medium leading-relaxed">
                {level === 'enfant' ? "Idéal pour les plus jeunes. Des bases simples et ludiques." :
                 level === 'novice' ? "Pour débuter sereinement avec les concepts fondamentaux." :
                 level === 'intermédiaire' ? "Niveau standard. Couvre les enjeux climatiques majeurs." :
                 "Pour les passionnés. Chiffres précis et concepts techniques."}
              </p>
              <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                <CheckCircle className="text-emerald-500" size={32} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Brain className="text-violet-600" size={32} />
          <h2 className="text-3xl font-black cmm-text-primary tracking-tight">Apprentissage Adaptatif</h2>
        </div>
        <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium">
          Ce quiz utilise la répétition espacée. Les questions reviennent selon votre niveau de maîtrise.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
            <Trophy size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Score</div>
            <div className="text-lg font-black cmm-text-primary">{score}</div>
          </div>
        </div>
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Streak</div>
            <div className="text-lg font-black cmm-text-primary">{srsData[question?.id]?.streak || 0}</div>
          </div>
        </div>
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <History size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Révision</div>
            <div className="text-lg font-black cmm-text-primary">
              {new Date(srsData[question?.id]?.next_review_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
            <Star size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Maîtrise</div>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-3 rounded-full",
                    i < (srsData[question?.id]?.mastery_level || 0) ? "bg-amber-500" : "bg-slate-200"
                  )} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className="bg-emerald-500 h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQuestionIdx + 1) / sortedQuestions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Brain size={200} />
        </div>
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm",
              question.type === 'multiple-choice' ? 'bg-violet-500 text-white' : 'bg-emerald-500 text-white'
            )}>
              {question.type === 'multiple-choice' ? 'Choix Multiple' : 'Flashcard'}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <Sparkles size={12} className="text-violet-400" />
              {question.category}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
            <span className="text-slate-900 font-black">{currentQuestionIdx + 1}</span>
            <span className="opacity-30">/</span>
            <span>{sortedQuestions.length}</span>
          </div>
        </div>

        <h3 className="text-xl font-bold cmm-text-primary mb-6 leading-relaxed">
          {question.question}
        </h3>

        {question.type === 'multiple-choice' && question.options && (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !showAnswer && setSelectedOption(option)}
                className={`w-full p-4 text-left rounded-xl border transition-all ${
                  selectedOption === option
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                } ${showAnswer ? 'cursor-not-allowed opacity-60' : ''}`}
                disabled={showAnswer}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {question.type === 'flashcard' && !showAnswer && (
          <div className="text-center">
            <button
              onClick={() => setShowAnswer(true)}
              className="px-8 py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
            >
              Révéler la réponse
            </button>
          </div>
        )}

        {((question.type === 'multiple-choice' && selectedOption)) && !showAnswer && (
          <button
            onClick={checkAnswer}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors mt-4"
          >
            Vérifier ma réponse
          </button>
        )}

        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 mt-10 relative z-10"
          >
            <div className={cn(
              "flex items-start gap-4 p-6 rounded-3xl border shadow-sm",
              lastCheckResult === true ? "bg-emerald-50/50 border-emerald-100" : 
              lastCheckResult === false ? "bg-red-50/50 border-red-100" :
              "bg-blue-50/50 border-blue-100"
            )}>
              <div className={cn(
                "p-3 rounded-2xl text-white shadow-md",
                lastCheckResult === true ? "bg-emerald-500" : 
                lastCheckResult === false ? "bg-red-500" : "bg-blue-500"
              )}>
                {lastCheckResult === true ? <CheckCircle size={24} /> : 
                 lastCheckResult === false ? <XCircle size={24} /> : <Lightbulb size={24} />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                  {question.type === 'flashcard' ? 'Réponse attendue' : 
                   lastCheckResult === true ? 'Excellent !' : 'Oups...'}
                </p>
                <p className="text-xl font-bold cmm-text-primary leading-tight">
                  {question.answer}
                </p>
                {lastCheckResult === false && (
                  <p className="mt-2 text-sm text-red-600 font-medium italic">
                    Votre réponse : {selectedOption}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-3xl text-white/90 text-sm leading-relaxed border border-slate-800 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Lightbulb size={80} />
               </div>
               <p className="relative z-10">{question.explanation}</p>
            </div>

            {lastCheckResult === true && !srsData[question.id].last_seen_at?.includes(new Date().toISOString().split('T')[0]) && (
              <div className="bg-violet-50/50 border border-violet-100 p-6 rounded-3xl">
                <p className="text-xs font-black uppercase tracking-widest text-violet-600 mb-4 text-center">Niveau de difficulté ?</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSRSUpdate(3)}
                    className="group flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-violet-200 hover:border-violet-500 transition-all shadow-sm"
                  >
                    <div className="text-2xl group-hover:scale-110 transition-transform">😅</div>
                    <span className="text-xs font-bold text-violet-900">Pas évident</span>
                  </button>
                  <button
                    onClick={() => handleSRSUpdate(5)}
                    className="group flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-violet-200 hover:border-violet-500 transition-all shadow-sm"
                  >
                    <div className="text-2xl group-hover:scale-110 transition-transform">🚀</div>
                    <span className="text-xs font-bold text-violet-900">Trop facile</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              {currentQuestionIdx < sortedQuestions.length - 1 ? (
                <button
                  onClick={nextQuestion}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  Question suivante
                </button>
              ) : (
                <button
                  onClick={resetQuiz}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  Terminer le cycle
                </button>
              )}
              <button
                onClick={resetQuiz}
                className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-slate-900 hover:border-slate-400 transition-all active:rotate-180 duration-500"
              >
                <Shuffle size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>

      {score > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12">
            <Trophy size={250} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Trophy size={48} />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-3xl font-black mb-2 tracking-tight">Progression de Maîtrise</h3>
              <p className="text-indigo-100 text-lg font-medium opacity-90">
                Vous avez consolidé {score} concept{score > 1 ? 's' : ''} aujourd'hui.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
                <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 text-xs font-bold tracking-widest uppercase">
                  {Math.round((score / QUIZ_QUESTIONS.length) * 100)}% de réussite
                </div>
                <div className="px-4 py-2 bg-emerald-500 rounded-xl text-xs font-bold tracking-widest uppercase shadow-lg shadow-emerald-500/20">
                  SRS Actif
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
 </div>
 );
}