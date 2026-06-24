import { HelpCircle, Sparkles } from "lucide-react";
import { QUICK_PROMPTS, type AssistantCopy, type Locale } from "../assistant-constants";
import { CmmButton } from "@/components/ui/cmm-button";

interface AssistantHeaderProps {
  copy: AssistantCopy;
  locale: Locale;
  setQuestion: (val: string) => void;
}

export function AssistantHeader({ copy, locale, setQuestion }: AssistantHeaderProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8">
      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-emerald-500">
            <Sparkles size={14} />
          </div>
          {copy.title}
        </div>
        <h3 className="text-3xl font-black tracking-tighter text-white">
          {copy.subtitle}
        </h3>
        <p className="text-sm cmm-text-secondary leading-relaxed max-w-xl font-medium opacity-70 italic">
          {copy.helper}
        </p>
      </div>

      <div className="rounded-3xl border border-white/5 bg-slate-900/20 backdrop-blur-3xl p-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
        
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle size={12} className="text-slate-600" />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            {copy.examples}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative z-10">
          {QUICK_PROMPTS[locale].slice(0, 3).map((item) => (
            <CmmButton
              key={item}
              type="button"
              onClick={() => setQuestion(item)}
              tone="tertiary"
              variant="pill"
              className="rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 hover:scale-105 active:scale-95"
            >
              {item}
            </CmmButton>
          ))}
        </div>
      </div>
    </div>
  );
}
