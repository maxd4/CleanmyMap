"use client";

import type { ReactNode } from "react";
import {
  CheckCircle,
  Brain,
  Calculator,
  FlaskConical,
  Megaphone,
  Shuffle,
  MapPin,
  Repeat2,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import type { QuizAccessTypeId } from "@/components/learn/quiz-access-types";
import { QUIZ_TRAP_LEVELS, type QuizTrapLevelId } from "@/components/learn/quiz-trap-levels";

type QuizAccessPickerProps = {
  locale: SupportedLocale;
  selectedTrapLevel: QuizTrapLevelId | null;
  onSelectTrapLevel: (trapLevel: QuizTrapLevelId | null) => void;
  onSelectAccessType: (accessType: QuizAccessTypeId) => void;
};

const ACCESS_TYPES: Array<{
  id: QuizAccessTypeId;
  label: string;
  description: Record<SupportedLocale, string>;
  focus: Record<SupportedLocale, string[]>;
  tone: string;
  icon: ReactNode;
}> = [
  {
    id: "mixte",
    label: "Mixte",
    description: {
      fr: "Toutes les questions mélangées dans une même séance.",
      en: "All questions mixed in a single session.",
    },
    focus: {
      fr: ["Mélange de toute la banque", "Sans filtre de thème ni de contexte"],
      en: ["Full bank mixing", "No theme or context filter"],
    },
    tone: "bg-violet-100 text-violet-700",
    icon: <Shuffle size={28} />,
  },
  {
    id: "terrain",
    label: "Terrain",
    description: {
      fr: "Décisions réelles pendant une cleanwalk.",
      en: "Real decisions during a cleanwalk.",
    },
    focus: {
      fr: ["Sécurité, gestes pratiques et organisation", "Cas limites et arbitrages de terrain"],
      en: ["Safety, practical gestures and organization", "Edge cases and field trade-offs"],
    },
    tone: "bg-emerald-100 text-emerald-700",
    icon: <MapPin size={28} />,
  },
  {
    id: "donnees-scientifiques",
    label: "Données scientifiques",
    description: {
      fr: "Mécanismes environnementaux et impacts mesurables.",
      en: "Environmental mechanisms and measurable impacts.",
    },
    focus: {
      fr: ["Pollution, recyclage, dégradation et biodiversité", "Ordres de grandeur et conséquences indirectes"],
      en: ["Pollution, recycling, degradation and biodiversity", "Orders of magnitude and indirect consequences"],
    },
    tone: "bg-sky-100 text-sky-700",
    icon: <FlaskConical size={28} />,
  },
  {
    id: "sensibilisation",
    label: "Sensibilisation",
    description: {
      fr: "Idées reçues, mythes et questions contre-intuitives.",
      en: "Misconceptions, myths and counter-intuitive questions.",
    },
    focus: {
      fr: ["Prise de conscience rapide", "Questions qui bousculent l'intuition"],
      en: ["Quick awareness building", "Questions that challenge intuition"],
    },
    tone: "bg-rose-100 text-rose-700",
    icon: <Megaphone size={28} />,
  },
  {
    id: "habitudes-de-vie",
    label: "Habitudes de vie",
    description: {
      fr: "Gestes quotidiens, consommation et réduction des déchets.",
      en: "Daily habits, consumption and waste reduction.",
    },
    focus: {
      fr: ["Lien entre geste individuel et impact collectif", "Réduction des déchets au quotidien"],
      en: ["Link individual actions to collective impact", "Waste reduction in daily life"],
    },
    tone: "bg-amber-100 text-amber-800",
    icon: <Repeat2 size={28} />,
  },
  {
    id: "ordres-de-grandeur",
    label: "Ordres de grandeur",
    description: {
      fr: "Estimations, durées, masses et proportions.",
      en: "Estimates, durations, masses and proportions.",
    },
    focus: {
      fr: ["Apprendre à raisonner avec une échelle", "Comparer sans réponse évidente"],
      en: ["Learn to reason with scale", "Compare without an obvious answer"],
    },
    tone: "bg-blue-100 text-blue-700",
    icon: <Calculator size={28} />,
  },
  {
    id: "tri-securite",
    label: "Tri & sécurité",
    description: {
      fr: "Filières de traitement, erreurs de tri et déchets dangereux.",
      en: "Treatment streams, sorting mistakes and hazardous waste.",
    },
    focus: {
      fr: ["Éviter les mauvais gestes sur le terrain", "Sécuriser les décisions de tri"],
      en: ["Avoid bad field practices", "Secure sorting decisions"],
    },
    tone: "bg-slate-100 text-slate-700",
    icon: <ShieldAlert size={28} />,
  },
];

export function QuizAccessPicker({
  locale,
  selectedTrapLevel,
  onSelectTrapLevel,
  onSelectAccessType,
}: QuizAccessPickerProps) {
  return (
    <div className="space-y-12 py-10">
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 inline-flex items-center gap-3 rounded-full border border-emerald-100 bg-emerald-50 px-6 py-2"
        >
          <Brain className="text-emerald-600" size={20} />
          <span className="text-sm font-black uppercase tracking-widest text-emerald-800">
            Accès au quiz
          </span>
        </motion.div>
        <h2 className="text-4xl font-black tracking-tight cmm-text-primary md:text-5xl">
          Choisissez ce que vous voulez évaluer
        </h2>
        <p className="mx-auto max-w-2xl text-lg font-medium cmm-text-secondary">
          Le parcours commence par une porte d&apos;entrée claire: mixte, terrain, données scientifiques,
          sensibilisation, habitudes de vie, ordres de grandeur ou tri &amp; sécurité selon ce que vous voulez évaluer.
        </p>
      </div>

      <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Mode de piège</p>
            <h3 className="mt-1 text-lg font-black cmm-text-primary">Niveau de piégeage</h3>
            <p className="mt-1 text-sm cmm-text-secondary">
              Choisissez si vous voulez des questions plus directes ou plus piégeuses en intuition.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectTrapLevel(null)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              !selectedTrapLevel
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
            )}
          >
            Tous
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {QUIZ_TRAP_LEVELS.map((trapLevel) => (
            <button
              key={trapLevel.id}
              type="button"
              onClick={() => onSelectTrapLevel(trapLevel.id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition",
                selectedTrapLevel === trapLevel.id
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <p className="text-sm font-black uppercase tracking-widest cmm-text-primary">{trapLevel.label}</p>
              <p className="mt-2 text-sm cmm-text-secondary">{trapLevel.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {ACCESS_TYPES.map((accessType, index) => (
          <motion.button
            key={accessType.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectAccessType(accessType.id)}
            className="group relative overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white p-8 text-left shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10"
          >
            <div
              className={cn(
                "mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner",
                accessType.tone,
              )}
            >
              {accessType.icon}
            </div>
            <h3 className="mb-2 text-xl font-black cmm-text-primary">{accessType.label}</h3>
            <p className="text-sm font-medium leading-relaxed cmm-text-secondary">
              {accessType.description[locale]}
            </p>
            <ul className="mt-5 space-y-2 text-sm font-medium text-slate-700">
              {accessType.focus[locale].map((focus) => (
                <li key={focus} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span>{focus}</span>
                </li>
              ))}
            </ul>
            <div className="absolute bottom-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <CheckCircle className="text-emerald-500" size={32} />
            </div>
          </motion.button>
        ))}
      </div>

      <p className="text-center text-sm cmm-text-secondary">
        Les formats détaillés du quiz s&apos;appliquent ensuite selon le type choisi.
      </p>
    </div>
  );
}
