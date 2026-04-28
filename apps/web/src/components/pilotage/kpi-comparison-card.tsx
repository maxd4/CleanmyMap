import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type KpiComparisonCardProps = {
  label: ReactNode;
  value: string;
  previousValue?: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
  hint?: string;
};

function toneClass(interpretation: KpiComparisonCardProps["interpretation"]): string {
  if (interpretation === "positive") return "text-emerald-500 bg-emerald-500/10";
  if (interpretation === "negative") return "text-rose-500 bg-rose-500/10";
  return "text-slate-500 bg-slate-500/10";
}

function TrendIcon({ interpretation }: { interpretation: KpiComparisonCardProps["interpretation"] }) {
  if (interpretation === "positive") return <TrendingUp size={16} />;
  if (interpretation === "negative") return <TrendingDown size={16} />;
  return <Minus size={16} />;
}

export function KpiComparisonCard({
  label,
  value,
  previousValue,
  deltaAbsolute,
  deltaPercent,
  interpretation = "neutral",
  hint,
}: KpiComparisonCardProps) {
  return (
    <motion.article 
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group rounded-2xl border border-white/20 bg-white/40 p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-xl hover:shadow-[0_8px_30px_rgb(16,185,129,0.08)] hover:border-emerald-100/50 transition-all"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      
      <div className="flex items-end justify-between mb-2">
        <p className="text-2xl font-black bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent">
          {value}
        </p>
        
        {(deltaAbsolute || deltaPercent) && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${toneClass(interpretation)}`}>
            <TrendIcon interpretation={interpretation} />
            <span>
              {deltaAbsolute ? `${deltaAbsolute}` : ""}
              {deltaAbsolute && deltaPercent ? " | " : ""}
              {deltaPercent ? `${deltaPercent}` : ""}
            </span>
          </div>
        )}
      </div>

      {previousValue && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100/50">
          <p className="text-xs font-semibold text-slate-400">
            Précédent: <span className="text-slate-600">{previousValue}</span>
          </p>
        </div>
      )}
      
      {hint && (
        <p className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          {hint}
        </p>
      )}
    </motion.article>
  );
}
