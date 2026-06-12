"use client";

import type { ReactNode } from "react";
import {
  CheckCircle,
  Sparkles,
  Brain,
  MapPin,
  Calculator,
  Scale,
  ArrowRightLeft,
  Lightbulb,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CognitivePrimer } from "@/components/learn/cognitive-primer";
import { QuizArchitectureStrip } from "@/components/learn/quiz-architecture-strip";
import type { CognitiveQuizSummary, SupportedLocale } from "@/lib/learning/cognitive-principles";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";

type ReasoningType = QuizReasoningType;

type QuizReasoningPickerProps = {
  locale: SupportedLocale;
  quizSummary: CognitiveQuizSummary;
  onSelectReasoningType: (reasoningType: ReasoningType) => void;
  onBackToAccessType?: () => void;
  availableReasoningTypes?: ReasoningType[];
};

const REASONING_TYPES: Array<{
  id: ReasoningType;
  label: string;
  description: Record<SupportedLocale, string>;
  tone: string;
  icon: ReactNode;
}> = [
  {
    id: "idée reçue",
    label: "idée reçue",
    description: {
      fr: "Corriger une croyance fréquente avec une phrase qui paraît plausible au premier regard.",
      en: "Correct a common misconception with a statement that feels plausible at first glance.",
    },
    tone: "bg-amber-100 text-amber-600",
    icon: <Sparkles size={28} />,
  },
  {
    id: "terrain",
    label: "situations terrain",
    description: {
      fr: "Tester le bon réflexe dans une situation réelle de cleanwalk, de tri ou de sécurité.",
      en: "Test the right reflex in a real cleanwalk, sorting or safety situation.",
    },
    tone: "bg-emerald-100 text-emerald-600",
    icon: <MapPin size={28} />,
  },
  {
    id: "estimation",
    label: "estimations",
    description: {
      fr: "Lire un ordre de grandeur sans le confondre avec une valeur exacte.",
      en: "Read an order of magnitude without confusing it with an exact value.",
    },
    tone: "bg-blue-100 text-blue-600",
    icon: <Calculator size={28} />,
  },
  {
    id: "comparaison",
    label: "comparaisons",
    description: {
      fr: "Comparer deux cas proches pour éviter la réponse automatique.",
      en: "Compare two close cases to avoid an automatic answer.",
    },
    tone: "bg-sky-100 text-sky-600",
    icon: <Scale size={28} />,
  },
  {
    id: "conséquences indirectes",
    label: "conséquences indirectes",
    description: {
      fr: "Montrer des effets cachés, des chaînes de cause à effet et des impacts moins visibles.",
      en: "Show hidden effects, chains of cause and effect and less visible impacts.",
    },
    tone: "bg-violet-100 text-violet-600",
    icon: <ArrowRightLeft size={28} />,
  },
  {
    id: "questions contre-intuitives",
    label: "questions contre-intuitives",
    description: {
      fr: "Faire douter avant de répondre quand l'intuition initiale est trompeuse.",
      en: "Make the learner hesitate before answering when the initial intuition is misleading.",
    },
    tone: "bg-rose-100 text-rose-600",
    icon: <Lightbulb size={28} />,
  },
  {
    id: "cas-limites",
    label: "cas limites",
    description: {
      fr: "Traiter les zones grises, les consignes ambiguës et les arbitrages imparfaits du terrain.",
      en: "Handle gray areas, ambiguous instructions and imperfect field trade-offs.",
    },
    tone: "bg-slate-100 text-slate-700",
    icon: <ShieldAlert size={28} />,
  },
];

export function QuizReasoningPicker({
  locale,
  quizSummary,
  onSelectReasoningType,
  onBackToAccessType,
  availableReasoningTypes,
}: QuizReasoningPickerProps) {
  const visibleReasoningTypes = availableReasoningTypes
    ? REASONING_TYPES.filter((reasoningType) => availableReasoningTypes.includes(reasoningType.id))
    : REASONING_TYPES;

  return (
    <div className="space-y-12 py-10">
      <div className="text-center space-y-4">
        {onBackToAccessType ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onBackToAccessType}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Changer de type de quiz
            </button>
          </div>
        ) : null}
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
          Choisissez votre type de raisonnement
        </h2>
        <p className="text-lg cmm-text-secondary max-w-2xl mx-auto font-medium">
          Le but n&apos;est pas de mesurer une performance scolaire mais le type de raisonnement mobilisé.
        </p>
      </div>

      <QuizArchitectureStrip locale={locale} summary={quizSummary} className="max-w-6xl mx-auto" />

      <CognitivePrimer
        locale={locale}
        summary={quizSummary}
        highlightRubricId="quiz"
        className="max-w-6xl mx-auto"
      />

      <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto md:grid-cols-2 lg:grid-cols-3">
        {visibleReasoningTypes.map((reasoningType, index) => (
          <motion.button
            key={reasoningType.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectReasoningType(reasoningType.id)}
            className="group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 text-left shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10"
          >
            <div
              className={cn(
                "mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner",
                reasoningType.tone,
              )}
            >
              {reasoningType.icon}
            </div>
            <h3 className="mb-2 text-xl font-black capitalize cmm-text-primary">
              {reasoningType.label}
            </h3>
            <p className="text-sm font-medium leading-relaxed cmm-text-secondary">
              {reasoningType.description[locale]}
            </p>
            <div className="absolute bottom-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <CheckCircle className="text-emerald-500" size={32} />
            </div>
          </motion.button>
        ))}
      </div>

      {availableReasoningTypes && visibleReasoningTypes.length === 0 ? (
        <p className="text-center text-sm font-medium cmm-text-secondary">
          Aucun type de raisonnement disponible pour ce choix de quiz.
        </p>
      ) : null}
    </div>
  );
}
