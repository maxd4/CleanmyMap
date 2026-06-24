import { Search, RotateCcw } from "lucide-react";
import { QUICK_PROMPTS, type AssistantCopy, type Locale } from "../assistant-constants";
import { CmmButton } from "@/components/ui/cmm-button";

interface AssistantFormProps {
  question: string;
  setQuestion: (val: string) => void;
  copy: AssistantCopy;
  locale: Locale;
}

export function AssistantForm({ question, setQuestion, copy, locale }: AssistantFormProps) {
  const fr = locale === "fr";
  return (
    <div className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl h-full flex flex-col space-y-6">
      <div className="space-y-4 flex-grow">
        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          {copy.yourQuestion}
        </label>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={6}
          placeholder={copy.placeholder}
          className="w-full rounded-2xl border border-white/5 bg-slate-950/40 px-6 py-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-emerald-500/50 focus:bg-slate-950/60 resize-none font-medium"
        />

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS[locale].map((item) => (
            <CmmButton
              key={item}
              type="button"
              onClick={() => setQuestion(item)}
              tone="tertiary"
              variant="pill"
              className="rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              {item}
            </CmmButton>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CmmButton
            type="button"
            onClick={() => setQuestion("")}
            tone="tertiary"
            variant="pill"
            className="flex h-12 w-12 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <RotateCcw size={18} />
          </CmmButton>
          <div className="flex-grow rounded-xl bg-white/5 border border-white/5 px-5 py-3">
            <p className="text-[10px] font-black text-slate-500 leading-relaxed italic">
              {copy.hint}
            </p>
          </div>
        </div>

        <CmmButton
          tone="primary"
          variant="pill"
          className="group flex items-center justify-center w-full h-14 rounded-2xl px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Search size={18} className="mr-2" />
          {fr ? "Analyser le déchet" : "Analyze waste"}
        </CmmButton>
      </div>
    </div>
  );
}
