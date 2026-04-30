"use client";

import type { ReactNode } from "react";
import { CheckCircle, Sparkles, Brain, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CognitivePrimer } from "@/components/learn/cognitive-primer";
import { QuizArchitectureStrip } from "@/components/learn/quiz-architecture-strip";
import type { CognitiveQuizSummary, SupportedLocale } from "@/lib/learning/cognitive-principles";

type QuizDifficulty = "enfant" | "novice" | "intermédiaire" | "expert";

type QuizDifficultyPickerProps = {
  locale: SupportedLocale;
  quizSummary: CognitiveQuizSummary;
  onSelectDifficulty: (difficulty: QuizDifficulty) => void;
};

const DIFFICULTIES: Array<{
  id: QuizDifficulty;
  label: string;
  description: Record<SupportedLocale, string>;
  tone: string;
  icon: ReactNode;
}> = [
  {
    id: "enfant",
    label: "enfant",
    description: {
      fr: "Idéal pour les plus jeunes. Des bases simples et ludiques.",
      en: "Ideal for younger learners. Simple, playful foundations.",
    },
    tone: "bg-amber-100 text-amber-600",
    icon: <Sparkles size={28} />,
  },
  {
    id: "novice",
    label: "novice",
    description: {
      fr: "Pour débuter sereinement avec les concepts fondamentaux.",
      en: "To start calmly with the core concepts.",
    },
    tone: "bg-emerald-100 text-emerald-600",
    icon: <Brain size={28} />,
  },
  {
    id: "intermédiaire",
    label: "intermédiaire",
    description: {
      fr: "Niveau standard. Couvre les enjeux climatiques majeurs.",
      en: "Standard level. Covers the main climate issues.",
    },
    tone: "bg-blue-100 text-blue-600",
    icon: <Trophy size={28} />,
  },
  {
    id: "expert",
    label: "expert",
    description: {
      fr: "Pour les passionnés. Chiffres précis et concepts techniques.",
      en: "For enthusiasts. Precise figures and technical concepts.",
    },
    tone: "bg-violet-100 text-violet-600",
    icon: <Zap size={28} />,
  },
];

export function QuizDifficultyPicker({
  locale,
  quizSummary,
  onSelectDifficulty,
}: QuizDifficultyPickerProps) {
  return (
    <div className="space-y-12 py-10">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-50 rounded-full border border-emerald-100 mb-4"
        >
          <Brain className="text-emerald-600" size={20} />
          <span className="text-sm font-black text-emerald-800 uppercase tracking-widest">
            Parcours Adaptatif
          </span>
        </motion.div>
        <h2 className="text-4xl md:text-5xl font-black cmm-text-primary tracking-tight">
          Choisissez votre niveau
        </h2>
        <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium">
          Adaptez les questions à votre connaissance de l&apos;écologie pour une meilleure
          expérience d&apos;apprentissage.
        </p>
      </div>

      <QuizArchitectureStrip locale={locale} summary={quizSummary} className="max-w-6xl mx-auto" />

      <CognitivePrimer
        locale={locale}
        summary={quizSummary}
        highlightRubricId="quiz"
        className="max-w-6xl mx-auto"
      />

      <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto md:grid-cols-2 lg:grid-cols-4">
        {DIFFICULTIES.map((difficulty, index) => (
          <motion.button
            key={difficulty.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectDifficulty(difficulty.id)}
            className="group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 text-left shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10"
          >
            <div
              className={cn(
                "mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner",
                difficulty.tone,
              )}
            >
              {difficulty.icon}
            </div>
            <h3 className="mb-2 text-xl font-black capitalize cmm-text-primary">
              {difficulty.label}
            </h3>
            <p className="text-sm font-medium leading-relaxed cmm-text-secondary">
              {difficulty.description[locale]}
            </p>
            <div className="absolute bottom-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <CheckCircle className="text-emerald-500" size={32} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
