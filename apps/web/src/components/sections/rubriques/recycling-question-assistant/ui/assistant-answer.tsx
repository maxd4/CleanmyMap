import Link from "next/link";
import { ArrowRight, MapPin, Info } from "lucide-react";
import { Answer } from "../assistant-constants";
import { toneClasses } from "../assistant-utils";
import { cn } from "@/lib/utils";

interface AssistantAnswerProps {
  answer: Answer;
  copy: any;
}

export function AssistantAnswer({ answer, copy }: AssistantAnswerProps) {
  const classes = toneClasses(answer.tone);

  return (
    <div
      className={cn(
        "rounded-[2.5rem] border border-white/5 p-8 shadow-2xl bg-slate-950/40 backdrop-blur-3xl h-full flex flex-col",
        classes.shell
      )}
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
        <MapPin size={14} className="text-emerald-500" />
        {copy.answerTitle}
      </div>

      <div className="mt-6">
        <div
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em] border shadow-sm",
            classes.badge
          )}
        >
          {answer.badge}
        </div>
        <h4 className={cn("mt-4 text-2xl font-black tracking-tighter text-white", classes.title)}>
          {answer.title}
        </h4>
        <p className="mt-3 text-sm cmm-text-secondary leading-relaxed font-medium opacity-80">
          {answer.summary}
        </p>
      </div>

      <ul className="mt-8 space-y-4 flex-grow">
        {answer.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3 text-sm text-slate-300 group">
            <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-colors">
              <ArrowRight size={10} className="text-slate-500 group-hover:text-emerald-400" />
            </div>
            <span className="leading-tight">{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 space-y-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 group hover:bg-white/10 transition-colors">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">
            {copy.answerNext}
          </p>
          <p className="text-sm font-black text-white tracking-tight">{answer.nextStep}</p>
        </div>

        {answer.note ? (
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Info size={24} />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">
              {copy.noteTitle}
            </p>
            <p className="text-xs cmm-text-secondary leading-relaxed italic">{answer.note}</p>
          </div>
        ) : null}

        <div className="pt-4 border-t border-white/5 flex flex-col gap-4">
          <p className="text-[10px] font-medium text-slate-600 italic">
            {copy.footerNote}
          </p>

          <Link
            href="/learn/bonnes-pratiques#ressources-utiles"
            className="group flex items-center justify-between w-full h-14 rounded-2xl bg-white px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              {copy.cta}
            </span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
