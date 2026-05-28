"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Info, MapPin, Search } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { buildAnswer } from "./recycling-question-assistant/assistant-utils";
import { QUICK_PROMPTS, type Tone } from "./recycling-question-assistant/assistant-constants";

function toneClasses(tone: Tone): { shell: string; badge: string; title: string; accent: string } {
  switch (tone) {
    case "emerald":
      return {
        shell: "border-emerald-500/20 bg-emerald-500/5",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        title: "text-emerald-400",
        accent: "text-emerald-500",
      };
    case "amber":
      return {
        shell: "border-amber-500/20 bg-amber-500/5",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        title: "text-amber-400",
        accent: "text-amber-500",
      };
    case "rose":
      return {
        shell: "border-rose-500/20 bg-rose-500/5",
        badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        title: "text-rose-400",
        accent: "text-rose-500",
      };
    default:
      return {
        shell: "border-slate-800/40 bg-slate-900/40",
        badge: "bg-slate-800 text-slate-400 border-slate-700/60",
        title: "text-slate-100",
        accent: "text-slate-500",
      };
  }
}

export function RecyclingQuestionAssistant() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [question, setQuestion] = useState("");
  const answer = useMemo(() => buildAnswer(question, locale), [question, locale]);

  const copy = fr
    ? {
      title: "IA Assistant de tri",
      subtitle: "Comment recycler cet objet ?",
      placeholder: "Ex. : dans quelle poubelle je mets une pile usagée ?",
      helper: "Matière, état, lieu... dis-moi tout.",
      examples: "Suggestions",
      clear: "Effacer",
      answerTitle: "Recommandation",
      answerNext: "Étape suivante",
      noteTitle: "Note terrain",
      cta: "Ressources complètes",
    }
    : {
      title: "AI Sorting assistant",
      subtitle: "How to recycle this item?",
      placeholder: "Ex. : which bin for a used battery?",
      helper: "Material, condition, location... tell me more.",
      examples: "Suggestions",
      clear: "Clear",
      answerTitle: "Recommendation",
      answerNext: "Next step",
      noteTitle: "Field note",
      cta: "Full resources",
    };

  const classes = toneClasses(answer.tone);

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-800/40 bg-slate-900/40 p-8 backdrop-blur-xl shadow-2xl">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-[100px]" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/5 blur-[100px]" />

      <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
        
        {/* GAUCHE : INTERACTION */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {copy.title}
            </div>
            <h3 className="mt-3 text-3xl font-black tracking-tight cmm-text-primary">
              {copy.subtitle}
            </h3>
            <p className="mt-2 cmm-text-secondary font-medium italic opacity-60">
              {copy.helper}
            </p>
          </div>

          <div className="relative group">
            <textarea
              id="sorting-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              placeholder={copy.placeholder}
              className="w-full rounded-3xl border border-slate-800/60 bg-slate-950/40 px-6 py-5 text-base cmm-text-primary outline-none transition-all placeholder:text-slate-600 focus:border-emerald-500/50 focus:bg-slate-950/60 focus:shadow-[0_0_20px_-5px_rgba(16,185,129,0.2)] resize-none"
            />
            <div className="absolute right-4 bottom-4 flex items-center gap-2">
               {question && (
                 <CmmButton
                   onClick={() => setQuestion("")}
                   tone="tertiary"
                   variant="pill"
                   size="sm"
                   className="p-2 rounded-xl text-slate-400 hover:text-rose-400 transition-colors"
                   title={copy.clear}
                 >
                   <Search size={18} className="rotate-45" />
                 </CmmButton>
               )}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              {copy.examples}
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS[locale].map((item) => (
                <CmmButton
                  key={item}
                  type="button"
                  onClick={() => setQuestion(item)}
                  tone="tertiary"
                  variant="pill"
                  className="rounded-2xl px-4 py-2 text-xs font-bold text-slate-400 transition-all active:scale-95"
                >
                  {item}
                </CmmButton>
              ))}
            </div>
          </div>
        </div>

        {/* DROITE : RÉPONSE (IA) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question ? answer.title : "empty"}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`flex flex-col rounded-[2rem] border p-8 shadow-inner transition-colors duration-500 ${classes.shell}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
                <MapPin size={14} className={classes.accent} />
                {copy.answerTitle}
              </div>
              <div className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${classes.badge}`}>
                {answer.badge}
              </div>
            </div>

            <h4 className={`mt-6 text-2xl font-black tracking-tight ${classes.title}`}>
              {answer.title}
            </h4>
            
            <p className="mt-4 text-base cmm-text-secondary leading-relaxed font-medium">
              {answer.summary}
            </p>

            <ul className="mt-6 space-y-3">
              {answer.bullets.map((bullet, i) => (
                <motion.li 
                  key={bullet} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex gap-3 text-sm cmm-text-secondary"
                >
                  <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${classes.accent} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                  <span className="opacity-80">{bullet}</span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-auto pt-8 space-y-4">
              <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-5 group transition-colors hover:bg-slate-950/60">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                  {copy.answerNext}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-black cmm-text-primary group-hover:text-emerald-400 transition-colors">
                    {answer.nextStep}
                  </p>
                  <ArrowRight size={16} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                </div>
              </div>

              {answer.note && (
                <div className="flex items-start gap-3 px-2">
                  <Info size={14} className="mt-0.5 shrink-0 text-amber-500/60" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    {answer.note}
                  </p>
                </div>
              )}

              <CmmButton
                href="/learn/ressources"
                tone="secondary"
                variant="pill"
                className="group flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-black text-slate-950 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/5"
              >
                {copy.cta}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </CmmButton>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
