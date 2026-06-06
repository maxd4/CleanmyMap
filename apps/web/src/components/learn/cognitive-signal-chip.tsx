"use client";

"use client";

import { cn } from "@/lib/utils";

type CognitiveSignalTone = "default" | "emerald" | "cyan" | "violet" | "amber";

type CognitiveSignalChipProps = {
  label: string;
  tone?: CognitiveSignalTone;
  title?: string;
  className?: string;
};

const TONE_CLASSES: Record<CognitiveSignalTone, string> = {
  default:
    "border-[color:var(--border-default)] bg-[color:var(--bg-muted)] cmm-text-secondary",
  emerald: "border-emerald-300/35 bg-emerald-500/10 text-emerald-900",
  cyan: "border-cyan-300/35 bg-cyan-500/10 text-cyan-900",
  violet: "border-violet-300/35 bg-violet-500/10 text-violet-900",
  amber: "border-amber-300/35 bg-amber-500/10 text-amber-900",
};

const DOT_CLASSES: Record<CognitiveSignalTone, string> = {
  default: "bg-cyan-300",
  emerald: "bg-emerald-400",
  cyan: "bg-cyan-400",
  violet: "bg-violet-400",
  amber: "bg-amber-400",
};

export function CognitiveSignalChip({
  label,
  tone = "default",
  title,
  className,
}: CognitiveSignalChipProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 cmm-text-caption font-semibold transition-all duration-150 ease-out hover:-translate-y-[1px] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-elevated)]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
